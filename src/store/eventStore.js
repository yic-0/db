import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export const useEventStore = create((set, get) => ({
  events: [],
  rsvps: {}, // Keyed by event_id
  carpools: {}, // Keyed by event_id
  expenses: {}, // Keyed by event_id
  payments: {}, // Keyed by event_id
  waivers: {}, // Keyed by event_id
  waiver_signatures: {}, // Keyed by waiver_id
  races: {}, // Keyed by event_id
  tasks: {}, // Keyed by event_id
  loading: false,

  // Fetch all events
  fetchEvents: async () => {
    set({ loading: true })
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          created_by_profile:profiles!events_created_by_fkey(id, full_name)
        `)
        .order('event_date', { ascending: true })

      if (error) throw error
      set({ events: data || [] })
    } catch (error) {
      console.error('Error fetching events:', error)
      toast.error('Failed to load events')
    } finally {
      set({ loading: false })
    }
  },

  // Create new event
  createEvent: async (eventData) => {
    try {
      const { data, error } = await supabase
        .from('events')
        .insert([eventData])
        .select()
        .single()

      if (error) throw error

      set((state) => ({
        events: [...state.events, data]
      }))

      toast.success('Event created successfully!')
      return { success: true, data }
    } catch (error) {
      console.error('Error creating event:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Update event
  updateEvent: async (id, updates) => {
    try {
      const { data, error } = await supabase
        .from('events')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      set((state) => ({
        events: state.events.map((e) => e.id === id ? data : e)
      }))

      toast.success('Event updated successfully!')
      return { success: true }
    } catch (error) {
      console.error('Error updating event:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Delete event
  deleteEvent: async (id) => {
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id)

      if (error) throw error

      set((state) => ({
        events: state.events.filter((e) => e.id !== id)
      }))

      toast.success('Event deleted successfully!')
      return { success: true }
    } catch (error) {
      console.error('Error deleting event:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // RSVPs
  fetchRSVPs: async (eventId) => {
    try {
      const { data, error } = await supabase
        .from('event_rsvps')
        .select(`
          *,
          user_profile:profiles!event_rsvps_user_id_fkey(id, full_name, email, is_guest)
        `)
        .eq('event_id', eventId)

      if (error) throw error

      set((state) => ({
        rsvps: { ...state.rsvps, [eventId]: data || [] }
      }))
    } catch (error) {
      console.error('Error fetching RSVPs:', error)
      toast.error('Failed to load RSVPs')
    }
  },

  setRSVP: async (eventId, userId, status, role = null, notes = null) => {
    try {
      const { data, error } = await supabase
        .from('event_rsvps')
        .upsert({
          event_id: eventId,
          user_id: userId,
          status,
          role,
          response_notes: notes,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'event_id,user_id'
        })
        .select()
        .single()

      if (error) throw error

      // Refresh RSVPs for this event
      await get().fetchRSVPs(eventId)

      toast.success('RSVP updated!')
      return { success: true }
    } catch (error) {
      console.error('Error setting RSVP:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Carpools
  fetchCarpools: async (eventId) => {
    try {
      const { data, error } = await supabase
        .from('event_carpools')
        .select(`
          *,
          driver:profiles!event_carpools_driver_id_fkey(id, full_name, phone),
          passengers:event_carpool_passengers(
            *,
            passenger:profiles!event_carpool_passengers_passenger_id_fkey(id, full_name, phone)
          )
        `)
        .eq('event_id', eventId)

      if (error) throw error

      set((state) => ({
        carpools: { ...state.carpools, [eventId]: data || [] }
      }))
    } catch (error) {
      console.error('Error fetching carpools:', error)
      toast.error('Failed to load carpools')
    }
  },

  createCarpool: async (carpoolData) => {
    try {
      const { data, error } = await supabase
        .from('event_carpools')
        .insert([carpoolData])
        .select()
        .single()

      if (error) throw error

      // Refresh carpools for this event
      await get().fetchCarpools(carpoolData.event_id)

      toast.success('Carpool created!')
      return { success: true, data }
    } catch (error) {
      console.error('Error creating carpool:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  updateCarpool: async (id, eventId, updates) => {
    try {
      const { error } = await supabase
        .from('event_carpools')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error

      await get().fetchCarpools(eventId)
      toast.success('Carpool updated!')
      return { success: true }
    } catch (error) {
      console.error('Error updating carpool:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  joinCarpool: async (carpoolId, userId, eventId, pickupLocation = null) => {
    try {
      const { error } = await supabase
        .from('event_carpool_passengers')
        .insert({
          carpool_id: carpoolId,
          passenger_id: userId,
          pickup_location: pickupLocation,
          status: 'confirmed'
        })

      if (error) throw error

      await get().fetchCarpools(eventId)
      toast.success('Joined carpool!')
      return { success: true }
    } catch (error) {
      console.error('Error joining carpool:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  leaveCarpool: async (carpoolId, userId, eventId) => {
    try {
      const { error } = await supabase
        .from('event_carpool_passengers')
        .delete()
        .eq('carpool_id', carpoolId)
        .eq('passenger_id', userId)

      if (error) throw error

      await get().fetchCarpools(eventId)
      toast.success('Left carpool')
      return { success: true }
    } catch (error) {
      console.error('Error leaving carpool:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Expenses
  fetchExpenses: async (eventId) => {
    try {
      const { data, error } = await supabase
        .from('event_expenses')
        .select(`
          *,
          paid_by_profile:profiles!event_expenses_paid_by_fkey(id, full_name)
        `)
        .eq('event_id', eventId)

      if (error) throw error

      set((state) => ({
        expenses: { ...state.expenses, [eventId]: data || [] }
      }))
    } catch (error) {
      console.error('Error fetching expenses:', error)
      toast.error('Failed to load expenses')
    }
  },

  createExpense: async (expenseData) => {
    try {
      const { data, error } = await supabase
        .from('event_expenses')
        .insert([expenseData])
        .select()
        .single()

      if (error) throw error

      await get().fetchExpenses(expenseData.event_id)
      toast.success('Expense added!')
      return { success: true, data }
    } catch (error) {
      console.error('Error creating expense:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Payments
  fetchPayments: async (eventId) => {
    try {
      const { data, error } = await supabase
        .from('event_payments')
        .select(`
          *,
          user_profile:profiles!event_payments_user_id_fkey(id, full_name),
          expense:event_expenses(description, amount)
        `)
        .eq('event_id', eventId)

      if (error) throw error

      set((state) => ({
        payments: { ...state.payments, [eventId]: data || [] }
      }))
    } catch (error) {
      console.error('Error fetching payments:', error)
      toast.error('Failed to load payments')
    }
  },

  recordPayment: async (paymentData) => {
    try {
      const { data, error } = await supabase
        .from('event_payments')
        .insert([paymentData])
        .select()
        .single()

      if (error) throw error

      await get().fetchPayments(paymentData.event_id)
      toast.success('Payment recorded!')
      return { success: true, data }
    } catch (error) {
      console.error('Error recording payment:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Waivers
  fetchWaivers: async (eventId) => {
    try {
      const { data, error } = await supabase
        .from('event_waivers')
        .select('*')
        .eq('event_id', eventId)

      if (error) throw error

      set((state) => ({
        waivers: { ...state.waivers, [eventId]: data || [] }
      }))

      // Fetch signatures for each waiver
      for (const waiver of data || []) {
        await get().fetchWaiverSignatures(waiver.id)
      }
    } catch (error) {
      console.error('Error fetching waivers:', error)
      toast.error('Failed to load waivers')
    }
  },

  fetchWaiverSignatures: async (waiverId) => {
    try {
      const { data, error } = await supabase
        .from('event_waiver_signatures')
        .select(`
          *,
          user_profile:profiles!event_waiver_signatures_user_id_fkey(id, full_name)
        `)
        .eq('waiver_id', waiverId)

      if (error) throw error

      set((state) => ({
        waiver_signatures: { ...state.waiver_signatures, [waiverId]: data || [] }
      }))
    } catch (error) {
      console.error('Error fetching waiver signatures:', error)
    }
  },

  signWaiver: async (waiverId, userId) => {
    try {
      const { error } = await supabase
        .from('event_waiver_signatures')
        .insert({
          waiver_id: waiverId,
          user_id: userId
        })

      if (error) throw error

      await get().fetchWaiverSignatures(waiverId)
      toast.success('Waiver signed!')
      return { success: true }
    } catch (error) {
      console.error('Error signing waiver:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Races
  fetchRaces: async (eventId) => {
    try {
      const { data, error } = await supabase
        .from('event_races')
        .select(`
          *,
          lineup:lineups(*)
        `)
        .eq('event_id', eventId)
        .order('race_number', { ascending: true })

      if (error) throw error

      set((state) => ({
        races: { ...state.races, [eventId]: data || [] }
      }))
    } catch (error) {
      console.error('Error fetching races:', error)
      toast.error('Failed to load race schedule')
    }
  },

  createRace: async (raceData) => {
    try {
      const { data, error } = await supabase
        .from('event_races')
        .insert([raceData])
        .select()
        .single()

      if (error) throw error

      await get().fetchRaces(raceData.event_id)
      toast.success('Race added!')
      return { success: true, data }
    } catch (error) {
      console.error('Error creating race:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  updateRace: async (id, eventId, updates) => {
    try {
      const { error } = await supabase
        .from('event_races')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error

      await get().fetchRaces(eventId)
      toast.success('Race updated!')
      return { success: true }
    } catch (error) {
      console.error('Error updating race:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Tasks
  fetchTasks: async (eventId) => {
    try {
      const { data, error } = await supabase
        .from('event_tasks')
        .select(`
          *,
          assigned_to_profile:profiles!event_tasks_assigned_to_fkey(id, full_name),
          completed_by_profile:profiles!event_tasks_completed_by_fkey(id, full_name)
        `)
        .eq('event_id', eventId)
        .order('due_date', { ascending: true })

      if (error) throw error

      set((state) => ({
        tasks: { ...state.tasks, [eventId]: data || [] }
      }))
    } catch (error) {
      console.error('Error fetching tasks:', error)
      toast.error('Failed to load tasks')
    }
  },

  createTask: async (taskData) => {
    try {
      const { data, error } = await supabase
        .from('event_tasks')
        .insert([taskData])
        .select()
        .single()

      if (error) throw error

      await get().fetchTasks(taskData.event_id)
      toast.success('Task added!')
      return { success: true, data }
    } catch (error) {
      console.error('Error creating task:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  toggleTask: async (id, eventId, completed, userId) => {
    try {
      const updates = {
        completed,
        updated_at: new Date().toISOString()
      }

      if (completed) {
        updates.completed_at = new Date().toISOString()
        updates.completed_by = userId
      } else {
        updates.completed_at = null
        updates.completed_by = null
      }

      const { error } = await supabase
        .from('event_tasks')
        .update(updates)
        .eq('id', id)

      if (error) throw error

      await get().fetchTasks(eventId)
      return { success: true }
    } catch (error) {
      console.error('Error toggling task:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  }
}))
