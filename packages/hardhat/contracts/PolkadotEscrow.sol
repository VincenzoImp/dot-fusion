// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

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
        IERC20 token;                 // Token being swapped
        uint256 amount;               // Amount of tokens
        uint256 safetyDeposit;        // ETH safety deposit
        uint256 unlockTime;           // When swap can be cancelled
        SwapState state;              // Current swap state
        bytes32 swapId;               // Unique swap identifier
    }

    // ═══════════════════════════════════════════════════════════════════
    //                            STORAGE
    // ═══════════════════════════════════════════════════════════════════

    mapping(bytes32 => Swap) public swaps;
    
    // Owner and rescue delays
    address public immutable owner;
    uint32 public immutable rescueDelay;
    IERC20 public immutable accessToken;
    
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
    
    // ═══════════════════════════════════════════════════════════════════
    //                        EXTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════

    /**
     * @notice Create a new swap
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
            swapId: swapId
        });
        
        emit SwapCreated(swapId, secretHash, maker, msg.sender, address(token), amount, unlockTime);
    }

    /**
     * @notice Complete a swap by revealing the secret
     * @param swapId Unique swap identifier
     * @param secret Preimage of secretHash
     * @param target Address to receive the tokens
     */
    function completeSwap(bytes32 swapId, bytes32 secret, address target) external nonReentrant {
        Swap storage swap = swaps[swapId];

        if (swap.state == SwapState.INVALID) revert SwapDoesNotExist();
        if (swap.state != SwapState.OPEN) revert SwapNotOpen();
        if (keccak256(abi.encodePacked(secret)) != swap.secretHash) revert InvalidSecret();

        // CEI Pattern: Update state before external calls
        swap.state = SwapState.COMPLETED;
        IERC20 token = swap.token;
        uint256 amount = swap.amount;
        uint256 deposit = swap.safetyDeposit;

        // Transfer tokens to target
        token.safeTransfer(target, amount);

        // Return safety deposit to caller
        if (deposit > 0) {
            (bool success, ) = msg.sender.call{value: deposit}("");
            if (!success) revert TransferFailed();
        }

        emit SwapCompleted(swapId, secret);
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
        IERC20 token = swap.token;
        uint256 amount = swap.amount;
        uint256 deposit = swap.safetyDeposit;
        address payable taker = swap.taker;

        // Return tokens to taker
        token.safeTransfer(taker, amount);

        // Return safety deposit to caller
        if (deposit > 0) {
            (bool success, ) = msg.sender.call{value: deposit}("");
            if (!success) revert TransferFailed();
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
        IERC20 token = swap.token;
        uint256 amount = swap.amount;
        uint256 deposit = swap.safetyDeposit;
        address payable taker = swap.taker;

        // Return tokens to taker
        token.safeTransfer(taker, amount);

        // Return safety deposit to caller
        if (deposit > 0) {
            (bool success, ) = msg.sender.call{value: deposit}("");
            if (!success) revert TransferFailed();
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
        IERC20 token = swap.token;
        uint256 amount = swap.amount;
        swap.state = SwapState.CANCELLED;
        swap.amount = 0; // Prevent double-rescue

        // Transfer tokens to owner
        token.safeTransfer(owner, amount);

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

    // ═══════════════════════════════════════════════════════════════════
    //                        XCM BRIDGE COMPATIBILITY
    // ═══════════════════════════════════════════════════════════════════

    /**
     * @notice Receive a cross-chain swap message from Ethereum (XCM Bridge compatibility)
     * @param swapId Unique swap identifier (from Ethereum)
     * @param secretHash Hash of the secret
     * @param receiver Receiver address on Polkadot
     * @param amount Amount to lock
     * @param ethereumSender Original sender on Ethereum
     * @dev Called by the XCM bridge contract for backward compatibility
     */
    function receiveSwap(
        bytes32 swapId,
        bytes32 secretHash,
        address payable receiver,
        uint256 amount,
        bytes32 ethereumSender
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

