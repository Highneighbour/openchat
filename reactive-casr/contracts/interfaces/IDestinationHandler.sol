// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IDestinationHandler
 * @dev Interface for destination chain handler contracts
 */
interface IDestinationHandler {
    /**
     * @dev Emitted when a hedging trade is executed
     * @param positionId Original position identifier
     * @param tokenIn Input token address
     * @param tokenOut Output token address
     * @param amountIn Amount of input token
     * @param amountOut Amount of output token
     * @param txHash Transaction hash of the trade
     */
    event HedgingTradeExecuted(
        bytes32 indexed positionId,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        bytes32 txHash
    );

    /**
     * @dev Emitted when a rebalancing action is executed
     * @param positionId Original position identifier
     * @param actionType Type of rebalancing action
     * @param amount Amount involved in the action
     * @param txHash Transaction hash of the action
     */
    event RebalancingExecuted(
        bytes32 indexed positionId,
        string actionType,
        uint256 amount,
        bytes32 txHash
    );

    /**
     * @dev Executes a hedging trade
     * @param positionId Original position identifier
     * @param tokenIn Input token address
     * @param tokenOut Output token address
     * @param amountIn Amount of input token
     * @param minAmountOut Minimum amount of output token expected
     * @return amountOut Actual amount of output token received
     * @return txHash Transaction hash of the trade
     */
    function executeHedgingTrade(
        bytes32 positionId,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut
    ) external returns (uint256 amountOut, bytes32 txHash);

    /**
     * @dev Executes a rebalancing action
     * @param positionId Original position identifier
     * @param actionType Type of action (partial_unwind, rebalance)
     * @param amount Amount to rebalance
     * @return success Whether the action was successful
     * @return txHash Transaction hash of the action
     */
    function executeRebalancing(
        bytes32 positionId,
        string memory actionType,
        uint256 amount
    ) external returns (bool success, bytes32 txHash);

    /**
     * @dev Validates a callback signature
     * @param positionId Position identifier
     * @param signature Callback signature
     * @return isValid Whether the signature is valid
     */
    function validateCallback(bytes32 positionId, bytes memory signature)
        external
        view
        returns (bool isValid);
}