import React, { useState, useEffect } from 'react'
import { useSupabase } from '../hooks/useSupabase'
import { useWallet } from '../hooks/useWallet'
import { ArrowLeft, Copy, CheckCircle, ExternalLink, Settings, Database, Zap } from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'

interface AdminProps {
  onPageChange: (page: string) => void
}

const Admin: React.FC<AdminProps> = ({ onPageChange }) => {
  const { user } = useSupabase()
  const { isConnected, address } = useWallet()
  const [loading, setLoading] = useState(true)
  const [contractAddresses, setContractAddresses] = useState({
    originPosition: '',
    destinationHandler: '',
    reactiveManager: ''
  })
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    // Load contract addresses from environment
    setContractAddresses({
      originPosition: import.meta.env.VITE_ORIGIN_POSITION_CONTRACT || '',
      destinationHandler: import.meta.env.VITE_DESTINATION_HANDLER_CONTRACT || '',
      reactiveManager: import.meta.env.VITE_REACTIVE_MANAGER_CONTRACT || ''
    })
    setLoading(false)
  }, [])

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const isAdmin = user?.email === 'admin@reactive-casr.com' || address === '0x...' // Replace with actual admin address

  if (loading) {
    return <LoadingSpinner size="lg" className="py-12" />
  }

  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <Settings className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Access Denied
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>You don't have permission to access the admin panel.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <button
          onClick={() => onPageChange('dashboard')}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Dashboard
        </button>
        <h2 className="mt-2 text-2xl font-bold text-gray-900">
          Admin Panel
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Manage contracts, subscriptions, and system configuration
        </p>
      </div>

      {/* Contract Addresses */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Contract Addresses
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Origin Position Contract
              </label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <input
                  type="text"
                  value={contractAddresses.originPosition}
                  readOnly
                  className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-l-md border border-gray-300 bg-gray-50 text-sm"
                />
                <button
                  onClick={() => copyToClipboard(contractAddresses.originPosition, 'originPosition')}
                  className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-gray-500 hover:text-gray-700"
                >
                  {copied === 'originPosition' ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Destination Handler Contract
              </label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <input
                  type="text"
                  value={contractAddresses.destinationHandler}
                  readOnly
                  className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-l-md border border-gray-300 bg-gray-50 text-sm"
                />
                <button
                  onClick={() => copyToClipboard(contractAddresses.destinationHandler, 'destinationHandler')}
                  className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-gray-500 hover:text-gray-700"
                >
                  {copied === 'destinationHandler' ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Reactive Manager Contract
              </label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <input
                  type="text"
                  value={contractAddresses.reactiveManager}
                  readOnly
                  className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-l-md border border-gray-300 bg-gray-50 text-sm"
                />
                <button
                  onClick={() => copyToClipboard(contractAddresses.reactiveManager, 'reactiveManager')}
                  className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-gray-500 hover:text-gray-700"
                >
                  {copied === 'reactiveManager' ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            System Status
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-2 w-2 rounded-full bg-green-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">
                  Reactive Network
                </p>
                <p className="text-sm text-gray-500">Connected</p>
              </div>
            </div>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-2 w-2 rounded-full bg-green-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">
                  Supabase Database
                </p>
                <p className="text-sm text-gray-500">Connected</p>
              </div>
            </div>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">
                  Wallet Connection
                </p>
                <p className="text-sm text-gray-500">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </p>
              </div>
            </div>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-2 w-2 rounded-full bg-green-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">
                  Subscriptions
                </p>
                <p className="text-sm text-gray-500">Active</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <button className="btn-primary flex items-center justify-center">
              <Zap className="w-4 h-4 mr-2" />
              Register Subscriptions
            </button>
            <button className="btn-secondary flex items-center justify-center">
              <Database className="w-4 h-4 mr-2" />
              Sync Database
            </button>
            <button className="btn-secondary flex items-center justify-center">
              <Settings className="w-4 h-4 mr-2" />
              Update Gas Budget
            </button>
            <button className="btn-secondary flex items-center justify-center">
              <ExternalLink className="w-4 h-4 mr-2" />
              View on Explorer
            </button>
          </div>
        </div>
      </div>

      {/* Network Information */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Network Information
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Current Network:</span>
              <span className="text-sm font-medium text-gray-900">
                {import.meta.env.VITE_NETWORK_NAME || 'Reactive Mainnet'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Chain ID:</span>
              <span className="text-sm font-medium text-gray-900">
                {import.meta.env.VITE_CHAIN_ID || '1597'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">RPC URL:</span>
              <span className="text-sm font-medium text-gray-900">
                {import.meta.env.VITE_REACTIVE_MAINNET_RPC || 'https://rpc.reactive.network'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Explorer:</span>
              <span className="text-sm font-medium text-gray-900">
                <a 
                  href="https://explorer.reactive.network" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:text-primary-500"
                >
                  explorer.reactive.network
                  <ExternalLink className="inline w-3 h-3 ml-1" />
                </a>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Admin