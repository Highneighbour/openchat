// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IReactiveManager
 * @dev Interface for the Reactive Manager contract that handles cross-chain automated stop-rebalance
 */
interface IReactiveManager {
    /**
     * @dev Emitted when a position is created
     * @param positionId Unique identifier for the position
     * @param user Address of the user who created the position
     * @param originChainId Chain ID where the position exists
     * @param originContract Address of the origin contract
     * @param threshold Threshold value for triggering rebalance
     * @param actionType Type of action to perform (partial_unwind, rebalance, hedge)
     */
    event PositionCreated(
        bytes32 indexed positionId,
        address indexed user,
        uint256 originChainId,
        address originContract,
        uint256 threshold,
        string actionType
    );

    /**
     * @dev Emitted when a position is updated
     * @param positionId Unique identifier for the position
     * @param newThreshold New threshold value
     * @param newActionType New action type
     */
    event PositionUpdated(
        bytes32 indexed positionId,
        uint256 newThreshold,
        string newActionType
    );

    /**
     * @dev Emitted when a reactive action is triggered
     * @param positionId Position that triggered the action
     * @param originTxHash Hash of the origin transaction
     * @param destTxHash Hash of the destination transaction
     * @param gasUsed Amount of gas used for the reactive action
     */
    event ReactiveActionTriggered(
        bytes32 indexed positionId,
        bytes32 originTxHash,
        bytes32 destTxHash,
        uint256 gasUsed
    );

    /**
     * @dev Emitted when a callback is processed
     * @param positionId Position associated with the callback
     * @param success Whether the callback was successful
     * @param gasUsed Gas used for the callback execution
     */
    event CallbackProcessed(
        bytes32 indexed positionId,
        bool success,
        uint256 gasUsed
    );

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
    ) external payable returns (bytes32 positionId);

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
    ) external;

    /**
     * @dev Reacts to an incoming event (called by Reactive Network)
     * @param log The log record containing event data
     */
    function react(bytes calldata log) external;

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
        returns (
            address user,
            uint256 originChainId,
            address originContract,
            uint256 threshold,
            string memory actionType,
            uint256 gasBudget,
            bool isActive
        );
}