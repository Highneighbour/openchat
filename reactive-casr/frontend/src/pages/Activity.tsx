import React, { useState, useEffect } from 'react'
import { useSupabase } from '../hooks/useSupabase'
import { ReactiveLog, PositionEvent } from '../types'
import { ArrowLeft, ExternalLink, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'

interface ActivityProps {
  onPageChange: (page: string) => void
}

const Activity: React.FC<ActivityProps> = ({ onPageChange }) => {
  const { getReactiveLogs, getPositionEvents } = useSupabase()
  const [reactiveLogs, setReactiveLogs] = useState<ReactiveLog[]>([])
  const [positionEvents, setPositionEvents] = useState<PositionEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'reactive' | 'events'>('reactive')

  useEffect(() => {
    const loadData = async () => {
      try {
        const [logsData, eventsData] = await Promise.all([
          getReactiveLogs(),
          getPositionEvents()
        ])
        setReactiveLogs(logsData)
        setPositionEvents(eventsData)
      } catch (error) {
        console.error('Failed to load activity data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [getReactiveLogs, getPositionEvents])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'pending':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
      default:
        return <Clock className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatTxHash = (hash?: string) => {
    if (!hash) return 'N/A'
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`
  }

  if (loading) {
    return <LoadingSpinner size="lg" className="py-12" />
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
          Activity Log
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Monitor reactive actions and position events
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('reactive')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'reactive'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Reactive Actions ({reactiveLogs.length})
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'events'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Position Events ({positionEvents.length})
          </button>
        </nav>
      </div>

      {/* Reactive Actions Tab */}
      {activeTab === 'reactive' && (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Reactive Actions
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Automated actions triggered by threshold breaches
            </p>
          </div>
          <ul className="divide-y divide-gray-200">
            {reactiveLogs.map((log) => (
              <li key={log.id}>
                <div className="px-4 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {getStatusIcon(log.status)}
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          Reactive Action
                        </div>
                        <div className="text-sm text-gray-500">
                          Position: {log.positionId}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(log.status)}`}>
                        {log.status}
                      </span>
                      <div className="text-sm text-gray-500">
                        {log.gasUsed ? `${log.gasUsed} REACT` : 'N/A'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Origin TX
                      </div>
                      <div className="mt-1 text-sm text-gray-900 flex items-center">
                        {log.originTxHash ? (
                          <>
                            {formatTxHash(log.originTxHash)}
                            <ExternalLink className="ml-1 h-3 w-3" />
                          </>
                        ) : (
                          'N/A'
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Reactive TX
                      </div>
                      <div className="mt-1 text-sm text-gray-900 flex items-center">
                        {log.reactiveTxHash ? (
                          <>
                            {formatTxHash(log.reactiveTxHash)}
                            <ExternalLink className="ml-1 h-3 w-3" />
                          </>
                        ) : (
                          'N/A'
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Destination TX
                      </div>
                      <div className="mt-1 text-sm text-gray-900 flex items-center">
                        {log.destTxHash ? (
                          <>
                            {formatTxHash(log.destTxHash)}
                            <ExternalLink className="ml-1 h-3 w-3" />
                          </>
                        ) : (
                          'N/A'
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex items-center text-sm text-gray-500">
                    <Clock className="h-4 w-4 mr-1" />
                    {new Date(log.createdAt).toLocaleString()}
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
      )}

      {/* Position Events Tab */}
      {activeTab === 'events' && (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Position Events
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Events from monitored positions
            </p>
          </div>
          <ul className="divide-y divide-gray-200">
            {positionEvents.map((event) => (
              <li key={event.id}>
                <div className="px-4 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="h-2 w-2 rounded-full bg-blue-400" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {event.eventType.replace('_', ' ').toUpperCase()}
                        </div>
                        <div className="text-sm text-gray-500">
                          Position: {event.positionId}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {event.originTxHash ? (
                        <div className="flex items-center">
                          {formatTxHash(event.originTxHash)}
                          <ExternalLink className="ml-1 h-3 w-3" />
                        </div>
                      ) : (
                        'N/A'
                      )}
                    </div>
                  </div>
                  
                  {event.eventData && (
                    <div className="mt-4">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Event Data
                      </div>
                      <div className="mt-1 text-sm text-gray-900">
                        <pre className="bg-gray-50 p-2 rounded text-xs overflow-x-auto">
                          {JSON.stringify(event.eventData, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-4 flex items-center text-sm text-gray-500">
                    <Clock className="h-4 w-4 mr-1" />
                    {new Date(event.createdAt).toLocaleString()}
                  </div>
                </div>
              </li>
            ))}
            {positionEvents.length === 0 && (
              <li className="px-4 py-8 text-center text-gray-500">
                No position events yet. Create positions to see events.
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

export default Activity