// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IOriginPosition.sol";

/**
 * @title OriginPosition
 * @dev Contract for managing positions on the origin chain
 * @notice This contract represents positions that can be monitored for automated rebalancing
 */
contract OriginPosition is IOriginPosition, Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Position {
        address user;
        address token0;
        address token1;
        uint256 amount0;
        uint256 amount1;
        uint256 currentPrice;
        uint256 liquidity;
        uint256 createdAt;
        bool isActive;
    }

    mapping(bytes32 => Position) public positions;
    mapping(address => bytes32[]) public userPositions;
    
    uint256 public totalPositions;
    uint256 public constant PRICE_PRECISION = 1e18;
    uint256 public constant MAX_PRICE_CHANGE = 50e16; // 50% max price change per update

    event PositionClosed(bytes32 indexed positionId, address indexed user);
    event EmergencyWithdraw(bytes32 indexed positionId, address indexed user);

    constructor() {}

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
    ) external override whenNotPaused nonReentrant returns (bytes32 positionId) {
        require(token0 != address(0) && token1 != address(0), "Invalid token addresses");
        require(token0 != token1, "Tokens must be different");
        require(amount0 > 0 && amount1 > 0, "Amounts must be positive");

        // Transfer tokens from user
        IERC20(token0).safeTransferFrom(msg.sender, address(this), amount0);
        IERC20(token1).safeTransferFrom(msg.sender, address(this), amount1);

        // Calculate initial price (amount1 / amount0)
        uint256 initialPrice = (amount1 * PRICE_PRECISION) / amount0;
        uint256 initialLiquidity = amount0 + amount1; // Simplified liquidity calculation

        positionId = keccak256(
            abi.encodePacked(
                msg.sender,
                token0,
                token1,
                amount0,
                amount1,
                block.timestamp,
                block.number
            )
        );

        positions[positionId] = Position({
            user: msg.sender,
            token0: token0,
            token1: token1,
            amount0: amount0,
            amount1: amount1,
            currentPrice: initialPrice,
            liquidity: initialLiquidity,
            createdAt: block.timestamp,
            isActive: true
        });

        userPositions[msg.sender].push(positionId);
        totalPositions++;

        emit PositionCreated(
            positionId,
            msg.sender,
            token0,
            token1,
            amount0,
            amount1,
            initialPrice
        );
    }

    /**
     * @dev Updates position price (called by oracle or price feed)
     * @param positionId Position to update
     * @param newPrice New price value
     */
    function updatePrice(bytes32 positionId, uint256 newPrice) external override onlyOwner {
        require(positions[positionId].isActive, "Position not active");
        require(newPrice > 0, "Invalid price");

        Position storage position = positions[positionId];
        uint256 oldPrice = position.currentPrice;
        
        // Calculate price change percentage
        int256 priceChange;
        if (newPrice > oldPrice) {
            priceChange = int256(((newPrice - oldPrice) * PRICE_PRECISION) / oldPrice);
        } else {
            priceChange = -int256(((oldPrice - newPrice) * PRICE_PRECISION) / oldPrice);
        }

        // Prevent extreme price changes in single update
        require(
            uint256(abs(priceChange)) <= MAX_PRICE_CHANGE,
            "Price change too large"
        );

        position.currentPrice = newPrice;

        emit PriceUpdate(positionId, oldPrice, newPrice, priceChange);
    }

    /**
     * @dev Updates position liquidity
     * @param positionId Position to update
     * @param newLiquidity New liquidity amount
     */
    function updateLiquidity(bytes32 positionId, uint256 newLiquidity) external override onlyOwner {
        require(positions[positionId].isActive, "Position not active");
        require(newLiquidity > 0, "Invalid liquidity");

        Position storage position = positions[positionId];
        uint256 oldLiquidity = position.liquidity;
        
        int256 liquidityChange = int256(newLiquidity) - int256(oldLiquidity);
        position.liquidity = newLiquidity;

        emit LiquidityUpdate(positionId, oldLiquidity, newLiquidity, liquidityChange);
    }

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
        override
        returns (
            address user,
            address token0,
            address token1,
            uint256 amount0,
            uint256 amount1,
            uint256 currentPrice,
            uint256 liquidity
        )
    {
        Position memory position = positions[positionId];
        return (
            position.user,
            position.token0,
            position.token1,
            position.amount0,
            position.amount1,
            position.currentPrice,
            position.liquidity
        );
    }

    /**
     * @dev Closes a position and returns tokens to user
     * @param positionId Position to close
     */
    function closePosition(bytes32 positionId) external nonReentrant {
        Position storage position = positions[positionId];
        require(position.isActive, "Position not active");
        require(position.user == msg.sender || msg.sender == owner(), "Not authorized");

        position.isActive = false;

        // Return tokens to user
        IERC20(position.token0).safeTransfer(position.user, position.amount0);
        IERC20(position.token1).safeTransfer(position.user, position.amount1);

        emit PositionClosed(positionId, position.user);
    }

    /**
     * @dev Emergency withdraw function (owner only)
     * @param positionId Position to withdraw from
     */
    function emergencyWithdraw(bytes32 positionId) external onlyOwner {
        Position storage position = positions[positionId];
        require(position.isActive, "Position not active");

        position.isActive = false;

        // Transfer tokens to owner
        IERC20(position.token0).safeTransfer(owner(), position.amount0);
        IERC20(position.token1).safeTransfer(owner(), position.amount1);

        emit EmergencyWithdraw(positionId, position.user);
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
     * @dev Helper function to get absolute value
     * @param x Input value
     * @return Absolute value
     */
    function abs(int256 x) private pure returns (int256) {
        return x >= 0 ? x : -x;
    }
}