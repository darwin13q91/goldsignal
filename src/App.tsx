import { useState, useEffect, useCallback, useRef } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Dashboard from './components/Dashboard'
import AuthForm from './components/AuthForm'
import { PaymentSuccess } from './components/PaymentSuccess'
import { PricingPage } from './components/PricingPage'
import { ErrorBoundary } from './components/ErrorBoundary'
import { useAuth } from './hooks/useAuth'
import { signalCRUDService } from './services/SignalCRUDService'
import type { Database } from './lib/supabase'

type Signal = Database['public']['Tables']['signals']['Row']

export default function App() {
  const { user, profile, loading } = useAuth()
  const [signals, setSignals] = useState<Signal[]>([])
  const [isLoadingSignals, setIsLoadingSignals] = useState(false)
  const [signalError, setSignalError] = useState<string | null>(null)
  const fetchingRef = useRef(false)

  const fetchSignals = useCallback(async () => {
    // Prevent multiple simultaneous calls
    if (fetchingRef.current) {
      console.log('🔄 Signal fetch already in progress, skipping...')
      return
    }

    try {
      console.log('🔄 Fetching signals...')
      fetchingRef.current = true
      setIsLoadingSignals(true)
      setSignalError(null)
      
      const { signals: fetchedSignals } = await signalCRUDService.getAllSignals(1, 50)
      setSignals(fetchedSignals)
      console.log(`✅ Loaded ${fetchedSignals.length} signals`)
      
      setIsLoadingSignals(false)
    } catch (error) {
      console.error('❌ Error fetching signals:', error)
      setSignals([]) // Set empty array on error to prevent infinite loading
      setSignalError('Failed to load signals')
      setIsLoadingSignals(false)
    } finally {
      fetchingRef.current = false
    }
    // FIXED: No dependencies needed - using basic state setters
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cancel any pending signal requests when component unmounts
      signalCRUDService.cancelRequests()
      fetchingRef.current = false
    }
  }, [])

  // Fetch signals when user is authenticated
  useEffect(() => {
    if (user && profile) {
      // Move fetch logic directly here to avoid dependency cycle
      const doFetchSignals = async () => {
        // Prevent multiple simultaneous calls
        if (fetchingRef.current) {
          console.log('🔄 Signal fetch already in progress, skipping...')
          return
        }

        try {
          console.log('🔄 Fetching signals...')
          fetchingRef.current = true
          setIsLoadingSignals(true)
          setSignalError(null)
          
          const { signals: fetchedSignals } = await signalCRUDService.getAllSignals(1, 50)
          setSignals(fetchedSignals)
          console.log(`✅ Loaded ${fetchedSignals.length} signals`)
          
          setIsLoadingSignals(false)
        } catch (error) {
          console.error('❌ Error fetching signals:', error)
          setSignals([]) // Set empty array on error to prevent infinite loading
          setSignalError('Failed to load signals')
          setIsLoadingSignals(false)
        } finally {
          fetchingRef.current = false
        }
      }

      doFetchSignals()
    } else {
      // Clear signals for unauthenticated users
      setSignals([])
      setIsLoadingSignals(false)
      setSignalError(null)
      fetchingRef.current = false
    }
    // FIXED: Only depend on user and profile, not loading objects
  }, [user, profile])

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
                    isLoadingSignals={isLoadingSignals}
                    userProfile={profile}
                    loadingError={signalError}
                    hasTimedOut={false}
                    onRetryLoading={() => {
                      setSignalError(null)
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
