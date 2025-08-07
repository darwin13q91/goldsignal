import React, { useState, useEffect, useCallback } from 'react'
import { brokerIntegrationService } from '../services/BrokerIntegrationService'
import type { TradingAccount, TradeExecution } from '../services/BrokerIntegrationService'
import { useAuth } from '../hooks/useAuth'
import { 
  PlusCircle, 
  Settings, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff,
  Activity
} from 'lucide-react'

interface TradingDashboardProps {
  onClose?: () => void
}

export const TradingDashboard: React.FC<TradingDashboardProps> = ({ onClose }) => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'accounts' | 'settings' | 'history'>('accounts')
  const [tradingAccounts, setTradingAccounts] = useState<TradingAccount[]>([])
  const [tradeHistory, setTradeHistory] = useState<TradeExecution[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddAccount, setShowAddAccount] = useState(false)
  const [showApiKeys, setShowApiKeys] = useState<{[key: string]: boolean}>({})

  // New account form
  const [newAccountForm, setNewAccountForm] = useState({
    broker_name: 'demo' as const,
    account_id: '',
    api_key: '',
    api_secret: ''
  })

  // Load data
  const loadTradingData = useCallback(async () => {
    setLoading(true)
    try {
      const [accounts, history] = await Promise.all([
        brokerIntegrationService.getTradingAccounts(user!.id),
        brokerIntegrationService.getTradeHistory(user!.id)
      ])
      
      setTradingAccounts(accounts)
      setTradeHistory(history)
    } catch (error) {
      console.error('Error loading trading data:', error)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      loadTradingData()
    }
  }, [user, loadTradingData])

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const account = await brokerIntegrationService.createTradingAccount(user!.id, newAccountForm)
      
      if (account) {
        setTradingAccounts(prev => [...prev, account])
        setShowAddAccount(false)
        setNewAccountForm({
          broker_name: 'demo',
          account_id: '',
          api_key: '',
          api_secret: ''
        })
        
        // Show success message
        alert('Trading account connected successfully! 🎯')
      } else {
        alert('Failed to connect trading account. Please check your credentials.')
      }
    } catch (error) {
      console.error('Error adding trading account:', error)
      alert('Error connecting trading account. Please try again.')
    }
  }

  const handleSyncBalance = async (accountId: string) => {
    try {
      const success = await brokerIntegrationService.syncAccountBalance(accountId)
      if (success) {
        await loadTradingData() // Refresh data
        alert('Account balance synced! 💰')
      } else {
        alert('Failed to sync balance. Please try again.')
      }
    } catch (error) {
      console.error('Error syncing balance:', error)
    }
  }

  const toggleApiKeyVisibility = (accountId: string) => {
    setShowApiKeys(prev => ({
      ...prev,
      [accountId]: !prev[accountId]
    }))
  }

  const formatCurrency = (amount: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount)
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
          <span className="ml-2 text-lg">Loading trading data...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <Activity className="w-6 h-6 mr-2 text-blue-600" />
          Auto-Trading Dashboard
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b">
        <nav className="flex space-x-8 px-6">
          {(['accounts', 'settings', 'history'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 px-1 border-b-2 font-medium text-sm capitalize ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'accounts' && '🏦 '}
              {tab === 'settings' && '⚙️ '}
              {tab === 'history' && '📊 '}
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {/* Trading Accounts Tab */}
        {activeTab === 'accounts' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Your Trading Accounts</h3>
              <button
                onClick={() => setShowAddAccount(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700"
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                Connect Account
              </button>
            </div>

            {/* Account Cards */}
            {tradingAccounts.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-lg mb-2">No trading accounts connected</p>
                <p className="text-gray-400 text-sm mb-4">Connect your first trading account to start auto-trading</p>
                <button
                  onClick={() => setShowAddAccount(true)}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
                >
                  Connect Demo Account
                </button>
              </div>
            ) : (
              <div className="grid gap-6">
                {tradingAccounts.map((account) => (
                  <div key={account.id} className="border rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="text-lg font-semibold capitalize">
                          {account.broker_name.replace('_', ' ')} Account
                        </h4>
                        <p className="text-gray-600">Account: {account.account_id}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-600">
                          {formatCurrency(account.account_balance, account.currency)}
                        </div>
                        <p className="text-sm text-gray-500">
                          Last sync: {formatDateTime(account.last_sync)}
                        </p>
                      </div>
                    </div>

                    {/* Account Details */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-600">Status</p>
                        <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                          account.status === 'active' 
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {account.status}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Leverage</p>
                        <p className="font-semibold">1:{account.leverage}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Currency</p>
                        <p className="font-semibold">{account.currency}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">API Status</p>
                        <span className="text-green-600 text-sm">Connected ✓</span>
                      </div>
                    </div>

                    {/* API Credentials */}
                    {account.api_key && (
                      <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-gray-700">API Credentials</p>
                          <button
                            onClick={() => toggleApiKeyVisibility(account.id)}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            {showApiKeys[account.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <div className="text-sm text-gray-600">
                          <p>API Key: {showApiKeys[account.id] ? account.api_key : '••••••••••••••••'}</p>
                          {account.api_secret && (
                            <p>API Secret: {showApiKeys[account.id] ? account.api_secret : '••••••••••••••••'}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex space-x-3">
                      <button
                        onClick={() => handleSyncBalance(account.id)}
                        className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg flex items-center hover:bg-blue-200"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Sync Balance
                      </button>
                      <button
                        onClick={() => setActiveTab('settings')}
                        className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg flex items-center hover:bg-gray-200"
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Auto-Trade Settings
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add Account Modal */}
            {showAddAccount && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                  <h3 className="text-lg font-semibold mb-4">Connect Trading Account</h3>
                  
                  <form onSubmit={handleAddAccount}>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Broker
                        </label>
                        <select
                          value={newAccountForm.broker_name}
                          onChange={(e) => setNewAccountForm(prev => ({ 
                            ...prev, 
                            broker_name: e.target.value as 'demo' 
                          }))}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          required
                        >
                          <option value="demo">Demo Account (For Testing)</option>
                          <option value="ic_markets" disabled>IC Markets (Coming Soon)</option>
                          <option value="pepperstone" disabled>Pepperstone (Coming Soon)</option>
                          <option value="xm" disabled>XM (Coming Soon)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Account ID
                        </label>
                        <input
                          type="text"
                          value={newAccountForm.account_id}
                          onChange={(e) => setNewAccountForm(prev => ({ ...prev, account_id: e.target.value }))}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="demo123"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          API Key
                        </label>
                        <input
                          type="text"
                          value={newAccountForm.api_key}
                          onChange={(e) => setNewAccountForm(prev => ({ ...prev, api_key: e.target.value }))}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="demo_key_123"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          API Secret (Optional)
                        </label>
                        <input
                          type="password"
                          value={newAccountForm.api_secret}
                          onChange={(e) => setNewAccountForm(prev => ({ ...prev, api_secret: e.target.value }))}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="demo_secret_123"
                        />
                      </div>
                    </div>

                    {newAccountForm.broker_name === 'demo' && (
                      <div className="mt-4 bg-blue-50 p-3 rounded-lg">
                        <div className="flex items-start">
                          <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5 mr-2" />
                          <div className="text-sm text-blue-700">
                            <p className="font-medium mb-1">Demo Account Setup</p>
                            <p>Use account ID: <code className="bg-blue-100 px-1 rounded">demo123</code> or <code className="bg-blue-100 px-1 rounded">demo456</code></p>
                            <p>This will create a $10,000 demo account for testing auto-trading.</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex space-x-3 mt-6">
                      <button
                        type="submit"
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex-1"
                      >
                        Connect Account
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddAccount(false)}
                        className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div>
            <h3 className="text-lg font-semibold mb-6">Auto-Trade Settings</h3>
            {tradingAccounts.length === 0 ? (
              <div className="text-center py-12">
                <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Connect a trading account first to configure auto-trading.</p>
              </div>
            ) : (
              <div className="text-center py-12">
                <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Auto-trade settings configuration coming soon!</p>
                <p className="text-sm text-gray-400 mt-2">You'll be able to set risk levels, trading hours, and position sizes here.</p>
              </div>
            )}
          </div>
        )}

        {/* Trade History Tab */}
        {activeTab === 'history' && (
          <div>
            <h3 className="text-lg font-semibold mb-6">Trade History</h3>
            {tradeHistory.length === 0 ? (
              <div className="text-center py-12">
                <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No trades executed yet.</p>
                <p className="text-sm text-gray-400 mt-2">Your auto-traded signals will appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Symbol</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lot Size</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entry Price</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">P&L</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {tradeHistory.map((trade) => (
                      <tr key={trade.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {trade.symbol}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                            trade.trade_type === 'buy' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {trade.trade_type === 'buy' ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                            {trade.trade_type.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {trade.lot_size}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${trade.entry_price.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-sm font-medium ${
                            (trade.profit_loss || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {trade.profit_loss ? formatCurrency(trade.profit_loss) : '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                            trade.status === 'filled' ? 'bg-blue-100 text-blue-800' :
                            trade.status === 'closed' ? 'bg-gray-100 text-gray-800' :
                            trade.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {trade.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDateTime(trade.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
