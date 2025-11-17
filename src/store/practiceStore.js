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
  },

  // Create a recurring practice series
  createRecurringPractice: async (practiceData, recurrenceOptions) => {
    try {
      const { pattern, days, endDate, count } = recurrenceOptions

      // Create the parent recurring practice
      const parentData = {
        ...practiceData,
        is_recurring: true,
        recurrence_pattern: pattern,
        recurrence_days: days || null,
        recurrence_end_date: endDate || null,
        recurrence_count: count || null
      }

      const { data: parentPractice, error: parentError } = await supabase
        .from('practices')
        .insert([parentData])
        .select()
        .single()

      if (parentError) throw parentError

      // Generate instances based on recurrence pattern
      const instances = get().generateRecurrenceInstances(parentPractice, recurrenceOptions)

      if (instances.length > 0) {
        const { error: instancesError } = await supabase
          .from('practices')
          .insert(instances)

        if (instancesError) throw instancesError
      }

      await get().fetchPractices()
      toast.success(`Recurring practice created with ${instances.length} instances!`)
      return { success: true, data: parentPractice, instanceCount: instances.length }
    } catch (error) {
      console.error('Error creating recurring practice:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Generate individual practice instances from a recurring pattern
  generateRecurrenceInstances: (parentPractice, options) => {
    const { pattern, days, endDate, count } = options
    const instances = []
    const startDate = new Date(parentPractice.date)
    const maxInstances = count || 52 // Default max 52 instances (1 year of weekly)
    const endDateObj = endDate ? new Date(endDate) : null

    let currentDate = new Date(startDate)
    let instanceCount = 0

    // Helper to check if a date matches the pattern
    const shouldAddDate = (date) => {
      if (pattern === 'daily') return true
      if (pattern === 'weekly' || pattern === 'biweekly') {
        return days && days.includes(date.getDay())
      }
      if (pattern === 'monthly') {
        return date.getDate() === startDate.getDate()
      }
      return false
    }

    // Helper to advance date based on pattern
    const advanceDate = (date, skipWeeks = false) => {
      if (pattern === 'daily') {
        date.setDate(date.getDate() + 1)
      } else if (pattern === 'weekly') {
        if (skipWeeks) {
          // Move to next week's first selected day
          date.setDate(date.getDate() + 7)
          while (!shouldAddDate(date)) {
            date.setDate(date.getDate() + 1)
          }
        } else {
          date.setDate(date.getDate() + 1)
        }
      } else if (pattern === 'biweekly') {
        if (skipWeeks) {
          date.setDate(date.getDate() + 14)
          while (!shouldAddDate(date)) {
            date.setDate(date.getDate() + 1)
          }
        } else {
          date.setDate(date.getDate() + 1)
        }
      } else if (pattern === 'monthly') {
        date.setMonth(date.getMonth() + 1)
      }
    }

    // For weekly/biweekly, we need to track which week we're in
    let weekStartDate = new Date(startDate)
    weekStartDate.setDate(weekStartDate.getDate() - weekStartDate.getDay()) // Start of week

    // Skip the first date (it's the parent)
    advanceDate(currentDate)

    while (instanceCount < maxInstances) {
      // Check end date
      if (endDateObj && currentDate > endDateObj) break

      // For weekly/biweekly, check if we're in a valid week
      if (pattern === 'biweekly') {
        const weeksDiff = Math.floor((currentDate - weekStartDate) / (7 * 24 * 60 * 60 * 1000))
        if (weeksDiff % 2 !== 0) {
          // Skip this week entirely for biweekly
          currentDate.setDate(currentDate.getDate() + (7 - currentDate.getDay()))
          continue
        }
      }

      if (shouldAddDate(currentDate)) {
        const instance = {
          title: parentPractice.title,
          description: parentPractice.description,
          practice_type: parentPractice.practice_type,
          date: currentDate.toISOString().split('T')[0],
          start_time: parentPractice.start_time,
          end_time: parentPractice.end_time,
          location_name: parentPractice.location_name,
          location_address: parentPractice.location_address,
          location_lat: parentPractice.location_lat,
          location_lng: parentPractice.location_lng,
          max_capacity: parentPractice.max_capacity,
          status: 'scheduled',
          rsvp_deadline: parentPractice.rsvp_deadline,
          created_by: parentPractice.created_by,
          parent_practice_id: parentPractice.id,
          is_exception: false,
          original_date: currentDate.toISOString().split('T')[0]
        }
        instances.push(instance)
        instanceCount++
      }

      advanceDate(currentDate)

      // Safety check to prevent infinite loops
      if (currentDate > new Date(startDate.getTime() + 365 * 2 * 24 * 60 * 60 * 1000)) {
        break // Max 2 years out
      }
    }

    return instances
  },

  // Update a single instance (marks as exception)
  updateSingleInstance: async (id, updates) => {
    try {
      const { data, error } = await supabase
        .from('practices')
        .update({
          ...updates,
          is_exception: true
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      set((state) => ({
        practices: state.practices.map((p) =>
          p.id === id ? data : p
        )
      }))

      toast.success('This practice instance updated!')
      return { success: true }
    } catch (error) {
      console.error('Error updating practice instance:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Update entire series (parent + all future non-exception instances)
  updateEntireSeries: async (parentId, updates) => {
    try {
      // Update parent practice
      const { error: parentError } = await supabase
        .from('practices')
        .update(updates)
        .eq('id', parentId)

      if (parentError) throw parentError

      // Update all future non-exception instances
      const today = new Date().toISOString().split('T')[0]
      const { error: instancesError } = await supabase
        .from('practices')
        .update(updates)
        .eq('parent_practice_id', parentId)
        .eq('is_exception', false)
        .gte('date', today)

      if (instancesError) throw instancesError

      await get().fetchPractices()
      toast.success('Entire series updated!')
      return { success: true }
    } catch (error) {
      console.error('Error updating series:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Delete a single instance
  deleteSingleInstance: async (id) => {
    try {
      const { error } = await supabase
        .from('practices')
        .delete()
        .eq('id', id)

      if (error) throw error

      set((state) => ({
        practices: state.practices.filter((p) => p.id !== id)
      }))

      toast.success('Practice instance deleted!')
      return { success: true }
    } catch (error) {
      console.error('Error deleting practice instance:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Delete entire series (parent + all instances)
  deleteEntireSeries: async (parentId) => {
    try {
      // Deleting parent will cascade delete all instances due to FK constraint
      const { error } = await supabase
        .from('practices')
        .delete()
        .eq('id', parentId)

      if (error) throw error

      set((state) => ({
        practices: state.practices.filter((p) =>
          p.id !== parentId && p.parent_practice_id !== parentId
        )
      }))

      toast.success('Entire series deleted!')
      return { success: true }
    } catch (error) {
      console.error('Error deleting series:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Get parent practice for an instance
  getParentPractice: (instanceId) => {
    const instance = get().practices.find(p => p.id === instanceId)
    if (!instance || !instance.parent_practice_id) return null
    return get().practices.find(p => p.id === instance.parent_practice_id)
  },

  // Get all instances of a recurring series
  getSeriesInstances: (parentId) => {
    return get().practices.filter(p => p.parent_practice_id === parentId)
  }
}))
