// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./interfaces/IReactiveManager.sol";
import "./interfaces/IOriginPosition.sol";
import "./interfaces/IDestinationHandler.sol";

/**
 * @title ReactiveManager
 * @dev Main contract for managing reactive smart contract workflows
 * @notice This contract implements the core reactive logic for cross-chain automated stop-rebalance
 */
contract ReactiveManager is IReactiveManager, Ownable, Pausable, ReentrancyGuard {
    using ECDSA for bytes32;

    struct Position {
        address user;
        uint256 originChainId;
        address originContract;
        address originToken;
        string positionIdentifier;
        uint256 threshold;
        string actionType;
        uint256 gasBudget;
        bool isActive;
        uint256 createdAt;
        uint256 lastTriggered;
    }

    struct CallbackRequest {
        uint256 destChainId;
        address destContract;
        bytes callData;
        uint256 gasLimit;
        uint256 value;
    }

    mapping(bytes32 => Position) public positions;
    mapping(address => bytes32[]) public userPositions;
    mapping(bytes32 => bool) public processedEvents;
    
    address public originPositionContract;
    address public destinationHandlerContract;
    uint256 public destinationChainId;
    
    uint256 public totalPositions;
    uint256 public totalReactiveActions;
    uint256 public totalGasUsed;
    
    // Reactive Network system contract (placeholder - would be the actual system contract address)
    address public constant REACTIVE_SYSTEM = address(0x0000000000000000000000000000000000000001);
    
    // Event signatures for subscription
    bytes32 public constant POSITION_CREATED_SIGNATURE = keccak256("PositionCreated(bytes32,address,address,address,uint256,uint256,uint256)");
    bytes32 public constant PRICE_UPDATE_SIGNATURE = keccak256("PriceUpdate(bytes32,uint256,uint256,int256)");
    bytes32 public constant LIQUIDITY_UPDATE_SIGNATURE = keccak256("LiquidityUpdate(bytes32,uint256,uint256,int256)");

    event SubscriptionRegistered(bytes32 indexed subscriptionId, address indexed contractAddress, bytes32 indexed eventSignature);
    event CallbackEmitted(bytes32 indexed positionId, uint256 destChainId, address destContract, bytes callData);
    event GasBudgetUpdated(bytes32 indexed positionId, uint256 newGasBudget);
    event PositionDeactivated(bytes32 indexed positionId, address indexed user);

    constructor(
        address _originPositionContract,
        address _destinationHandlerContract,
        uint256 _destinationChainId
    ) {
        originPositionContract = _originPositionContract;
        destinationHandlerContract = _destinationHandlerContract;
        destinationChainId = _destinationChainId;
        
        // Register subscriptions in constructor
        _registerSubscriptions();
    }

    /**
     * @dev Creates a new position to monitor
     * @param originChainId Chain ID where the position exists
     * @param originContract Address of the origin contract
     * @param originToken Token address (if applicable)
     * @param positionIdentifier Unique identifier for the position
     * @param threshold Threshold value for triggering rebalance
     * @param actionType Type of action to perform
     * @param gasBudget Maximum gas budget for reactive actions
     * @return positionId Unique identifier for the created position
     */
    function createPosition(
        uint256 originChainId,
        address originContract,
        address originToken,
        string memory positionIdentifier,
        uint256 threshold,
        string memory actionType,
        uint256 gasBudget
    ) external payable override whenNotPaused nonReentrant returns (bytes32 positionId) {
        require(originContract != address(0), "Invalid origin contract");
        require(threshold > 0, "Invalid threshold");
        require(bytes(actionType).length > 0, "Invalid action type");
        require(gasBudget > 0, "Invalid gas budget");
        require(msg.value >= gasBudget, "Insufficient gas payment");

        positionId = keccak256(
            abi.encodePacked(
                msg.sender,
                originChainId,
                originContract,
                positionIdentifier,
                threshold,
                actionType,
                block.timestamp,
                block.number
            )
        );

        positions[positionId] = Position({
            user: msg.sender,
            originChainId: originChainId,
            originContract: originContract,
            originToken: originToken,
            positionIdentifier: positionIdentifier,
            threshold: threshold,
            actionType: actionType,
            gasBudget: gasBudget,
            isActive: true,
            createdAt: block.timestamp,
            lastTriggered: 0
        });

        userPositions[msg.sender].push(positionId);
        totalPositions++;

        emit PositionCreated(
            positionId,
            msg.sender,
            originChainId,
            originContract,
            threshold,
            actionType
        );
    }

    /**
     * @dev Updates an existing position
     * @param positionId Position to update
     * @param newThreshold New threshold value
     * @param newActionType New action type
     * @param newGasBudget New gas budget
     */
    function updatePosition(
        bytes32 positionId,
        uint256 newThreshold,
        string memory newActionType,
        uint256 newGasBudget
    ) external override whenNotPaused {
        Position storage position = positions[positionId];
        require(position.isActive, "Position not active");
        require(position.user == msg.sender, "Not position owner");
        require(newThreshold > 0, "Invalid threshold");
        require(bytes(newActionType).length > 0, "Invalid action type");

        position.threshold = newThreshold;
        position.actionType = newActionType;
        position.gasBudget = newGasBudget;

        emit PositionUpdated(positionId, newThreshold, newActionType);
    }

    /**
     * @dev Reacts to an incoming event (called by Reactive Network)
     * @param log The log record containing event data
     */
    function react(bytes calldata log) external override whenNotPaused {
        require(msg.sender == REACTIVE_SYSTEM, "Only Reactive Network can call react");
        
        // Parse the log data
        (bytes32 eventSignature, bytes32 positionId, bytes memory eventData) = _parseLog(log);
        
        // Check if we've already processed this event
        bytes32 eventHash = keccak256(abi.encodePacked(eventSignature, positionId, eventData));
        require(!processedEvents[eventHash], "Event already processed");
        processedEvents[eventHash] = true;

        // Get position details
        Position memory position = positions[positionId];
        require(position.isActive, "Position not active");

        // Process the event based on its type
        if (eventSignature == PRICE_UPDATE_SIGNATURE) {
            _handlePriceUpdate(positionId, eventData);
        } else if (eventSignature == LIQUIDITY_UPDATE_SIGNATURE) {
            _handleLiquidityUpdate(positionId, eventData);
        } else if (eventSignature == POSITION_CREATED_SIGNATURE) {
            _handlePositionCreated(positionId, eventData);
        }
    }

    /**
     * @dev Gets position details
     * @param positionId Position identifier
     * @return user Address of the position owner
     * @return originChainId Chain ID where position exists
     * @return originContract Address of origin contract
     * @return threshold Threshold value
     * @return actionType Action type
     * @return gasBudget Gas budget
     * @return isActive Whether position is active
     */
    function getPosition(bytes32 positionId)
        external
        view
        override
        returns (
            address user,
            uint256 originChainId,
            address originContract,
            uint256 threshold,
            string memory actionType,
            uint256 gasBudget,
            bool isActive
        )
    {
        Position memory position = positions[positionId];
        return (
            position.user,
            position.originChainId,
            position.originContract,
            position.threshold,
            position.actionType,
            position.gasBudget,
            position.isActive
        );
    }

    /**
     * @dev Gets all positions for a user
     * @param user User address
     * @return Array of position IDs
     */
    function getUserPositions(address user) external view returns (bytes32[] memory) {
        return userPositions[user];
    }

    /**
     * @dev Deactivates a position
     * @param positionId Position to deactivate
     */
    function deactivatePosition(bytes32 positionId) external {
        Position storage position = positions[positionId];
        require(position.isActive, "Position not active");
        require(position.user == msg.sender || msg.sender == owner(), "Not authorized");

        position.isActive = false;
        emit PositionDeactivated(positionId, position.user);
    }

    /**
     * @dev Updates gas budget for a position
     * @param positionId Position to update
     * @param newGasBudget New gas budget
     */
    function updateGasBudget(bytes32 positionId, uint256 newGasBudget) external payable {
        Position storage position = positions[positionId];
        require(position.isActive, "Position not active");
        require(position.user == msg.sender, "Not position owner");
        require(newGasBudget > 0, "Invalid gas budget");
        require(msg.value >= newGasBudget, "Insufficient gas payment");

        position.gasBudget = newGasBudget;
        emit GasBudgetUpdated(positionId, newGasBudget);
    }

    /**
     * @dev Pauses the contract
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpauses the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Withdraws accumulated gas fees (owner only)
     */
    function withdrawGasFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        payable(owner()).transfer(balance);
    }

    /**
     * @dev Internal function to register subscriptions with Reactive Network
     */
    function _registerSubscriptions() internal {
        // Register subscription for PositionCreated events
        bytes32 subscriptionId1 = keccak256(abi.encodePacked(
            originPositionContract,
            POSITION_CREATED_SIGNATURE,
            block.timestamp
        ));
        emit SubscriptionRegistered(subscriptionId1, originPositionContract, POSITION_CREATED_SIGNATURE);

        // Register subscription for PriceUpdate events
        bytes32 subscriptionId2 = keccak256(abi.encodePacked(
            originPositionContract,
            PRICE_UPDATE_SIGNATURE,
            block.timestamp
        ));
        emit SubscriptionRegistered(subscriptionId2, originPositionContract, PRICE_UPDATE_SIGNATURE);

        // Register subscription for LiquidityUpdate events
        bytes32 subscriptionId3 = keccak256(abi.encodePacked(
            originPositionContract,
            LIQUIDITY_UPDATE_SIGNATURE,
            block.timestamp
        ));
        emit SubscriptionRegistered(subscriptionId3, originPositionContract, LIQUIDITY_UPDATE_SIGNATURE);
    }

    /**
     * @dev Internal function to parse log data
     * @param log Raw log data
     * @return eventSignature Event signature
     * @return positionId Position identifier
     * @return eventData Event data
     */
    function _parseLog(bytes calldata log) internal pure returns (bytes32 eventSignature, bytes32 positionId, bytes memory eventData) {
        // Simplified log parsing - in real implementation, this would parse the actual log structure
        require(log.length >= 64, "Invalid log data");
        
        eventSignature = bytes32(log[0:32]);
        positionId = bytes32(log[32:64]);
        eventData = log[64:];
    }

    /**
     * @dev Internal function to handle price update events
     * @param positionId Position identifier
     * @param eventData Event data
     */
    function _handlePriceUpdate(bytes32 positionId, bytes memory eventData) internal {
        Position storage position = positions[positionId];
        
        // Decode event data (oldPrice, newPrice, priceChange)
        (uint256 oldPrice, uint256 newPrice, int256 priceChange) = abi.decode(eventData, (uint256, uint256, int256));
        
        // Check if price change exceeds threshold
        uint256 absPriceChange = uint256(priceChange < 0 ? -priceChange : priceChange);
        if (absPriceChange >= position.threshold) {
            _triggerReactiveAction(positionId, "price_threshold_exceeded", abi.encode(oldPrice, newPrice, priceChange));
        }
    }

    /**
     * @dev Internal function to handle liquidity update events
     * @param positionId Position identifier
     * @param eventData Event data
     */
    function _handleLiquidityUpdate(bytes32 positionId, bytes memory eventData) internal {
        Position storage position = positions[positionId];
        
        // Decode event data (oldLiquidity, newLiquidity, liquidityChange)
        (uint256 oldLiquidity, uint256 newLiquidity, int256 liquidityChange) = abi.decode(eventData, (uint256, uint256, int256));
        
        // Check if liquidity change exceeds threshold
        uint256 absLiquidityChange = uint256(liquidityChange < 0 ? -liquidityChange : liquidityChange);
        if (absLiquidityChange >= position.threshold) {
            _triggerReactiveAction(positionId, "liquidity_threshold_exceeded", abi.encode(oldLiquidity, newLiquidity, liquidityChange));
        }
    }

    /**
     * @dev Internal function to handle position created events
     * @param positionId Position identifier
     * @param eventData Event data
     */
    function _handlePositionCreated(bytes32 positionId, bytes memory eventData) internal {
        // Log the position creation for tracking
        emit ReactiveActionTriggered(positionId, bytes32(0), bytes32(0), 0);
    }

    /**
     * @dev Internal function to trigger reactive action
     * @param positionId Position identifier
     * @param triggerReason Reason for triggering
     * @param triggerData Additional trigger data
     */
    function _triggerReactiveAction(bytes32 positionId, string memory triggerReason, bytes memory triggerData) internal {
        Position storage position = positions[positionId];
        
        // Update last triggered timestamp
        position.lastTriggered = block.timestamp;
        totalReactiveActions++;

        // Create callback request
        CallbackRequest memory callback = CallbackRequest({
            destChainId: destinationChainId,
            destContract: destinationHandlerContract,
            callData: abi.encodeWithSignature(
                "processCallback(bytes32,bytes32,bytes,bytes)",
                keccak256(abi.encodePacked(positionId, block.timestamp)),
                positionId,
                abi.encode(position.actionType, position.threshold, position.originToken),
                new bytes(0) // signature would be provided by Reactive Network
            ),
            gasLimit: position.gasBudget,
            value: 0
        });

        // Emit callback event for Reactive Network to process
        emit CallbackEmitted(positionId, callback.destChainId, callback.destContract, callback.callData);
        
        // Emit reactive action triggered event
        emit ReactiveActionTriggered(
            positionId,
            bytes32(0), // originTxHash would be from the actual event
            bytes32(0), // destTxHash would be from the callback execution
            position.gasBudget
        );
        
        totalGasUsed += position.gasBudget;
    }
}