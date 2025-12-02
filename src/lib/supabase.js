import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env file.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Helper to refresh Supabase connection after tab becomes visible
// This helps prevent stale connections when browser suspends background tabs
export const refreshSupabaseConnection = async (timeoutMs = 5000) => {
  try {
    console.log('🔄 Refreshing Supabase connection...')

    // Add timeout since even refresh can hang when connection is stale
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Refresh timed out')), timeoutMs)
    })

    const refreshPromise = (async () => {
      const { data, error } = await supabase.auth.refreshSession()
      return { data, error }
    })()

    const { data, error } = await Promise.race([refreshPromise, timeoutPromise])

    if (error) {
      console.warn('Session refresh warning:', error.message)
    } else {
      console.log('✅ Supabase session refreshed')
    }
    return { success: !error, data, error }
  } catch (e) {
    console.error('Failed to refresh Supabase connection:', e)
    return { success: false, error: e }
  }
}

// Force reconnect by getting current session (lighter than full refresh)
export const pingSupabase = async (timeoutMs = 3000) => {
  try {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Ping timed out')), timeoutMs)
    })

    const pingPromise = supabase.auth.getSession()

    await Promise.race([pingPromise, timeoutPromise])
    return true
  } catch (e) {
    console.warn('Supabase ping failed:', e.message)
    return false
  }
}
