import { useState, useEffect, useCallback } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Dashboard from './components/Dashboard'
import AuthForm from './components/AuthForm'
import { PaymentSuccess } from './components/PaymentSuccess'
import { PricingPage } from './components/PricingPage'
import { ErrorBoundary } from './components/ErrorBoundary'
import { useAuth } from './hooks/useAuth'
import { useLoadingWithTimeout } from './hooks/useLoadingWithTimeout'
import { signalCRUDService } from './services/SignalCRUDService'
import type { Database } from './lib/supabase'

type Signal = Database['public']['Tables']['signals']['Row']

export default function App() {
  const { user, profile, loading } = useAuth()
  const [signals, setSignals] = useState<Signal[]>([])
  
  // Use the loading hook with timeout
  const signalLoading = useLoadingWithTimeout({
    timeoutMs: 15000, // 15 seconds timeout for signals
    onTimeout: () => {
      console.warn('Signal loading timed out')
      // Try to fetch again after timeout
      setTimeout(() => fetchSignals(), 2000)
    }
  })

  const fetchSignals = useCallback(async () => {
    const result = await signalLoading.executeWithLoading(
      async () => {
        const { signals: fetchedSignals } = await signalCRUDService.getAllSignals(1, 50)
        setSignals(fetchedSignals)
        return fetchedSignals
      },
      'Failed to load signals. Please check your connection and try again.'
    )
    
    // If fetch failed, set empty array to prevent infinite loading
    if (!result) {
      setSignals([])
    }
  }, [signalLoading])

  // Fetch signals when user is authenticated
  useEffect(() => {
    if (user && profile) {
      fetchSignals()
    } else {
      // Clear signals for unauthenticated users
      setSignals([])
      signalLoading.reset() // Reset loading state
    }
  }, [user, profile, fetchSignals, signalLoading])

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
    <ErrorBoundary>
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
                    isLoadingSignals={signalLoading.isLoading}
                    userProfile={profile}
                    loadingError={signalLoading.error}
                    hasTimedOut={signalLoading.hasTimedOut}
                    onRetryLoading={() => {
                      signalLoading.reset()
                      fetchSignals()
                    }}
                  />
                )
              } 
            />
          </Routes>
        </div>
      </Router>
    </ErrorBoundary>
  )
}
