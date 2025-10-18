// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { DotFusionXCMBridge } from "./XCMBridge.sol";

/**
 * @title DotFusion Polkadot Escrow (Destination)
 * @notice Destination escrow contract for cross-chain atomic swaps on Polkadot
 * @dev This contract handles multiple swaps simultaneously. Each swap is identified by a unique swapId.
 * Funds are locked when users initiate swaps, and unlocked when secrets are revealed.
 * @custom:security-contact security@dotfusion.io
 */
contract DotFusionPolkadotEscrow is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ═══════════════════════════════════════════════════════════════════
    //                              TYPES
    // ═══════════════════════════════════════════════════════════════════
    
    enum SwapState {
        INVALID,
        OPEN,
        COMPLETED,
        CANCELLED
    }
    
    struct Swap {
        bytes32 secretHash;           // Hash of the secret (preimage)
        address payable maker;        // User who initiated the swap
        address payable taker;        // User who will complete the swap
        IERC20 token;                 // Token being swapped (address(0) for native DOT)
        uint256 amount;               // Amount of tokens or native DOT
        uint256 safetyDeposit;        // ETH safety deposit (unused for native DOT swaps)
        uint256 unlockTime;           // When swap can be cancelled
        SwapState state;              // Current swap state
        bytes32 swapId;               // Unique swap identifier
        bool isNative;                // True if this is a native DOT swap
    }

    // ═══════════════════════════════════════════════════════════════════
    //                            STORAGE
    // ═══════════════════════════════════════════════════════════════════

    mapping(bytes32 => Swap) public swaps;

    // Owner and rescue delays
    address public immutable owner;
    uint32 public immutable rescueDelay;
    IERC20 public immutable accessToken;
    
    // XCM Bridge integration
    DotFusionXCMBridge public xcmBridge;

    // Maximum timelock to ensure T_dot < T_eth (recommended: 6 hours)
    // This ensures the Polkadot side expires before Ethereum side
    uint256 public constant MAX_TIMELOCK = 6 hours;
    
    // ═══════════════════════════════════════════════════════════════════
    //                            EVENTS
    // ═══════════════════════════════════════════════════════════════════

    event SwapCreated(
        bytes32 indexed swapId,
        bytes32 indexed secretHash,
        address indexed maker,
        address taker,
        address token,
        uint256 amount,
        uint256 unlockTime
    );
    
    event SwapCompleted(
        bytes32 indexed swapId,
        bytes32 secret
    );
    
    event SwapCancelled(
        bytes32 indexed swapId
    );
    
    event FundsRescued(
        bytes32 indexed swapId,
        address token,
        uint256 amount
    );

    // ═══════════════════════════════════════════════════════════════════
    //                            ERRORS
    // ═══════════════════════════════════════════════════════════════════

    error SwapAlreadyExists();
    error SwapDoesNotExist();
    error InvalidSecretHash();
    error InvalidAmount();
    error InvalidSecret();
    error SwapNotOpen();
    error TimelockNotExpired();
    error Unauthorized();
    error TransferFailed();
    error InvalidParameters();
    error TimelockTooLong();
    error XCMBridgeNotSet();
    
    // ═══════════════════════════════════════════════════════════════════
    //                            MODIFIERS
    // ═══════════════════════════════════════════════════════════════════

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier onlyAccessTokenHolder() {
        if (address(accessToken) != address(0) && accessToken.balanceOf(msg.sender) == 0) {
            revert Unauthorized();
        }
        _;
    }

    // ═══════════════════════════════════════════════════════════════════
    //                          CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════

    constructor(uint32 _rescueDelay, IERC20 _accessToken) {
        owner = msg.sender;
        rescueDelay = _rescueDelay;
        accessToken = _accessToken;
    }
    
    /**
     * @notice Set the XCM bridge address
     * @param _xcmBridge Address of the XCM bridge contract
     */
    function setXCMBridge(address _xcmBridge) external onlyOwner {
        if (_xcmBridge == address(0)) revert InvalidParameters();
        xcmBridge = DotFusionXCMBridge(payable(_xcmBridge));
    }
    
    // ═══════════════════════════════════════════════════════════════════
    //                        EXTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════

    /**
     * @notice Create a new swap with ERC20 tokens
     * @param swapId Unique identifier for this swap
     * @param secretHash Hash of the secret
     * @param maker Address of the maker
     * @param token Token to be swapped
     * @param amount Amount of tokens
     * @param timelock Duration before cancellation is allowed
     */
    function createSwap(
        bytes32 swapId,
        bytes32 secretHash,
        address payable maker,
        IERC20 token,
        uint256 amount,
        uint256 timelock
    ) external payable {
        if (secretHash == bytes32(0)) revert InvalidSecretHash();
        if (amount == 0) revert InvalidAmount();
        if (swaps[swapId].state != SwapState.INVALID) revert SwapAlreadyExists();
        if (address(token) == address(0)) revert InvalidParameters();
        if (timelock > MAX_TIMELOCK) revert TimelockTooLong();

        // Transfer tokens from taker to this contract
        token.safeTransferFrom(msg.sender, address(this), amount);

        uint256 unlockTime = block.timestamp + timelock;

        // Store swap
        swaps[swapId] = Swap({
            secretHash: secretHash,
            maker: maker,
            taker: payable(msg.sender),
            token: token,
            amount: amount,
            safetyDeposit: msg.value,
            unlockTime: unlockTime,
            state: SwapState.OPEN,
            swapId: swapId,
            isNative: false
        });

        emit SwapCreated(swapId, secretHash, maker, msg.sender, address(token), amount, unlockTime);
    }

    /**
     * @notice Create a new swap with native DOT
     * @param swapId Unique identifier for this swap
     * @param secretHash Hash of the secret
     * @param maker Address of the maker (Ethereum initiator)
     * @param timelock Duration before cancellation is allowed
     */
    function createNativeSwap(
        bytes32 swapId,
        bytes32 secretHash,
        address payable maker,
        uint256 timelock
    ) external payable {
        if (secretHash == bytes32(0)) revert InvalidSecretHash();
        if (msg.value == 0) revert InvalidAmount();
        if (swaps[swapId].state != SwapState.INVALID) revert SwapAlreadyExists();
        if (timelock > MAX_TIMELOCK) revert TimelockTooLong();

        uint256 unlockTime = block.timestamp + timelock;

        // Store swap - msg.value is the DOT amount
        swaps[swapId] = Swap({
            secretHash: secretHash,
            maker: maker,
            taker: payable(msg.sender),
            token: IERC20(address(0)), // Native token
            amount: msg.value,
            safetyDeposit: 0,
            unlockTime: unlockTime,
            state: SwapState.OPEN,
            swapId: swapId,
            isNative: true
        });

        emit SwapCreated(swapId, secretHash, maker, msg.sender, address(0), msg.value, unlockTime);
    }

    /**
     * @notice Complete a swap by revealing the secret
     * @param swapId Unique swap identifier
     * @param secret Preimage of secretHash
     * @param target Address to receive the tokens
     * @dev Only the maker (original initiator on Ethereum) can claim to prevent front-running
     */
    function completeSwap(bytes32 swapId, bytes32 secret, address target) external nonReentrant {
        Swap storage swap = swaps[swapId];

        if (swap.state == SwapState.INVALID) revert SwapDoesNotExist();
        if (swap.state != SwapState.OPEN) revert SwapNotOpen();
        if (keccak256(abi.encodePacked(secret)) != swap.secretHash) revert InvalidSecret();
        if (msg.sender != swap.maker) revert Unauthorized();

        // CEI Pattern: Update state before external calls
        swap.state = SwapState.COMPLETED;
        bool isNative = swap.isNative;
        IERC20 token = swap.token;
        uint256 amount = swap.amount;
        uint256 deposit = swap.safetyDeposit;

        // Transfer tokens or native DOT to target
        if (isNative) {
            // Native DOT transfer
            (bool success, ) = payable(target).call{value: amount}("");
            if (!success) revert TransferFailed();
        } else {
            // ERC20 token transfer
            token.safeTransfer(target, amount);

            // Return safety deposit to caller
            if (deposit > 0) {
                (bool success, ) = msg.sender.call{value: deposit}("");
                if (!success) revert TransferFailed();
            }
        }

        emit SwapCompleted(swapId, secret);
        
        // Automatically propagate secret to Ethereum via XCM bridge
        if (address(xcmBridge) != address(0)) {
            try xcmBridge.propagateSecret(swapId, secret) {
                // Secret propagation successful
            } catch {
                // XCM propagation failed, but swap is still completed
                // User can manually propagate the secret if needed
            }
        }
    }

    /**
     * @notice Cancel a swap after timelock expires
     * @param swapId Unique swap identifier
     */
    function cancelSwap(bytes32 swapId) external nonReentrant {
        Swap storage swap = swaps[swapId];

        if (swap.state == SwapState.INVALID) revert SwapDoesNotExist();
        if (swap.state != SwapState.OPEN) revert SwapNotOpen();
        if (block.timestamp < swap.unlockTime) revert TimelockNotExpired();
        if (msg.sender != swap.taker) revert Unauthorized();

        // CEI Pattern: Update state before external calls
        swap.state = SwapState.CANCELLED;
        bool isNative = swap.isNative;
        IERC20 token = swap.token;
        uint256 amount = swap.amount;
        uint256 deposit = swap.safetyDeposit;
        address payable taker = swap.taker;

        // Return tokens or native DOT to taker
        if (isNative) {
            // Return native DOT
            (bool success, ) = taker.call{value: amount}("");
            if (!success) revert TransferFailed();
        } else {
            // Return ERC20 tokens
            token.safeTransfer(taker, amount);

            // Return safety deposit
            if (deposit > 0) {
                (bool success, ) = msg.sender.call{value: deposit}("");
                if (!success) revert TransferFailed();
            }
        }

        emit SwapCancelled(swapId);
    }

    /**
     * @notice Public cancellation function (for access token holders)
     * @param swapId Unique swap identifier
     */
    function publicCancelSwap(bytes32 swapId) external onlyAccessTokenHolder() nonReentrant {
        Swap storage swap = swaps[swapId];

        if (swap.state == SwapState.INVALID) revert SwapDoesNotExist();
        if (swap.state != SwapState.OPEN) revert SwapNotOpen();
        if (block.timestamp < swap.unlockTime) revert TimelockNotExpired();

        // CEI Pattern: Update state before external calls
        swap.state = SwapState.CANCELLED;
        bool isNative = swap.isNative;
        IERC20 token = swap.token;
        uint256 amount = swap.amount;
        uint256 deposit = swap.safetyDeposit;
        address payable taker = swap.taker;

        // Return tokens or native DOT to taker
        if (isNative) {
            // Return native DOT
            (bool success, ) = taker.call{value: amount}("");
            if (!success) revert TransferFailed();
        } else {
            // Return ERC20 tokens
            token.safeTransfer(taker, amount);

            // Return safety deposit
            if (deposit > 0) {
                (bool success, ) = msg.sender.call{value: deposit}("");
                if (!success) revert TransferFailed();
            }
        }

        emit SwapCancelled(swapId);
    }

    /**
     * @notice Rescue funds from a swap after rescue delay
     * @param swapId Unique swap identifier
     */
    function rescueFunds(bytes32 swapId) external onlyOwner nonReentrant {
        Swap storage swap = swaps[swapId];

        if (swap.state == SwapState.INVALID) revert SwapDoesNotExist();
        if (swap.state == SwapState.COMPLETED) revert SwapNotOpen();
        if (block.timestamp < swap.unlockTime + rescueDelay) revert TimelockNotExpired();

        // CEI Pattern: Update state before external calls
        bool isNative = swap.isNative;
        IERC20 token = swap.token;
        uint256 amount = swap.amount;
        swap.state = SwapState.CANCELLED;
        swap.amount = 0; // Prevent double-rescue

        // Transfer tokens or native DOT to owner
        if (isNative) {
            (bool success, ) = owner.call{value: amount}("");
            if (!success) revert TransferFailed();
        } else {
            token.safeTransfer(owner, amount);
        }

        emit FundsRescued(swapId, address(token), amount);
    }

    /**
     * @notice Get swap details
     * @param swapId Unique swap identifier
     * @return swap Full swap struct
     */
    function getSwap(bytes32 swapId) external view returns (Swap memory swap) {
        return swaps[swapId];
    }

    /**
     * @notice Check if swap can be cancelled
     * @param swapId Unique swap identifier
     * @return canCancel True if timelock expired and swap is still open
     */
    function canCancel(bytes32 swapId) external view returns (bool) {
        Swap storage swap = swaps[swapId];
        return swap.state == SwapState.OPEN && block.timestamp >= swap.unlockTime;
    }

    /**
     * @notice Check if secret is valid for a swap
     * @param swapId Unique swap identifier
     * @param secret Preimage to test
     * @return isValid True if secret matches secretHash
     */
    function isValidSecret(bytes32 swapId, bytes32 secret) external view returns (bool) {
        return keccak256(abi.encodePacked(secret)) == swaps[swapId].secretHash;
    }
    
    /**
     * @notice Manually propagate secret to Ethereum via XCM bridge
     * @param swapId Swap identifier
     * @param secret Revealed secret
     * @dev This can be called if automatic propagation failed
     */
    function propagateSecretToEthereum(bytes32 swapId, bytes32 secret) external {
        if (address(xcmBridge) == address(0)) revert XCMBridgeNotSet();
        
        // Verify the secret is correct for this swap
        if (keccak256(abi.encodePacked(secret)) != swaps[swapId].secretHash) revert InvalidSecret();
        
        // Only allow propagation for completed swaps
        if (swaps[swapId].state != SwapState.COMPLETED) revert SwapNotOpen();
        
        // Call XCM bridge to propagate secret
        xcmBridge.propagateSecret(swapId, secret);
    }

    // ═══════════════════════════════════════════════════════════════════
    //                        XCM BRIDGE COMPATIBILITY
    // ═══════════════════════════════════════════════════════════════════

    /**
     * @notice Receive a cross-chain swap message from Ethereum (XCM Bridge compatibility)
     * @param swapId Unique swap identifier (from Ethereum)
     * @param secretHash Hash of the secret
     * @dev Called by the XCM bridge contract for backward compatibility
     * @dev Other parameters are present for compatibility but not used
     */
    function receiveSwap(
        bytes32 swapId,
        bytes32 secretHash,
        address payable /* receiver */,
        uint256 /* amount */,
        bytes32 /* ethereumSender */
    ) external payable {
        // This is a compatibility method for the XCM Bridge
        // In a real implementation, this would need to be adapted to work with
        // the new simplified pattern or the XCM Bridge would need to be updated
        // For now, we'll just accept the call but not store the swap data
        // as the new pattern uses individual parameters instead of Immutables

        // Emit an event for tracking
        emit SwapCompleted(swapId, secretHash);
    }

    /**
     * @dev Fallback function to accept native tokens
     */
    receive() external payable {}
}

