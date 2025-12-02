import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export const useCalendarStore = create((set, get) => ({
  // Unified races from events table
  prospectiveRaces: [], // Planning status races from events table
  confirmedRaces: [],   // Confirmed status races from events table
  calendarSettings: null,
  loading: false,

  // Fetch prospective races
  fetchProspectiveRaces: async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          created_by_profile:profiles!events_created_by_fkey(id, full_name)
        `)
        .eq('event_type', 'race')
        .eq('status', 'prospective')
        .order('event_date', { ascending: true })

      if (error) throw error

      // Map event fields to legacy race field names for backwards compatibility
      const mappedData = (data || []).map(event => ({
        ...event,
        name: event.title,
        race_date: event.event_date,
        external_link: event.event_url
      }))

      set({ prospectiveRaces: mappedData })
    } catch (error) {
      console.error('Error fetching prospective races:', error)
      toast.error('Failed to load prospective races')
    }
  },

  // Fetch confirmed races
  fetchConfirmedRaces: async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          created_by_profile:profiles!events_created_by_fkey(id, full_name)
        `)
        .eq('event_type', 'race')
        .in('status', ['confirmed', 'registration_open', 'in_progress', 'completed'])
        .order('event_date', { ascending: true })

      // Fetch participants (RSVPs) separately from unified rsvps table
      if (data && data.length > 0) {
        for (const event of data) {
          const { data: rsvpData } = await supabase
            .from('rsvps')
            .select(`
              *,
              user_profile:profiles!rsvps_user_id_fkey(id, full_name)
            `)
            .eq('event_id', event.id)

          event.participants = rsvpData || []
        }
      }

      if (error) throw error

      // Map event fields to legacy race field names for backwards compatibility
      const mappedData = (data || []).map(event => ({
        ...event,
        name: event.title,
        race_date: event.event_date,
        race_start_time: event.start_time,
        race_end_time: event.end_time,
        race_website: event.event_url,
        meeting_location: event.captains_meeting_location
      }))

      set({ confirmedRaces: mappedData })
    } catch (error) {
      console.error('Error fetching confirmed races:', error)
      toast.error('Failed to load confirmed races')
    }
  },

  // Create prospective race
  createProspectiveRace: async (raceData) => {
    try {
      // Map legacy fields to event fields
      const eventData = {
        title: raceData.name || raceData.title,
        event_type: 'race',
        event_date: raceData.race_date || raceData.event_date,
        location: raceData.location,
        description: raceData.description,
        status: 'prospective',
        event_url: raceData.external_link || raceData.event_url,
        registration_deadline: raceData.registration_deadline,
        notes: raceData.notes,
        created_by: raceData.created_by
      }

      const { data, error } = await supabase
        .from('events')
        .insert([eventData])
        .select()
        .single()

      if (error) throw error

      await get().fetchProspectiveRaces()
      toast.success('Prospective race added!')
      return { success: true, data }
    } catch (error) {
      console.error('Error creating prospective race:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Update prospective race
  updateProspectiveRace: async (id, updates) => {
    try {
      // Map legacy fields to event fields
      const eventUpdates = {
        ...updates,
        title: updates.name || updates.title,
        event_date: updates.race_date || updates.event_date,
        event_url: updates.external_link || updates.event_url,
        updated_at: new Date().toISOString()
      }

      // Remove legacy field names
      delete eventUpdates.name
      delete eventUpdates.race_date
      delete eventUpdates.external_link

      const { data, error } = await supabase
        .from('events')
        .update(eventUpdates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      await get().fetchProspectiveRaces()
      toast.success('Race updated!')
      return { success: true, data }
    } catch (error) {
      console.error('Error updating prospective race:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Delete prospective race
  deleteProspectiveRace: async (id) => {
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id)

      if (error) throw error

      await get().fetchProspectiveRaces()
      toast.success('Race deleted!')
      return { success: true }
    } catch (error) {
      console.error('Error deleting prospective race:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Create confirmed race
  createConfirmedRace: async (raceData) => {
    try {
      // Map legacy fields to event fields
      const eventData = {
        title: raceData.name || raceData.title,
        event_type: 'race',
        event_date: raceData.race_date || raceData.event_date,
        start_time: raceData.race_start_time,
        end_time: raceData.race_end_time,
        arrival_time: raceData.arrival_time,
        location: raceData.location,
        description: raceData.description,
        status: 'confirmed',
        event_url: raceData.race_website || raceData.event_url,
        captains_meeting_time: raceData.captains_meeting_time,
        captains_meeting_location: raceData.meeting_location,
        registration_deadline: raceData.lineup_submission_deadline || raceData.registration_deadline,
        notes: raceData.notes || raceData.registration_notes,
        created_by: raceData.created_by
      }

      const { data, error } = await supabase
        .from('events')
        .insert([eventData])
        .select()
        .single()

      if (error) throw error

      await get().fetchConfirmedRaces()
      toast.success('Confirmed race added!')
      return { success: true, data }
    } catch (error) {
      console.error('Error creating confirmed race:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Update confirmed race
  updateConfirmedRace: async (id, updates) => {
    try {
      // Map legacy fields to event fields
      const eventUpdates = {
        ...updates,
        title: updates.name || updates.title,
        event_date: updates.race_date || updates.event_date,
        start_time: updates.race_start_time || updates.start_time,
        end_time: updates.race_end_time || updates.end_time,
        event_url: updates.race_website || updates.event_url,
        captains_meeting_location: updates.meeting_location || updates.captains_meeting_location,
        updated_at: new Date().toISOString()
      }

      // Remove legacy field names
      delete eventUpdates.name
      delete eventUpdates.race_date
      delete eventUpdates.race_start_time
      delete eventUpdates.race_end_time
      delete eventUpdates.race_website
      delete eventUpdates.meeting_location

      const { data, error } = await supabase
        .from('events')
        .update(eventUpdates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      await get().fetchConfirmedRaces()
      toast.success('Race updated!')
      return { success: true, data }
    } catch (error) {
      console.error('Error updating confirmed race:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Delete confirmed race
  deleteConfirmedRace: async (id) => {
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id)

      if (error) throw error

      await get().fetchConfirmedRaces()
      toast.success('Race deleted!')
      return { success: true }
    } catch (error) {
      console.error('Error deleting confirmed race:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Convert prospective to confirmed
  convertToConfirmed: async (prospectiveRaceId, confirmedRaceData) => {
    try {
      // Just update the status to confirmed
      const { data, error } = await supabase
        .from('events')
        .update({
          status: 'confirmed',
          ...confirmedRaceData,
          updated_at: new Date().toISOString()
        })
        .eq('id', prospectiveRaceId)
        .select()
        .single()

      if (error) throw error

      await get().fetchProspectiveRaces()
      await get().fetchConfirmedRaces()
      toast.success('Race confirmed!')
      return { success: true, data }
    } catch (error) {
      console.error('Error converting race:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Toggle race visibility (for prospective races)
  toggleRaceVisibility: async (raceId, isVisible) => {
    try {
      const { data, error } = await supabase
        .from('events')
        .update({
          status: isVisible ? 'registration_open' : 'planning',
          updated_at: new Date().toISOString()
        })
        .eq('id', raceId)
        .select()
        .single()

      if (error) throw error

      await get().fetchProspectiveRaces()
      toast.success(isVisible ? 'Race is now visible to members' : 'Race hidden from members')
      return { success: true, data }
    } catch (error) {
      console.error('Error toggling race visibility:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Join a race (RSVP as interested/confirmed) - Now using unified system
  joinRace: async (raceId, userId, status = 'interested') => {
    try {
      // Convert status to yes/no/maybe format
      const unifiedStatus = status === 'interested' || status === 'registered' || status === 'confirmed' ? 'yes' : 'no'

      // First, check if RSVP exists
      const { data: existing } = await supabase
        .from('rsvps')
        .select('id')
        .eq('event_id', raceId)
        .eq('user_id', userId)
        .maybeSingle()

      let result
      if (existing) {
        // Update existing RSVP
        result = await supabase
          .from('rsvps')
          .update({
            status: unifiedStatus
          })
          .eq('event_id', raceId)
          .eq('user_id', userId)
          .select()
          .single()
      } else {
        // Insert new RSVP
        result = await supabase
          .from('rsvps')
          .insert({
            event_id: raceId,
            user_id: userId,
            status: unifiedStatus,
            registered_at: new Date().toISOString()
          })
          .select()
          .single()
      }

      const { data, error } = result

      if (error) throw error

      await get().fetchProspectiveRaces()
      await get().fetchConfirmedRaces()
      toast.success('RSVP updated!')
      return { success: true, data }
    } catch (error) {
      console.error('Error joining race:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Leave a race (remove RSVP) - Now using unified system
  leaveRace: async (raceId, userId) => {
    try {
      const { error } = await supabase
        .from('rsvps')
        .delete()
        .eq('event_id', raceId)
        .eq('user_id', userId)

      if (error) throw error

      await get().fetchProspectiveRaces()
      await get().fetchConfirmedRaces()
      toast.success('RSVP removed')
      return { success: true }
    } catch (error) {
      console.error('Error leaving race:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Get upcoming deadlines across all races
  getUpcomingDeadlines: () => {
    const allRaces = [...get().prospectiveRaces, ...get().confirmedRaces]
    const now = new Date()
    const deadlines = []

    allRaces.forEach(race => {
      if (race.registration_deadline) {
        const deadline = new Date(race.registration_deadline)
        if (deadline > now) {
          deadlines.push({
            type: 'registration',
            race: race.name || race.title,
            raceId: race.id,
            date: deadline
          })
        }
      }
    })

    return deadlines.sort((a, b) => a.date - b.date)
  },

  // Fetch calendar settings (placeholder for future settings)
  fetchCalendarSettings: async () => {
    // Initialize with default settings - all toggles enabled by default
    set({
      calendarSettings: {
        show_practices: true,
        show_confirmed_races: true,
        show_prospective_races: true,
        show_deadlines: true,
        show_team_events: true,
        show_workouts: true
      }
    })
  },

  // Update calendar settings (placeholder for future settings)
  updateCalendarSettings: async (settings) => {
    // Placeholder - can be implemented if needed
    set({ calendarSettings: settings })
    return { success: true }
  }
}))
