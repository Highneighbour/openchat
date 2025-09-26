import { useState, useEffect, useCallback } from 'react'
import { ethers } from 'ethers'
import { connectWallet, getWalletProvider, getNetworkConfig, addNetworkToWallet } from '../lib/ethers'
import { WalletState } from '../types'

export const useWallet = () => {
  const [walletState, setWalletState] = useState<WalletState>({
    address: null,
    chainId: null,
    isConnected: false,
    isConnecting: false
  })

  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null)

  const connect = useCallback(async () => {
    try {
      setWalletState(prev => ({ ...prev, isConnecting: true }))
      
      const { address, chainId, provider: newProvider } = await connectWallet()
      
      setWalletState({
        address,
        chainId,
        isConnected: true,
        isConnecting: false
      })
      
      setProvider(newProvider)
      
      // Check if we're on the correct network
      const targetChainId = import.meta.env.VITE_REACTIVE_CHAIN_ID || 1597
      if (chainId !== Number(targetChainId)) {
        const networkConfig = getNetworkConfig(Number(targetChainId))
        if (networkConfig) {
          await addNetworkToWallet(networkConfig)
        }
      }
      
    } catch (error) {
      console.error('Failed to connect wallet:', error)
      setWalletState(prev => ({ ...prev, isConnecting: false }))
      throw error
    }
  }, [])

  const disconnect = useCallback(() => {
    setWalletState({
      address: null,
      chainId: null,
      isConnected: false,
      isConnecting: false
    })
    setProvider(null)
  }, [])

  const switchNetwork = useCallback(async (chainId: number) => {
    if (!window.ethereum) {
      throw new Error('MetaMask not detected')
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }]
      })
    } catch (error: any) {
      if (error.code === 4902) {
        // Chain not added, try to add it
        const networkConfig = getNetworkConfig(chainId)
        if (networkConfig) {
          await addNetworkToWallet(networkConfig)
        }
      } else {
        throw error
      }
    }
  }, [])

  // Listen for account changes
  useEffect(() => {
    if (!window.ethereum) return

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect()
      } else if (accounts[0] !== walletState.address) {
        connect()
      }
    }

    const handleChainChanged = (chainId: string) => {
      setWalletState(prev => ({
        ...prev,
        chainId: parseInt(chainId, 16)
      }))
    }

    window.ethereum.on('accountsChanged', handleAccountsChanged)
    window.ethereum.on('chainChanged', handleChainChanged)

    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
      window.ethereum.removeListener('chainChanged', handleChainChanged)
    }
  }, [walletState.address, connect, disconnect])

  // Check if wallet is already connected on mount
  useEffect(() => {
    const checkConnection = async () => {
      if (!window.ethereum) return

      try {
        const provider = getWalletProvider()
        if (!provider) return

        const accounts = await provider.listAccounts()
        if (accounts.length > 0) {
          const network = await provider.getNetwork()
          setWalletState({
            address: accounts[0].address,
            chainId: Number(network.chainId),
            isConnected: true,
            isConnecting: false
          })
          setProvider(provider)
        }
      } catch (error) {
        console.error('Failed to check wallet connection:', error)
      }
    }

    checkConnection()
  }, [])

  return {
    ...walletState,
    provider,
    connect,
    disconnect,
    switchNetwork
  }
}