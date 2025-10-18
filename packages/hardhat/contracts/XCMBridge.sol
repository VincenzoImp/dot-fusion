// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {DotFusionPolkadotEscrow} from "./PolkadotEscrow.sol";

/**
 * @title DotFusion XCM Bridge
 * @notice Bridge coordinator using XCM Precompile for cross-chain messaging
 * @dev Integrates with Polkadot's XCM Precompile for cross-chain atomic swap coordination
 * @custom:security-contact security@dotfusion.io
 */
contract DotFusionXCMBridge {
    
    // ═══════════════════════════════════════════════════════════════════
    //                              TYPES
    // ═══════════════════════════════════════════════════════════════════
    
    struct XCMMessage {
        bytes32 swapId;
        bytes32 secret;
        address targetContract;
        uint256 timestamp;
        bool processed;
    }
    
    // ═══════════════════════════════════════════════════════════════════
    //                            STORAGE
    // ═══════════════════════════════════════════════════════════════════
    
    address public immutable owner;
    DotFusionPolkadotEscrow public escrow;
    
    // XCM Precompile address on Polkadot Asset Hub
    address public constant XCM_PRECOMPILE = 0x0000000000000000000000000000000000000804;
    
    // Ethereum parachain configuration
    uint32 public constant ETHEREUM_PARACHAIN_ID = 1000; // Example ParaId for Ethereum
    address public constant ETHEREUM_ESCROW_ADDRESS = 0x0000000000000000000000000000000000000000; // To be set
    
    // Message tracking
    mapping(bytes32 => XCMMessage) public messages;
    mapping(bytes32 => bool) public processedSecrets;
    
    // Fee configuration
    uint256 public constant MIN_XCM_FEE = 0.001 ether; // Minimum fee for XCM operations
    uint256 public xcmFee = 0.01 ether; // Configurable XCM fee
    
    // ═══════════════════════════════════════════════════════════════════
    //                            EVENTS
    // ═══════════════════════════════════════════════════════════════════
    
    event MessageReceived(
        bytes32 indexed swapId,
        bytes32 indexed secretHash,
        address receiver,
        uint256 amount
    );
    
    event MessageSent(
        bytes32 indexed swapId,
        bytes32 secret,
        uint32 destination,
        uint256 fee
    );
    
    event SecretPropagated(
        bytes32 indexed swapId,
        bytes32 secret,
        address indexed ethereumEscrow
    );
    
    event BridgeConfigured(
        address indexed escrowAddress,
        address indexed ethereumEscrowAddress,
        uint32 ethereumParaId
    );
    
    event XCMFeeUpdated(
        uint256 oldFee,
        uint256 newFee
    );
    
    // ═══════════════════════════════════════════════════════════════════
    //                            ERRORS
    // ═══════════════════════════════════════════════════════════════════
    
    error Unauthorized();
    error InvalidAddress();
    error EscrowNotSet();
    error InsufficientFee();
    error MessageAlreadyProcessed();
    error InvalidParaId();
    error XCMCallFailed();
    error SecretAlreadyPropagated();
    
    // ═══════════════════════════════════════════════════════════════════
    //                            MODIFIERS
    // ═══════════════════════════════════════════════════════════════════
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }
    
    modifier onlyEscrow() {
        if (msg.sender != address(escrow)) revert Unauthorized();
        _;
    }
    
    // ═══════════════════════════════════════════════════════════════════
    //                          CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════
    
    constructor() {
        owner = msg.sender;
    }
    
    // ═══════════════════════════════════════════════════════════════════
    //                        EXTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * @notice Configure the bridge with escrow and Ethereum parachain details
     * @param _escrow Address of the Polkadot escrow contract
     * @param _ethereumEscrow Address of the Ethereum escrow contract
     * @param _ethereumParaId ParaId of the Ethereum parachain
     */
    function configureBridge(
        address _escrow,
        address _ethereumEscrow,
        uint32 _ethereumParaId
    ) external onlyOwner {
        if (_escrow == address(0)) revert InvalidAddress();
        if (_ethereumEscrow == address(0)) revert InvalidAddress();
        if (_ethereumParaId == 0) revert InvalidParaId();
        
        escrow = DotFusionPolkadotEscrow(payable(_escrow));
        
        emit BridgeConfigured(_escrow, _ethereumEscrow, _ethereumParaId);
    }
    
    /**
     * @notice Update XCM fee for cross-chain operations
     * @param _newFee New fee amount in wei
     */
    function updateXCMFee(uint256 _newFee) external onlyOwner {
        if (_newFee < MIN_XCM_FEE) revert InsufficientFee();
        
        uint256 oldFee = xcmFee;
        xcmFee = _newFee;
        
        emit XCMFeeUpdated(oldFee, _newFee);
    }
    
    /**
     * @notice Receive cross-chain message from Ethereum
     * @param swapId Unique swap identifier from Ethereum
     * @param secretHash Hash of the secret
     * @param receiver Receiver address on Polkadot
     * @param ethereumSender Original sender on Ethereum
     */
    function receiveFromEthereum(
        bytes32 swapId,
        bytes32 secretHash,
        address payable receiver,
        bytes32 ethereumSender
    ) external payable {
        if (address(escrow) == address(0)) revert EscrowNotSet();
        
        // Forward to escrow with value
        escrow.receiveSwap{value: msg.value}(
            swapId,
            secretHash,
            receiver,
            msg.value,
            ethereumSender
        );
        
        emit MessageReceived(swapId, secretHash, receiver, msg.value);
    }
    
    /**
     * @notice Send revealed secret back to Ethereum via XCM
     * @param swapId Swap identifier
     * @param secret Revealed secret
     * @dev This function uses the XCM Precompile to send cross-chain messages
     */
    function sendToEthereum(
        bytes32 swapId,
        bytes32 secret
    ) external payable {
        if (msg.value < xcmFee) revert InsufficientFee();
        if (processedSecrets[secret]) revert SecretAlreadyPropagated();
        
        // Mark secret as processed to prevent double-propagation
        processedSecrets[secret] = true;
        
        // Store message for tracking
        messages[swapId] = XCMMessage({
            swapId: swapId,
            secret: secret,
            targetContract: ETHEREUM_ESCROW_ADDRESS,
            timestamp: block.timestamp,
            processed: false
        });
        
        // Prepare XCM message for Ethereum parachain
        bytes memory xcmMessage = _buildXCMMessage(swapId, secret);
        
        // Call XCM Precompile to send message to Ethereum parachain
        (bool success, ) = XCM_PRECOMPILE.call{value: xcmFee}(
            abi.encodeWithSignature(
                "send(uint32,bytes,uint64)",
                ETHEREUM_PARACHAIN_ID,
                xcmMessage,
                uint64(1000000) // Weight limit
            )
        );
        
        if (!success) {
            // Revert the secret processing if XCM fails
            processedSecrets[secret] = false;
            delete messages[swapId];
            revert XCMCallFailed();
        }
        
        // Mark message as processed
        messages[swapId].processed = true;
        
        emit MessageSent(swapId, secret, ETHEREUM_PARACHAIN_ID, xcmFee);
        emit SecretPropagated(swapId, secret, ETHEREUM_ESCROW_ADDRESS);
        
        // Return excess fee to sender
        if (msg.value > xcmFee) {
            (bool refundSuccess, ) = payable(msg.sender).call{value: msg.value - xcmFee}("");
            require(refundSuccess, "Fee refund failed");
        }
    }
    
    /**
     * @notice Alternative method to propagate secret (called by escrow)
     * @param swapId Swap identifier
     * @param secret Revealed secret
     */
    function propagateSecret(
        bytes32 swapId,
        bytes32 secret
    ) external onlyEscrow {
        if (processedSecrets[secret]) revert SecretAlreadyPropagated();
        
        // Mark secret as processed
        processedSecrets[secret] = true;
        
        // Store message for tracking
        messages[swapId] = XCMMessage({
            swapId: swapId,
            secret: secret,
            targetContract: ETHEREUM_ESCROW_ADDRESS,
            timestamp: block.timestamp,
            processed: false
        });
        
        // Prepare and send XCM message
        bytes memory xcmMessage = _buildXCMMessage(swapId, secret);
        
        (bool success, ) = XCM_PRECOMPILE.call{value: xcmFee}(
            abi.encodeWithSignature(
                "send(uint32,bytes,uint64)",
                ETHEREUM_PARACHAIN_ID,
                xcmMessage,
                uint64(1000000)
            )
        );
        
        if (!success) {
            processedSecrets[secret] = false;
            delete messages[swapId];
            revert XCMCallFailed();
        }
        
        messages[swapId].processed = true;
        
        emit MessageSent(swapId, secret, ETHEREUM_PARACHAIN_ID, xcmFee);
        emit SecretPropagated(swapId, secret, ETHEREUM_ESCROW_ADDRESS);
    }
    
    /**
     * @notice Get message details
     * @param swapId Swap identifier
     * @return message XCM message struct
     */
    function getMessage(bytes32 swapId) external view returns (XCMMessage memory message) {
        return messages[swapId];
    }
    
    /**
     * @notice Check if secret has been propagated
     * @param secret Secret to check
     * @return propagated True if secret has been propagated
     */
    function isSecretPropagated(bytes32 secret) external view returns (bool propagated) {
        return processedSecrets[secret];
    }
    
    // ═══════════════════════════════════════════════════════════════════
    //                        INTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * @notice Build XCM message payload for Ethereum parachain
     * @param swapId Swap identifier
     * @param secret Revealed secret
     * @return xcmMessage Encoded XCM message
     */
    function _buildXCMMessage(
        bytes32 swapId,
        bytes32 secret
    ) internal pure returns (bytes memory xcmMessage) {
        // XCM message format for calling Ethereum escrow contract
        // This would typically include:
        // 1. Transact instruction to call Ethereum escrow
        // 2. CompleteSwap function call with swapId and secret
        // 3. Weight limits and fee payment
        
        return abi.encode(
            // XCM Transact instruction
            uint8(0x02), // Transact instruction
            uint64(1000000), // Weight limit
            uint8(0x00), // Require weight at most
            // Encoded call to Ethereum escrow
            abi.encodeWithSignature(
                "completeSwap(bytes32,bytes32)",
                swapId,
                secret
            )
        );
    }
    
    /**
     * @notice Emergency function to withdraw accumulated fees
     */
    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            (bool success, ) = payable(owner).call{value: balance}("");
            require(success, "Withdrawal failed");
        }
    }
    
    /**
     * @notice Receive ETH for XCM fees
     */
    receive() external payable {}
}
