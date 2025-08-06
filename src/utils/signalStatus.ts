// Signal status calculation utilities
import type { Database } from '../lib/supabase'

type Signal = Database['public']['Tables']['signals']['Row']

export interface SignalStatusInfo {
  status: 'pending' | 'active' | 'hit_tp' | 'hit_sl' | 'closed'
  pnl?: number
  pnlPercentage?: number
  isProfit?: boolean
  statusText: string
}

export interface EnhancedSignal {
  id: string
  symbol: string
  type: 'buy' | 'sell'
  entry_price: number
  stop_loss: number
  take_profit: number
  confidence: number
  description: string
  created_at: string
  status: 'pending' | 'active' | 'closed'
  calculated_status?: SignalStatusInfo
}

export function calculateSignalStatus(
  signal: Signal,
  currentPrice: number
): SignalStatusInfo {
  const entryPrice = signal.entry_price
  const stopLoss = signal.stop_loss
  const takeProfit = signal.take_profit
  const signalType = signal.type
  
  // For buy signals
  if (signalType === 'buy') {
    // Check if price hit take profit
    if (currentPrice >= takeProfit) {
      const pnl = takeProfit - entryPrice
      const pnlPercentage = ((takeProfit - entryPrice) / entryPrice) * 100
      return {
        status: 'hit_tp',
        pnl,
        pnlPercentage,
        isProfit: true,
        statusText: `TP HIT (+${pnlPercentage.toFixed(1)}%)`
      }
    }
    
    // Check if price hit stop loss
    if (currentPrice <= stopLoss) {
      const pnl = stopLoss - entryPrice
      const pnlPercentage = ((stopLoss - entryPrice) / entryPrice) * 100
      return {
        status: 'hit_sl',
        pnl,
        pnlPercentage,
        isProfit: false,
        statusText: `SL HIT (${pnlPercentage.toFixed(1)}%)`
      }
    }
    
    // Check if price reached entry (signal activated)
    if (currentPrice <= entryPrice) {
      const pnl = currentPrice - entryPrice
      const pnlPercentage = ((currentPrice - entryPrice) / entryPrice) * 100
      return {
        status: 'active',
        pnl,
        pnlPercentage,
        isProfit: pnl >= 0,
        statusText: `ACTIVE (${pnlPercentage >= 0 ? '+' : ''}${pnlPercentage.toFixed(1)}%)`
      }
    }
    
    // Price hasn't reached entry yet
    return {
      status: 'pending',
      statusText: 'PENDING'
    }
  }
  
  // For sell signals
  if (signalType === 'sell') {
    // Check if price hit take profit (price went down)
    if (currentPrice <= takeProfit) {
      const pnl = entryPrice - takeProfit
      const pnlPercentage = ((entryPrice - takeProfit) / entryPrice) * 100
      return {
        status: 'hit_tp',
        pnl,
        pnlPercentage,
        isProfit: true,
        statusText: `TP HIT (+${pnlPercentage.toFixed(1)}%)`
      }
    }
    
    // Check if price hit stop loss (price went up)
    if (currentPrice >= stopLoss) {
      const pnl = entryPrice - stopLoss
      const pnlPercentage = ((entryPrice - stopLoss) / entryPrice) * 100
      return {
        status: 'hit_sl',
        pnl,
        pnlPercentage,
        isProfit: false,
        statusText: `SL HIT (${pnlPercentage.toFixed(1)}%)`
      }
    }
    
    // Check if price reached entry (signal activated)
    if (currentPrice >= entryPrice) {
      const pnl = entryPrice - currentPrice
      const pnlPercentage = ((entryPrice - currentPrice) / entryPrice) * 100
      return {
        status: 'active',
        pnl,
        pnlPercentage,
        isProfit: pnl >= 0,
        statusText: `ACTIVE (${pnlPercentage >= 0 ? '+' : ''}${pnlPercentage.toFixed(1)}%)`
      }
    }
    
    // Price hasn't reached entry yet
    return {
      status: 'pending',
      statusText: 'PENDING'
    }
  }
  
  // Default fallback
  return {
    status: 'pending',
    statusText: 'PENDING'
  }
}

export function getEnhancedStatusColor(calculatedStatus: SignalStatusInfo) {
  switch (calculatedStatus.status) {
    case 'hit_tp':
      return 'text-green-800 bg-green-100 border border-green-200'
    case 'hit_sl':
      return 'text-red-800 bg-red-100 border border-red-200'
    case 'active':
      return calculatedStatus.isProfit 
        ? 'text-blue-800 bg-blue-100 border border-blue-200'
        : 'text-orange-800 bg-orange-100 border border-orange-200'
    case 'pending':
      return 'text-yellow-800 bg-yellow-100 border border-yellow-200'
    default:
      return 'text-gray-800 bg-gray-100 border border-gray-200'
  }
}

export function enhanceSignalsWithStatus(
  signals: Signal[],
  currentGoldPrice: number
): EnhancedSignal[] {
  return signals.map(signal => ({
    ...signal,
    calculated_status: calculateSignalStatus(signal, currentGoldPrice)
  }))
}
