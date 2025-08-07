import { useState, useEffect, useCallback } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Dashboard from './components/Dashboard'
import AuthForm from './components/AuthForm'
import { PaymentSuccess } from './components/PaymentSuccess'
import { PricingPage } from './components/PricingPage'
import { useAuth } from './hooks/useAuth'
import { signalCRUDService } from './services/SignalCRUDService'
import type { Database } from './lib/supabase'

type Signal = Database['public']['Tables']['signals']['Row']

export default function App() {
  const { user, profile, loading } = useAuth()
  const [signals, setSignals] = useState<Signal[]>([])
  const [isLoadingSignals, setIsLoadingSignals] = useState(true)

  const fetchSignals = useCallback(async () => {
    try {
      setIsLoadingSignals(true)
      const { signals: fetchedSignals } = await signalCRUDService.getAllSignals(1, 50)
      setSignals(fetchedSignals)
    } catch (error) {
      console.error('Error fetching signals:', error)
      setSignals([])
    } finally {
      setIsLoadingSignals(false)
    }
  }, [])

  // Fetch signals when user is authenticated
  useEffect(() => {
    if (user && profile) {
      fetchSignals()
    } else {
      // Clear signals for unauthenticated users
      setSignals([])
      setIsLoadingSignals(false)
    }
  }, [user, profile, fetchSignals])

  // Show loading screen while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Signal Service...</p>
        </div>
      </div>
    )
  }

  // Main router - always accessible
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          {/* Public routes - accessible without authentication */}
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/success" element={<PaymentSuccess />} />
          <Route path="/cancel" element={<PricingPage />} />
          
          {/* Protected routes - require authentication */}
          <Route 
            path="/" 
            element={
              !user || !profile ? (
                <AuthForm onSuccess={() => {}} />
              ) : (
                <Dashboard 
                  signals={signals}
                  onSignalUpdate={fetchSignals}
                  isLoadingSignals={isLoadingSignals}
                  userProfile={profile}
                />
              )
            } 
          />
        </Routes>
      </div>
    </Router>
  )
}
