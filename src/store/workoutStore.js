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
  }
}))
