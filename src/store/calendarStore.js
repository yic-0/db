import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export const useCalendarStore = create((set, get) => ({
  prospectiveRaces: [],
  confirmedRaces: [],
  raceParticipants: [],
  calendarSettings: null,
  loading: false,

  // Fetch prospective races
  fetchProspectiveRaces: async () => {
    try {
      const { data, error } = await supabase
        .from('prospective_races')
        .select(`
          *,
          created_by_profile:profiles!prospective_races_created_by_fkey(id, full_name)
        `)
        .neq('status', 'cancelled')
        .order('race_date', { ascending: true })

      if (error) throw error
      set({ prospectiveRaces: data || [] })
    } catch (error) {
      console.error('Error fetching prospective races:', error)
      toast.error('Failed to load prospective races')
    }
  },

  // Fetch confirmed races
  fetchConfirmedRaces: async () => {
    try {
      const { data, error } = await supabase
        .from('confirmed_races')
        .select(`
          *,
          created_by_profile:profiles!confirmed_races_created_by_fkey(id, full_name),
          participants:race_participants(
            *,
            user_profile:profiles(id, full_name)
          )
        `)
        .order('race_date', { ascending: true })

      if (error) throw error
      set({ confirmedRaces: data || [] })
    } catch (error) {
      console.error('Error fetching confirmed races:', error)
      toast.error('Failed to load confirmed races')
    }
  },

  // Create prospective race
  createProspectiveRace: async (raceData) => {
    try {
      const { data, error } = await supabase
        .from('prospective_races')
        .insert([raceData])
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
      const { data, error } = await supabase
        .from('prospective_races')
        .update({ ...updates, updated_at: new Date().toISOString() })
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
        .from('prospective_races')
        .delete()
        .eq('id', id)

      if (error) throw error

      await get().fetchProspectiveRaces()
      toast.success('Prospective race deleted')
      return { success: true }
    } catch (error) {
      console.error('Error deleting prospective race:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Convert prospective race to confirmed
  convertToConfirmed: async (prospectiveRaceId, additionalData = {}) => {
    try {
      // Get the prospective race data
      const { data: prospectiveRace, error: fetchError } = await supabase
        .from('prospective_races')
        .select('*')
        .eq('id', prospectiveRaceId)
        .single()

      if (fetchError) throw fetchError

      // Create confirmed race from prospective
      const confirmedRaceData = {
        prospective_race_id: prospectiveRaceId,
        created_by: prospectiveRace.created_by,
        name: prospectiveRace.name,
        location: prospectiveRace.location,
        description: prospectiveRace.description,
        race_date: prospectiveRace.race_date,
        total_cost: prospectiveRace.estimated_cost,
        external_link: prospectiveRace.external_link,
        notes: prospectiveRace.notes,
        is_visible_to_members: true,
        ...additionalData
      }

      const { data: confirmedRace, error: createError } = await supabase
        .from('confirmed_races')
        .insert([confirmedRaceData])
        .select()
        .single()

      if (createError) throw createError

      // Update prospective race status to 'confirmed'
      const { error: updateError } = await supabase
        .from('prospective_races')
        .update({
          status: 'confirmed',
          updated_at: new Date().toISOString()
        })
        .eq('id', prospectiveRaceId)

      if (updateError) throw updateError

      // Refresh both lists
      await Promise.all([
        get().fetchProspectiveRaces(),
        get().fetchConfirmedRaces()
      ])

      toast.success('Race confirmed successfully!')
      return { success: true, data: confirmedRace }
    } catch (error) {
      console.error('Error converting race:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Create confirmed race directly
  createConfirmedRace: async (raceData) => {
    try {
      const { data, error } = await supabase
        .from('confirmed_races')
        .insert([raceData])
        .select()
        .single()

      if (error) throw error

      await get().fetchConfirmedRaces()
      toast.success('Confirmed race created!')
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
      const { data, error } = await supabase
        .from('confirmed_races')
        .update({ ...updates, updated_at: new Date().toISOString() })
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
        .from('confirmed_races')
        .delete()
        .eq('id', id)

      if (error) throw error

      await get().fetchConfirmedRaces()
      toast.success('Confirmed race deleted')
      return { success: true }
    } catch (error) {
      console.error('Error deleting confirmed race:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Join race as participant
  joinRace: async (raceId, userId) => {
    try {
      const { data, error } = await supabase
        .from('race_participants')
        .insert({
          confirmed_race_id: raceId,
          user_id: userId,
          status: 'interested'
        })
        .select()
        .single()

      if (error) throw error

      await get().fetchConfirmedRaces()
      toast.success('Registered interest in race!')
      return { success: true, data }
    } catch (error) {
      console.error('Error joining race:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Update participant status
  updateParticipantStatus: async (participantId, status) => {
    try {
      const { error } = await supabase
        .from('race_participants')
        .update({
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', participantId)

      if (error) throw error

      await get().fetchConfirmedRaces()
      toast.success('Status updated!')
      return { success: true }
    } catch (error) {
      console.error('Error updating participant status:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Leave race
  leaveRace: async (raceId, userId) => {
    try {
      const { error } = await supabase
        .from('race_participants')
        .delete()
        .eq('confirmed_race_id', raceId)
        .eq('user_id', userId)

      if (error) throw error

      await get().fetchConfirmedRaces()
      toast.success('Left race')
      return { success: true }
    } catch (error) {
      console.error('Error leaving race:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Fetch calendar settings for user
  fetchCalendarSettings: async (userId) => {
    try {
      const { data, error } = await supabase
        .from('calendar_settings')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows

      if (!data) {
        // Create default settings if none exist
        const { data: newSettings, error: createError } = await supabase
          .from('calendar_settings')
          .insert({
            user_id: userId,
            show_practices: true,
            show_confirmed_races: true,
            show_prospective_races: true,
            show_team_events: true,
            show_deadlines: true
          })
          .select()
          .single()

        if (createError) throw createError
        set({ calendarSettings: newSettings })
      } else {
        set({ calendarSettings: data })
      }
    } catch (error) {
      console.error('Error fetching calendar settings:', error)
    }
  },

  // Update calendar settings
  updateCalendarSettings: async (userId, settings) => {
    try {
      const { data, error } = await supabase
        .from('calendar_settings')
        .upsert({
          user_id: userId,
          ...settings,
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      set({ calendarSettings: data })
      toast.success('Calendar settings updated!')
      return { success: true }
    } catch (error) {
      console.error('Error updating calendar settings:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Toggle race visibility (admin/coach only)
  toggleRaceVisibility: async (raceId, isProspective, visible) => {
    try {
      const table = isProspective ? 'prospective_races' : 'confirmed_races'
      const { error } = await supabase
        .from(table)
        .update({
          is_visible_to_members: visible,
          updated_at: new Date().toISOString()
        })
        .eq('id', raceId)

      if (error) throw error

      if (isProspective) {
        await get().fetchProspectiveRaces()
      } else {
        await get().fetchConfirmedRaces()
      }

      toast.success(`Race visibility ${visible ? 'enabled' : 'disabled'}`)
      return { success: true }
    } catch (error) {
      console.error('Error toggling visibility:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Get upcoming deadlines
  getUpcomingDeadlines: () => {
    const { prospectiveRaces, confirmedRaces } = get()
    const today = new Date()
    const deadlines = []

    // Prospective race deadlines
    prospectiveRaces.forEach(race => {
      if (race.status === 'prospective') {
        if (race.early_bird_deadline && new Date(race.early_bird_deadline) >= today) {
          deadlines.push({
            type: 'Early Bird Deadline',
            raceName: race.name,
            date: new Date(race.early_bird_deadline),
            raceId: race.id,
            isProspective: true
          })
        }
        if (race.registration_deadline && new Date(race.registration_deadline) >= today) {
          deadlines.push({
            type: 'Registration Deadline',
            raceName: race.name,
            date: new Date(race.registration_deadline),
            raceId: race.id,
            isProspective: true
          })
        }
        if (race.payment_deadline && new Date(race.payment_deadline) >= today) {
          deadlines.push({
            type: 'Payment Deadline',
            raceName: race.name,
            date: new Date(race.payment_deadline),
            raceId: race.id,
            isProspective: true
          })
        }
      }
    })

    // Confirmed race deadlines
    confirmedRaces.forEach(race => {
      if (race.captains_meeting_date && new Date(race.captains_meeting_date) >= today) {
        deadlines.push({
          type: "Captain's Meeting",
          raceName: race.name,
          date: new Date(race.captains_meeting_date),
          raceId: race.id,
          isProspective: false
        })
      }
      if (race.team_briefing_date && new Date(race.team_briefing_date) >= today) {
        deadlines.push({
          type: 'Team Briefing',
          raceName: race.name,
          date: new Date(race.team_briefing_date),
          raceId: race.id,
          isProspective: false
        })
      }
      if (race.lineup_submission_deadline && new Date(race.lineup_submission_deadline) >= today) {
        deadlines.push({
          type: 'Lineup Submission',
          raceName: race.name,
          date: new Date(race.lineup_submission_deadline),
          raceId: race.id,
          isProspective: false
        })
      }
      if (race.payment_due_date && new Date(race.payment_due_date) >= today) {
        deadlines.push({
          type: 'Payment Due',
          raceName: race.name,
          date: new Date(race.payment_due_date),
          raceId: race.id,
          isProspective: false
        })
      }
    })

    // Sort by date
    return deadlines.sort((a, b) => a.date - b.date)
  },

  // Get all calendar events (for calendar view)
  getAllCalendarEvents: () => {
    const { prospectiveRaces, confirmedRaces, calendarSettings } = get()
    const events = []

    // Add prospective races
    if (calendarSettings?.show_prospective_races) {
      prospectiveRaces.forEach(race => {
        if (race.status === 'prospective') {
          events.push({
            id: `prospective-${race.id}`,
            title: race.name,
            date: race.race_date,
            type: 'prospective_race',
            color: '#FFA500', // Orange for prospective
            data: race
          })
        }
      })
    }

    // Add confirmed races
    if (calendarSettings?.show_confirmed_races) {
      confirmedRaces.forEach(race => {
        events.push({
          id: `confirmed-${race.id}`,
          title: race.name,
          date: race.race_date,
          type: 'confirmed_race',
          color: '#10B981', // Green for confirmed
          data: race
        })
      })
    }

    // Add deadlines
    if (calendarSettings?.show_deadlines) {
      const deadlines = get().getUpcomingDeadlines()
      deadlines.forEach(deadline => {
        events.push({
          id: `deadline-${deadline.raceId}-${deadline.type}`,
          title: `${deadline.type}: ${deadline.raceName}`,
          date: deadline.date.toISOString().split('T')[0],
          type: 'deadline',
          color: '#EF4444', // Red for deadlines
          data: deadline
        })
      })
    }

    return events
  }
}))
