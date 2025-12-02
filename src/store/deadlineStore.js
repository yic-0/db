import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export const useDeadlineStore = create((set, get) => ({
  deadlines: [],
  loading: false,

  // Fetch all deadlines
  fetchDeadlines: async () => {
    set({ loading: true })
    try {
      const { data, error } = await supabase
        .from('deadlines')
        .select(`
          *,
          event:events(id, title, event_date, event_type),
          created_by_profile:profiles!deadlines_created_by_fkey(id, full_name)
        `)
        .order('deadline_date', { ascending: true })

      if (error) throw error
      set({ deadlines: data || [] })
    } catch (error) {
      console.error('Error fetching deadlines:', error)
      // Don't show toast - table might not exist yet
    } finally {
      set({ loading: false })
    }
  },

  // Fetch deadlines for a specific event
  fetchDeadlinesForEvent: async (eventId) => {
    try {
      const { data, error } = await supabase
        .from('deadlines')
        .select('*')
        .eq('event_id', eventId)
        .order('deadline_date', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching event deadlines:', error)
      return []
    }
  },

  // Create deadline
  createDeadline: async (deadlineData) => {
    try {
      const { data: user } = await supabase.auth.getUser()

      const { data, error } = await supabase
        .from('deadlines')
        .insert([{
          ...deadlineData,
          created_by: user?.user?.id
        }])
        .select(`
          *,
          event:events(id, title, event_date, event_type)
        `)
        .single()

      if (error) throw error

      set((state) => ({
        deadlines: [...state.deadlines, data].sort((a, b) =>
          new Date(a.deadline_date) - new Date(b.deadline_date)
        )
      }))

      toast.success('Deadline created!')
      return { success: true, data }
    } catch (error) {
      console.error('Error creating deadline:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Update deadline
  updateDeadline: async (id, updates) => {
    try {
      const { data, error } = await supabase
        .from('deadlines')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select(`
          *,
          event:events(id, title, event_date, event_type)
        `)
        .single()

      if (error) throw error

      set((state) => ({
        deadlines: state.deadlines
          .map(d => d.id === id ? data : d)
          .sort((a, b) => new Date(a.deadline_date) - new Date(b.deadline_date))
      }))

      toast.success('Deadline updated!')
      return { success: true, data }
    } catch (error) {
      console.error('Error updating deadline:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Delete deadline
  deleteDeadline: async (id) => {
    try {
      const { error } = await supabase
        .from('deadlines')
        .delete()
        .eq('id', id)

      if (error) throw error

      set((state) => ({
        deadlines: state.deadlines.filter(d => d.id !== id)
      }))

      toast.success('Deadline deleted!')
      return { success: true }
    } catch (error) {
      console.error('Error deleting deadline:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Toggle visibility
  toggleDeadlineVisibility: async (id) => {
    const deadline = get().deadlines.find(d => d.id === id)
    if (!deadline) return { success: false }

    return get().updateDeadline(id, {
      is_visible_to_members: !deadline.is_visible_to_members
    })
  },

  // Get deadlines for calendar (visible ones for members, all for admin)
  getCalendarDeadlines: (isAdmin = false) => {
    const { deadlines } = get()
    if (isAdmin) return deadlines
    return deadlines.filter(d => d.is_visible_to_members)
  },

  // Get deadlines by event
  getDeadlinesByEvent: (eventId) => {
    return get().deadlines.filter(d => d.event_id === eventId)
  },

  // Get standalone deadlines (not associated with any event)
  getStandaloneDeadlines: () => {
    return get().deadlines.filter(d => !d.event_id)
  }
}))
