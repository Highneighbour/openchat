// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IOriginPosition
 * @dev Interface for origin chain position contracts
 */
interface IOriginPosition {
    /**
     * @dev Emitted when a position is created
     * @param positionId Unique identifier for the position
     * @param user Address of the user who created the position
     * @param token0 First token in the position
     * @param token1 Second token in the position
     * @param amount0 Amount of token0
     * @param amount1 Amount of token1
     * @param price Current price ratio
     */
    event PositionCreated(
        bytes32 indexed positionId,
        address indexed user,
        address token0,
        address token1,
        uint256 amount0,
        uint256 amount1,
        uint256 price
    );

    /**
     * @dev Emitted when position price changes significantly
     * @param positionId Position identifier
     * @param oldPrice Previous price
     * @param newPrice New price
     * @param priceChange Percentage change in price
     */
    event PriceUpdate(
        bytes32 indexed positionId,
        uint256 oldPrice,
        uint256 newPrice,
        int256 priceChange
    );

    /**
     * @dev Emitted when liquidity changes
     * @param positionId Position identifier
     * @param oldLiquidity Previous liquidity amount
     * @param newLiquidity New liquidity amount
     * @param liquidityChange Change in liquidity
     */
    event LiquidityUpdate(
        bytes32 indexed positionId,
        uint256 oldLiquidity,
        uint256 newLiquidity,
        int256 liquidityChange
    );

    /**
     * @dev Creates a new position
     * @param token0 First token address
     * @param token1 Second token address
     * @param amount0 Amount of token0 to deposit
     * @param amount1 Amount of token1 to deposit
     * @return positionId Unique identifier for the position
     */
    function createPosition(
        address token0,
        address token1,
        uint256 amount0,
        uint256 amount1
    ) external returns (bytes32 positionId);

    /**
     * @dev Updates position price (called by oracle or price feed)
     * @param positionId Position to update
     * @param newPrice New price value
     */
    function updatePrice(bytes32 positionId, uint256 newPrice) external;

    /**
     * @dev Updates position liquidity
     * @param positionId Position to update
     * @param newLiquidity New liquidity amount
     */
    function updateLiquidity(bytes32 positionId, uint256 newLiquidity) external;

    /**
     * @dev Gets position details
     * @param positionId Position identifier
     * @return user Position owner
     * @return token0 First token
     * @return token1 Second token
     * @return amount0 Amount of token0
     * @return amount1 Amount of token1
     * @return currentPrice Current price
     * @return liquidity Current liquidity
     */
    function getPosition(bytes32 positionId)
        external
        view
        returns (
            address user,
            address token0,
            address token1,
            uint256 amount0,
            uint256 amount1,
            uint256 currentPrice,
            uint256 liquidity
        );
}