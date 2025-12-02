import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export const useLineupStore = create((set, get) => ({
  lineups: [],
  currentLineup: null,
  loading: false,

  // Fetch all lineups
  fetchLineups: async () => {
    set({ loading: true })
    try {
      const { data, error } = await supabase
        .from('lineups')
        .select(`
          *,
          created_by_profile:profiles!lineups_created_by_fkey(id, full_name)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      set({ lineups: data || [] })
    } catch (error) {
      console.error('Error fetching lineups:', error)
      toast.error('Failed to load lineups')
    } finally {
      set({ loading: false })
    }
  },

  // Fetch single lineup
  fetchLineup: async (id) => {
    set({ loading: true })
    try {
      const { data, error } = await supabase
        .from('lineups')
        .select(`
          *,
          created_by_profile:profiles!lineups_created_by_fkey(id, full_name)
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      set({ currentLineup: data })
      return { success: true, data }
    } catch (error) {
      console.error('Error fetching lineup:', error)
      toast.error('Failed to load lineup')
      return { success: false, error }
    } finally {
      set({ loading: false })
    }
  },

  // Create new lineup
  createLineup: async (lineupData) => {
    try {
      const { data, error } = await supabase
        .from('lineups')
        .insert([lineupData])
        .select(`
          *,
          created_by_profile:profiles!lineups_created_by_fkey(id, full_name)
        `)
        .single()

      if (error) throw error

      set((state) => ({
        lineups: [data, ...state.lineups]
      }))

      toast.success('Lineup created successfully!')
      return { success: true, data }
    } catch (error) {
      console.error('Error creating lineup:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Update lineup
  updateLineup: async (id, updates) => {
    try {
      const { data, error } = await supabase
        .from('lineups')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          created_by_profile:profiles!lineups_created_by_fkey(id, full_name)
        `)
        .single()

      if (error) throw error

      set((state) => ({
        lineups: state.lineups.map((l) => (l.id === id ? data : l)),
        currentLineup: state.currentLineup?.id === id ? data : state.currentLineup
      }))

      toast.success('Lineup updated successfully!')
      return { success: true, data }
    } catch (error) {
      console.error('Error updating lineup:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Delete lineup
  deleteLineup: async (id) => {
    try {
      const { error } = await supabase
        .from('lineups')
        .delete()
        .eq('id', id)

      if (error) throw error

      set((state) => ({
        lineups: state.lineups.filter((l) => l.id !== id),
        currentLineup: state.currentLineup?.id === id ? null : state.currentLineup
      }))

      toast.success('Lineup deleted successfully!')
      return { success: true }
    } catch (error) {
      console.error('Error deleting lineup:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Set current lineup
  setCurrentLineup: (lineup) => {
    set({ currentLineup: lineup })
  },

  // Clear current lineup
  clearCurrentLineup: () => {
    set({ currentLineup: null })
  },

  // Fetch lineups for a specific practice
  fetchPracticeLineups: async (practiceId) => {
    try {
      const { data, error } = await supabase
        .from('lineups')
        .select(`
          *,
          created_by_profile:profiles!lineups_created_by_fkey(id, full_name)
        `)
        .eq('practice_id', practiceId)
        .order('created_at', { ascending: true })

      if (error) throw error
      return { success: true, data: data || [] }
    } catch (error) {
      console.error('Error fetching practice lineups:', error)
      return { success: false, error, data: [] }
    }
  },

  // Link existing lineup to practice
  linkLineupToPractice: async (lineupId, practiceId, boatName = null) => {
    try {
      const updates = { practice_id: practiceId }
      if (boatName) updates.boat_name = boatName

      const { data, error } = await supabase
        .from('lineups')
        .update(updates)
        .eq('id', lineupId)
        .select(`
          *,
          created_by_profile:profiles!lineups_created_by_fkey(id, full_name)
        `)
        .single()

      if (error) throw error

      set((state) => ({
        lineups: state.lineups.map((l) => (l.id === lineupId ? data : l)),
        currentLineup: state.currentLineup?.id === lineupId ? data : state.currentLineup
      }))

      toast.success('Lineup linked to practice!')
      return { success: true, data }
    } catch (error) {
      console.error('Error linking lineup to practice:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Unlink lineup from practice
  unlinkLineupFromPractice: async (lineupId) => {
    try {
      const { data, error } = await supabase
        .from('lineups')
        .update({ practice_id: null })
        .eq('id', lineupId)
        .select(`
          *,
          created_by_profile:profiles!lineups_created_by_fkey(id, full_name)
        `)
        .single()

      if (error) throw error

      set((state) => ({
        lineups: state.lineups.map((l) => (l.id === lineupId ? data : l)),
        currentLineup: state.currentLineup?.id === lineupId ? data : state.currentLineup
      }))

      toast.success('Lineup unlinked from practice')
      return { success: true, data }
    } catch (error) {
      console.error('Error unlinking lineup from practice:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Fetch lineups for a specific event
  fetchEventLineups: async (eventId) => {
    try {
      const { data, error } = await supabase
        .from('lineups')
        .select(`
          *,
          created_by_profile:profiles!lineups_created_by_fkey(id, full_name)
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: true })

      if (error) throw error
      return { success: true, data: data || [] }
    } catch (error) {
      console.error('Error fetching event lineups:', error)
      return { success: false, error, data: [] }
    }
  },

  // Link existing lineup to event
  linkLineupToEvent: async (lineupId, eventId, boatName = null) => {
    try {
      const updates = { event_id: eventId }
      if (boatName) updates.boat_name = boatName

      const { data, error } = await supabase
        .from('lineups')
        .update(updates)
        .eq('id', lineupId)
        .select(`
          *,
          created_by_profile:profiles!lineups_created_by_fkey(id, full_name)
        `)
        .single()

      if (error) throw error

      set((state) => ({
        lineups: state.lineups.map((l) => (l.id === lineupId ? data : l)),
        currentLineup: state.currentLineup?.id === lineupId ? data : state.currentLineup
      }))

      toast.success('Lineup linked to event!')
      return { success: true, data }
    } catch (error) {
      console.error('Error linking lineup to event:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Unlink lineup from event
  unlinkLineupFromEvent: async (lineupId) => {
    try {
      const { data, error } = await supabase
        .from('lineups')
        .update({ event_id: null })
        .eq('id', lineupId)
        .select(`
          *,
          created_by_profile:profiles!lineups_created_by_fkey(id, full_name)
        `)
        .single()

      if (error) throw error

      set((state) => ({
        lineups: state.lineups.map((l) => (l.id === lineupId ? data : l)),
        currentLineup: state.currentLineup?.id === lineupId ? data : state.currentLineup
      }))

      toast.success('Lineup unlinked from event')
      return { success: true, data }
    } catch (error) {
      console.error('Error unlinking lineup from event:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Toggle lineup visibility for members
  toggleLineupVisibility: async (lineupId, isVisible) => {
    try {
      const { data, error } = await supabase
        .from('lineups')
        .update({ is_visible_to_members: isVisible })
        .eq('id', lineupId)
        .select(`
          *,
          created_by_profile:profiles!lineups_created_by_fkey(id, full_name)
        `)
        .single()

      if (error) throw error

      set((state) => ({
        lineups: state.lineups.map((l) => (l.id === lineupId ? data : l)),
        currentLineup: state.currentLineup?.id === lineupId ? data : state.currentLineup
      }))

      toast.success(isVisible ? 'Lineup published to team' : 'Lineup hidden from team')
      return { success: true, data }
    } catch (error) {
      console.error('Error toggling lineup visibility:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  }
}))
