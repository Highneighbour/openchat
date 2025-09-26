// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./interfaces/IDestinationHandler.sol";

/**
 * @title DestinationHandler
 * @dev Contract for handling destination chain operations (hedging, rebalancing)
 * @notice This contract executes hedging trades and rebalancing actions on the destination chain
 */
contract DestinationHandler is IDestinationHandler, Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;

    struct TradeParams {
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minAmountOut;
        uint256 deadline;
    }

    struct RebalanceParams {
        string actionType;
        uint256 amount;
        address token;
        uint256 deadline;
    }

    mapping(bytes32 => bool) public processedCallbacks;
    mapping(address => bool) public authorizedCallers;
    
    uint256 public constant MAX_SLIPPAGE = 5e16; // 5% max slippage
    uint256 public constant DEFAULT_DEADLINE = 300; // 5 minutes

    event CallbackProcessed(bytes32 indexed callbackId, bool success);
    event AuthorizedCallerUpdated(address indexed caller, bool authorized);

    constructor() {
        authorizedCallers[msg.sender] = true;
    }

    /**
     * @dev Modifier to check if caller is authorized
     */
    modifier onlyAuthorized() {
        require(authorizedCallers[msg.sender], "Not authorized caller");
        _;
    }

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
    ) external override onlyAuthorized whenNotPaused nonReentrant returns (uint256 amountOut, bytes32 txHash) {
        require(tokenIn != address(0) && tokenOut != address(0), "Invalid token addresses");
        require(tokenIn != tokenOut, "Tokens must be different");
        require(amountIn > 0, "Invalid amount");
        require(minAmountOut > 0, "Invalid min amount");

        // Check if we have enough tokens
        IERC20 tokenInContract = IERC20(tokenIn);
        require(tokenInContract.balanceOf(address(this)) >= amountIn, "Insufficient balance");

        // Calculate expected output (simplified - in real implementation, use DEX router)
        amountOut = _calculateSwapOutput(tokenIn, tokenOut, amountIn);
        require(amountOut >= minAmountOut, "Slippage too high");

        // Execute the swap (simplified - in real implementation, call DEX router)
        _executeSwap(tokenIn, tokenOut, amountIn, amountOut);

        txHash = keccak256(abi.encodePacked(positionId, tokenIn, tokenOut, amountIn, amountOut, block.timestamp));

        emit HedgingTradeExecuted(positionId, tokenIn, tokenOut, amountIn, amountOut, txHash);
    }

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
    ) external override onlyAuthorized whenNotPaused nonReentrant returns (bool success, bytes32 txHash) {
        require(amount > 0, "Invalid amount");
        require(bytes(actionType).length > 0, "Invalid action type");

        // Execute rebalancing logic based on action type
        if (keccak256(bytes(actionType)) == keccak256(bytes("partial_unwind"))) {
            success = _executePartialUnwind(positionId, amount);
        } else if (keccak256(bytes(actionType)) == keccak256(bytes("rebalance"))) {
            success = _executeRebalance(positionId, amount);
        } else {
            revert("Unsupported action type");
        }

        txHash = keccak256(abi.encodePacked(positionId, actionType, amount, block.timestamp));

        emit RebalancingExecuted(positionId, actionType, amount, txHash);
    }

    /**
     * @dev Validates a callback signature
     * @param positionId Position identifier
     * @param signature Callback signature
     * @return isValid Whether the signature is valid
     */
    function validateCallback(bytes32 positionId, bytes memory signature)
        external
        view
        override
        returns (bool isValid)
    {
        // In a real implementation, this would validate the signature from the Reactive Network
        // For now, we'll implement a simple validation
        bytes32 messageHash = keccak256(abi.encodePacked(positionId, block.chainid));
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        address signer = ethSignedMessageHash.recover(signature);
        
        return authorizedCallers[signer];
    }

    /**
     * @dev Processes a callback from the Reactive Network
     * @param callbackId Unique callback identifier
     * @param positionId Position identifier
     * @param actionData Encoded action data
     * @param signature Callback signature
     * @return success Whether the callback was processed successfully
     */
    function processCallback(
        bytes32 callbackId,
        bytes32 positionId,
        bytes memory actionData,
        bytes memory signature
    ) external onlyAuthorized returns (bool success) {
        require(!processedCallbacks[callbackId], "Callback already processed");
        require(validateCallback(positionId, signature), "Invalid callback signature");

        processedCallbacks[callbackId] = true;

        // Decode and execute the action
        (string memory actionType, uint256 amount, address token) = abi.decode(actionData, (string, uint256, address));

        if (keccak256(bytes(actionType)) == keccak256(bytes("hedge"))) {
            // Execute hedging trade
            (uint256 amountOut, bytes32 txHash) = executeHedgingTrade(
                positionId,
                token,
                address(0), // tokenOut would be determined by the hedging strategy
                amount,
                amount * 95 / 100 // 5% slippage tolerance
            );
            success = amountOut > 0;
        } else {
            // Execute rebalancing
            (success, ) = executeRebalancing(positionId, actionType, amount);
        }

        emit CallbackProcessed(callbackId, success);
    }

    /**
     * @dev Updates authorized caller status
     * @param caller Address to update
     * @param authorized Whether the caller is authorized
     */
    function updateAuthorizedCaller(address caller, bool authorized) external onlyOwner {
        authorizedCallers[caller] = authorized;
        emit AuthorizedCallerUpdated(caller, authorized);
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
     * @dev Emergency withdraw function
     * @param token Token to withdraw
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }

    /**
     * @dev Internal function to calculate swap output (simplified)
     * @param tokenIn Input token
     * @param tokenOut Output token
     * @param amountIn Input amount
     * @return amountOut Output amount
     */
    function _calculateSwapOutput(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) internal pure returns (uint256 amountOut) {
        // Simplified calculation - in real implementation, use DEX router
        // This is just a placeholder that returns 95% of input as output
        amountOut = amountIn * 95 / 100;
    }

    /**
     * @dev Internal function to execute swap (simplified)
     * @param tokenIn Input token
     * @param tokenOut Output token
     * @param amountIn Input amount
     * @param amountOut Output amount
     */
    function _executeSwap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut
    ) internal {
        // Simplified swap execution - in real implementation, call DEX router
        IERC20 tokenInContract = IERC20(tokenIn);
        IERC20 tokenOutContract = IERC20(tokenOut);
        
        // Transfer input tokens (already checked balance)
        tokenInContract.safeTransfer(address(this), amountIn);
        
        // In a real implementation, this would call a DEX router
        // For now, we'll just simulate the swap by transferring tokens
        // This is a placeholder - real implementation would use Uniswap, SushiSwap, etc.
    }

    /**
     * @dev Internal function to execute partial unwind
     * @param positionId Position identifier
     * @param amount Amount to unwind
     * @return success Whether the action was successful
     */
    function _executePartialUnwind(bytes32 positionId, uint256 amount) internal returns (bool success) {
        // Simplified partial unwind logic
        // In real implementation, this would interact with the actual position contract
        success = true;
    }

    /**
     * @dev Internal function to execute rebalance
     * @param positionId Position identifier
     * @param amount Amount to rebalance
     * @return success Whether the action was successful
     */
    function _executeRebalance(bytes32 positionId, uint256 amount) internal returns (bool success) {
        // Simplified rebalance logic
        // In real implementation, this would interact with the actual position contract
        success = true;
    }
}