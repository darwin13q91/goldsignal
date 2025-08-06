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
    }
  }
}
