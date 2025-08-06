import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { TrendingUp, Users, DollarSign, Target, LogOut, User, Settings, Activity, RefreshCw } from 'lucide-react'
import SignalManager from './SignalManager'
import { SubscriberManager } from './SubscriberManager'
import { UpgradeModal } from './UpgradeModal'
import { useAuth } from '../hooks/useAuth'
import { useFeatureAccess } from '../hooks/useFeatureAccess'
import TwelveDataService from '../services/TwelveDataService'
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
}

const Dashboard: React.FC<DashboardProps> = ({
  signals,
  onSignalUpdate,
  isLoadingSignals,
  userProfile
}) => {
  const [activeTab, setActiveTab] = useState<'signals' | 'performance' | 'subscribers' | 'manage'>('signals')
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false)
  const [marketData, setMarketData] = useState<MarketData[]>([])
  const [isLoadingMarketData, setIsLoadingMarketData] = useState(false)
  const [dataSource, setDataSource] = useState<string>('loading...')
  const { signOut, user } = useAuth()
  const { hasAccess } = useFeatureAccess()

  // Initialize Twelve Data service (broker-grade data)
  const twelveDataService = useMemo(() => new TwelveDataService(), [])

  // Fetch Gold price using Twelve Data (800 calls/day free)
  const fetchGoldPrice = useCallback(async (): Promise<MarketData | null> => {
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
      setDataSource('Error - Mock Data Fallback')
      return null
    }
  }, [twelveDataService])

  // Fetch market data on component mount
  useEffect(() => {
    const fetchMarketData = async () => {
      setIsLoadingMarketData(true)
      try {
        // Use Twelve Data for broker-grade XAUUSD data
        const goldQuote = await fetchGoldPrice()
        if (goldQuote) {
          setMarketData([goldQuote])
        } else {
          // Final fallback to demo Gold data
          setMarketData([
            {
              symbol: 'XAUUSD',
              price: 2658.50,
              change: 8.75,
              changePercent: 0.33,
              high: 2665.25,
              low: 2652.00,
              volume: 0,
              timestamp: new Date().toISOString()
            }
          ])
        }
      } catch (error) {
        console.error('Error fetching market data:', error)
        // Fallback to demo Gold data if Alpha Vantage fails
        setMarketData([
          {
            symbol: 'XAUUSD',
            price: 2658.50,
            change: 8.75,
            changePercent: 0.33,
            high: 2665.25,
            low: 2652.00,
            volume: 0,
            timestamp: new Date().toISOString()
          }
        ])
      } finally {
        setIsLoadingMarketData(false)
      }
    }

    fetchMarketData()
    
    // Refresh market data every 30 seconds
    const interval = setInterval(fetchMarketData, 30000)
    return () => clearInterval(interval)
  }, [fetchGoldPrice])

  const refreshMarketData = async () => {
    setIsLoadingMarketData(true)
    try {
      // Use Twelve Data for broker-grade XAUUSD data
      const goldQuote = await fetchGoldPrice()
      if (goldQuote) {
        setMarketData([goldQuote])
      } else {
        // Final fallback to demo Gold data
        setMarketData([
          {
            symbol: 'XAUUSD',
            price: 2658.50,
            change: 8.75,
            changePercent: 0.33,
            high: 2665.25,
            low: 2652.00,
            volume: 0,
            timestamp: new Date().toISOString()
          }
        ])
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

  // Subscription distribution data (demo)
  const subscriptionData = [
    { name: 'Free', value: 45, color: '#8884d8' },
    { name: 'Basic', value: 25, color: '#82ca9d' },
    { name: 'Premium', value: 20, color: '#ffc658' },
    { name: 'VIP', value: 10, color: '#ff7c7c' }
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
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm text-gray-700">{userProfile.subscription_tier.toUpperCase()}</span>
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
              { id: 'subscribers', label: 'Subscribers', icon: Users },
              { id: 'manage', label: 'Manage Signals', icon: Settings },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'signals' | 'performance' | 'subscribers' | 'manage')}
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
                    <button
                      onClick={refreshMarketData}
                      disabled={isLoadingMarketData}
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
                      {signals.slice(0, 10).map((signal) => (
                        <tr key={signal.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{signal.symbol}</div>
                            <div className="text-sm text-gray-500">{signal.description.slice(0, 30)}...</div>
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
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(signal.status)}`}>
                              {signal.status.toUpperCase()}
                            </span>
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
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

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
            {hasAccess('subscriber_management') ? (
              <SubscriberManager currentUser={userProfile} />
            ) : (
              <div className="text-center py-12">
                <div className="bg-gradient-to-br from-purple-50 to-pink-100 rounded-xl p-8 max-w-md mx-auto">
                  <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Users className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">Subscriber Management</h3>
                  <p className="text-gray-600 mb-6">
                    Manage your subscriber base, view analytics, and grow your trading community with advanced tools.
                  </p>
                  <button
                    onClick={() => setIsUpgradeModalOpen(true)}
                    className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-700 transition-all duration-200"
                  >
                    Upgrade to VIP
                  </button>
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
      </div>

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        userEmail={user?.email}
      />
    </div>
  )
}

export default Dashboard
