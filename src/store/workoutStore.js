import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export const useWorkoutStore = create((set, get) => ({
  workoutLogs: [],
  workoutTypes: [],
  programs: [],
  challenges: [],
  resources: [],
  streaks: {},
  enrollments: [],
  assignments: [],
  loading: false,

  // Exercise Library
  exerciseCategories: [],
  exercises: [],
  exerciseCompletions: [],
  trainingPlans: [],

  // Practice Drills
  drillCategories: [],
  drills: [],

  // Training Challenges System (new)
  trainingChallenges: [],
  challengeEnrollments: [],
  weeklyAssignments: [],
  teamWeeklyCompletions: [],

  // Fetch workout types
  fetchWorkoutTypes: async () => {
    try {
      const { data, error } = await supabase
        .from('workout_types')
        .select('*')
        .order('name')

      if (error) throw error
      set({ workoutTypes: data || [] })
    } catch (error) {
      console.error('Error fetching workout types:', error)
    }
  },

  // Fetch workout logs (with filters)
  fetchWorkoutLogs: async (userId = null, startDate = null, endDate = null) => {
    set({ loading: true })
    try {
      let query = supabase
        .from('workout_logs')
        .select(`
          *,
          user_profile:profiles!workout_logs_user_id_fkey(id, full_name, is_guest),
          workout_type:workout_types(name, icon, color)
        `)
        .order('workout_date', { ascending: false })

      if (userId) {
        query = query.eq('user_id', userId)
      }
      if (startDate) {
        query = query.gte('workout_date', startDate)
      }
      if (endDate) {
        query = query.lte('workout_date', endDate)
      }

      const { data, error } = await query

      if (error) throw error
      set({ workoutLogs: data || [] })
    } catch (error) {
      console.error('Error fetching workout logs:', error)
      toast.error('Failed to load workout logs')
    } finally {
      set({ loading: false })
    }
  },

  // Log a workout
  logWorkout: async (workoutData) => {
    try {
      const { data, error } = await supabase
        .from('workout_logs')
        .insert([workoutData])
        .select()
        .single()

      if (error) throw error

      // Refresh workout logs
      await get().fetchWorkoutLogs(workoutData.user_id)

      toast.success('Workout logged!')
      return { success: true, data }
    } catch (error) {
      console.error('Error logging workout:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Update workout log
  updateWorkout: async (id, userId, updates) => {
    try {
      const { error } = await supabase
        .from('workout_logs')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error

      await get().fetchWorkoutLogs(userId)
      toast.success('Workout updated!')
      return { success: true }
    } catch (error) {
      console.error('Error updating workout:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Delete workout log
  deleteWorkout: async (id, userId) => {
    try {
      const { error } = await supabase
        .from('workout_logs')
        .delete()
        .eq('id', id)

      if (error) throw error

      await get().fetchWorkoutLogs(userId)
      toast.success('Workout deleted')
      return { success: true }
    } catch (error) {
      console.error('Error deleting workout:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Fetch workout programs
  fetchPrograms: async () => {
    try {
      const { data, error } = await supabase
        .from('workout_programs')
        .select(`
          *,
          created_by_profile:profiles!workout_programs_created_by_fkey(id, full_name),
          checklists:workout_checklists(*)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      set({ programs: data || [] })
    } catch (error) {
      console.error('Error fetching programs:', error)
      toast.error('Failed to load workout programs')
    }
  },

  // Create workout program
  createProgram: async (programData) => {
    try {
      const { data, error } = await supabase
        .from('workout_programs')
        .insert([programData])
        .select()
        .single()

      if (error) throw error

      await get().fetchPrograms()
      toast.success('Program created!')
      return { success: true, data }
    } catch (error) {
      console.error('Error creating program:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Add checklist item to program
  addChecklistItem: async (checklistData) => {
    try {
      const { data, error } = await supabase
        .from('workout_checklists')
        .insert([checklistData])
        .select()
        .single()

      if (error) throw error

      await get().fetchPrograms()
      toast.success('Exercise added!')
      return { success: true, data }
    } catch (error) {
      console.error('Error adding checklist item:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Enroll in program
  enrollInProgram: async (programId, userId) => {
    try {
      const { data, error } = await supabase
        .from('workout_program_enrollments')
        .insert({
          program_id: programId,
          user_id: userId
        })
        .select()
        .single()

      if (error) throw error

      await get().fetchEnrollments(userId)
      toast.success('Enrolled in program!')
      return { success: true, data }
    } catch (error) {
      console.error('Error enrolling in program:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Fetch user enrollments
  fetchEnrollments: async (userId) => {
    try {
      const { data, error } = await supabase
        .from('workout_program_enrollments')
        .select(`
          *,
          program:workout_programs(
            *,
            checklists:workout_checklists(*)
          )
        `)
        .eq('user_id', userId)
        .eq('is_active', true)

      if (error) throw error
      set({ enrollments: data || [] })
    } catch (error) {
      console.error('Error fetching enrollments:', error)
    }
  },

  // Complete checklist item
  completeChecklistItem: async (completionData) => {
    try {
      const { data, error } = await supabase
        .from('workout_checklist_completions')
        .upsert({
          ...completionData,
          completed: true,
          completed_at: new Date().toISOString()
        }, {
          onConflict: 'checklist_id,user_id,workout_date'
        })
        .select()
        .single()

      if (error) throw error

      toast.success('Exercise completed!')
      return { success: true, data }
    } catch (error) {
      console.error('Error completing checklist item:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Fetch challenges
  fetchChallenges: async () => {
    try {
      const { data, error } = await supabase
        .from('workout_challenges')
        .select(`
          *,
          participants:workout_challenge_participants(
            *,
            user_profile:profiles(id, full_name)
          )
        `)
        .eq('is_active', true)
        .order('start_date', { ascending: false })

      if (error) throw error
      set({ challenges: data || [] })
    } catch (error) {
      console.error('Error fetching challenges:', error)
      toast.error('Failed to load challenges')
    }
  },

  // Create challenge
  createChallenge: async (challengeData) => {
    try {
      const { data, error } = await supabase
        .from('workout_challenges')
        .insert([challengeData])
        .select()
        .single()

      if (error) throw error

      await get().fetchChallenges()
      toast.success('Challenge created!')
      return { success: true, data }
    } catch (error) {
      console.error('Error creating challenge:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Join challenge
  joinChallenge: async (challengeId, userId) => {
    try {
      const { data, error } = await supabase
        .from('workout_challenge_participants')
        .insert({
          challenge_id: challengeId,
          user_id: userId
        })
        .select()
        .single()

      if (error) throw error

      await get().fetchChallenges()
      toast.success('Joined challenge!')
      return { success: true, data }
    } catch (error) {
      console.error('Error joining challenge:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Update challenge progress
  updateChallengeProgress: async (participantId, currentValue) => {
    try {
      const { error } = await supabase
        .from('workout_challenge_participants')
        .update({ current_value: currentValue })
        .eq('id', participantId)

      if (error) throw error

      await get().fetchChallenges()
      toast.success('Progress updated!')
      return { success: true }
    } catch (error) {
      console.error('Error updating challenge progress:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Fetch workout resources
  fetchResources: async () => {
    try {
      const { data, error } = await supabase
        .from('workout_resources')
        .select(`
          *,
          created_by_profile:profiles!workout_resources_created_by_fkey(id, full_name)
        `)
        .eq('is_active', true)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error
      set({ resources: data || [] })
    } catch (error) {
      console.error('Error fetching resources:', error)
      toast.error('Failed to load resources')
    }
  },

  // Create workout resource
  createResource: async (resourceData) => {
    try {
      const { data, error } = await supabase
        .from('workout_resources')
        .insert([resourceData])
        .select()
        .single()

      if (error) throw error

      await get().fetchResources()
      toast.success('Resource added!')
      return { success: true, data }
    } catch (error) {
      console.error('Error creating resource:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Fetch workout streaks
  fetchStreaks: async () => {
    try {
      const { data, error } = await supabase
        .from('workout_streaks')
        .select(`
          *,
          user_profile:profiles(id, full_name)
        `)
        .order('current_streak', { ascending: false })

      if (error) throw error

      // Convert to object keyed by user_id
      const streaksObj = {}
      data.forEach(streak => {
        streaksObj[streak.user_id] = streak
      })

      set({ streaks: streaksObj })
    } catch (error) {
      console.error('Error fetching streaks:', error)
    }
  },

  // Get user streak
  getUserStreak: (userId) => {
    return get().streaks[userId] || {
      current_streak: 0,
      longest_streak: 0,
      total_workouts: 0
    }
  },

  // Get workout stats for user
  getWorkoutStats: (userId) => {
    const logs = get().workoutLogs.filter(log => log.user_id === userId)

    const totalWorkouts = logs.length
    const totalDuration = logs.reduce((sum, log) => sum + (log.duration_minutes || 0), 0)
    const totalDistance = logs.reduce((sum, log) => sum + (parseFloat(log.distance_km) || 0), 0)

    const workoutsByType = {}
    logs.forEach(log => {
      const typeName = log.workout_type?.name || 'Unknown'
      workoutsByType[typeName] = (workoutsByType[typeName] || 0) + 1
    })

    return {
      totalWorkouts,
      totalDuration,
      totalDistance,
      workoutsByType
    }
  },

  // Fetch workout assignments
  fetchAssignments: async (userId = null, date = null) => {
    try {
      let query = supabase
        .from('workout_assignments')
        .select(`
          *,
          assigned_to_profile:profiles!workout_assignments_assigned_to_fkey(id, full_name),
          created_by_profile:profiles!workout_assignments_created_by_fkey(id, full_name),
          workout_type:workout_types(name, icon, color),
          workout_log:workout_logs(*)
        `)
        .order('assigned_date', { ascending: false })

      if (userId) {
        query = query.eq('assigned_to', userId)
      }
      if (date) {
        query = query.eq('assigned_date', date)
      }

      const { data, error } = await query

      if (error) throw error
      set({ assignments: data || [] })
    } catch (error) {
      console.error('Error fetching assignments:', error)
      toast.error('Failed to load assignments')
    }
  },

  // Create workout assignment
  createAssignment: async (assignmentData) => {
    try {
      const { data, error } = await supabase
        .from('workout_assignments')
        .insert([assignmentData])
        .select()
        .single()

      if (error) throw error

      await get().fetchAssignments()
      toast.success('Workout assigned!')
      return { success: true, data }
    } catch (error) {
      console.error('Error creating assignment:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Complete assignment
  completeAssignment: async (assignmentId, completed = true) => {
    try {
      const updates = {
        is_completed: completed,
        completed_at: completed ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('workout_assignments')
        .update(updates)
        .eq('id', assignmentId)

      if (error) throw error

      await get().fetchAssignments()
      toast.success(completed ? 'Workout completed!' : 'Marked as incomplete')
      return { success: true }
    } catch (error) {
      console.error('Error completing assignment:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Delete assignment
  deleteAssignment: async (assignmentId) => {
    try {
      const { error } = await supabase
        .from('workout_assignments')
        .delete()
        .eq('id', assignmentId)

      if (error) throw error

      await get().fetchAssignments()
      toast.success('Assignment deleted')
      return { success: true }
    } catch (error) {
      console.error('Error deleting assignment:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Bulk assign workout to multiple members
  bulkAssignWorkout: async (assignmentData, userIds) => {
    try {
      const assignments = userIds.map(userId => ({
        ...assignmentData,
        assigned_to: userId
      }))

      const { data, error } = await supabase
        .from('workout_assignments')
        .insert(assignments)
        .select()

      if (error) throw error

      await get().fetchAssignments()
      toast.success(`Workout assigned to ${userIds.length} members!`)
      return { success: true, data }
    } catch (error) {
      console.error('Error bulk assigning:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // =============================================
  // EXERCISE LIBRARY FUNCTIONS
  // =============================================

  // Fetch exercise categories
  fetchExerciseCategories: async () => {
    try {
      const { data, error } = await supabase
        .from('exercise_categories')
        .select('*')
        .order('sort_order')

      if (error) throw error
      set({ exerciseCategories: data || [] })
    } catch (error) {
      console.error('Error fetching exercise categories:', error)
    }
  },

  // Fetch exercises
  fetchExercises: async () => {
    try {
      const { data, error } = await supabase
        .from('exercises')
        .select(`
          *,
          category:exercise_categories(id, name, icon, color)
        `)
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      set({ exercises: data || [] })
    } catch (error) {
      console.error('Error fetching exercises:', error)
    }
  },

  // Create custom exercise
  createExercise: async (exerciseData) => {
    try {
      const { data, error } = await supabase
        .from('exercises')
        .insert([{ ...exerciseData, is_system: false }])
        .select()
        .single()

      if (error) throw error

      await get().fetchExercises()
      toast.success('Exercise added!')
      return { success: true, data }
    } catch (error) {
      console.error('Error creating exercise:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Delete exercise (soft delete by setting is_active to false)
  deleteExercise: async (exerciseId) => {
    try {
      const { error } = await supabase
        .from('exercises')
        .update({ is_active: false })
        .eq('id', exerciseId)

      if (error) throw error

      await get().fetchExercises()
      toast.success('Exercise deleted')
      return { success: true }
    } catch (error) {
      console.error('Error deleting exercise:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Export exercises to CSV
  exportExercises: () => {
    const exercises = get().exercises

    // CSV header
    const headers = [
      'name',
      'category',
      'description',
      'dragon_boat_benefit',
      'duration_minutes',
      'reps',
      'sets',
      'difficulty',
      'is_dragon_boat_specific'
    ]

    // Helper to escape CSV values
    const escapeCSV = (value) => {
      if (value === null || value === undefined) return ''
      const str = String(value)
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    // Build CSV rows
    const rows = exercises.map(e => [
      escapeCSV(e.name),
      escapeCSV(e.category?.name || ''),
      escapeCSV(e.description),
      escapeCSV(e.dragon_boat_benefit),
      escapeCSV(e.default_duration_minutes),
      escapeCSV(e.default_reps),
      escapeCSV(e.default_sets),
      escapeCSV(e.difficulty),
      escapeCSV(e.is_dragon_boat_specific ? 'yes' : 'no')
    ].join(','))

    const csv = [headers.join(','), ...rows].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `exercises-export-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast.success(`Exported ${exercises.length} exercises`)
    return { success: true }
  },

  // Parse CSV string to array of objects
  parseCSV: (csvText) => {
    const lines = csvText.split('\n').filter(line => line.trim())
    if (lines.length < 2) return []

    // Parse header
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())

    // Parse rows
    const exercises = []
    for (let i = 1; i < lines.length; i++) {
      const values = []
      let current = ''
      let inQuotes = false

      // Handle quoted values with commas
      for (const char of lines[i]) {
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }
      values.push(current.trim())

      // Map to object
      const exercise = {}
      headers.forEach((header, idx) => {
        let value = values[idx] || ''
        // Remove surrounding quotes
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1).replace(/""/g, '"')
        }
        exercise[header] = value
      })

      // Normalize field names
      exercises.push({
        name: exercise.name || exercise.exercise_name || '',
        category_name: exercise.category || exercise.category_name || '',
        description: exercise.description || '',
        dragon_boat_benefit: exercise.dragon_boat_benefit || exercise.paddling_benefit || '',
        default_duration_minutes: exercise.duration_minutes || exercise.duration || exercise.default_duration_minutes || null,
        default_reps: exercise.reps || exercise.default_reps || null,
        default_sets: exercise.sets || exercise.default_sets || null,
        difficulty: exercise.difficulty || 'intermediate',
        is_dragon_boat_specific: ['yes', 'true', '1', 'y'].includes((exercise.is_dragon_boat_specific || 'yes').toLowerCase())
      })
    }

    return exercises
  },

  // Import exercises from CSV or JSON
  importExercises: async (fileContent, userId) => {
    try {
      let exerciseList = []

      // Check if it's JSON or CSV
      const trimmed = fileContent.trim()
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        // JSON format
        const data = JSON.parse(trimmed)
        if (Array.isArray(data)) {
          exerciseList = data
        } else if (data.exercises && Array.isArray(data.exercises)) {
          exerciseList = data.exercises
        } else {
          throw new Error('Invalid JSON format')
        }
      } else {
        // CSV format
        exerciseList = get().parseCSV(fileContent)
      }

      if (exerciseList.length === 0) {
        throw new Error('No exercises found in file')
      }

      const categories = get().exerciseCategories

      // Create a map of category names to IDs
      const categoryMap = {}
      categories.forEach(c => {
        categoryMap[c.name.toLowerCase()] = c.id
      })

      let imported = 0
      let skipped = 0

      for (const exercise of exerciseList) {
        // Find category ID by name
        const categoryId = categoryMap[exercise.category_name?.toLowerCase()]

        if (!exercise.name) {
          skipped++
          continue
        }

        // Check if exercise already exists
        const existingExercises = get().exercises
        const exists = existingExercises.some(
          e => e.name.toLowerCase() === exercise.name.toLowerCase()
        )

        if (exists) {
          skipped++
          continue
        }

        const { error } = await supabase
          .from('exercises')
          .insert({
            name: exercise.name,
            description: exercise.description || null,
            category_id: categoryId || null,
            dragon_boat_benefit: exercise.dragon_boat_benefit || null,
            default_duration_minutes: exercise.default_duration_minutes ? parseInt(exercise.default_duration_minutes) : null,
            default_reps: exercise.default_reps ? parseInt(exercise.default_reps) : null,
            default_sets: exercise.default_sets ? parseInt(exercise.default_sets) : null,
            difficulty: exercise.difficulty || 'intermediate',
            is_dragon_boat_specific: exercise.is_dragon_boat_specific ?? true,
            is_system: false,
            is_active: true,
            created_by: userId
          })

        if (!error) {
          imported++
        } else {
          console.error('Error importing exercise:', exercise.name, error)
          skipped++
        }
      }

      await get().fetchExercises()
      toast.success(`Imported ${imported} exercises${skipped > 0 ? ` (${skipped} skipped)` : ''}`)
      return { success: true, imported, skipped }
    } catch (error) {
      console.error('Error importing exercises:', error)
      toast.error(error.message || 'Failed to import exercises')
      return { success: false, error }
    }
  },

  // Get exercise templates (pre-built exercise sets)
  getExerciseTemplates: () => {
    return [
      {
        id: 'dragon-boat-core',
        name: 'Dragon Boat Core Essentials',
        description: 'Essential core exercises for dragon boat paddlers',
        exercises: [
          { name: 'Plank Hold', category_name: 'Core', description: 'Hold a plank position with proper form', dragon_boat_benefit: 'Builds core stability for powerful paddle strokes and rotation', default_duration_minutes: 1, difficulty: 'beginner', is_dragon_boat_specific: true },
          { name: 'Russian Twists', category_name: 'Core', description: 'Seated twisting motion with or without weight', dragon_boat_benefit: 'Develops rotational power essential for the catch and pull phases', default_reps: 20, default_sets: 3, difficulty: 'intermediate', is_dragon_boat_specific: true },
          { name: 'Dead Bug', category_name: 'Core', description: 'Alternating arm and leg extensions while lying on back', dragon_boat_benefit: 'Strengthens deep core muscles for better trunk control during paddling', default_reps: 12, default_sets: 3, difficulty: 'beginner', is_dragon_boat_specific: true },
          { name: 'Pallof Press', category_name: 'Core', description: 'Anti-rotation exercise with resistance band', dragon_boat_benefit: 'Builds anti-rotation strength to maintain posture under load', default_reps: 10, default_sets: 3, difficulty: 'intermediate', is_dragon_boat_specific: true },
          { name: 'Hanging Leg Raises', category_name: 'Core', description: 'Raise legs while hanging from a bar', dragon_boat_benefit: 'Develops hip flexor and lower ab strength for powerful leg drive', default_reps: 10, default_sets: 3, difficulty: 'advanced', is_dragon_boat_specific: true }
        ]
      },
      {
        id: 'paddler-upper-body',
        name: 'Paddler Upper Body Strength',
        description: 'Upper body exercises specific to paddle sports',
        exercises: [
          { name: 'Lat Pulldown', category_name: 'Upper Body', description: 'Cable pulldown targeting lats', dragon_boat_benefit: 'Mimics the pulling motion of the paddle stroke', default_reps: 12, default_sets: 3, difficulty: 'intermediate', is_dragon_boat_specific: true },
          { name: 'Seated Cable Row', category_name: 'Upper Body', description: 'Horizontal rowing motion on cable machine', dragon_boat_benefit: 'Builds back strength for powerful paddle recovery', default_reps: 12, default_sets: 3, difficulty: 'intermediate', is_dragon_boat_specific: true },
          { name: 'Face Pulls', category_name: 'Upper Body', description: 'High cable pull to face level', dragon_boat_benefit: 'Strengthens rear delts and rotator cuff for shoulder health', default_reps: 15, default_sets: 3, difficulty: 'beginner', is_dragon_boat_specific: true },
          { name: 'Single Arm Dumbbell Row', category_name: 'Upper Body', description: 'Unilateral rowing movement', dragon_boat_benefit: 'Develops balanced pulling strength and core anti-rotation', default_reps: 10, default_sets: 3, difficulty: 'intermediate', is_dragon_boat_specific: true },
          { name: 'Push-Ups', category_name: 'Upper Body', description: 'Classic push-up with proper form', dragon_boat_benefit: 'Builds pushing strength for paddle exit and overall upper body endurance', default_reps: 15, default_sets: 3, difficulty: 'beginner', is_dragon_boat_specific: false }
        ]
      },
      {
        id: 'paddler-conditioning',
        name: 'Paddler Conditioning',
        description: 'Cardio and endurance exercises for paddlers',
        exercises: [
          { name: 'Rowing Machine Intervals', category_name: 'Cardio', description: '30 seconds hard, 30 seconds easy', dragon_boat_benefit: 'Builds paddling-specific endurance and power', default_duration_minutes: 20, difficulty: 'intermediate', is_dragon_boat_specific: true },
          { name: 'Battle Ropes', category_name: 'Cardio', description: 'Alternating or simultaneous rope waves', dragon_boat_benefit: 'Develops arm and shoulder endurance for long races', default_duration_minutes: 1, default_sets: 5, difficulty: 'intermediate', is_dragon_boat_specific: true },
          { name: 'Box Jumps', category_name: 'Cardio', description: 'Explosive jump onto a box', dragon_boat_benefit: 'Builds explosive power for race starts', default_reps: 10, default_sets: 3, difficulty: 'intermediate', is_dragon_boat_specific: false },
          { name: 'Burpees', category_name: 'Cardio', description: 'Full body explosive movement', dragon_boat_benefit: 'Develops full-body conditioning and mental toughness', default_reps: 10, default_sets: 3, difficulty: 'intermediate', is_dragon_boat_specific: false },
          { name: 'Mountain Climbers', category_name: 'Cardio', description: 'Fast alternating knee drives in plank', dragon_boat_benefit: 'Builds core endurance and cardiovascular fitness', default_duration_minutes: 1, default_sets: 3, difficulty: 'beginner', is_dragon_boat_specific: false }
        ]
      },
      {
        id: 'flexibility-mobility',
        name: 'Flexibility & Mobility',
        description: 'Stretches and mobility work for paddlers',
        exercises: [
          { name: 'Hip Flexor Stretch', category_name: 'Flexibility', description: 'Kneeling hip flexor stretch', dragon_boat_benefit: 'Improves hip extension for better seated posture in the boat', default_duration_minutes: 2, difficulty: 'beginner', is_dragon_boat_specific: true },
          { name: 'Thoracic Spine Rotation', category_name: 'Flexibility', description: 'Seated or lying spinal rotation', dragon_boat_benefit: 'Increases rotation range for fuller paddle strokes', default_reps: 10, default_sets: 2, difficulty: 'beginner', is_dragon_boat_specific: true },
          { name: 'Shoulder Dislocates', category_name: 'Flexibility', description: 'Band or dowel shoulder circles', dragon_boat_benefit: 'Improves shoulder mobility for overhead recovery', default_reps: 15, default_sets: 2, difficulty: 'beginner', is_dragon_boat_specific: true },
          { name: 'Pigeon Pose', category_name: 'Flexibility', description: 'Deep hip opener stretch', dragon_boat_benefit: 'Opens hips for comfortable seated position', default_duration_minutes: 2, difficulty: 'intermediate', is_dragon_boat_specific: true },
          { name: 'Cat-Cow Stretch', category_name: 'Flexibility', description: 'Alternating spine flexion and extension', dragon_boat_benefit: 'Warms up spine for paddling movements', default_reps: 10, default_sets: 2, difficulty: 'beginner', is_dragon_boat_specific: false }
        ]
      }
    ]
  },

  // Import a template
  importTemplate: async (templateId, userId) => {
    const templates = get().getExerciseTemplates()
    const template = templates.find(t => t.id === templateId)

    if (!template) {
      toast.error('Template not found')
      return { success: false }
    }

    const result = await get().importExercises({ exercises: template.exercises }, userId)
    return result
  },

  // Fetch exercise completions for a user and date range
  fetchExerciseCompletions: async (userId, startDate = null, endDate = null) => {
    try {
      let query = supabase
        .from('exercise_completions')
        .select(`
          *,
          exercise:exercises(id, name, category_id)
        `)
        .eq('user_id', userId)
        .order('completion_date', { ascending: false })

      if (startDate) {
        query = query.gte('completion_date', startDate)
      }
      if (endDate) {
        query = query.lte('completion_date', endDate)
      }

      const { data, error } = await query

      if (error) throw error
      set({ exerciseCompletions: data || [] })
      return data || []
    } catch (error) {
      console.error('Error fetching exercise completions:', error)
      return []
    }
  },

  // Fetch all team completions for a date (for the team view)
  fetchTeamCompletions: async (date) => {
    try {
      const { data, error } = await supabase
        .from('exercise_completions')
        .select(`
          *,
          exercise:exercises(id, name),
          user:profiles(id, full_name)
        `)
        .eq('completion_date', date)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching team completions:', error)
      return []
    }
  },

  // Toggle exercise completion (complete/uncomplete)
  toggleExerciseCompletion: async (userId, exerciseId, date, completed = true, details = {}) => {
    try {
      if (completed) {
        // Upsert completion
        const { error } = await supabase
          .from('exercise_completions')
          .upsert({
            user_id: userId,
            exercise_id: exerciseId,
            completion_date: date,
            actual_duration_minutes: details.duration || null,
            actual_reps: details.reps || null,
            actual_sets: details.sets || null,
            notes: details.notes || null,
            feeling: details.feeling || null,
            completed_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,exercise_id,completion_date'
          })

        if (error) throw error
      } else {
        // Delete completion
        const { error } = await supabase
          .from('exercise_completions')
          .delete()
          .match({ user_id: userId, exercise_id: exerciseId, completion_date: date })

        if (error) throw error
      }

      await get().fetchExerciseCompletions(userId, date, date)
      return { success: true }
    } catch (error) {
      console.error('Error toggling exercise completion:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Get completion status for exercises on a date
  getCompletionStatus: (exerciseId, date) => {
    const completions = get().exerciseCompletions
    return completions.find(c =>
      c.exercise_id === exerciseId &&
      c.completion_date === date
    )
  },

  // Fetch training plans
  fetchTrainingPlans: async () => {
    try {
      const { data, error } = await supabase
        .from('training_plans')
        .select(`
          *,
          exercises:training_plan_exercises(
            *,
            exercise:exercises(id, name, category_id, default_duration_minutes, default_reps, default_sets)
          )
        `)
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      set({ trainingPlans: data || [] })
    } catch (error) {
      console.error('Error fetching training plans:', error)
    }
  },

  // =============================================
  // PRACTICE DRILLS FUNCTIONS
  // =============================================

  // Fetch drill categories
  fetchDrillCategories: async () => {
    try {
      const { data, error } = await supabase
        .from('practice_drill_categories')
        .select('*')
        .order('sort_order')

      if (error) throw error
      set({ drillCategories: data || [] })
    } catch (error) {
      console.error('Error fetching drill categories:', error)
    }
  },

  // Fetch practice drills
  fetchDrills: async () => {
    try {
      const { data, error } = await supabase
        .from('practice_drills')
        .select(`
          *,
          category:practice_drill_categories(id, name, icon, color)
        `)
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      set({ drills: data || [] })
    } catch (error) {
      console.error('Error fetching drills:', error)
    }
  },

  // Create custom drill
  createDrill: async (drillData) => {
    try {
      const { data, error } = await supabase
        .from('practice_drills')
        .insert([{ ...drillData, is_system: false }])
        .select()
        .single()

      if (error) throw error

      await get().fetchDrills()
      toast.success('Drill added!')
      return { success: true, data }
    } catch (error) {
      console.error('Error creating drill:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Assign drills to a practice
  assignDrillsToPractice: async (practiceId, drillAssignments) => {
    try {
      // Delete existing assignments
      await supabase
        .from('practice_drill_assignments')
        .delete()
        .eq('practice_id', practiceId)

      // Insert new assignments
      if (drillAssignments.length > 0) {
        const { error } = await supabase
          .from('practice_drill_assignments')
          .insert(drillAssignments.map((d, idx) => ({
            practice_id: practiceId,
            drill_id: d.drill_id,
            duration_minutes: d.duration_minutes,
            notes: d.notes,
            sort_order: idx
          })))

        if (error) throw error
      }

      toast.success('Practice drills updated!')
      return { success: true }
    } catch (error) {
      console.error('Error assigning drills:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Fetch drills for a practice
  fetchPracticeDrills: async (practiceId) => {
    try {
      const { data, error } = await supabase
        .from('practice_drill_assignments')
        .select(`
          *,
          drill:practice_drills(*)
        `)
        .eq('practice_id', practiceId)
        .order('sort_order')

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching practice drills:', error)
      return []
    }
  },

  // =============================================
  // TRAINING CHALLENGES SYSTEM (NEW)
  // =============================================

  // Fetch all training challenges
  fetchTrainingChallenges: async () => {
    try {
      const { data, error } = await supabase
        .from('training_challenges')
        .select(`
          *,
          created_by_profile:profiles!training_challenges_created_by_fkey(id, full_name),
          enrollments:challenge_enrollments(
            id,
            tier,
            joined_at,
            user_id,
            user:profiles(id, full_name)
          )
        `)
        .order('start_date', { ascending: false })

      if (error) throw error
      set({ trainingChallenges: data || [] })
      return data || []
    } catch (error) {
      console.error('Error fetching training challenges:', error)
      toast.error('Failed to load challenges')
      return []
    }
  },

  // Fetch user's challenge enrollments
  fetchChallengeEnrollments: async (userId) => {
    try {
      const { data, error } = await supabase
        .from('challenge_enrollments')
        .select(`
          *,
          challenge:training_challenges(*)
        `)
        .eq('user_id', userId)

      if (error) throw error
      set({ challengeEnrollments: data || [] })
      return data || []
    } catch (error) {
      console.error('Error fetching challenge enrollments:', error)
      return []
    }
  },

  // Join a training challenge with selected tier
  joinTrainingChallenge: async (challengeId, userId, tier) => {
    try {
      const { data, error } = await supabase
        .from('challenge_enrollments')
        .insert({
          challenge_id: challengeId,
          user_id: userId,
          tier
        })
        .select()
        .single()

      if (error) throw error

      await get().fetchTrainingChallenges()
      await get().fetchChallengeEnrollments(userId)
      toast.success(`Joined challenge as ${tier}!`)
      return { success: true, data }
    } catch (error) {
      console.error('Error joining challenge:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Update challenge enrollment tier
  updateEnrollmentTier: async (enrollmentId, userId, tier) => {
    try {
      const { error } = await supabase
        .from('challenge_enrollments')
        .update({ tier })
        .eq('id', enrollmentId)

      if (error) throw error

      await get().fetchTrainingChallenges()
      await get().fetchChallengeEnrollments(userId)
      toast.success(`Switched to ${tier} tier!`)
      return { success: true }
    } catch (error) {
      console.error('Error updating tier:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Leave a challenge
  leaveChallenge: async (enrollmentId, userId) => {
    try {
      const { error } = await supabase
        .from('challenge_enrollments')
        .delete()
        .eq('id', enrollmentId)

      if (error) throw error

      await get().fetchTrainingChallenges()
      await get().fetchChallengeEnrollments(userId)
      toast.success('Left challenge')
      return { success: true }
    } catch (error) {
      console.error('Error leaving challenge:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Fetch weekly exercise assignments
  fetchWeeklyAssignments: async (weekStart) => {
    try {
      const { data, error } = await supabase
        .from('weekly_exercise_assignments')
        .select(`
          *,
          exercise:exercises(
            *,
            category:exercise_categories(id, name, icon, color)
          ),
          assigned_by_profile:profiles!weekly_exercise_assignments_assigned_by_fkey(id, full_name)
        `)
        .eq('week_start', weekStart)
        .order('sort_order')

      if (error) throw error
      set({ weeklyAssignments: data || [] })
      return data || []
    } catch (error) {
      console.error('Error fetching weekly assignments:', error)
      return []
    }
  },

  // Fetch team completions for a week
  fetchTeamCompletionsForWeek: async (weekStart) => {
    try {
      // Get the week end date (Sunday)
      const startDate = new Date(weekStart)
      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + 6)
      const weekEnd = endDate.toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('exercise_completions')
        .select(`
          *,
          exercise:exercises(id, name),
          user:profiles(id, full_name)
        `)
        .gte('completion_date', weekStart)
        .lte('completion_date', weekEnd)

      if (error) throw error
      set({ teamWeeklyCompletions: data || [] })
      return data || []
    } catch (error) {
      console.error('Error fetching team completions:', error)
      return []
    }
  },

  // Get completion count for user in a week
  getWeeklyCompletionCount: (userId, weekStart) => {
    const completions = get().teamWeeklyCompletions
    const startDate = new Date(weekStart)
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + 6)

    return completions.filter(c => {
      const compDate = new Date(c.completion_date)
      return c.user_id === userId && compDate >= startDate && compDate <= endDate
    }).length
  },

  // Get team total completions for current challenge period
  getTeamChallengeProgress: (challengeId) => {
    const challenges = get().trainingChallenges
    const challenge = challenges.find(c => c.id === challengeId)
    if (!challenge) return { total: 0, goal: 0, percentage: 0 }

    // Count all completions within challenge period from enrolled users
    const enrolledUserIds = challenge.enrollments?.map(e => e.user_id) || []
    const completions = get().teamWeeklyCompletions

    const total = completions.filter(c => enrolledUserIds.includes(c.user_id)).length
    const goal = challenge.team_goal || 200
    const percentage = Math.min(100, Math.round((total / goal) * 100))

    return { total, goal, percentage }
  },

  // ADMIN: Assign exercises to a week
  assignExercisesToWeek: async (exerciseIds, weekStart, assignedBy) => {
    try {
      // First, remove existing assignments for this week
      await supabase
        .from('weekly_exercise_assignments')
        .delete()
        .eq('week_start', weekStart)

      // Insert new assignments
      if (exerciseIds.length > 0) {
        const assignments = exerciseIds.map((exerciseId, idx) => ({
          exercise_id: exerciseId,
          week_start: weekStart,
          assigned_by: assignedBy,
          sort_order: idx,
          is_required: true
        }))

        const { error } = await supabase
          .from('weekly_exercise_assignments')
          .insert(assignments)

        if (error) throw error
      }

      await get().fetchWeeklyAssignments(weekStart)
      toast.success('Weekly exercises assigned!')
      return { success: true }
    } catch (error) {
      console.error('Error assigning exercises:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // ADMIN: Create a training challenge
  createTrainingChallenge: async (challengeData) => {
    try {
      const { data, error } = await supabase
        .from('training_challenges')
        .insert([challengeData])
        .select()
        .single()

      if (error) throw error

      await get().fetchTrainingChallenges()
      toast.success('Challenge created!')
      return { success: true, data }
    } catch (error) {
      console.error('Error creating challenge:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // ADMIN: Update a training challenge
  updateTrainingChallenge: async (id, updates) => {
    try {
      const { error } = await supabase
        .from('training_challenges')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error

      await get().fetchTrainingChallenges()
      toast.success('Challenge updated!')
      return { success: true }
    } catch (error) {
      console.error('Error updating challenge:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // ADMIN: Delete a training challenge
  deleteTrainingChallenge: async (id) => {
    try {
      const { error } = await supabase
        .from('training_challenges')
        .delete()
        .eq('id', id)

      if (error) throw error

      await get().fetchTrainingChallenges()
      toast.success('Challenge deleted')
      return { success: true }
    } catch (error) {
      console.error('Error deleting challenge:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Update exercise with dragon boat benefit (admin)
  updateExerciseDragonBoatBenefit: async (exerciseId, benefit) => {
    try {
      const { error } = await supabase
        .from('exercises')
        .update({ dragon_boat_benefit: benefit })
        .eq('id', exerciseId)

      if (error) throw error

      await get().fetchExercises()
      toast.success('Dragon boat benefit updated!')
      return { success: true }
    } catch (error) {
      console.error('Error updating exercise:', error)
      toast.error(error.message)
      return { success: false, error }
    }
  },

  // Helper: Get Monday of current week
  getCurrentWeekStart: () => {
    const today = new Date()
    const day = today.getDay()
    const diff = today.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(today.setDate(diff))
    return monday.toISOString().split('T')[0]
  },

  // Helper: Get active challenges (currently running)
  getActiveChallenges: () => {
    const today = new Date().toISOString().split('T')[0]
    return get().trainingChallenges.filter(c =>
      c.is_active && c.start_date <= today && c.end_date >= today
    )
  },

  // Helper: Get user's enrollment for a challenge
  getUserEnrollment: (challengeId, userId) => {
    const challenges = get().trainingChallenges
    const challenge = challenges.find(c => c.id === challengeId)
    return challenge?.enrollments?.find(e => e.user_id === userId) || null
  }
}))
