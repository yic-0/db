import { create } from 'zustand'
import { supabase, refreshSupabaseConnection } from '../lib/supabase'
import toast from 'react-hot-toast'
import { usePracticeStore } from './practiceStore'

export const useEventStore = create((set, get) => ({
  events: [],
  rsvps: {}, // Keyed by event_id
  carpools: {}, // Keyed by event_id
  expenses: {}, // Keyed by event_id
  payments: {}, // Keyed by event_id
  waivers: {}, // Keyed by event_id
  waiver_signatures: {}, // Keyed by waiver_id
  races: {}, // Keyed by event_id
  teams: {}, // Keyed by event_id - teams for multi-boat events
  teamMembers: {}, // Keyed by team_id
  tasks: {}, // Keyed by event_id
  loading: false,

  // Fetch all events (including races - unified system)
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
      // Convert empty strings to null for time fields
      const cleanedData = { ...eventData }
      const timeFields = ['start_time', 'end_time', 'arrival_time', 'captains_meeting_time']
      timeFields.forEach(field => {
        if (cleanedData[field] === '') {
          cleanedData[field] = null
        }
      })
      // Also handle registration_deadline
      if (cleanedData.registration_deadline === '') {
        cleanedData.registration_deadline = null
      }

      const { data, error } = await supabase
        .from('events')
        .insert([cleanedData])
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

  // Upload photo to event
  uploadEventPhoto: async (eventId, file, caption = '') => {
    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${eventId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

      // Upload to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('event-photos')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('event-photos')
        .getPublicUrl(fileName)

      const photoUrl = urlData.publicUrl

      // Get current event to update photos array
      const { data: event, error: fetchError } = await supabase
        .from('events')
        .select('photos')
        .eq('id', eventId)
        .single()

      if (fetchError) throw fetchError

      const currentPhotos = event.photos || []
      const newPhoto = {
        id: Math.random().toString(36).substring(7),
        url: photoUrl,
        storage_path: fileName,
        caption,
        uploaded_at: new Date().toISOString()
      }

      const updatedPhotos = [...currentPhotos, newPhoto]

      // Update event with new photos array
      const { error: updateError } = await supabase
        .from('events')
        .update({ photos: updatedPhotos, updated_at: new Date().toISOString() })
        .eq('id', eventId)

      if (updateError) throw updateError

      // Update local state
      set((state) => ({
        events: state.events.map((e) =>
          e.id === eventId ? { ...e, photos: updatedPhotos } : e
        )
      }))

      toast.success('Photo uploaded!')
      return { success: true, photo: newPhoto }
    } catch (error) {
      console.error('Error uploading photo:', error)
      toast.error('Failed to upload photo')
      return { success: false, error }
    }
  },

  // Delete photo from event
  deleteEventPhoto: async (eventId, photoId, storagePath) => {
    try {
      // Delete from storage if path provided
      if (storagePath) {
        await supabase.storage
          .from('event-photos')
          .remove([storagePath])
      }

      // Get current event photos
      const { data: event, error: fetchError } = await supabase
        .from('events')
        .select('photos')
        .eq('id', eventId)
        .single()

      if (fetchError) throw fetchError

      const currentPhotos = event.photos || []
      const updatedPhotos = currentPhotos.filter((p) => p.id !== photoId)

      // Update event
      const { error: updateError } = await supabase
        .from('events')
        .update({ photos: updatedPhotos, updated_at: new Date().toISOString() })
        .eq('id', eventId)

      if (updateError) throw updateError

      // Update local state
      set((state) => ({
        events: state.events.map((e) =>
          e.id === eventId ? { ...e, photos: updatedPhotos } : e
        )
      }))

      toast.success('Photo deleted!')
      return { success: true }
    } catch (error) {
      console.error('Error deleting photo:', error)
      toast.error('Failed to delete photo')
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

  // RSVPs - Now using unified system from practiceStore
  fetchRSVPs: async (eventId) => {
    try {
      // Use the unified RSVP system from practiceStore
      const { fetchEventRSVPs } = usePracticeStore.getState()
      const data = await fetchEventRSVPs(eventId)

      // Also store in eventStore for backwards compatibility
      set((state) => ({
        rsvps: { ...state.rsvps, [eventId]: data }
      }))
    } catch (error) {
      console.error('Error fetching RSVPs:', error)
      toast.error('Failed to load RSVPs')
    }
  },

  setRSVP: async (eventId, userId, status, role = null, notes = null) => {
    try {
      // Map legacy statuses but keep 'interested' as separate status
      let unifiedStatus = status
      if (status === 'registered' || status === 'confirmed') {
        unifiedStatus = 'yes'
      } else if (status === 'declined') {
        unifiedStatus = 'no'
      } else if (status === 'waitlist') {
        unifiedStatus = 'maybe'
      }
      // 'interested', 'yes', 'maybe', 'no' pass through unchanged

      // Use the unified RSVP system from practiceStore
      const { setEventRSVP } = usePracticeStore.getState()
      const result = await setEventRSVP(eventId, userId, unifiedStatus, role, notes)

      if (result.success) {
        // Refresh RSVPs for this event
        await get().fetchRSVPs(eventId)
      }

      return result
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
      console.log('📦 eventStore.updateCarpool: Starting update...')

      // Add timeout to prevent hanging when Supabase connection is stale
      let timeoutId = null
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          console.log('📦 eventStore.updateCarpool: TIMEOUT after 10 seconds')
          reject(new Error('Request timed out. Please try again.'))
        }, 10000)
      })

      // Wrap Supabase call in a proper Promise (Supabase returns a thenable, not a real Promise)
      const updatePromise = (async () => {
        console.log('📦 eventStore.updateCarpool: Sending to Supabase...')
        const result = await supabase
          .from('event_carpools')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', id)
        console.log('📦 eventStore.updateCarpool: Supabase responded', result)
        return result
      })()

      const { error } = await Promise.race([updatePromise, timeoutPromise])

      // Clear timeout if we got a response
      if (timeoutId) clearTimeout(timeoutId)

      console.log('📦 eventStore.updateCarpool: Update complete', { error })

      if (error) throw error

      await get().fetchCarpools(eventId)
      toast.success('Carpool updated!')
      return { success: true }
    } catch (error) {
      console.error('Error updating carpool:', error)

      // If timeout, try refreshing connection and retry once
      if (error.message?.includes('timed out')) {
        console.log('📦 eventStore.updateCarpool: Timeout detected, refreshing connection and retrying...')
        toast.loading('Connection stale, reconnecting...', { id: 'carpool-retry' })

        try {
          const refreshResult = await refreshSupabaseConnection()

          if (!refreshResult.success) {
            console.log('📦 Refresh failed, auto-reloading page')
            toast.loading('Connection lost. Reloading...', { id: 'carpool-retry' })
            // Auto-reload after a brief delay so user sees the message
            setTimeout(() => window.location.reload(), 1500)
            return { success: false, error: new Error('Connection lost') }
          }

          console.log('📦 Retrying update after refresh...')

          // Retry the update with its own timeout
          let retryTimeoutId = null
          const retryTimeoutPromise = new Promise((_, reject) => {
            retryTimeoutId = setTimeout(() => reject(new Error('Retry timed out')), 10000)
          })

          const retryPromise = (async () => {
            const result = await supabase
              .from('event_carpools')
              .update({ ...updates, updated_at: new Date().toISOString() })
              .eq('id', id)
            return result
          })()

          const { error: retryError } = await Promise.race([retryPromise, retryTimeoutPromise])
          if (retryTimeoutId) clearTimeout(retryTimeoutId)

          if (retryError) throw retryError

          await get().fetchCarpools(eventId)
          toast.success('Carpool updated!', { id: 'carpool-retry' })
          return { success: true }
        } catch (retryError) {
          console.error('Retry also failed:', retryError)
          toast.loading('Update failed. Reloading...', { id: 'carpool-retry' })
          // Auto-reload after a brief delay
          setTimeout(() => window.location.reload(), 1500)
          return { success: false, error: retryError }
        }
      }

      toast.error(error.message || 'Failed to update carpool')
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

  deleteCarpool: async (carpoolId, eventId) => {
    try {
      const { error } = await supabase
        .from('event_carpools')
        .delete()
        .eq('id', carpoolId)

      if (error) throw error

      await get().fetchCarpools(eventId)
      toast.success('Carpool deleted')
      return { success: true }
    } catch (error) {
      console.error('Error deleting carpool:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  toggleCarpoolVisibility: async (carpoolId, eventId, isVisible) => {
    try {
      const { error } = await supabase
        .from('event_carpools')
        .update({ is_visible: isVisible })
        .eq('id', carpoolId)

      if (error) throw error

      await get().fetchCarpools(eventId)
      toast.success(isVisible ? 'Carpool is now visible to paddlers' : 'Carpool hidden from paddlers')
      return { success: true }
    } catch (error) {
      console.error('Error toggling carpool visibility:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  addPassengerToCarpool: async (carpoolId, passengerId, eventId, pickupLocation = null) => {
    try {
      const { error } = await supabase
        .from('event_carpool_passengers')
        .insert({
          carpool_id: carpoolId,
          passenger_id: passengerId,
          pickup_location: pickupLocation
        })

      if (error) throw error

      await get().fetchCarpools(eventId)
      toast.success('Passenger added to carpool')
      return { success: true }
    } catch (error) {
      console.error('Error adding passenger:', error)
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
      // Try to fetch with team data first
      let { data, error } = await supabase
        .from('event_races')
        .select(`
          *,
          lineup:lineups(*),
          team:event_teams(id, team_name, team_color)
        `)
        .eq('event_id', eventId)
        .order('race_number', { ascending: true })

      // If error (likely because event_teams table doesn't exist), fallback to basic query
      if (error) {
        console.warn('Fetching races with team data failed, trying without:', error.message)
        const fallback = await supabase
          .from('event_races')
          .select(`
            *,
            lineup:lineups(*)
          `)
          .eq('event_id', eventId)
          .order('race_number', { ascending: true })

        if (fallback.error) throw fallback.error
        data = fallback.data
      }

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

  deleteRace: async (raceId, eventId) => {
    try {
      const { error } = await supabase
        .from('event_races')
        .delete()
        .eq('id', raceId)

      if (error) throw error

      await get().fetchRaces(eventId)
      toast.success('Race deleted')
      return { success: true }
    } catch (error) {
      console.error('Error deleting race:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Event Teams (for multi-boat events)
  fetchEventTeams: async (eventId) => {
    try {
      const { data, error } = await supabase
        .from('event_teams')
        .select(`
          *,
          members:event_team_members(
            *,
            profile:profiles(id, full_name)
          )
        `)
        .eq('event_id', eventId)
        .order('sort_order', { ascending: true })

      // If table doesn't exist yet, just return empty array silently
      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.warn('event_teams table does not exist yet - run migration')
          set((state) => ({
            teams: { ...state.teams, [eventId]: [] }
          }))
          return { success: true, data: [] }
        }
        throw error
      }

      set((state) => ({
        teams: { ...state.teams, [eventId]: data || [] }
      }))

      return { success: true, data: data || [] }
    } catch (error) {
      console.error('Error fetching event teams:', error)
      return { success: false, error, data: [] }
    }
  },

  createEventTeam: async (teamData) => {
    try {
      const { data, error } = await supabase
        .from('event_teams')
        .insert([teamData])
        .select()
        .single()

      if (error) throw error

      await get().fetchEventTeams(teamData.event_id)
      toast.success('Team created!')
      return { success: true, data }
    } catch (error) {
      console.error('Error creating event team:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  updateEventTeam: async (teamId, eventId, updates) => {
    try {
      const { error } = await supabase
        .from('event_teams')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', teamId)

      if (error) throw error

      await get().fetchEventTeams(eventId)
      toast.success('Team updated!')
      return { success: true }
    } catch (error) {
      console.error('Error updating event team:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  deleteEventTeam: async (teamId, eventId) => {
    try {
      const { error } = await supabase
        .from('event_teams')
        .delete()
        .eq('id', teamId)

      if (error) throw error

      await get().fetchEventTeams(eventId)
      toast.success('Team deleted')
      return { success: true }
    } catch (error) {
      console.error('Error deleting event team:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  addTeamMember: async (teamId, userId, eventId, role = 'paddler') => {
    try {
      const { error } = await supabase
        .from('event_team_members')
        .insert({
          team_id: teamId,
          user_id: userId,
          role
        })

      if (error) throw error

      await get().fetchEventTeams(eventId)
      toast.success('Member added to team!')
      return { success: true }
    } catch (error) {
      console.error('Error adding team member:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  removeTeamMember: async (teamId, userId, eventId) => {
    try {
      const { error } = await supabase
        .from('event_team_members')
        .delete()
        .eq('team_id', teamId)
        .eq('user_id', userId)

      if (error) throw error

      await get().fetchEventTeams(eventId)
      toast.success('Member removed from team')
      return { success: true }
    } catch (error) {
      console.error('Error removing team member:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  updateTeamMemberRole: async (teamId, userId, eventId, positionRole) => {
    try {
      // Automatically exclude drummers and steerers from paddler count
      const exclude_from_count = positionRole === 'drummer' || positionRole === 'steerer'

      const { error } = await supabase
        .from('event_team_members')
        .update({
          position_role: positionRole,
          exclude_from_count
        })
        .eq('team_id', teamId)
        .eq('user_id', userId)

      if (error) throw error

      await get().fetchEventTeams(eventId)
      return { success: true }
    } catch (error) {
      console.error('Error updating team member role:', error)
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
  },

  // Toggle event visibility (admin/coach/manager only)
  toggleEventVisibility: async (id, isVisible) => {
    try {
      const { data, error } = await supabase
        .from('events')
        .update({
          is_visible_to_members: isVisible,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      set((state) => ({
        events: state.events.map((e) => e.id === id ? data : e)
      }))

      toast.success(isVisible ? 'Event is now visible to members' : 'Event is now hidden from members')
      return { success: true }
    } catch (error) {
      console.error('Error toggling event visibility:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // ==================== PACKING LIST ====================
  packingItems: {}, // Keyed by event_id

  fetchPackingItems: async (eventId) => {
    try {
      const { data, error } = await supabase
        .from('event_packing_items')
        .select('*')
        .eq('event_id', eventId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })

      if (error) throw error

      set((state) => ({
        packingItems: { ...state.packingItems, [eventId]: data || [] }
      }))
      return { success: true, data }
    } catch (error) {
      console.error('Error fetching packing items:', error)
      return { success: false, error }
    }
  },

  addPackingItem: async (eventId, item) => {
    try {
      const { data, error } = await supabase
        .from('event_packing_items')
        .insert({
          event_id: eventId,
          item_name: item.item_name,
          is_required: item.is_required ?? true,
          category: item.category || 'general',
          notes: item.notes || null,
          sort_order: item.sort_order || 0
        })
        .select()
        .single()

      if (error) throw error

      set((state) => ({
        packingItems: {
          ...state.packingItems,
          [eventId]: [...(state.packingItems[eventId] || []), data]
        }
      }))
      toast.success('Item added to packing list')
      return { success: true, data }
    } catch (error) {
      console.error('Error adding packing item:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  updatePackingItem: async (itemId, eventId, updates) => {
    try {
      const { data, error } = await supabase
        .from('event_packing_items')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', itemId)
        .select()
        .single()

      if (error) throw error

      set((state) => ({
        packingItems: {
          ...state.packingItems,
          [eventId]: state.packingItems[eventId]?.map(item =>
            item.id === itemId ? data : item
          ) || []
        }
      }))
      return { success: true, data }
    } catch (error) {
      console.error('Error updating packing item:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  deletePackingItem: async (itemId, eventId) => {
    try {
      const { error } = await supabase
        .from('event_packing_items')
        .delete()
        .eq('id', itemId)

      if (error) throw error

      set((state) => ({
        packingItems: {
          ...state.packingItems,
          [eventId]: state.packingItems[eventId]?.filter(item => item.id !== itemId) || []
        }
      }))
      toast.success('Item removed from packing list')
      return { success: true }
    } catch (error) {
      console.error('Error deleting packing item:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // ==================== TEAM REQUIREMENTS ====================

  // Update team requirements (stored directly on event_teams table)
  updateTeamRequirements: async (teamId, eventId, requirements) => {
    try {
      const { error } = await supabase
        .from('event_teams')
        .update({
          ...requirements,
          updated_at: new Date().toISOString()
        })
        .eq('id', teamId)

      if (error) throw error

      await get().fetchEventTeams(eventId)
      toast.success('Team requirements updated')
      return { success: true }
    } catch (error) {
      console.error('Error updating team requirements:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Validate a team/lineup against requirements
  validateAgainstRequirements: (members, requirements, eventDate) => {
    const issues = []
    const warnings = []

    if (!requirements || !members || members.length === 0) {
      return { valid: true, issues, warnings }
    }

    // Calculate member stats
    const stats = {
      total: members.length,
      paddlers: members.filter(m => !m.exclude_from_count).length,
      male: 0,
      female: 0,
      byMemberType: {
        corporate: 0,
        'friends-family': 0,
        'ex-corporate': 0,
        community: 0
      },
      minAge: Infinity,
      maxAge: 0,
      underAge: [],
      overAge: []
    }

    const referenceDate = eventDate ? new Date(eventDate) : new Date()

    members.forEach(member => {
      if (member.exclude_from_count) return // Skip drummers/steerers marked as exclude

      // Count gender
      if (member.gender === 'male') stats.male++
      else if (member.gender === 'female') stats.female++

      // Count member type
      const memberType = member.member_type || 'community'
      if (stats.byMemberType[memberType] !== undefined) {
        stats.byMemberType[memberType]++
      }

      // Calculate age if birthday provided
      if (member.birthday) {
        const birthDate = new Date(member.birthday)
        const age = Math.floor((referenceDate - birthDate) / (365.25 * 24 * 60 * 60 * 1000))
        if (age < stats.minAge) stats.minAge = age
        if (age > stats.maxAge) stats.maxAge = age

        if (requirements.min_age && age < requirements.min_age) {
          stats.underAge.push({ name: member.full_name, age })
        }
        if (requirements.max_age && age > requirements.max_age) {
          stats.overAge.push({ name: member.full_name, age })
        }
      }
    })

    // Validate paddler count
    if (requirements.min_paddlers && stats.paddlers < requirements.min_paddlers) {
      issues.push(`Need ${requirements.min_paddlers - stats.paddlers} more paddlers (min: ${requirements.min_paddlers})`)
    }
    if (requirements.max_paddlers && stats.paddlers > requirements.max_paddlers) {
      issues.push(`${stats.paddlers - requirements.max_paddlers} too many paddlers (max: ${requirements.max_paddlers})`)
    }

    // Validate gender
    if (requirements.min_female && stats.female < requirements.min_female) {
      issues.push(`Need ${requirements.min_female - stats.female} more female paddlers (min: ${requirements.min_female})`)
    }
    if (requirements.max_female && stats.female > requirements.max_female) {
      issues.push(`${stats.female - requirements.max_female} too many female paddlers (max: ${requirements.max_female})`)
    }
    if (requirements.min_male && stats.male < requirements.min_male) {
      issues.push(`Need ${requirements.min_male - stats.male} more male paddlers (min: ${requirements.min_male})`)
    }
    if (requirements.max_male && stats.male > requirements.max_male) {
      issues.push(`${stats.male - requirements.max_male} too many male paddlers (max: ${requirements.max_male})`)
    }

    // Validate 50:50 ratio
    if (requirements.gender_ratio === '50:50') {
      if (stats.male !== stats.female) {
        issues.push(`Gender ratio must be 50:50. Currently: ${stats.male}M / ${stats.female}F`)
      }
    }

    // Validate age
    if (stats.underAge.length > 0) {
      issues.push(`Under minimum age (${requirements.min_age}): ${stats.underAge.map(m => `${m.name} (${m.age})`).join(', ')}`)
    }
    if (stats.overAge.length > 0) {
      issues.push(`Over maximum age (${requirements.max_age}): ${stats.overAge.map(m => `${m.name} (${m.age})`).join(', ')}`)
    }

    // Validate member type (corporate only)
    if (requirements.corporate_only) {
      const nonCorporate = stats.byMemberType['friends-family'] + stats.byMemberType['ex-corporate'] + stats.byMemberType['community']
      if (nonCorporate > 0) {
        issues.push(`Corporate only race: ${nonCorporate} non-corporate members included`)
      }
    }

    // Validate allowed member types
    if (requirements.allowed_member_types && requirements.allowed_member_types.length > 0) {
      const disallowed = []
      Object.entries(stats.byMemberType).forEach(([type, count]) => {
        if (count > 0 && !requirements.allowed_member_types.includes(type)) {
          disallowed.push(`${count} ${type}`)
        }
      })
      if (disallowed.length > 0) {
        issues.push(`Member types not allowed: ${disallowed.join(', ')}`)
      }
    }

    return {
      valid: issues.length === 0,
      issues,
      warnings,
      stats
    }
  },

  // ==================== ACCOMMODATIONS ====================
  accommodations: {}, // Keyed by event_id

  fetchEventAccommodations: async (eventId) => {
    try {
      const { data, error } = await supabase
        .from('event_accommodations')
        .select(`
          *,
          rooms:event_accommodation_rooms(*),
          assignments:event_accommodation_assignments(
            *,
            profile:profiles(id, full_name, gender)
          )
        `)
        .eq('event_id', eventId)
        .order('sort_order', { ascending: true })

      if (error) throw error

      set((state) => ({
        accommodations: { ...state.accommodations, [eventId]: data || [] }
      }))
      return { success: true, data }
    } catch (error) {
      console.error('Error fetching accommodations:', error)
      return { success: false, error }
    }
  },

  createAccommodation: async (accommodationData) => {
    try {
      const { data, error } = await supabase
        .from('event_accommodations')
        .insert([accommodationData])
        .select()
        .single()

      if (error) throw error

      await get().fetchEventAccommodations(accommodationData.event_id)
      toast.success('Accommodation added!')
      return { success: true, data }
    } catch (error) {
      console.error('Error creating accommodation:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  updateAccommodation: async (id, eventId, updates) => {
    try {
      const { error } = await supabase
        .from('event_accommodations')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error

      await get().fetchEventAccommodations(eventId)
      toast.success('Accommodation updated!')
      return { success: true }
    } catch (error) {
      console.error('Error updating accommodation:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  deleteAccommodation: async (id, eventId) => {
    try {
      const { error } = await supabase
        .from('event_accommodations')
        .delete()
        .eq('id', id)

      if (error) throw error

      await get().fetchEventAccommodations(eventId)
      toast.success('Accommodation deleted')
      return { success: true }
    } catch (error) {
      console.error('Error deleting accommodation:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Room management
  createRoom: async (roomData, eventId) => {
    try {
      const { data, error } = await supabase
        .from('event_accommodation_rooms')
        .insert([roomData])
        .select()
        .single()

      if (error) throw error

      await get().fetchEventAccommodations(eventId)
      toast.success('Room added!')
      return { success: true, data }
    } catch (error) {
      console.error('Error creating room:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  deleteRoom: async (roomId, eventId) => {
    try {
      const { error } = await supabase
        .from('event_accommodation_rooms')
        .delete()
        .eq('id', roomId)

      if (error) throw error

      await get().fetchEventAccommodations(eventId)
      return { success: true }
    } catch (error) {
      console.error('Error deleting room:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Assignment management
  assignMemberToAccommodation: async (assignmentData) => {
    try {
      // Upsert - update if exists, insert if not
      const { data, error } = await supabase
        .from('event_accommodation_assignments')
        .upsert([assignmentData], {
          onConflict: 'event_id,user_id'
        })
        .select()
        .single()

      if (error) throw error

      await get().fetchEventAccommodations(assignmentData.event_id)
      toast.success('Member assigned!')
      return { success: true, data }
    } catch (error) {
      console.error('Error assigning member:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  removeAccommodationAssignment: async (assignmentId, eventId) => {
    try {
      const { error } = await supabase
        .from('event_accommodation_assignments')
        .delete()
        .eq('id', assignmentId)

      if (error) throw error

      await get().fetchEventAccommodations(eventId)
      toast.success('Assignment removed')
      return { success: true }
    } catch (error) {
      console.error('Error removing assignment:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  }
}))
