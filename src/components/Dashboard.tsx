import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { TrendingUp, Users, DollarSign, Target, LogOut, User, Settings, Activity, RefreshCw } from 'lucide-react'
import SignalManager from './SignalManager'
import { SubscriberManager } from './SubscriberManager'
import { UpgradeModal } from './UpgradeModal'
import { NotificationCenter } from './NotificationCenter'
import { UserProfileSettings } from './UserProfileSettings'
import { TradingDashboard } from './TradingDashboard'
import { useAuth } from '../hooks/useAuth'
import { useFeatureAccess } from '../hooks/useFeatureAccess'
import { useAdminAccess } from '../hooks/useAdminAccess'
import { useSignalMonitor } from '../hooks/useSignalMonitor'
import TwelveDataService from '../services/TwelveDataService'
import { enhanceSignalsWithStatus, getEnhancedStatusColor, type EnhancedSignal } from '../utils/signalStatus'
import type { Database } from '../lib/supabase'

type Signal = Database['public']['Tables']['signals']['Row']
type UserProfile = Database['public']['Tables']['users']['Row']

interface MarketData {
  symbol: string
  price: number
  change: number
  changePercent: number
  high: number
  low: number
  volume: number
  timestamp: string
}

interface DashboardProps {
  signals: Signal[]
  onSignalUpdate: () => void
  isLoadingSignals: boolean
  userProfile: UserProfile
  loadingError?: string | null
  hasTimedOut?: boolean
  onRetryLoading?: () => void
}

// Utility functions for signal analytics
const getWinRate = (signals: EnhancedSignal[]): number => {
  if (signals.length === 0) return 0
  const closedSignals = signals.filter(signal => signal.status === 'closed')
  if (closedSignals.length === 0) return 0
  const winningSignals = closedSignals.filter(signal => 
    signal.calculated_status && signal.calculated_status.isProfit
  )
  return Math.round((winningSignals.length / closedSignals.length) * 100)
}

const getTotalProfitLoss = (signals: EnhancedSignal[]): number => {
  const closedSignals = signals.filter(signal => 
    signal.status === 'closed' && signal.calculated_status && signal.calculated_status.pnlPercentage !== undefined
  )
  if (closedSignals.length === 0) return 0
  const totalPnL = closedSignals.reduce((sum, signal) => 
    sum + (signal.calculated_status?.pnlPercentage || 0), 0
  )
  return totalPnL
}

