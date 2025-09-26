import React from 'react'
import { Wallet, Activity, Plus, Settings, LogOut } from 'lucide-react'
import { useSupabase } from '../hooks/useSupabase'
import { useWallet } from '../hooks/useWallet'

interface NavbarProps {
  currentPage: string
  onPageChange: (page: string) => void
  isWalletConnected: boolean
}

const Navbar: React.FC<NavbarProps> = ({ currentPage, onPageChange, isWalletConnected }) => {
  const { signOut } = useSupabase()
  const { address, connect, disconnect } = useWallet()

  const handleSignOut = async () => {
    await signOut()
  }

  const handleWalletConnect = async () => {
    try {
      if (isWalletConnected) {
        disconnect()
      } else {
        await connect()
      }
    } catch (error) {
      console.error('Wallet connection failed:', error)
    }
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    { id: 'create', label: 'Create Position', icon: Plus },
    { id: 'activity', label: 'Activity', icon: Activity },
    { id: 'admin', label: 'Admin', icon: Settings }
  ]

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <h1 className="text-xl font-bold text-gray-900">
                Reactive CASR
              </h1>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    onClick={() => onPageChange(item.id)}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      currentPage === item.id
                        ? 'border-primary-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {item.label}
                  </button>
                )
              })}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Wallet Connection */}
            <button
              onClick={handleWalletConnect}
              className={`inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md ${
                isWalletConnected
                  ? 'bg-green-100 text-green-800 hover:bg-green-200'
                  : 'bg-primary-100 text-primary-800 hover:bg-primary-200'
              }`}
            >
              <Wallet className="w-4 h-4 mr-2" />
              {isWalletConnected ? (
                <span>{address?.slice(0, 6)}...{address?.slice(-4)}</span>
              ) : (
                <span>Connect Wallet</span>
              )}
            </button>

            {/* Sign Out */}
            <button
              onClick={handleSignOut}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 hover:text-gray-700"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar