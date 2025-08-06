import { supabase } from '../lib/supabase'
import type { Database } from '../lib/supabase'

type User = Database['public']['Tables']['users']['Row']
type UserInsert = Database['public']['Tables']['users']['Insert']
type UserUpdate = Database['public']['Tables']['users']['Update']

class UserService {
  // Create new user
  async createUser(userData: UserInsert): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert(userData)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating user:', error)
      return null
    }
  }

  // Get user by ID
  async getUserById(id: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching user:', error)
      return null
    }
  }

  // Get user by email
  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching user by email:', error)
      return null
    }
  }

  // Update user
  async updateUser(id: string, updates: UserUpdate): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating user:', error)
      return null
    }
  }

  // Delete user
  async deleteUser(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error deleting user:', error)
      return false
    }
  }

  // Get all users (admin only)
  async getAllUsers(page = 1, limit = 10): Promise<{ users: User[], count: number }> {
    try {
      const start = (page - 1) * limit
      const end = start + limit - 1

      const { data, error, count } = await supabase
        .from('users')
        .select('*', { count: 'exact' })
        .range(start, end)
        .order('created_at', { ascending: false })

      if (error) throw error
      return { users: data || [], count: count || 0 }
    } catch (error) {
      console.error('Error fetching users:', error)
      return { users: [], count: 0 }
    }
  }

  // Update subscription
  async updateSubscription(userId: string, subscriptionData: {
    subscription_tier: User['subscription_tier']
    subscription_status: User['subscription_status']
    subscription_end_date?: string
  }): Promise<User | null> {
    return this.updateUser(userId, subscriptionData)
  }

  // Get users by subscription tier
  async getUsersBySubscriptionTier(tier: User['subscription_tier']): Promise<User[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('subscription_tier', tier)
        .eq('subscription_status', 'active')

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching users by subscription tier:', error)
      return []
    }
  }
}

export const userService = new UserService()
