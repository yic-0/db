import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useSettingsStore = create((set, get) => ({
  settings: {},
  loading: false,

  // Fetch all settings
  fetchSettings: async () => {
    try {
      const { data, error } = await supabase
        .from('team_settings')
        .select('*')

      if (error) throw error

      // Convert array to object for easy access
      const settingsObj = {}
      data?.forEach(setting => {
        settingsObj[setting.setting_key] = setting.setting_value
      })

      set({ settings: settingsObj })
    } catch (error) {
      console.error('Error fetching settings:', error)
    }
  },

  // Update a setting
  updateSetting: async (key, value, userId) => {
    try {
      const { error } = await supabase
        .from('team_settings')
        .upsert({
          setting_key: key,
          setting_value: value,
          updated_by: userId
        }, {
          onConflict: 'setting_key'
        })

      if (error) throw error

      // Update local state
      set((state) => ({
        settings: {
          ...state.settings,
          [key]: value
        }
      }))

      return { success: true }
    } catch (error) {
      console.error('Error updating setting:', error)
      return { success: false, error }
    }
  },

  // Get a specific setting with default value
  getSetting: (key, defaultValue = null) => {
    const settings = get().settings
    return settings[key] !== undefined ? settings[key] : defaultValue
  }
}))
