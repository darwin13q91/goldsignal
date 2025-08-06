import React, { useState } from 'react'
import { Plus, Edit, Trash2, Activity, AlertCircle, CheckCircle, Clock } from 'lucide-react'
import { signalCRUDService } from '../services/SignalCRUDService'
import type { Database } from '../lib/supabase'

type Signal = Database['public']['Tables']['signals']['Row']
type SignalInsert = Database['public']['Tables']['signals']['Insert']

interface SignalManagerProps {
  signals: Signal[]
  onSignalUpdate: () => void
}

export default function SignalManager({ signals, onSignalUpdate }: SignalManagerProps) {
  const [showForm, setShowForm] = useState(false)
  const [editingSignal, setEditingSignal] = useState<Signal | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState<Partial<SignalInsert>>({
    symbol: 'XAUUSD',
    type: 'buy',
    entry_price: 0,
    stop_loss: 0,
    take_profit: 0,
    confidence: 85,
    description: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (editingSignal) {
        await signalCRUDService.updateSignal(editingSignal.id, formData)
      } else {
        await signalCRUDService.createSignal(formData as SignalInsert)
      }
      
      setShowForm(false)
      setEditingSignal(null)
      resetForm()
      onSignalUpdate()
    } catch (error) {
      console.error('Error saving signal:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (signal: Signal) => {
    setEditingSignal(signal)
    setFormData({
      symbol: signal.symbol,
      type: signal.type,
      entry_price: signal.entry_price,
      stop_loss: signal.stop_loss,
      take_profit: signal.take_profit,
      confidence: signal.confidence,
      description: signal.description,
    })
    setShowForm(true)
  }

  const handleCloseSignal = async (signalId: string, result: 'win' | 'loss' | 'breakeven', pips?: number) => {
    try {
      await signalCRUDService.closeSignal(signalId, result, pips)
      onSignalUpdate()
    } catch (error) {
      console.error('Error closing signal:', error)
    }
  }

  const handleDelete = async (signalId: string) => {
    if (window.confirm('Are you sure you want to delete this signal?')) {
      try {
        await signalCRUDService.deleteSignal(signalId)
        onSignalUpdate()
      } catch (error) {
        console.error('Error deleting signal:', error)
      }
    }
  }

  const resetForm = () => {
    setFormData({
      symbol: 'XAUUSD',
      type: 'buy',
      entry_price: 0,
      stop_loss: 0,
      take_profit: 0,
      confidence: 85,
      description: '',
    })
  }

  const getStatusIcon = (status: Signal['status']) => {
    switch (status) {
      case 'active':
        return <Activity className="w-4 h-4 text-green-500" />
      case 'closed':
        return <CheckCircle className="w-4 h-4 text-blue-500" />
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />
    }
  }

  const getResultColor = (result?: string) => {
    switch (result) {
      case 'win':
        return 'text-green-600 bg-green-100'
      case 'loss':
        return 'text-red-600 bg-red-100'
      case 'breakeven':
        return 'text-yellow-600 bg-yellow-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Signal Management</h2>
        <button
          onClick={() => {
            resetForm()
            setEditingSignal(null)
            setShowForm(true)
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Create Signal</span>
        </button>
      </div>

      {/* Signal Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">
              {editingSignal ? 'Edit Signal' : 'Create New Signal'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Symbol
                  </label>
                  <select
                    value={formData.symbol}
                    onChange={(e) => setFormData(prev => ({ ...prev, symbol: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="XAUUSD">🥇 XAUUSD (Gold)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as 'buy' | 'sell' }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="buy">Buy</option>
                    <option value="sell">Sell</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Entry Price
                  </label>
                  <input
                    type="number"
                    step="0.00001"
                    value={formData.entry_price}
                    onChange={(e) => setFormData(prev => ({ ...prev, entry_price: parseFloat(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stop Loss
                  </label>
                  <input
                    type="number"
                    step="0.00001"
                    value={formData.stop_loss}
                    onChange={(e) => setFormData(prev => ({ ...prev, stop_loss: parseFloat(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Take Profit
                  </label>
                  <input
                    type="number"
                    step="0.00001"
                    value={formData.take_profit}
                    onChange={(e) => setFormData(prev => ({ ...prev, take_profit: parseFloat(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confidence ({formData.confidence}%)
                </label>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={formData.confidence}
                  onChange={(e) => setFormData(prev => ({ ...prev, confidence: parseInt(e.target.value) }))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Signal analysis and reasoning..."
                  required
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setEditingSignal(null)
                  }}
                  className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingSignal ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Signals List */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Signal
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prices
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Result
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {signals.map((signal) => (
                <tr key={signal.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={`w-2 h-2 rounded-full mr-3 ${
                        signal.type === 'buy' ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {signal.symbol}
                        </div>
                        <div className="text-sm text-gray-500">
                          {signal.type.toUpperCase()} • {signal.confidence}%
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>Entry: {signal.entry_price}</div>
                    <div>SL: {signal.stop_loss}</div>
                    <div>TP: {signal.take_profit}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(signal.status)}
                      <span className="ml-2 text-sm text-gray-900 capitalize">
                        {signal.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {signal.result ? (
                      <div className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getResultColor(signal.result)}`}>
                        {signal.result.toUpperCase()}
                        {signal.pips_result && ` (${signal.pips_result > 0 ? '+' : ''}${signal.pips_result} pips)`}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEdit(signal)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      
                      {signal.status === 'active' && (
                        <div className="flex space-x-1">
                          <button
                            onClick={() => handleCloseSignal(signal.id, 'win', 50)}
                            className="text-green-600 hover:text-green-900 text-xs px-2 py-1 bg-green-100 rounded"
                          >
                            Win
                          </button>
                          <button
                            onClick={() => handleCloseSignal(signal.id, 'loss', -30)}
                            className="text-red-600 hover:text-red-900 text-xs px-2 py-1 bg-red-100 rounded"
                          >
                            Loss
                          </button>
                        </div>
                      )}
                      
                      <button
                        onClick={() => handleDelete(signal.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
