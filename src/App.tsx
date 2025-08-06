import { useState, useEffect, useCallback, useMemo } from 'react'
import Dashboard from './components/Dashboard'
import AuthForm from './components/AuthForm'
import { useAuth } from './hooks/useAuth'
import { signalCRUDService } from './services/SignalCRUDService'
import type { Database } from './lib/supabase'

type Signal = Database['public']['Tables']['signals']['Row']

export default function App() {
  const { user, profile, loading } = useAuth()
  const [signals, setSignals] = useState<Signal[]>([])
  const [isLoadingSignals, setIsLoadingSignals] = useState(true)

  // Initialize demo data for unauthenticated users
  const demoSignals: Signal[] = useMemo(() => [
    {
      id: 'demo-1',
      symbol: 'XAUUSD',
      type: 'buy',
      entry_price: 2650.50,
      stop_loss: 2640.00,
      take_profit: 2670.00,
      status: 'active',
      confidence: 85,
      description: 'Gold breakout above resistance with strong momentum',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      closed_at: undefined,
      result: undefined,
      pips_result: undefined,
    },
    {
      id: 'demo-2',
      symbol: 'XAUUSD',
      type: 'sell',
      entry_price: 2665.50,
      stop_loss: 2680.00,
      take_profit: 2640.00,
      status: 'closed',
      confidence: 78,
      description: 'Gold resistance at key level, dollar strength',
      created_at: new Date(Date.now() - 3600000).toISOString(),
      updated_at: new Date().toISOString(),
      closed_at: new Date().toISOString(),
      result: 'win',
      pips_result: 255, // 25.5 points for Gold = 255 pips equivalent
    }
  ], [])

  const fetchSignals = useCallback(async () => {
    try {
      setIsLoadingSignals(true)
      const { signals: fetchedSignals } = await signalCRUDService.getAllSignals(1, 50)
      setSignals(fetchedSignals)
    } catch (error) {
      console.error('Error fetching signals:', error)
      // Fallback to demo data on error
      setSignals(demoSignals)
    } finally {
      setIsLoadingSignals(false)
    }
  }, [demoSignals])

  // Fetch signals when user is authenticated
  useEffect(() => {
    if (user && profile) {
      fetchSignals()
    } else {
      // Use demo data for unauthenticated users
      setSignals(demoSignals)
      setIsLoadingSignals(false)
    }
  }, [user, profile, fetchSignals, demoSignals])

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

  // Show auth form if user is not authenticated
  if (!user || !profile) {
    return <AuthForm onSuccess={() => {}} />
  }

  // Show dashboard for authenticated users
  return (
    <div className="min-h-screen bg-gray-50">
      <Dashboard 
        signals={signals}
        onSignalUpdate={fetchSignals}
        isLoadingSignals={isLoadingSignals}
        userProfile={profile}
      />
    </div>
  )
}
