import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export const usePracticeStore = create((set, get) => ({
  practices: [],
  rsvps: {},
  loading: false,

  // Fetch all practices
  fetchPractices: async () => {
    set({ loading: true })
    try {
      const { data, error } = await supabase
        .from('practices')
        .select('*')
        .order('date', { ascending: true })
        .order('start_time', { ascending: true })

      if (error) throw error
      set({ practices: data || [] })
    } catch (error) {
      console.error('Error fetching practices:', error)
      toast.error('Failed to load practices')
    } finally {
      set({ loading: false })
    }
  },

  // Fetch RSVPs for a specific practice
  fetchRSVPs: async (practiceId) => {
    try {
      const { data, error } = await supabase
        .from('rsvps')
        .select(`
          *,
          user:profiles!rsvps_user_id_fkey(id, full_name, email),
          checked_in_by_profile:profiles!rsvps_checked_in_by_fkey(id, full_name)
        `)
        .eq('practice_id', practiceId)

      if (error) throw error

      set((state) => ({
        rsvps: {
          ...state.rsvps,
          [practiceId]: data || []
        }
      }))
    } catch (error) {
      console.error('Error fetching RSVPs:', error)
    }
  },

  // Create a new practice
  createPractice: async (practiceData) => {
    try {
      const { data, error } = await supabase
        .from('practices')
        .insert([practiceData])
        .select()
        .single()

      if (error) throw error

      set((state) => ({
        practices: [...state.practices, data].sort((a, b) =>
          new Date(a.date) - new Date(b.date)
        )
      }))

      toast.success('Practice created successfully!')
      return { success: true, data }
    } catch (error) {
      console.error('Error creating practice:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Update a practice
  updatePractice: async (id, updates) => {
    try {
      const { data, error } = await supabase
        .from('practices')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      set((state) => ({
        practices: state.practices.map((p) =>
          p.id === id ? data : p
        )
      }))

      toast.success('Practice updated successfully!')
      return { success: true }
    } catch (error) {
      console.error('Error updating practice:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Delete a practice
  deletePractice: async (id) => {
    try {
      const { error } = await supabase
        .from('practices')
        .delete()
        .eq('id', id)

      if (error) throw error

      set((state) => ({
        practices: state.practices.filter((p) => p.id !== id)
      }))

      toast.success('Practice deleted successfully!')
      return { success: true }
    } catch (error) {
      console.error('Error deleting practice:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Create or update RSVP
  setRSVP: async (practiceId, userId, status, notes = '') => {
    try {
      console.log('Setting RSVP:', { practiceId, userId, status, notes })

      const { data, error } = await supabase
        .from('rsvps')
        .upsert({
          practice_id: practiceId,
          user_id: userId,
          status,
          notes,
          // Initialize attendance fields as null for new RSVPs
          attended: false,
          member_notes: null,
          checked_in_at: null,
          checked_in_by: null
        }, {
          onConflict: 'practice_id,user_id',
          ignoreDuplicates: false
        })
        .select()

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      console.log('RSVP set successfully:', data)

      // Refresh RSVPs for this practice
      await get().fetchRSVPs(practiceId)

      toast.success(`RSVP updated: ${status}`)
      return { success: true }
    } catch (error) {
      console.error('Error setting RSVP:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Get RSVP count for a practice
  getRSVPCount: (practiceId) => {
    const rsvps = get().rsvps[practiceId] || []
    return {
      yes: rsvps.filter(r => r.status === 'yes').length,
      no: rsvps.filter(r => r.status === 'no').length,
      maybe: rsvps.filter(r => r.status === 'maybe').length,
      total: rsvps.length
    }
  },

  // Get user's RSVP for a practice
  getUserRSVP: (practiceId, userId) => {
    const rsvps = get().rsvps[practiceId] || []
    return rsvps.find(r => r.user_id === userId)
  },

  // Update practice notes (coach notes)
  updatePracticeNotes: async (practiceId, notes) => {
    try {
      const { error } = await supabase
        .from('practices')
        .update({ coach_notes: notes })
        .eq('id', practiceId)

      if (error) throw error

      set((state) => ({
        practices: state.practices.map((p) =>
          p.id === practiceId ? { ...p, coach_notes: notes } : p
        )
      }))

      toast.success('Practice notes saved')
      return { success: true }
    } catch (error) {
      console.error('Error updating practice notes:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Mark attendance and add member notes
  updateAttendance: async (practiceId, userId, attended, memberNotes = '', checkedInBy = null) => {
    try {
      const updateData = {
        attended,
        member_notes: memberNotes,
        checked_in_at: attended ? new Date().toISOString() : null,
        checked_in_by: attended ? checkedInBy : null
      }

      const { error } = await supabase
        .from('rsvps')
        .update(updateData)
        .eq('practice_id', practiceId)
        .eq('user_id', userId)

      if (error) throw error

      // Refresh RSVPs for this practice
      await get().fetchRSVPs(practiceId)

      toast.success(attended ? 'Marked as attended' : 'Attendance removed')
      return { success: true }
    } catch (error) {
      console.error('Error updating attendance:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Add attendance for someone who didn't RSVP
  addAttendance: async (practiceId, userId, memberNotes = '', checkedInBy = null) => {
    try {
      // Don't set status - leave it NULL to indicate they didn't RSVP
      // This lets us track walk-ins vs. people who RSVP'd yes
      const { error } = await supabase
        .from('rsvps')
        .upsert({
          practice_id: practiceId,
          user_id: userId,
          status: null, // NULL = no RSVP, just walked in
          notes: null,
          attended: true,
          member_notes: memberNotes,
          checked_in_at: new Date().toISOString(),
          checked_in_by: checkedInBy
        }, {
          onConflict: 'practice_id,user_id'
        })

      if (error) throw error

      // Refresh RSVPs for this practice
      await get().fetchRSVPs(practiceId)

      toast.success('Attendance added (walk-in)')
      return { success: true }
    } catch (error) {
      console.error('Error adding attendance:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Fetch historical notes for a member across practices
  fetchMemberHistory: async (userId, limit = 5) => {
    try {
      const { data, error } = await supabase
        .from('rsvps')
        .select(`
          id,
          member_notes,
          checked_in_at,
          practice:practices(id, title, date, start_time)
        `)
        .eq('user_id', userId)
        .not('member_notes', 'is', null)
        .neq('member_notes', '')
        .order('checked_in_at', { ascending: false })
        .limit(limit)

      if (error) throw error

      return { success: true, data: data || [] }
    } catch (error) {
      console.error('Error fetching member history:', error)
      return { success: false, error, data: [] }
    }
  },

  // Update member notes only
  updateMemberNotes: async (practiceId, userId, memberNotes) => {
    try {
      const { error } = await supabase
        .from('rsvps')
        .update({ member_notes: memberNotes })
        .eq('practice_id', practiceId)
        .eq('user_id', userId)

      if (error) throw error

      // Refresh RSVPs for this practice
      await get().fetchRSVPs(practiceId)

      toast.success('Member notes saved')
      return { success: true }
    } catch (error) {
      console.error('Error updating member notes:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  }
}))
