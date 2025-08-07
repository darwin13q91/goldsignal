import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { User, Session } from '@supabase/supabase-js'
import type { Database } from '../lib/supabase'

type UserProfile = Database['public']['Tables']['users']['Row']

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string, fullName: string) => Promise<{ error?: string }>
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error?: string }>
}

export function useAuth(): AuthContextType {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUserProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        // If profile doesn't exist, create one
        if (error.code === 'PGRST116') {
          const user = await supabase.auth.getUser()
          if (user.data.user) {
            await createUserProfile(user.data.user)
          }
        }
        throw error
      }

      setProfile(data)
    } catch (err) {
      console.error('Error fetching user profile:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const createUserProfile = async (authUser: User) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert({
          id: authUser.id,
          email: authUser.email!,
          full_name: authUser.user_metadata?.full_name || '',
          subscription_tier: 'free',
          subscription_status: 'active',
        })
        .select()
        .single()

      if (error) throw error
      setProfile(data)
    } catch (err) {
      console.error('Error creating user profile:', err)
    }
  }

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchUserProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      
      if (session?.user) {
        await fetchUserProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [fetchUserProfile])

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      setLoading(true)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })

      if (error) {
        return { error: error.message }
      }

      // If signup was successful and user is created, create welcome notification
      if (data.user) {
        // Create welcome notification
        try {
          await supabase
            .from('notifications')
            .insert({
              user_id: data.user.id,
              title: '🎉 Welcome to Gold Signal Service!',
              message: `Hi ${fullName}! Welcome to our premium trading signal platform. You've successfully joined thousands of profitable traders. Start exploring our free signals and consider upgrading to Premium for unlimited access.`,
              type: 'welcome',
              is_read: false,
              created_at: new Date().toISOString()
            })
        } catch (notificationError) {
          console.log('Welcome notification creation failed:', notificationError)
          // Don't fail the signup process if notification fails
        }

        // Send welcome email using our email service
        try {
          const emailService = await import('../services/EmailNotificationService')
          await emailService.emailNotificationService.sendWelcomeEmail(
            email,
            'free'
          )
        } catch (emailError) {
          console.log('Welcome email failed:', emailError)
          // Don't fail the signup process if email fails
        }
      }

      return { user: data.user }
    } catch {
      return { error: 'An unexpected error occurred' }
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return { error: error.message }
      }

      return {}
    } catch {
      return { error: 'An unexpected error occurred' }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    setLoading(true)
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setSession(null)
    setLoading(false)
  }

  const updateProfile = async (updates: Partial<UserProfile>) => {
    try {
      if (!user) return { error: 'No user logged in' }

      const { error } = await supabase
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (error) {
        return { error: error.message }
      }

      // Refresh profile
      await fetchUserProfile(user.id)
      return {}
    } catch {
      return { error: 'An unexpected error occurred' }
    }
  }

  return {
    user,
    profile,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
  }
}
