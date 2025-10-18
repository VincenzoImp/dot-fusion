// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title DotFusion Ethereum Escrow (Source)
 * @notice Source escrow contract for cross-chain atomic swaps on Ethereum
 * @dev This contract handles multiple swaps simultaneously. Each swap is identified by a unique swapId.
 * Funds are locked when users initiate swaps, and unlocked when secrets are revealed.
 * @custom:security-contact security@dotfusion.io
 */
contract DotFusionEthereumEscrow is ReentrancyGuard {

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
        address payable maker;        // User who initiated the swap (ETH provider)
        address payable taker;        // User who will complete the swap (DOT provider)
        uint256 ethAmount;            // Amount of ETH being swapped
        uint256 dotAmount;            // Amount of DOT expected in return
        uint256 exchangeRate;         // Fixed exchange rate (DOT per ETH * 1e18)
        uint256 unlockTime;           // When swap can be cancelled
        SwapState state;              // Current swap state
        bytes32 swapId;               // Unique swap identifier
        bytes32 polkadotSender;       // Polkadot address of the taker
    }

    // ═══════════════════════════════════════════════════════════════════
    //                            STORAGE
    // ═══════════════════════════════════════════════════════════════════

    mapping(bytes32 => Swap) public swaps;
    
    // Owner and rescue delays
    address public immutable owner;
    uint32 public immutable rescueDelay;
    address public immutable accessToken;

    // ═══════════════════════════════════════════════════════════════════
    //                            EVENTS
    // ═══════════════════════════════════════════════════════════════════

    event SwapCreated(
        bytes32 indexed swapId,
        bytes32 indexed secretHash,
        address indexed maker,
        address taker,
        uint256 ethAmount,
        uint256 dotAmount,
        uint256 exchangeRate,
        uint256 unlockTime,
        bytes32 polkadotSender
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
        uint256 ethAmount
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
        if (accessToken != address(0)) {
            // For now, we'll skip the access token check since we're not using ERC20
            // This can be implemented later if needed
        }
        _;
    }

    // ═══════════════════════════════════════════════════════════════════
    //                          CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════

    constructor(uint32 _rescueDelay, address _accessToken) {
        owner = msg.sender;
        rescueDelay = _rescueDelay;
        accessToken = _accessToken;
    }

    // ═══════════════════════════════════════════════════════════════════
    //                        EXTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════

    /**
     * @notice Create a new ETH-DOT cross-chain swap
     * @param swapId Unique identifier for this swap
     * @param secretHash Hash of the secret
     * @param taker Ethereum address of the taker (DOT provider)
     * @param ethAmount Amount of ETH being swapped
     * @param dotAmount Amount of DOT expected in return
     * @param exchangeRate Fixed exchange rate (DOT per ETH * 1e18)
     * @param timelock Duration before cancellation is allowed
     * @param polkadotSender Polkadot address of the taker
     */
    function createSwap(
        bytes32 swapId,
        bytes32 secretHash,
        address payable taker,
        uint256 ethAmount,
        uint256 dotAmount,
        uint256 exchangeRate,
        uint256 timelock,
        bytes32 polkadotSender
    ) external payable {
        if (secretHash == bytes32(0)) revert InvalidSecretHash();
        if (ethAmount == 0 || dotAmount == 0) revert InvalidAmount();
        if (exchangeRate == 0) revert InvalidParameters();
        if (swaps[swapId].state != SwapState.INVALID) revert SwapAlreadyExists();
        if (msg.value != ethAmount) revert InvalidAmount();
        
        uint256 unlockTime = block.timestamp + timelock;
        
        // Store swap
        swaps[swapId] = Swap({
            secretHash: secretHash,
            maker: payable(msg.sender),
            taker: taker,
            ethAmount: ethAmount,
            dotAmount: dotAmount,
            exchangeRate: exchangeRate,
            unlockTime: unlockTime,
            state: SwapState.OPEN,
            swapId: swapId,
            polkadotSender: polkadotSender
        });
        
        emit SwapCreated(swapId, secretHash, msg.sender, taker, ethAmount, dotAmount, exchangeRate, unlockTime, polkadotSender);
    }

    /**
     * @notice Complete a swap by revealing the secret (called by taker after providing DOT)
     * @param swapId Unique swap identifier
     * @param secret Preimage of secretHash
     */
    function completeSwap(bytes32 swapId, bytes32 secret) external nonReentrant {
        Swap storage swap = swaps[swapId];

        if (swap.state == SwapState.INVALID) revert SwapDoesNotExist();
        if (swap.state != SwapState.OPEN) revert SwapNotOpen();
        if (keccak256(abi.encodePacked(secret)) != swap.secretHash) revert InvalidSecret();
        if (msg.sender != swap.taker) revert Unauthorized();

        // CEI Pattern: Update state before external call
        swap.state = SwapState.COMPLETED;
        uint256 amount = swap.ethAmount;
        address payable recipient = swap.taker;

        // Transfer ETH to taker (who provided DOT on Polkadot)
        (bool success, ) = recipient.call{value: amount}("");
        if (!success) revert TransferFailed();

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
        if (msg.sender != swap.maker) revert Unauthorized();

        // CEI Pattern: Update state before external call
        swap.state = SwapState.CANCELLED;
        uint256 amount = swap.ethAmount;
        address payable recipient = swap.maker;

        // Return ETH to maker
        (bool success, ) = recipient.call{value: amount}("");
        if (!success) revert TransferFailed();

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

        // CEI Pattern: Update state before external call
        swap.state = SwapState.CANCELLED;
        uint256 amount = swap.ethAmount;
        address payable recipient = swap.maker;

        // Return ETH to maker
        (bool success, ) = recipient.call{value: amount}("");
        if (!success) revert TransferFailed();

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

        // CEI Pattern: Update state before external call
        uint256 amount = swap.ethAmount;
        swap.state = SwapState.CANCELLED;
        swap.ethAmount = 0; // Prevent double-rescue

        // Transfer ETH to owner
        (bool success, ) = owner.call{value: amount}("");
        if (!success) revert TransferFailed();

        emit FundsRescued(swapId, amount);
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
     * @dev Fallback function to accept ETH
     */
    receive() external payable {}
}
