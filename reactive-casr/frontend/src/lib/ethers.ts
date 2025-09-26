import { ethers } from 'ethers'

export interface NetworkConfig {
  chainId: number
  name: string
  rpcUrl: string
  explorerUrl: string
  nativeCurrency: {
    name: string
    symbol: string
    decimals: number
  }
}

export const NETWORKS: Record<string, NetworkConfig> = {
  'reactive-mainnet': {
    chainId: 1597,
    name: 'Reactive Mainnet',
    rpcUrl: 'https://rpc.reactive.network',
    explorerUrl: 'https://explorer.reactive.network',
    nativeCurrency: {
      name: 'REACT',
      symbol: 'REACT',
      decimals: 18
    }
  },
  'lasna-testnet': {
    chainId: 1596,
    name: 'Lasna Testnet',
    rpcUrl: 'https://rpc.lasna.reactive.network',
    explorerUrl: 'https://explorer.lasna.reactive.network',
    nativeCurrency: {
      name: 'REACT',
      symbol: 'REACT',
      decimals: 18
    }
  }
}

export const getNetworkConfig = (chainId: number): NetworkConfig | null => {
  return Object.values(NETWORKS).find(network => network.chainId === chainId) || null
}

export const addNetworkToWallet = async (networkConfig: NetworkConfig) => {
  if (!window.ethereum) {
    throw new Error('MetaMask not detected')
  }

  try {
    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: `0x${networkConfig.chainId.toString(16)}`,
        chainName: networkConfig.name,
        nativeCurrency: networkConfig.nativeCurrency,
        rpcUrls: [networkConfig.rpcUrl],
        blockExplorerUrls: [networkConfig.explorerUrl]
      }]
    })
  } catch (error: any) {
    if (error.code === 4902) {
      // Chain not added, try to add it
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: `0x${networkConfig.chainId.toString(16)}`,
          chainName: networkConfig.name,
          nativeCurrency: networkConfig.nativeCurrency,
          rpcUrls: [networkConfig.rpcUrl],
          blockExplorerUrls: [networkConfig.explorerUrl]
        }]
      })
    } else {
      throw error
    }
  }
}

export const connectWallet = async (): Promise<{
  address: string
  chainId: number
  provider: ethers.BrowserProvider
}> => {
  if (!window.ethereum) {
    throw new Error('MetaMask not detected')
  }

  const provider = new ethers.BrowserProvider(window.ethereum)
  const accounts = await provider.send('eth_requestAccounts', [])
  const network = await provider.getNetwork()
  
  return {
    address: accounts[0],
    chainId: Number(network.chainId),
    provider
  }
}

export const getWalletProvider = (): ethers.BrowserProvider | null => {
  if (!window.ethereum) {
    return null
  }
  return new ethers.BrowserProvider(window.ethereum)
}

export const formatAddress = (address: string): string => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export const formatBalance = (balance: string, decimals: number = 18): string => {
  return ethers.formatUnits(balance, decimals)
}

export const parseBalance = (balance: string, decimals: number = 18): string => {
  return ethers.parseUnits(balance, decimals).toString()
}

// Contract ABI fragments for the main functions we need
export const REACTIVE_MANAGER_ABI = [
  'function createPosition(uint256 originChainId, address originContract, address originToken, string memory positionIdentifier, uint256 threshold, string memory actionType, uint256 gasBudget) external payable returns (bytes32 positionId)',
  'function updatePosition(bytes32 positionId, uint256 newThreshold, string memory newActionType, uint256 newGasBudget) external',
  'function getPosition(bytes32 positionId) external view returns (address user, uint256 originChainId, address originContract, uint256 threshold, string memory actionType, uint256 gasBudget, bool isActive)',
  'function getUserPositions(address user) external view returns (bytes32[] memory)',
  'function deactivatePosition(bytes32 positionId) external',
  'function updateGasBudget(bytes32 positionId, uint256 newGasBudget) external payable',
  'event PositionCreated(bytes32 indexed positionId, address indexed user, uint256 originChainId, address originContract, uint256 threshold, string actionType)',
  'event PositionUpdated(bytes32 indexed positionId, uint256 newThreshold, string newActionType)',
  'event ReactiveActionTriggered(bytes32 indexed positionId, bytes32 originTxHash, bytes32 destTxHash, uint256 gasUsed)',
  'event CallbackEmitted(bytes32 indexed positionId, uint256 destChainId, address destContract, bytes callData)'
]

export const ORIGIN_POSITION_ABI = [
  'function createPosition(address token0, address token1, uint256 amount0, uint256 amount1) external returns (bytes32 positionId)',
  'function getPosition(bytes32 positionId) external view returns (address user, address token0, address token1, uint256 amount0, uint256 amount1, uint256 currentPrice, uint256 liquidity)',
  'function getUserPositions(address user) external view returns (bytes32[] memory)',
  'function closePosition(bytes32 positionId) external',
  'event PositionCreated(bytes32 indexed positionId, address indexed user, address token0, address token1, uint256 amount0, uint256 amount1, uint256 price)',
  'event PriceUpdate(bytes32 indexed positionId, uint256 oldPrice, uint256 newPrice, int256 priceChange)',
  'event LiquidityUpdate(bytes32 indexed positionId, uint256 oldLiquidity, uint256 newLiquidity, int256 liquidityChange)'
]

export const DESTINATION_HANDLER_ABI = [
  'function executeHedgingTrade(bytes32 positionId, address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut) external returns (uint256 amountOut, bytes32 txHash)',
  'function executeRebalancing(bytes32 positionId, string memory actionType, uint256 amount) external returns (bool success, bytes32 txHash)',
  'function processCallback(bytes32 callbackId, bytes32 positionId, bytes memory actionData, bytes memory signature) external returns (bool success)',
  'event HedgingTradeExecuted(bytes32 indexed positionId, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut, bytes32 txHash)',
  'event RebalancingExecuted(bytes32 indexed positionId, string actionType, uint256 amount, bytes32 txHash)',
  'event CallbackProcessed(bytes32 indexed callbackId, bool success)'
]