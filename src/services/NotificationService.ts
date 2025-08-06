import { supabase } from '../lib/supabase'
import type { Database } from '../lib/supabase'

type Notification = Database['public']['Tables']['notifications']['Row']
type NotificationInsert = Database['public']['Tables']['notifications']['Insert']

class NotificationService {
  // Create notification
  async createNotification(notificationData: NotificationInsert): Promise<Notification | null> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          ...notificationData,
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating notification:', error)
      return null
    }
  }

  // Get user notifications
  async getUserNotifications(
    userId: string,
    page = 1,
    limit = 20,
    unreadOnly = false
  ): Promise<{ notifications: Notification[], count: number }> {
    try {
      const start = (page - 1) * limit
      const end = start + limit - 1

      let query = supabase
        .from('notifications')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)

      if (unreadOnly) {
        query = query.eq('read', false)
      }

      const { data, error, count } = await query
        .range(start, end)
        .order('created_at', { ascending: false })

      if (error) throw error
      return { notifications: data || [], count: count || 0 }
    } catch (error) {
      console.error('Error fetching user notifications:', error)
      return { notifications: [], count: 0 }
    }
  }

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error marking notification as read:', error)
      return false
    }
  }

  // Mark all user notifications as read
  async markAllAsRead(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      return false
    }
  }

  // Delete notification
  async deleteNotification(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error deleting notification:', error)
      return false
    }
  }

  // Get unread count
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false)

      if (error) throw error
      return count || 0
    } catch (error) {
      console.error('Error getting unread count:', error)
      return 0
    }
  }

  // Send bulk notifications
  async sendBulkNotifications(notifications: NotificationInsert[]): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert(notifications.map(n => ({
          ...n,
          created_at: new Date().toISOString(),
        })))

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error sending bulk notifications:', error)
      return false
    }
  }

  // Send system notification to all users
  async sendSystemNotification(
    title: string,
    message: string,
    subscriptionTierFilter?: string[]
  ): Promise<boolean> {
    try {
      // Get users to notify
      let query = supabase
        .from('users')
        .select('id, subscription_tier')
        .eq('subscription_status', 'active')

      if (subscriptionTierFilter && subscriptionTierFilter.length > 0) {
        query = query.in('subscription_tier', subscriptionTierFilter)
      }

      const { data: users, error: usersError } = await query

      if (usersError) throw usersError
      if (!users || users.length === 0) return true

      const notifications = users.map(user => ({
        user_id: user.id,
        type: 'system' as const,
        title,
        message,
      }))

      return await this.sendBulkNotifications(notifications)
    } catch (error) {
      console.error('Error sending system notification:', error)
      return false
    }
  }
}

export const notificationService = new NotificationService()
