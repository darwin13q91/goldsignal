import { supabase } from '../lib/supabase'
import type { Database } from '../lib/supabase'

type Signal = Database['public']['Tables']['signals']['Row']
type SignalInsert = Database['public']['Tables']['signals']['Insert']
type SignalUpdate = Database['public']['Tables']['signals']['Update']

class SignalCRUDService {
  private abortController: AbortController | null = null

  // Cancel any ongoing requests
  cancelRequests() {
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
  }
  // Create new signal
  async createSignal(signalData: SignalInsert): Promise<Signal | null> {
    try {
      const { data, error } = await supabase
        .from('signals')
        .insert({
          ...signalData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error

      // Send notifications to subscribers
      await this.notifySubscribers(data)
      
      return data
    } catch (error) {
      console.error('Error creating signal:', error)
      return null
    }
  }

  // Get signal by ID
  async getSignalById(id: string): Promise<Signal | null> {
    try {
      const { data, error } = await supabase
        .from('signals')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching signal:', error)
      return null
    }
  }

  // Get all signals with pagination
  async getAllSignals(
    page = 1, 
    limit = 10,
    filters?: {
      symbol?: string
      status?: Signal['status']
      type?: Signal['type']
    }
  ): Promise<{ signals: Signal[], count: number }> {
    try {
      // Cancel any existing request
      this.cancelRequests()
      
      // Create new abort controller for this request
      this.abortController = new AbortController()
      
      const start = (page - 1) * limit
      const end = start + limit - 1

      let query = supabase
        .from('signals')
        .select('*', { count: 'exact' })
        .abortSignal(this.abortController.signal)

      // Apply filters
      if (filters?.symbol) {
        query = query.eq('symbol', filters.symbol)
      }
      if (filters?.status) {
        query = query.eq('status', filters.status)
      }
      if (filters?.type) {
        query = query.eq('type', filters.type)
      }

      const { data, error, count } = await query
        .range(start, end)
        .order('created_at', { ascending: false })

      if (error) {
        // Don't throw error if it's just a request cancellation
        if (error.message?.includes('aborted')) {
          console.log('Signal fetch request was cancelled')
          return { signals: [], count: 0 }
        }
        throw error
      }
      
      // Clear abort controller on success
      this.abortController = null
      
      return { signals: data || [], count: count || 0 }
    } catch (error) {
      console.error('Error fetching signals:', error)
      
      // Don't log cancelled requests as errors
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Signal fetch was cancelled')
        return { signals: [], count: 0 }
      }
      
      return { signals: [], count: 0 }
    }
  }

  // Update signal
  async updateSignal(id: string, updates: SignalUpdate): Promise<Signal | null> {
    try {
      const { data, error } = await supabase
        .from('signals')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating signal:', error)
      return null
    }
  }

  // Close signal
  async closeSignal(
    id: string, 
    result: 'win' | 'loss' | 'breakeven',
    pipsResult?: number
  ): Promise<Signal | null> {
    try {
      const { data, error } = await supabase
        .from('signals')
        .update({
          status: 'closed',
          result,
          pips_result: pipsResult,
          closed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      // Notify subscribers about signal closure
      await this.notifySignalClosure(data)

      return data
    } catch (error) {
      console.error('Error closing signal:', error)
      return null
    }
  }

  // Delete signal
  async deleteSignal(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('signals')
        .delete()
        .eq('id', id)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error deleting signal:', error)
      return false
    }
  }

  // Get active signals
  async getActiveSignals(): Promise<Signal[]> {
    try {
      const { data, error } = await supabase
        .from('signals')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching active signals:', error)
      return []
    }
  }

  // Get signals by symbol
  async getSignalsBySymbol(symbol: string, limit = 50): Promise<Signal[]> {
    try {
      const { data, error } = await supabase
        .from('signals')
        .select('*')
        .eq('symbol', symbol)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching signals by symbol:', error)
      return []
    }
  }

  // Get performance analytics
  async getPerformanceAnalytics(days = 30): Promise<{
    totalSignals: number
    winRate: number
    avgPips: number
    profitFactor: number
    totalPips: number
  }> {
    try {
      const fromDate = new Date()
      fromDate.setDate(fromDate.getDate() - days)

      const { data, error } = await supabase
        .from('signals')
        .select('result, pips_result')
        .eq('status', 'closed')
        .gte('closed_at', fromDate.toISOString())

      if (error) throw error

      const signals = data || []
      const totalSignals = signals.length
      
      if (totalSignals === 0) {
        return { totalSignals: 0, winRate: 0, avgPips: 0, profitFactor: 0, totalPips: 0 }
      }

      const wins = signals.filter(s => s.result === 'win').length
      const winRate = (wins / totalSignals) * 100
      
      const totalPips = signals.reduce((sum, s) => sum + (s.pips_result || 0), 0)
      const avgPips = totalPips / totalSignals

      const winningPips = signals
        .filter(s => s.result === 'win')
        .reduce((sum, s) => sum + Math.abs(s.pips_result || 0), 0)
      
      const losingPips = signals
        .filter(s => s.result === 'loss')
        .reduce((sum, s) => sum + Math.abs(s.pips_result || 0), 0)

      const profitFactor = losingPips > 0 ? winningPips / losingPips : winningPips

      return {
        totalSignals,
        winRate: Math.round(winRate * 100) / 100,
        avgPips: Math.round(avgPips * 100) / 100,
        profitFactor: Math.round(profitFactor * 100) / 100,
        totalPips: Math.round(totalPips * 100) / 100,
      }
    } catch (error) {
      console.error('Error calculating performance analytics:', error)
      return { totalSignals: 0, winRate: 0, avgPips: 0, profitFactor: 0, totalPips: 0 }
    }
  }

  // Private methods for notifications
  private async notifySubscribers(signal: Signal): Promise<void> {
    try {
      // Get all active subscribers
      const { data: users } = await supabase
        .from('users')
        .select('id, subscription_tier')
        .eq('subscription_status', 'active')
        .neq('subscription_tier', 'free')

      if (!users) return

      // Create notifications for each subscriber
      const notifications = users.map(user => ({
        user_id: user.id,
        signal_id: signal.id,
        type: 'signal' as const,
        title: `New ${signal.type.toUpperCase()} Signal - ${signal.symbol}`,
        message: `Entry: ${signal.entry_price}, SL: ${signal.stop_loss}, TP: ${signal.take_profit}`,
      }))

      await supabase
        .from('notifications')
        .insert(notifications)
    } catch (error) {
      console.error('Error notifying subscribers:', error)
    }
  }

  private async notifySignalClosure(signal: Signal): Promise<void> {
    try {
      // Get all active subscribers
      const { data: users } = await supabase
        .from('users')
        .select('id')
        .eq('subscription_status', 'active')
        .neq('subscription_tier', 'free')

      if (!users) return

      const resultEmoji = signal.result === 'win' ? '✅' : signal.result === 'loss' ? '❌' : '⚖️'
      const pipsText = signal.pips_result ? ` (${signal.pips_result > 0 ? '+' : ''}${signal.pips_result} pips)` : ''

      const notifications = users.map(user => ({
        user_id: user.id,
        signal_id: signal.id,
        type: 'signal' as const,
        title: `Signal Closed - ${signal.symbol} ${resultEmoji}`,
        message: `Result: ${signal.result?.toUpperCase()}${pipsText}`,
      }))

      await supabase
        .from('notifications')
        .insert(notifications)
    } catch (error) {
      console.error('Error notifying signal closure:', error)
    }
  }
}

export const signalCRUDService = new SignalCRUDService()
