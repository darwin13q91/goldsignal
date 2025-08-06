import { supabase } from '../lib/supabase'
import type { Database } from '../lib/supabase'

type Subscription = Database['public']['Tables']['subscriptions']['Row']
type SubscriptionInsert = Database['public']['Tables']['subscriptions']['Insert']
type SubscriptionUpdate = Database['public']['Tables']['subscriptions']['Update']

class SubscriptionCRUDService {
  // Create new subscription
  async createSubscription(subscriptionData: SubscriptionInsert): Promise<Subscription | null> {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .insert({
          ...subscriptionData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error

      // Update user subscription tier
      if (data) {
        await this.updateUserSubscriptionTier(data.user_id, data.plan_id, data.status)
      }

      return data
    } catch (error) {
      console.error('Error creating subscription:', error)
      return null
    }
  }

  // Get subscription by ID
  async getSubscriptionById(id: string): Promise<Subscription | null> {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching subscription:', error)
      return null
    }
  }

  // Get user's active subscription
  async getUserActiveSubscription(userId: string): Promise<Subscription | null> {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching user active subscription:', error)
      return null
    }
  }

  // Get all user subscriptions
  async getUserSubscriptions(userId: string): Promise<Subscription[]> {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching user subscriptions:', error)
      return []
    }
  }

  // Update subscription
  async updateSubscription(id: string, updates: SubscriptionUpdate): Promise<Subscription | null> {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      // Update user subscription tier if status changed
      if (data && updates.status) {
        await this.updateUserSubscriptionTier(data.user_id, data.plan_id, updates.status)
      }

      return data
    } catch (error) {
      console.error('Error updating subscription:', error)
      return null
    }
  }

  // Cancel subscription
  async cancelSubscription(id: string): Promise<boolean> {
    try {
      const subscription = await this.getSubscriptionById(id)
      if (!subscription) return false

      const { error } = await supabase
        .from('subscriptions')
        .update({
          status: 'canceled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (error) throw error

      // Update user to free tier
      await this.updateUserSubscriptionTier(subscription.user_id, 'free', 'canceled')

      return true
    } catch (error) {
      console.error('Error canceling subscription:', error)
      return false
    }
  }

  // Get all subscriptions with pagination
  async getAllSubscriptions(
    page = 1,
    limit = 10,
    filters?: {
      status?: Subscription['status']
      planId?: string
    }
  ): Promise<{ subscriptions: Subscription[], count: number }> {
    try {
      const start = (page - 1) * limit
      const end = start + limit - 1

      let query = supabase
        .from('subscriptions')
        .select('*', { count: 'exact' })

      if (filters?.status) {
        query = query.eq('status', filters.status)
      }
      if (filters?.planId) {
        query = query.eq('plan_id', filters.planId)
      }

      const { data, error, count } = await query
        .range(start, end)
        .order('created_at', { ascending: false })

      if (error) throw error
      return { subscriptions: data || [], count: count || 0 }
    } catch (error) {
      console.error('Error fetching subscriptions:', error)
      return { subscriptions: [], count: 0 }
    }
  }

  // Get subscription analytics
  async getSubscriptionAnalytics(): Promise<{
    totalActive: number
    totalCanceled: number
    totalRevenue: number
    planBreakdown: Record<string, number>
  }> {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('status, plan_id')

      if (error) throw error

      const subscriptions = data || []
      const totalActive = subscriptions.filter(s => s.status === 'active').length
      const totalCanceled = subscriptions.filter(s => s.status === 'canceled').length

      // Plan pricing (should match your actual plans)
      const planPrices: Record<string, number> = {
        'free': 0,
        'basic': 49,
        'premium': 99,
        'vip': 199,
      }

      const totalRevenue = subscriptions
        .filter(s => s.status === 'active')
        .reduce((sum, s) => sum + (planPrices[s.plan_id] || 0), 0)

      const planBreakdown = subscriptions
        .filter(s => s.status === 'active')
        .reduce((acc, s) => {
          acc[s.plan_id] = (acc[s.plan_id] || 0) + 1
          return acc
        }, {} as Record<string, number>)

      return {
        totalActive,
        totalCanceled,
        totalRevenue,
        planBreakdown,
      }
    } catch (error) {
      console.error('Error getting subscription analytics:', error)
      return {
        totalActive: 0,
        totalCanceled: 0,
        totalRevenue: 0,
        planBreakdown: {},
      }
    }
  }

  // Check for expired subscriptions
  async checkExpiredSubscriptions(): Promise<Subscription[]> {
    try {
      const now = new Date().toISOString()
      
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('status', 'active')
        .lt('current_period_end', now)

      if (error) throw error

      const expiredSubscriptions = data || []

      // Update expired subscriptions
      for (const subscription of expiredSubscriptions) {
        await this.updateSubscription(subscription.id, { status: 'past_due' })
      }

      return expiredSubscriptions
    } catch (error) {
      console.error('Error checking expired subscriptions:', error)
      return []
    }
  }

  // Private helper to update user subscription tier
  private async updateUserSubscriptionTier(
    userId: string,
    planId: string,
    status: Subscription['status']
  ): Promise<void> {
    try {
      let subscriptionTier: 'free' | 'basic' | 'premium' | 'vip' = 'free'
      const subscriptionStatus: 'active' | 'canceled' | 'past_due' = status === 'unpaid' ? 'past_due' : status

      if (status === 'active') {
        switch (planId) {
          case 'basic':
            subscriptionTier = 'basic'
            break
          case 'premium':
            subscriptionTier = 'premium'
            break
          case 'vip':
            subscriptionTier = 'vip'
            break
          default:
            subscriptionTier = 'free'
        }
      }

      await supabase
        .from('users')
        .update({
          subscription_tier: subscriptionTier,
          subscription_status: subscriptionStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
    } catch (error) {
      console.error('Error updating user subscription tier:', error)
    }
  }
}

export const subscriptionCRUDService = new SubscriptionCRUDService()