const Dashboard: React.FC<DashboardProps> = ({
  signals,
  onSignalUpdate,
  isLoadingSignals,
  userProfile,
  loadingError,
  hasTimedOut,
  onRetryLoading
}) => {
  const [activeTab, setActiveTab] = useState<'signals' | 'performance' | 'subscribers' | 'manage' | 'profile' | 'trading'>('signals')
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false)
  const [marketData, setMarketData] = useState<MarketData[]>([])
  const [enhancedSignals, setEnhancedSignals] = useState<EnhancedSignal[]>([])
  const [currentGoldPrice, setCurrentGoldPrice] = useState<number>(0)
  const [isLoadingMarketData, setIsLoadingMarketData] = useState(false)
  const [dataSource, setDataSource] = useState<string>('loading...')
  const [apiQuotaExhausted, setApiQuotaExhausted] = useState(true) // EMERGENCY: Force quota exhausted state
  const { signOut } = useAuth()
  const { hasAccess } = useFeatureAccess()
  const { hasAdminAccess } = useAdminAccess()

  // Monitor signals for automatic TP/SL alerts
  useSignalMonitor({ signals, onSignalUpdate })

  // Initialize Twelve Data service (broker-grade data)
  const twelveDataService = useMemo(() => TwelveDataService, [])

  // Fetch Gold price using Twelve Data (800 calls/day free)
  const fetchGoldPrice = useCallback(async (): Promise<MarketData | null> => {
    // Triple-check quota status before making any requests
    if (apiQuotaExhausted || twelveDataService.isQuotaExhausted()) {
      console.log('🚫 API quota exhausted, skipping Gold price fetch')
      setDataSource('API Quota Exhausted - Wait until tomorrow')
      setApiQuotaExhausted(true) // Ensure state is set
      return null
    }

    console.log('🏦 Fetching broker-grade XAUUSD data from Twelve Data...')
    
    try {
      const goldData = await twelveDataService.getGoldPrice()
      
      if (goldData) {
        // Check if it's real API data or mock data
        const isRealData = !goldData.symbol.includes('mock') && goldData.timestamp
        setDataSource(isRealData ? 'Twelve Data API (Broker-grade)' : 'Realistic Mock Data (Current Gold Range)')
        console.log(`✅ ${isRealData ? 'Real' : 'Mock'} Gold price: $${goldData.price.toFixed(2)}`)
        return goldData
      }
      
      return null
      
    } catch (error) {
      console.error('❌ Error fetching Gold data:', error)
      
      // Check for quota exhaustion - be more aggressive in detection
      if (error instanceof Error && 
          (error.message.includes('quota exhausted') || 
           error.message.includes('API_QUOTA_EXHAUSTED') ||
           error.message.includes('API credits') || 
           error.message.includes('daily limit') ||
           error.message.includes('limit exceeded') ||
           error.message.includes('429'))) {
        console.log('💰 Detected API quota exhaustion - stopping ALL further requests')
        setApiQuotaExhausted(true)
        // Also mark the service as exhausted
        twelveDataService.resetQuota = () => {
          console.log('🚫 Quota reset blocked - manually set to exhausted')
        }
        setDataSource('API Quota Exhausted (800/day) - Upgrade or wait until tomorrow')
      } else {
        setDataSource('Error - Mock Data Fallback')
      }
      
      return null
    }
  }, [twelveDataService, apiQuotaExhausted])

  // Fetch market data on component mount
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null
    
    const fetchMarketData = async () => {
      // Double-check quota status before each request
      if (apiQuotaExhausted || twelveDataService.isQuotaExhausted()) {
        console.log('🚫 Skipping market data fetch - quota exhausted')
        setDataSource('API Quota Exhausted - Wait until tomorrow')
        setIsLoadingMarketData(false)
        // Clear any existing interval
        if (intervalId) {
          clearInterval(intervalId)
          intervalId = null
        }
        return
      }

      setIsLoadingMarketData(true)
      try {
        // Use Twelve Data for broker-grade XAUUSD data
        const goldQuote = await fetchGoldPrice()
        if (goldQuote) {
          setMarketData([goldQuote])
          setCurrentGoldPrice(goldQuote.price)
        } else {
          // No fallback data - show loading or error state
          console.warn('No market data available')
          setMarketData([])
          setCurrentGoldPrice(0)
        }
      } catch (error) {
        console.error('Error fetching market data:', error)
        
        // Check if this was a quota error and stop the interval
        if (error instanceof Error && 
            (error.message.includes('quota exhausted') || 
             error.message.includes('API credits') || 
             error.message.includes('daily limit'))) {
          console.log('🛑 Quota exhaustion detected - clearing interval')
          setApiQuotaExhausted(true)
          if (intervalId) {
            clearInterval(intervalId)
            intervalId = null
          }
        }
        
        // No fallback data - show error state
        setMarketData([])
        setCurrentGoldPrice(0)
      } finally {
        setIsLoadingMarketData(false)
      }
    }

    // Initial fetch
    fetchMarketData()
    
    // EMERGENCY MODE: All intervals disabled to prevent API calls and console spam
    // Intervals are completely disabled while in emergency mode
    console.log('🚨 EMERGENCY MODE: Market data intervals disabled to prevent API quota burning')
    
    /*
    // Only set interval if quota is not exhausted
    if (!apiQuotaExhausted && !twelveDataService.isQuotaExhausted()) {
      console.log('🔄 Starting market data interval (30s)')
      intervalId = setInterval(() => {
        // Triple-check quota status before each interval call
        if (apiQuotaExhausted || twelveDataService.isQuotaExhausted()) {
          console.log('🛑 Stopping market data interval due to quota exhaustion')
          if (intervalId) {
            clearInterval(intervalId)
            intervalId = null
          }
          return
        }
        fetchMarketData()
      }, 30000)
    } else {
      console.log('🚫 Not starting market data interval - quota exhausted')
    }
    */
    
    // Cleanup function
    return () => {
      if (intervalId) {
        console.log('🧹 Cleaning up market data interval')
        clearInterval(intervalId)
        intervalId = null
      }
    }
  }, [fetchGoldPrice, apiQuotaExhausted, twelveDataService])

  // Enhance signals with real-time status calculation
  useEffect(() => {
    if (signals.length > 0 && currentGoldPrice > 0) {
      const enhanced = enhanceSignalsWithStatus(signals, currentGoldPrice)
      setEnhancedSignals(enhanced)
      console.log(`📊 Enhanced ${enhanced.length} signals with current Gold price: $${currentGoldPrice}`)
    }
  }, [signals, currentGoldPrice])

  const refreshMarketData = async () => {
    // Don't refresh if quota is exhausted
    if (apiQuotaExhausted) {
      console.log('🚫 Cannot refresh - API quota exhausted')
      return
    }

    setIsLoadingMarketData(true)
    try {
      // Use Twelve Data for broker-grade XAUUSD data
      const goldQuote = await fetchGoldPrice()
      if (goldQuote) {
        setMarketData([goldQuote])
        setCurrentGoldPrice(goldQuote.price)
      } else {
        // No fallback data - show loading or error state
        console.warn('No market data available')
        setMarketData([])
        setCurrentGoldPrice(0)
      }
    } catch (error) {
      console.error('Error refreshing market data:', error)
    } finally {
      setIsLoadingMarketData(false)
    }
  }

  // Calculate statistics from signals
  const activeSignals = signals.filter(s => s.status === 'active').length
  const closedSignals = signals.filter(s => s.status === 'closed')
  const winningSignals = closedSignals.filter(s => s.result === 'win').length
  const winRate = closedSignals.length > 0 ? (winningSignals / closedSignals.length) * 100 : 0
  const totalPips = closedSignals.reduce((sum, s) => sum + (s.pips_result || 0), 0)

  // Performance data for charts
  const performanceData = closedSignals.slice(0, 10).map((signal) => ({
    name: signal.symbol,
    profit: signal.pips_result || 0,
    confidence: signal.confidence
  }))

  // Calculate subscription distribution from actual data
  // Note: This would require fetching all user profiles in a production system
  const subscriptionData = [
    { name: 'Free', value: 0, color: '#8884d8' },
    { name: 'Premium', value: 0, color: '#82ca9d' },
    { name: 'VIP', value: 0, color: '#ffc658' }
  ]

  // Stats cards data
  const statsCards = [
    {
      title: 'Total Signals',
      value: signals.length,
      icon: Target,
      color: 'bg-blue-500',
      change: '+12%'
    },
    {
      title: 'Win Rate',
      value: `${winRate.toFixed(1)}%`,
      icon: TrendingUp,
      color: 'bg-green-500',
      change: '+5%'
    },
    {
      title: 'Active Signals',
      value: activeSignals,
      icon: Activity,
      color: 'bg-purple-500',
      change: '+3'
    },
    {
      title: 'Total Pips',
      value: `${totalPips > 0 ? '+' : ''}${totalPips}`,
      icon: DollarSign,
      color: totalPips >= 0 ? 'bg-green-500' : 'bg-red-500',
      change: '+25%'
    }
  ]

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  const getSignalColor = (type: 'buy' | 'sell') => {
    return type === 'buy' ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-600 bg-green-100'
    if (confidence >= 75) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const getStatusColor = (status: Signal['status']) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-100'
      case 'closed':
        return 'text-blue-600 bg-blue-100'
      case 'pending':
        return 'text-yellow-600 bg-yellow-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">      
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Signal Service Dashboard</h1>
              <p className="text-gray-600">Welcome back, {userProfile.full_name}</p>
            </div>
            <div className="flex items-center space-x-4">
              <NotificationCenter userId={userProfile.id} />
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm text-gray-700">{userProfile.subscription_tier.toUpperCase()}</span>
                  {userProfile.user_role && userProfile.user_role !== 'user' && (
                    <span className="text-xs text-red-600 font-semibold">
                      {userProfile.user_role.toUpperCase().replace('_', ' ')}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={signOut}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 border rounded-lg hover:bg-gray-50"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Navigation Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-8">
            {[
              { id: 'signals', label: 'Signals', icon: Target },
              { id: 'performance', label: 'Performance', icon: TrendingUp },
              ...(hasAccess('subscriber_management') ? [
                { id: 'subscribers', label: 'Subscribers', icon: Users },
              ] : []),
              { id: 'manage', label: 'Manage Signals', icon: Settings },
              { id: 'trading', label: 'Auto-Trading', icon: Activity },
              { id: 'profile', label: 'Profile', icon: User },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'signals' | 'performance' | 'subscribers' | 'manage' | 'profile' | 'trading')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statsCards.map((card, index) => (
            <div key={index} className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{card.title}</p>
                  <p className="text-3xl font-bold text-gray-900">{card.value}</p>
                  <p className="text-sm text-green-600">{card.change} from last month</p>
                </div>
                <div className={`w-12 h-12 rounded-lg ${card.color} flex items-center justify-center`}>
                  <card.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'signals' && (
          <div>
            {/* Error Display */}
            {(loadingError || hasTimedOut) && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="text-red-600 mr-3">⚠️</div>
                    <div>
                      <h4 className="text-red-800 font-semibold">
                        {hasTimedOut ? 'Connection Timeout' : 'Loading Error'}
                      </h4>
                      <p className="text-red-700 text-sm">
                        {loadingError || 'The request is taking longer than expected. This may be due to deployment updates or network issues.'}
                      </p>
                    </div>
                  </div>
                  {onRetryLoading && (
                    <button
                      onClick={onRetryLoading}
                      className="flex items-center px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium transition-colors"
                    >
                      <RefreshCw className="w-4 h-4 mr-1" />
                      Retry
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Signal Data */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-lg text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100">Active Signals</p>
                    <p className="text-2xl font-bold">{enhancedSignals.filter(s => s.status === 'active').length}</p>
                  </div>
                  <Target className="w-8 h-8 text-green-200" />
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-lg text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100">Win Rate</p>
                    <p className="text-2xl font-bold">{getWinRate(enhancedSignals)}%</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-blue-200" />
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-lg text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100">Total P&L</p>
                    <p className="text-2xl font-bold">
                      {getTotalProfitLoss(enhancedSignals) >= 0 ? '+' : ''}
                      {getTotalProfitLoss(enhancedSignals).toFixed(1)}%
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-purple-200" />
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-6 rounded-lg text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100">Gold Price</p>
                    <p className="text-2xl font-bold">${currentGoldPrice > 0 ? currentGoldPrice.toFixed(2) : 'Loading...'}</p>
                    <p className="text-xs text-orange-200">{dataSource}</p>
                  </div>
                  <Activity className="w-8 h-8 text-orange-200" />
                </div>
              </div>
            </div>

            {/* Recent Signals Table */}
            <div className="bg-white rounded-lg shadow-md">
              <div className="px-6 py-4 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Recent Trading Signals</h3>
                  {isLoadingSignals && (
                    <div className="flex items-center text-sm text-gray-500">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent mr-2"></div>
                      Loading signals...
                    </div>
                  )}
                </div>
              </div>
              
              {enhancedSignals.length === 0 && !isLoadingSignals ? (
                <div className="p-8 text-center">
                  <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No signals available yet.</p>
                  <p className="text-sm text-gray-400 mt-1">Start by creating your first trading signal!</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Signal</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entry</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SL</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">TP</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">P&L</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {enhancedSignals.slice(0, 10).map((signal) => (
                        <tr key={signal.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div className={`w-3 h-3 rounded-full mr-3 ${
                                signal.type === 'buy' ? 'bg-green-500' : 'bg-red-500'
                              }`}></div>
                              <div>
                                <div className="font-semibold text-gray-900">{signal.symbol}</div>
                                <div className="text-sm text-gray-500 capitalize">{signal.type}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-mono text-sm">${signal.entry_price}</td>
                          <td className="px-6 py-4 font-mono text-sm">${signal.stop_loss}</td>
                          <td className="px-6 py-4 font-mono text-sm">${signal.take_profit}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              signal.calculated_status 
                                ? getEnhancedStatusColor(signal.calculated_status)
                                : getStatusColor(signal.status)
                            }`}>
                              {signal.calculated_status 
                                ? signal.calculated_status.statusText 
                                : signal.status.toUpperCase()
                              }
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`font-semibold ${
                              signal.calculated_status && signal.calculated_status.isProfit 
                                ? 'text-green-600' 
                                : 'text-red-600'
                            }`}>
                              {signal.calculated_status && signal.calculated_status.pnlPercentage !== undefined 
                                ? `${signal.calculated_status.pnlPercentage >= 0 ? '+' : ''}${signal.calculated_status.pnlPercentage.toFixed(2)}%`
                                : '—'
                              }
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {new Date(signal.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
          <div className="space-y-6">
            {/* Gold Market Data Section */}
            <div className="bg-white rounded-xl shadow-sm">
              <div className="p-6 border-b">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-gray-900">🥇 Gold (XAUUSD) Live Data</h2>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      Source: {dataSource}
                    </span>
                    {/* API Usage Display */}
                    <div className="text-sm bg-yellow-100 text-yellow-800 px-2 py-1 rounded border">
                      API: {twelveDataService.getRemainingRequests()}/{twelveDataService.getUsageStats().dailyLimit} remaining
                    </div>
                    {/* Emergency Stop Button */}
                    {!apiQuotaExhausted && (
                      <button
                        onClick={() => {
                          console.log('🛑 EMERGENCY STOP - User manually stopped API calls')
                          setApiQuotaExhausted(true)
                        }}
                        className="px-3 py-1 text-xs text-red-600 hover:text-red-800 border border-red-200 rounded hover:bg-red-50"
                      >
                        🛑 Stop API
                      </button>
                    )}
                    <button
                      onClick={refreshMarketData}
                      disabled={isLoadingMarketData || apiQuotaExhausted}
                      className="flex items-center space-x-2 px-4 py-2 text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg hover:bg-blue-50 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 ${isLoadingMarketData ? 'animate-spin' : ''}`} />
                      <span>{isLoadingMarketData ? 'Refreshing...' : 'Refresh'}</span>
                    </button>
                  </div>
                </div>
              </div>
              <div className="p-6">
                {marketData.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4">
                    {marketData.map((data, index) => (
                      <div key={index} className="border-2 border-yellow-200 bg-yellow-50 rounded-lg p-6 hover:shadow-lg transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                          <h3 className="font-bold text-2xl text-yellow-900">{data.symbol}</h3>
                          <span className={`px-3 py-2 rounded-lg text-lg font-bold ${
                            data.change >= 0 ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'
                          }`}>
                            {data.change >= 0 ? '+' : ''}${data.change.toFixed(2)}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="text-center">
                            <div className="text-gray-600 text-sm">Current Price</div>
                            <div className="font-bold text-xl text-gray-900">${data.price.toFixed(2)}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-gray-600 text-sm">Change %</div>
                            <div className={`font-bold text-xl ${data.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {data.changePercent >= 0 ? '+' : ''}{data.changePercent.toFixed(2)}%
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-gray-600 text-sm">High</div>
                            <div className="font-bold text-xl text-gray-900">${data.high.toFixed(2)}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-gray-600 text-sm">Low</div>
                            <div className="font-bold text-xl text-gray-900">${data.low.toFixed(2)}</div>
                          </div>
                        </div>
                        <div className="mt-4 text-center">
                          <div className="text-gray-500 text-sm">Last Updated: {new Date(data.timestamp).toLocaleTimeString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-gray-500">
                      {isLoadingMarketData ? 'Loading Gold market data...' : 'No Gold market data available'}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Signals Table */}
            <div className="bg-white rounded-xl shadow-sm">
              <div className="p-6 border-b">
                <h2 className="text-xl font-semibold text-gray-900">Recent Signals</h2>
              </div>
              <div className="overflow-x-auto">
                {isLoadingSignals ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading signals...</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Signal</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entry</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SL/TP</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Confidence</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(enhancedSignals.length > 0 ? enhancedSignals : signals).slice(0, 10).map((signal) => {
                        const isEnhanced = 'calculated_status' in signal
                        const displayStatus = isEnhanced && signal.calculated_status 
                          ? signal.calculated_status.statusText 
                          : signal.status.toUpperCase()
                        const statusColorClass = isEnhanced && signal.calculated_status 
                          ? getEnhancedStatusColor(signal.calculated_status)
                          : getStatusColor(signal.status)
                        
                        return (
                          <tr key={signal.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{signal.symbol}</div>
                              <div className="text-sm text-gray-500">{signal.description.slice(0, 30)}...</div>
                              {isEnhanced && signal.calculated_status && currentGoldPrice > 0 && (
                                <div className="text-xs text-blue-600 mt-1">
                                  Current: ${currentGoldPrice.toFixed(2)}
                                </div>
                              )}
                            </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSignalColor(signal.type)}`}>
                              {signal.type.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {signal.entry_price}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            SL: {signal.stop_loss}<br />
                            TP: {signal.take_profit}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColorClass}`}>
                              {displayStatus}
                            </span>
                            {isEnhanced && signal.calculated_status && signal.calculated_status.pnlPercentage !== undefined && (
                              <div className={`text-xs mt-1 ${
                                signal.calculated_status.isProfit ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {signal.calculated_status.pnlPercentage >= 0 ? '+' : ''}{signal.calculated_status.pnlPercentage.toFixed(1)}%
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getConfidenceColor(signal.confidence)}`}>
                              {signal.confidence}%
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatTime(signal.created_at)}
                          </td>
                        </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

        {activeTab === 'performance' && (
          <>
            {hasAccess('analytics') ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Signal Performance</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="profit" stroke="#3b82f6" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Subscription Distribution</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={subscriptionData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {subscriptionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
            ) : (
              <div className="text-center py-12">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl p-8 max-w-md mx-auto">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Activity className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">Premium Analytics</h3>
                  <p className="text-gray-600 mb-6">
                    Get detailed performance analytics, win rates, and profit tracking to optimize your trading strategy.
                  </p>
                  <button
                    onClick={() => setIsUpgradeModalOpen(true)}
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all duration-200"
                  >
                    Upgrade to Premium
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'subscribers' && (
          <>
            {hasAdminAccess() ? (
              <SubscriberManager currentUser={userProfile} />
            ) : (
              <div className="text-center py-12">
                <div className="bg-gradient-to-br from-red-50 to-orange-100 rounded-xl p-8 max-w-md mx-auto">
                  <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Users className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">Admin Access Required</h3>
                  <p className="text-gray-600 mb-6">
                    Subscriber management is only available to system administrators. Contact the system owner for admin access.
                  </p>
                  <div className="mt-4 p-3 bg-orange-100 border border-orange-300 rounded-lg">
                    <p className="text-orange-800 text-sm">
                      <strong>Note:</strong> This feature is restricted to system administrators only. 
                      Regular subscribers cannot access user management regardless of subscription tier.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'manage' && (
          <SignalManager 
            signals={signals} 
            onSignalUpdate={onSignalUpdate}
          />
        )}

        {activeTab === 'trading' && (
          <TradingDashboard />
        )}

        {activeTab === 'profile' && (
          <UserProfileSettings
            userProfile={userProfile}
            onUpdate={onSignalUpdate} // This will refresh user data
          />
        )}
      </div>

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
      />
    </div>
  )
}

export default Dashboard
