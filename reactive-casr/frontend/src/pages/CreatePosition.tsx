import React, { useState } from 'react'
import { useSupabase } from '../hooks/useSupabase'
import { useWallet } from '../hooks/useWallet'
import { ethers } from 'ethers'
import { REACTIVE_MANAGER_ABI } from '../lib/ethers'
import { ArrowLeft, Loader2 } from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'

interface CreatePositionProps {
  onPageChange: (page: string) => void
}

interface PositionFormData {
  originChainId: string
  originContract: string
  originToken: string
  positionIdentifier: string
  threshold: string
  actionType: 'partial_unwind' | 'rebalance' | 'hedge'
  gasBudget: string
}

const CreatePosition: React.FC<CreatePositionProps> = ({ onPageChange }) => {
  const { createPosition } = useSupabase()
  const { isConnected, address, provider } = useWallet()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [formData, setFormData] = useState<PositionFormData>({
    originChainId: '1597', // Reactive Mainnet
    originContract: '',
    originToken: '',
    positionIdentifier: '',
    threshold: '',
    actionType: 'rebalance',
    gasBudget: ''
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isConnected || !provider || !address) {
      setError('Please connect your wallet first')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // Validate form data
      if (!formData.originContract || !formData.positionIdentifier || !formData.threshold || !formData.gasBudget) {
        throw new Error('Please fill in all required fields')
      }

      // Parse and validate numeric values
      const threshold = parseFloat(formData.threshold)
      const gasBudget = parseFloat(formData.gasBudget)
      const originChainId = parseInt(formData.originChainId)

      if (isNaN(threshold) || threshold <= 0) {
        throw new Error('Threshold must be a positive number')
      }

      if (isNaN(gasBudget) || gasBudget <= 0) {
        throw new Error('Gas budget must be a positive number')
      }

      if (isNaN(originChainId)) {
        throw new Error('Invalid chain ID')
      }

      // Get contract instance
      const reactiveManagerAddress = import.meta.env.VITE_REACTIVE_MANAGER_CONTRACT
      if (!reactiveManagerAddress) {
        throw new Error('Reactive Manager contract address not configured')
      }

      const reactiveManager = new ethers.Contract(
        reactiveManagerAddress,
        REACTIVE_MANAGER_ABI,
        await provider.getSigner()
      )

      // Convert gas budget to wei
      const gasBudgetWei = ethers.parseEther(formData.gasBudget)

      // Create position on-chain
      const tx = await reactiveManager.createPosition(
        originChainId,
        formData.originContract,
        formData.originToken || ethers.ZeroAddress,
        formData.positionIdentifier,
        ethers.parseEther(formData.threshold),
        formData.actionType,
        gasBudgetWei,
        { value: gasBudgetWei }
      )

      console.log('Transaction sent:', tx.hash)
      
      // Wait for transaction confirmation
      const receipt = await tx.wait()
      console.log('Transaction confirmed:', receipt)

      // Extract position ID from transaction logs
      let positionId = ''
      if (receipt.logs) {
        for (const log of receipt.logs) {
          try {
            const parsedLog = reactiveManager.interface.parseLog(log)
            if (parsedLog.name === 'PositionCreated') {
              positionId = parsedLog.args.positionId
              break
            }
          } catch (e) {
            // Skip logs that can't be parsed
          }
        }
      }

      // Save position to Supabase
      await createPosition({
        positionId: positionId || `pos_${Date.now()}`,
        originChainId,
        originContract: formData.originContract,
        originToken: formData.originToken || null,
        positionIdentifier: formData.positionIdentifier,
        threshold,
        actionType: formData.actionType,
        gasBudget,
        isActive: true
      })

      setSuccess(`Position created successfully! Transaction: ${tx.hash}`)
      
      // Reset form
      setFormData({
        originChainId: '1597',
        originContract: '',
        originToken: '',
        positionIdentifier: '',
        threshold: '',
        actionType: 'rebalance',
        gasBudget: ''
      })

      // Redirect to dashboard after a delay
      setTimeout(() => {
        onPageChange('dashboard')
      }, 3000)

    } catch (err: any) {
      console.error('Failed to create position:', err)
      setError(err.message || 'Failed to create position')
    } finally {
      setLoading(false)
    }
  }

  if (!isConnected) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <ArrowLeft className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Wallet Not Connected
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>Please connect your wallet to create a position.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => onPageChange('dashboard')}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Dashboard
        </button>
        <h2 className="mt-2 text-2xl font-bold text-gray-900">
          Create New Position
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Set up a new cross-chain automated stop-rebalance position
        </p>
      </div>

      <div className="bg-white shadow sm:rounded-lg">
        <form onSubmit={handleSubmit} className="px-4 py-5 sm:p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <div className="text-sm text-green-700">{success}</div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="originChainId" className="block text-sm font-medium text-gray-700">
                Origin Chain ID
              </label>
              <select
                id="originChainId"
                name="originChainId"
                value={formData.originChainId}
                onChange={handleInputChange}
                className="input-field mt-1"
                required
              >
                <option value="1597">Reactive Mainnet (1597)</option>
                <option value="1596">Lasna Testnet (1596)</option>
                <option value="1">Ethereum Mainnet (1)</option>
                <option value="137">Polygon (137)</option>
              </select>
            </div>

            <div>
              <label htmlFor="actionType" className="block text-sm font-medium text-gray-700">
                Action Type
              </label>
              <select
                id="actionType"
                name="actionType"
                value={formData.actionType}
                onChange={handleInputChange}
                className="input-field mt-1"
                required
              >
                <option value="rebalance">Rebalance</option>
                <option value="partial_unwind">Partial Unwind</option>
                <option value="hedge">Hedge</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="originContract" className="block text-sm font-medium text-gray-700">
              Origin Contract Address *
            </label>
            <input
              type="text"
              id="originContract"
              name="originContract"
              value={formData.originContract}
              onChange={handleInputChange}
              placeholder="0x..."
              className="input-field mt-1"
              required
            />
          </div>

          <div>
            <label htmlFor="originToken" className="block text-sm font-medium text-gray-700">
              Origin Token Address (optional)
            </label>
            <input
              type="text"
              id="originToken"
              name="originToken"
              value={formData.originToken}
              onChange={handleInputChange}
              placeholder="0x..."
              className="input-field mt-1"
            />
          </div>

          <div>
            <label htmlFor="positionIdentifier" className="block text-sm font-medium text-gray-700">
              Position Identifier *
            </label>
            <input
              type="text"
              id="positionIdentifier"
              name="positionIdentifier"
              value={formData.positionIdentifier}
              onChange={handleInputChange}
              placeholder="e.g., LP-ETH-USDC-001"
              className="input-field mt-1"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="threshold" className="block text-sm font-medium text-gray-700">
                Threshold (REACT) *
              </label>
              <input
                type="number"
                id="threshold"
                name="threshold"
                value={formData.threshold}
                onChange={handleInputChange}
                placeholder="1.0"
                step="0.1"
                min="0"
                className="input-field mt-1"
                required
              />
            </div>

            <div>
              <label htmlFor="gasBudget" className="block text-sm font-medium text-gray-700">
                Gas Budget (REACT) *
              </label>
              <input
                type="number"
                id="gasBudget"
                name="gasBudget"
                value={formData.gasBudget}
                onChange={handleInputChange}
                placeholder="0.1"
                step="0.01"
                min="0"
                className="input-field mt-1"
                required
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => onPageChange('dashboard')}
              className="btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Position'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreatePosition