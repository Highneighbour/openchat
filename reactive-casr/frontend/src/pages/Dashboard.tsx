import React, { useState, useEffect } from 'react'
import { useSupabase } from '../hooks/useSupabase'
import { useWallet } from '../hooks/useWallet'
import { Position, ReactiveLog } from '../types'
import { formatAddress } from '../lib/ethers'
import { Activity, TrendingUp, TrendingDown, Clock, DollarSign } from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'

interface DashboardProps {
  onPageChange: (page: string) => void
}

const Dashboard: React.FC<DashboardProps> = ({ onPageChange }) => {
  const { getPositions, getReactiveLogs } = useSupabase()
  const { isConnected, address } = useWallet()
  const [positions, setPositions] = useState<Position[]>([])
  const [reactiveLogs, setReactiveLogs] = useState<ReactiveLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [positionsData, logsData] = await Promise.all([
          getPositions(),
          getReactiveLogs()
        ])
        setPositions(positionsData)
        setReactiveLogs(logsData)
      } catch (error) {
        console.error('Failed to load dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [getPositions, getReactiveLogs])

  const activePositions = positions.filter(p => p.isActive)
  const totalGasUsed = reactiveLogs.reduce((sum, log) => sum + (log.gasUsed || 0), 0)
  const successfulActions = reactiveLogs.filter(log => log.status === 'success').length

  if (loading) {
    return <LoadingSpinner size="lg" className="py-12" />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Dashboard
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Monitor your cross-chain automated stop-rebalance positions
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <button
            onClick={() => onPageChange('create')}
            className="btn-primary"
          >
            Create Position
          </button>
        </div>
      </div>

      {/* Wallet Status */}
      {!isConnected && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <Activity className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Wallet Not Connected
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>Connect your wallet to create and manage positions.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Active Positions
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {activePositions.length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Activity className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Reactive Actions
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {reactiveLogs.length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingDown className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Success Rate
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {reactiveLogs.length > 0 
                      ? Math.round((successfulActions / reactiveLogs.length) * 100)
                      : 0}%
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Gas Used
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {totalGasUsed.toFixed(4)} REACT
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Positions */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Recent Positions
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Your latest automated stop-rebalance positions
          </p>
        </div>
        <ul className="divide-y divide-gray-200">
          {positions.slice(0, 5).map((position) => (
            <li key={position.id}>
              <div className="px-4 py-4 flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className={`h-2 w-2 rounded-full ${
                      position.isActive ? 'bg-green-400' : 'bg-gray-400'
                    }`} />
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900">
                      {position.positionIdentifier}
                    </div>
                    <div className="text-sm text-gray-500">
                      {position.actionType} • Threshold: {position.threshold}
                    </div>
                  </div>
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <Clock className="h-4 w-4 mr-1" />
                  {new Date(position.createdAt).toLocaleDateString()}
                </div>
              </div>
            </li>
          ))}
          {positions.length === 0 && (
            <li className="px-4 py-8 text-center text-gray-500">
              No positions created yet. Create your first position to get started.
            </li>
          )}
        </ul>
      </div>

      {/* Recent Activity */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Recent Activity
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Latest reactive actions and events
          </p>
        </div>
        <ul className="divide-y divide-gray-200">
          {reactiveLogs.slice(0, 5).map((log) => (
            <li key={log.id}>
              <div className="px-4 py-4 flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className={`h-2 w-2 rounded-full ${
                      log.status === 'success' ? 'bg-green-400' :
                      log.status === 'failed' ? 'bg-red-400' : 'bg-yellow-400'
                    }`} />
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900">
                      Reactive Action
                    </div>
                    <div className="text-sm text-gray-500">
                      Status: {log.status} • Gas: {log.gasUsed || 0} REACT
                    </div>
                  </div>
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <Clock className="h-4 w-4 mr-1" />
                  {new Date(log.createdAt).toLocaleDateString()}
                </div>
              </div>
            </li>
          ))}
          {reactiveLogs.length === 0 && (
            <li className="px-4 py-8 text-center text-gray-500">
              No reactive actions yet. Create positions to see activity.
            </li>
          )}
        </ul>
      </div>
    </div>
  )
}

export default Dashboard