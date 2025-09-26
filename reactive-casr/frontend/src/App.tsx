import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useSupabase } from './hooks/useSupabase'
import { useWallet } from './hooks/useWallet'
import Navbar from './components/Navbar'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import CreatePosition from './pages/CreatePosition'
import Activity from './pages/Activity'
import Admin from './pages/Admin'
import LoadingSpinner from './components/LoadingSpinner'

function App() {
  const { user, loading } = useSupabase()
  const { isConnected } = useWallet()
  const [currentPage, setCurrentPage] = useState('dashboard')

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!user) {
    return <Login />
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navbar 
          currentPage={currentPage} 
          onPageChange={setCurrentPage}
          isWalletConnected={isConnected}
        />
        
        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route 
              path="/dashboard" 
              element={<Dashboard onPageChange={setCurrentPage} />} 
            />
            <Route 
              path="/create" 
              element={<CreatePosition onPageChange={setCurrentPage} />} 
            />
            <Route 
              path="/activity" 
              element={<Activity onPageChange={setCurrentPage} />} 
            />
            <Route 
              path="/admin" 
              element={<Admin onPageChange={setCurrentPage} />} 
            />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App