import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,
  loading: true,

  // Initialize auth state
  initialize: async () => {
    try {
      // Check for existing session
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        await get().fetchProfile(session.user.id)
        set({ user: session.user, loading: false })
      } else {
        set({ user: null, profile: null, loading: false })
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          await get().fetchProfile(session.user.id)
          set({ user: session.user })
        } else {
          set({ user: null, profile: null })
        }
      })
    } catch (error) {
      console.error('Error initializing auth:', error)
      set({ loading: false })
    }
  },

  // Fetch user profile
  fetchProfile: async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      set({ profile: data })
    } catch (error) {
      console.error('Error fetching profile:', error)
    }
  },

  // Sign up
  signUp: async (email, password, fullName) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          }
        }
      })

      if (error) throw error

      // Profile is automatically created by database trigger!
      // No need to manually insert

      toast.success('Account created! Please check your email to verify.')
      return { success: true }
    } catch (error) {
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Sign in
  signIn: async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      toast.success('Welcome back!')
      return { success: true }
    } catch (error) {
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Sign out
  signOut: async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error

      set({ user: null, profile: null })
      toast.success('Signed out successfully')
      return { success: true }
    } catch (error) {
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Update profile
  updateProfile: async (updates) => {
    try {
      const userId = get().user?.id
      if (!userId) throw new Error('No user logged in')

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single()

      if (error) throw error

      set({ profile: data })
      toast.success('Profile updated successfully')
      return { success: true }
    } catch (error) {
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Check if user has role
  hasRole: (role) => {
    const profile = get().profile
    if (!profile) return false

    const adminRoles = ['admin', 'coach', 'captain']
    if (role === 'admin') return adminRoles.includes(profile.role)

    return profile.role === role
  },
}))

// Initialize auth when store is created
useAuthStore.getState().initialize()
