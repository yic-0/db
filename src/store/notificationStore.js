import { create } from 'zustand'
import { supabase } from '../lib/supabase'

// VAPID public key - you'll need to generate this and set it in your environment
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || ''

// Convert base64 to Uint8Array for Web Push
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export const useNotificationStore = create((set, get) => ({
  // State
  isSupported: 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window,
  permission: 'Notification' in window ? Notification.permission : 'denied',
  subscription: null,
  preferences: null,
  isLoading: false,
  error: null,

  // Check if push notifications are available
  checkSupport: () => {
    const isSupported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window
    set({ isSupported })
    return isSupported
  },

  // Request notification permission
  requestPermission: async () => {
    if (!get().isSupported) {
      set({ error: 'Push notifications are not supported in this browser' })
      return false
    }

    try {
      const permission = await Notification.requestPermission()
      set({ permission })
      return permission === 'granted'
    } catch (error) {
      console.error('Error requesting notification permission:', error)
      set({ error: error.message })
      return false
    }
  },

  // Subscribe to push notifications
  subscribeToPush: async (userId) => {
    const { isSupported, permission } = get()

    if (!isSupported) {
      set({ error: 'Push notifications are not supported' })
      return null
    }

    if (permission !== 'granted') {
      const granted = await get().requestPermission()
      if (!granted) {
        set({ error: 'Notification permission denied' })
        return null
      }
    }

    if (!VAPID_PUBLIC_KEY) {
      console.warn('VAPID public key not configured - push notifications disabled')
      set({ error: 'Push notifications not configured' })
      return null
    }

    try {
      set({ isLoading: true, error: null })

      const registration = await navigator.serviceWorker.ready

      // Check for existing subscription
      let subscription = await registration.pushManager.getSubscription()

      if (!subscription) {
        // Create new subscription
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        })
      }

      const subscriptionData = subscription.toJSON()

      // Save to database
      const { data, error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: userId,
          endpoint: subscriptionData.endpoint,
          p256dh_key: subscriptionData.keys.p256dh,
          auth_key: subscriptionData.keys.auth,
          user_agent: navigator.userAgent,
          is_active: true,
          last_used_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,endpoint'
        })
        .select()
        .single()

      if (error) throw error

      set({ subscription: data, isLoading: false })
      return data
    } catch (error) {
      console.error('Error subscribing to push:', error)
      set({ error: error.message, isLoading: false })
      return null
    }
  },

  // Unsubscribe from push notifications
  unsubscribeFromPush: async (userId) => {
    try {
      set({ isLoading: true, error: null })

      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        await subscription.unsubscribe()
      }

      // Deactivate all subscriptions for this user
      const { error } = await supabase
        .from('push_subscriptions')
        .update({ is_active: false })
        .eq('user_id', userId)

      if (error) throw error

      set({ subscription: null, isLoading: false })
      return true
    } catch (error) {
      console.error('Error unsubscribing from push:', error)
      set({ error: error.message, isLoading: false })
      return false
    }
  },

  // Fetch notification preferences
  fetchPreferences: async (userId) => {
    try {
      set({ isLoading: true, error: null })

      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows

      // If no preferences exist, create default ones
      if (!data) {
        const { data: newData, error: insertError } = await supabase
          .from('notification_preferences')
          .insert({ user_id: userId })
          .select()
          .single()

        if (insertError) throw insertError
        set({ preferences: newData, isLoading: false })
        return newData
      }

      set({ preferences: data, isLoading: false })
      return data
    } catch (error) {
      console.error('Error fetching notification preferences:', error)
      set({ error: error.message, isLoading: false })
      return null
    }
  },

  // Update notification preferences
  updatePreferences: async (userId, updates) => {
    try {
      set({ isLoading: true, error: null })

      const { data, error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: userId,
          ...updates,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })
        .select()
        .single()

      if (error) throw error

      set({ preferences: data, isLoading: false })
      return data
    } catch (error) {
      console.error('Error updating notification preferences:', error)
      set({ error: error.message, isLoading: false })
      return null
    }
  },

  // Check current subscription status
  checkSubscription: async (userId) => {
    try {
      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') throw error

      set({ subscription: data || null })
      return data
    } catch (error) {
      console.error('Error checking subscription:', error)
      return null
    }
  },

  // Send a local notification (for testing or non-push notifications)
  showLocalNotification: async (title, options = {}) => {
    if (Notification.permission !== 'granted') {
      return false
    }

    try {
      const registration = await navigator.serviceWorker.ready
      await registration.showNotification(title, {
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        ...options
      })
      return true
    } catch (error) {
      console.error('Error showing notification:', error)
      return false
    }
  },

  // Clear error
  clearError: () => set({ error: null })
}))
