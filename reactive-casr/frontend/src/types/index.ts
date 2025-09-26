export interface Position {
  id: string;
  userId: string;
  positionId: string;
  originChainId: number;
  originContract: string;
  originToken?: string;
  positionIdentifier: string;
  threshold: number;
  actionType: 'partial_unwind' | 'rebalance' | 'hedge';
  gasBudget: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReactiveLog {
  id: string;
  positionId: string;
  reactiveTxHash?: string;
  originTxHash?: string;
  destTxHash?: string;
  gasUsed?: number;
  status: 'pending' | 'success' | 'failed';
  payload?: any;
  createdAt: string;
}

export interface PositionEvent {
  id: string;
  positionId: string;
  eventType: 'created' | 'price_update' | 'liquidity_update' | 'threshold_breach';
  eventData?: any;
  originTxHash?: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  userId: string;
  positionId?: string;
  amount: number;
  currency: 'REACT' | 'ETH' | 'USDC';
  txHash?: string;
  status: 'pending' | 'confirmed' | 'failed';
  createdAt: string;
}

export interface WalletState {
  address: string | null;
  chainId: number | null;
  isConnected: boolean;
  isConnecting: boolean;
}

export interface User {
  id: string;
  email: string;
  walletAddress?: string;
  createdAt: string;
}

export interface ContractAddresses {
  originPosition: string;
  destinationHandler: string;
  reactiveManager: string;
}

export interface NetworkConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  explorerUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}