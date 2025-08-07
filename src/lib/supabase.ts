import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL 
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY 

export const supabase = createClient(supabaseUrl, supabaseKey)

// Database Types
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string
          avatar_url?: string
          subscription_tier: 'free' | 'basic' | 'premium' | 'vip'
          subscription_status: 'active' | 'canceled' | 'past_due'
          subscription_end_date?: string
          user_role: 'user' | 'admin'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          full_name: string
          avatar_url?: string
          subscription_tier?: 'free' | 'basic' | 'premium' | 'vip'
          subscription_status?: 'active' | 'canceled' | 'past_due'
          subscription_end_date?: string
          user_role?: 'user' | 'admin'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          avatar_url?: string
          subscription_tier?: 'free' | 'basic' | 'premium' | 'vip'
          subscription_status?: 'active' | 'canceled' | 'past_due'
          subscription_end_date?: string
          user_role?: 'user' | 'admin'
          updated_at?: string
        }
      }
      signals: {
        Row: {
          id: string
          symbol: string
          type: 'buy' | 'sell'
          entry_price: number
          stop_loss: number
          take_profit: number
          status: 'active' | 'closed' | 'pending'
          confidence: number
          description: string
          created_at: string
          updated_at: string
          closed_at?: string
          result?: 'win' | 'loss' | 'breakeven'
          pips_result?: number
        }
        Insert: {
          id?: string
          symbol: string
          type: 'buy' | 'sell'
          entry_price: number
          stop_loss: number
          take_profit: number
          status?: 'active' | 'closed' | 'pending'
          confidence: number
          description: string
          created_at?: string
          updated_at?: string
          closed_at?: string
          result?: 'win' | 'loss' | 'breakeven'
          pips_result?: number
        }
        Update: {
          symbol?: string
          type?: 'buy' | 'sell'
          entry_price?: number
          stop_loss?: number
          take_profit?: number
          status?: 'active' | 'closed' | 'pending'
          confidence?: number
          description?: string
          updated_at?: string
          closed_at?: string
          result?: 'win' | 'loss' | 'breakeven'
          pips_result?: number
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          signal_id?: string
          type: 'signal' | 'subscription' | 'system'
          title: string
          message: string
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          signal_id?: string
          type: 'signal' | 'subscription' | 'system'
          title: string
          message: string
          read?: boolean
          created_at?: string
        }
        Update: {
          read?: boolean
        }
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          plan_id: string
          status: 'active' | 'canceled' | 'past_due' | 'unpaid'
          current_period_start: string
          current_period_end: string
          stripe_subscription_id?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          plan_id: string
          status?: 'active' | 'canceled' | 'past_due' | 'unpaid'
          current_period_start: string
          current_period_end: string
          stripe_subscription_id?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          status?: 'active' | 'canceled' | 'past_due' | 'unpaid'
          current_period_start?: string
          current_period_end?: string
          updated_at?: string
        }
      }
      trading_accounts: {
        Row: {
          id: string
          user_id: string
          broker_name: 'ic_markets' | 'pepperstone' | 'xm' | 'fxtm' | 'demo'
          account_id: string
          api_key?: string
          api_secret?: string
          account_balance: number
          currency: 'USD' | 'EUR' | 'GBP' | 'AUD' | 'PHP'
          leverage: number
          status: 'active' | 'inactive' | 'error'
          last_sync: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          broker_name: 'ic_markets' | 'pepperstone' | 'xm' | 'fxtm' | 'demo'
          account_id: string
          api_key?: string
          api_secret?: string
          account_balance?: number
          currency?: 'USD' | 'EUR' | 'GBP' | 'AUD' | 'PHP'
          leverage?: number
          status?: 'active' | 'inactive' | 'error'
          last_sync?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          broker_name?: 'ic_markets' | 'pepperstone' | 'xm' | 'fxtm' | 'demo'
          account_id?: string
          api_key?: string
          api_secret?: string
          account_balance?: number
          currency?: 'USD' | 'EUR' | 'GBP' | 'AUD' | 'PHP'
          leverage?: number
          status?: 'active' | 'inactive' | 'error'
          last_sync?: string
          updated_at?: string
        }
      }
      auto_trade_settings: {
        Row: {
          id: string
          user_id: string
          trading_account_id: string
          enabled: boolean
          risk_per_trade: number
          max_concurrent_trades: number
          max_daily_trades: number
          stop_loss_mode: 'signal' | 'percentage' | 'fixed_amount'
          take_profit_mode: 'signal' | 'percentage' | 'fixed_amount'
          trading_hours_start: string
          trading_hours_end: string
          max_drawdown_percentage: number
          emergency_stop: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          trading_account_id: string
          enabled?: boolean
          risk_per_trade?: number
          max_concurrent_trades?: number
          max_daily_trades?: number
          stop_loss_mode?: 'signal' | 'percentage' | 'fixed_amount'
          take_profit_mode?: 'signal' | 'percentage' | 'fixed_amount'
          trading_hours_start?: string
          trading_hours_end?: string
          max_drawdown_percentage?: number
          emergency_stop?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          risk_per_trade?: number
          max_concurrent_trades?: number
          max_daily_trades?: number
          stop_loss_mode?: 'signal' | 'percentage' | 'fixed_amount'
          take_profit_mode?: 'signal' | 'percentage' | 'fixed_amount'
          trading_hours_start?: string
          trading_hours_end?: string
          max_drawdown_percentage?: number
          emergency_stop?: boolean
          updated_at?: string
        }
      }
      trade_executions: {
        Row: {
          id: string
          signal_id: string
          user_id: string
          trading_account_id: string
          symbol: string
          trade_type: 'buy' | 'sell'
          lot_size: number
          entry_price: number
          stop_loss?: number
          take_profit?: number
          status: 'pending' | 'filled' | 'cancelled' | 'closed'
          broker_order_id?: string
          actual_entry_price?: number
          actual_exit_price?: number
          profit_loss?: number
          commission?: number
          swap?: number
          execution_time?: string
          close_time?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          signal_id: string
          user_id: string
          trading_account_id: string
          symbol: string
          trade_type: 'buy' | 'sell'
          lot_size: number
          entry_price: number
          stop_loss?: number
          take_profit?: number
          status?: 'pending' | 'filled' | 'cancelled' | 'closed'
          broker_order_id?: string
          actual_entry_price?: number
          actual_exit_price?: number
          profit_loss?: number
          commission?: number
          swap?: number
          execution_time?: string
          close_time?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          status?: 'pending' | 'filled' | 'cancelled' | 'closed'
          broker_order_id?: string
          actual_entry_price?: number
          actual_exit_price?: number
          profit_loss?: number
          commission?: number
          swap?: number
          execution_time?: string
          close_time?: string
          updated_at?: string
        }
      }
      broker_symbols: {
        Row: {
          id: string
          broker_name: string
          symbol: string
          digits: number
          point: number
          contract_size: number
          min_lot: number
          max_lot: number
          lot_step: number
          tick_value: number
          tick_size: number
          margin_required: number
          last_updated: string
          created_at: string
        }
        Insert: {
          id?: string
          broker_name: string
          symbol: string
          digits?: number
          point?: number
          contract_size?: number
          min_lot?: number
          max_lot?: number
          lot_step?: number
          tick_value?: number
          tick_size?: number
          margin_required?: number
          last_updated?: string
          created_at?: string
        }
        Update: {
          digits?: number
          point?: number
          contract_size?: number
          min_lot?: number
          max_lot?: number
          lot_step?: number
          tick_value?: number
          tick_size?: number
          margin_required?: number
          last_updated?: string
        }
      }
    }
    Views: {
      trading_account_summary: {
        Row: {
          id: string
          user_id: string
          broker_name: string
          account_id: string
          account_balance: number
          currency: string
          leverage: number
          status: string
          last_sync: string
          auto_trade_enabled?: boolean
          risk_per_trade?: number
          max_concurrent_trades?: number
          total_trades: number
          open_trades: number
          total_profit_loss: number
          win_rate: number
        }
      }
    }
  }
}
