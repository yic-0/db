import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export const useRosterStore = create((set, get) => ({
  members: [],
  loading: false,
  filters: {
    search: '',
    role: 'all',
    skillLevel: 'all',
    isActive: true,
    showGuests: true, // Show/hide guest paddlers
  },

  // Fetch all team members
  fetchMembers: async () => {
    set({ loading: true })
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name', { ascending: true })

      if (error) throw error
      set({ members: data || [] })
    } catch (error) {
      console.error('Error fetching members:', error)
      toast.error('Failed to load team members')
    } finally {
      set({ loading: false })
    }
  },

  // Update member (admin only)
  updateMember: async (id, updates) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      set((state) => ({
        members: state.members.map((m) =>
          m.id === id ? data : m
        )
      }))

      toast.success('Member updated successfully!')
      return { success: true }
    } catch (error) {
      console.error('Error updating member:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Set filters
  setFilters: (filters) => {
    set((state) => ({
      filters: { ...state.filters, ...filters }
    }))
  },

  // Get filtered members
  getFilteredMembers: () => {
    const { members, filters } = get()

    return members.filter(member => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        const matchesSearch =
          member.full_name?.toLowerCase().includes(searchLower) ||
          member.email?.toLowerCase().includes(searchLower)

        if (!matchesSearch) return false
      }

      // Role filter
      if (filters.role !== 'all' && member.role !== filters.role) {
        return false
      }

      // Skill level filter
      if (filters.skillLevel !== 'all' && member.skill_level !== filters.skillLevel) {
        return false
      }

      // Active status filter
      if (member.is_active !== filters.isActive) {
        return false
      }

      // Guest filter
      if (!filters.showGuests && member.is_guest) {
        return false
      }

      return true
    })
  },

  // Get member stats
  getStats: () => {
    const members = get().members
    return {
      total: members.length,
      active: members.filter(m => m.is_active).length,
      guests: members.filter(m => m.is_guest).length,
      byRole: {
        admin: members.filter(m => m.role === 'admin').length,
        coach: members.filter(m => m.role === 'coach').length,
        captain: members.filter(m => m.role === 'captain').length,
        steersperson: members.filter(m => m.role === 'steersperson').length,
        member: members.filter(m => m.role === 'member').length,
      },
      bySkillLevel: {
        novice: members.filter(m => m.skill_level === 'novice').length,
        intermediate: members.filter(m => m.skill_level === 'intermediate').length,
        advanced: members.filter(m => m.skill_level === 'advanced').length,
        competitive: members.filter(m => m.skill_level === 'competitive').length,
      }
    }
  },

  // Add guest paddler (coach/admin only)
  addGuestMember: async (guestData) => {
    try {
      // Generate a UUID for the guest (since they don't have an auth account)
      const guestId = crypto.randomUUID()

      const { data, error } = await supabase
        .from('profiles')
        .insert({
          id: guestId, // Manually set UUID for guest
          full_name: guestData.full_name,
          weight_kg: guestData.weight_kg,
          skill_level: guestData.skill_level || 'novice',
          preferred_side: guestData.preferred_side || null,
          is_guest: true,
          is_active: true,
          role: 'member',
          email: `guest_${Date.now()}@temporary.local`, // Temporary unique email
        })
        .select()
        .single()

      if (error) throw error

      set((state) => ({
        members: [...state.members, data]
      }))

      toast.success(`Guest paddler "${guestData.full_name}" added!`)
      return { success: true, data }
    } catch (error) {
      console.error('Error adding guest member:', error)
      toast.error(error.message || 'Failed to add guest paddler')
      return { success: false, error }
    }
  },

  // Claim guest profile (when guest signs up for real account)
  claimGuestProfile: async (guestId, userId) => {
    try {
      // Get current user profile data
      const { data: userProfile, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (userError) throw userError

      // Get guest profile data
      const { data: guestProfile, error: guestError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', guestId)
        .single()

      if (guestError) throw guestError

      if (!guestProfile.is_guest) {
        toast.error('This profile is not a guest')
        return { success: false, error: 'Not a guest profile' }
      }

      // Update user profile with guest data (keep user's auth info, merge guest's paddling data)
      const { data: updated, error: updateError } = await supabase
        .from('profiles')
        .update({
          weight_kg: guestProfile.weight_kg,
          skill_level: guestProfile.skill_level,
          preferred_side: guestProfile.preferred_side,
          // Keep user's existing: email, full_name, role
        })
        .eq('id', userId)
        .select()
        .single()

      if (updateError) throw updateError

      // Delete the guest profile (data has been merged)
      const { error: deleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', guestId)

      if (deleteError) throw deleteError

      // Refresh members list
      await get().fetchMembers()

      toast.success('Guest profile claimed successfully!')
      return { success: true, data: updated }
    } catch (error) {
      console.error('Error claiming guest profile:', error)
      toast.error(error.message || 'Failed to claim guest profile')
      return { success: false, error }
    }
  },

  // Convert guest to regular member manually (admin action)
  convertGuestToMember: async (guestId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ is_guest: false })
        .eq('id', guestId)
        .select()
        .single()

      if (error) throw error

      set((state) => ({
        members: state.members.map((m) =>
          m.id === guestId ? data : m
        )
      }))

      toast.success('Guest converted to regular member!')
      return { success: true, data }
    } catch (error) {
      console.error('Error converting guest:', error)
      toast.error(error.message || 'Failed to convert guest')
      return { success: false, error }
    }
  },
}))
