import { useState, useEffect, useMemo } from 'react'
import { useWorkoutStore } from '../store/workoutStore'
import { useAuthStore } from '../store/authStore'
import { useRosterStore } from '../store/rosterStore'
import { format, startOfWeek, endOfWeek, addDays, isToday } from 'date-fns'
import toast from 'react-hot-toast'
import Icon from '../components/Icon'

export default function Workouts() {
  const exercises = useWorkoutStore(state => state.exercises)
  const exerciseCategories = useWorkoutStore(state => state.exerciseCategories)
  const exerciseCompletions = useWorkoutStore(state => state.exerciseCompletions)
  const drills = useWorkoutStore(state => state.drills)
  const drillCategories = useWorkoutStore(state => state.drillCategories)
  const workoutLogs = useWorkoutStore(state => state.workoutLogs)
  const streaks = useWorkoutStore(state => state.streaks)
  const assignments = useWorkoutStore(state => state.assignments)
  const loading = useWorkoutStore(state => state.loading)
  const workoutTypes = useWorkoutStore(state => state.workoutTypes)

  const fetchExercises = useWorkoutStore(state => state.fetchExercises)
  const fetchExerciseCategories = useWorkoutStore(state => state.fetchExerciseCategories)
  const fetchExerciseCompletions = useWorkoutStore(state => state.fetchExerciseCompletions)
  const fetchDrills = useWorkoutStore(state => state.fetchDrills)
  const fetchDrillCategories = useWorkoutStore(state => state.fetchDrillCategories)
  const toggleExerciseCompletion = useWorkoutStore(state => state.toggleExerciseCompletion)
  const fetchTeamCompletions = useWorkoutStore(state => state.fetchTeamCompletions)
  const fetchWorkoutLogs = useWorkoutStore(state => state.fetchWorkoutLogs)
  const fetchStreaks = useWorkoutStore(state => state.fetchStreaks)
  const fetchAssignments = useWorkoutStore(state => state.fetchAssignments)
  const completeAssignment = useWorkoutStore(state => state.completeAssignment)
  const logWorkout = useWorkoutStore(state => state.logWorkout)
  const fetchWorkoutTypes = useWorkoutStore(state => state.fetchWorkoutTypes)
  const getUserStreak = useWorkoutStore(state => state.getUserStreak)
  const getWorkoutStats = useWorkoutStore(state => state.getWorkoutStats)
  const createExercise = useWorkoutStore(state => state.createExercise)

  const { user, profile, hasRole } = useAuthStore()
  const { members, fetchMembers } = useRosterStore()

  const [activeTab, setActiveTab] = useState('today')
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [teamCompletions, setTeamCompletions] = useState([])
  const [showLogModal, setShowLogModal] = useState(false)
  const [showAddExercise, setShowAddExercise] = useState(false)

  // Quick log form
  const [quickLogForm, setQuickLogForm] = useState({
    workout_type_id: '',
    title: '',
    duration_minutes: '',
    intensity: 'moderate',
    feeling: 'good'
  })

  // Add exercise form
  const [newExercise, setNewExercise] = useState({
    name: '',
    description: '',
    category_id: '',
    default_duration_minutes: '',
    default_reps: '',
    default_sets: '',
    difficulty: 'intermediate'
  })

  // Load data on mount
  useEffect(() => {
    fetchExerciseCategories()
    fetchExercises()
    fetchDrillCategories()
    fetchDrills()
    fetchWorkoutTypes()
    fetchStreaks()
    fetchMembers()
  }, [])

  // Load user-specific data
  useEffect(() => {
    if (user) {
      const weekStart = format(startOfWeek(new Date()), 'yyyy-MM-dd')
      const weekEnd = format(endOfWeek(new Date()), 'yyyy-MM-dd')
      fetchExerciseCompletions(user.id, weekStart, weekEnd)
      fetchAssignments(user.id)
      fetchWorkoutLogs(user.id, weekStart)
    }
  }, [user?.id])

  // Load team completions when viewing team tab
  useEffect(() => {
    if (activeTab === 'team') {
      fetchTeamCompletions(selectedDate).then(setTeamCompletions)
    }
  }, [activeTab, selectedDate])

  // Calculate weekly progress
  const weekProgress = useMemo(() => {
    if (!exerciseCompletions.length) return { completed: 0, total: 0, percentage: 0 }

    const weekStart = startOfWeek(new Date())
    const weekEnd = endOfWeek(new Date())

    const weekCompletions = exerciseCompletions.filter(c => {
      const date = new Date(c.completion_date)
      return date >= weekStart && date <= weekEnd
    })

    // Target: at least 3 exercises per day for 7 days = 21
    const target = 21
    const completed = weekCompletions.length

    return {
      completed,
      total: target,
      percentage: Math.min(100, Math.round((completed / target) * 100))
    }
  }, [exerciseCompletions])

  // Get exercises by category
  const exercisesByCategory = useMemo(() => {
    if (selectedCategory === 'all') return exercises

    return exercises.filter(e => e.category_id === selectedCategory)
  }, [exercises, selectedCategory])

  // Check if exercise is completed today
  const isExerciseCompleted = (exerciseId) => {
    return exerciseCompletions.some(c =>
      c.exercise_id === exerciseId &&
      c.completion_date === selectedDate
    )
  }

  // Handle exercise toggle
  const handleToggleExercise = async (exerciseId) => {
    if (!user) return
    const isCompleted = isExerciseCompleted(exerciseId)
    await toggleExerciseCompletion(user.id, exerciseId, selectedDate, !isCompleted)
  }

  // Quick log workout
  const handleQuickLog = async () => {
    if (!user) return
    if (!quickLogForm.title || !quickLogForm.workout_type_id) {
      toast.error('Please fill in workout type and title')
      return
    }

    const result = await logWorkout({
      user_id: user.id,
      workout_type_id: quickLogForm.workout_type_id,
      title: quickLogForm.title,
      workout_date: selectedDate,
      duration_minutes: quickLogForm.duration_minutes ? parseInt(quickLogForm.duration_minutes) : null,
      intensity: quickLogForm.intensity,
      feeling: quickLogForm.feeling,
      is_public: true
    })

    if (result.success) {
      setShowLogModal(false)
      setQuickLogForm({
        workout_type_id: '',
        title: '',
        duration_minutes: '',
        intensity: 'moderate',
        feeling: 'good'
      })
    }
  }

  // Add custom exercise
  const handleAddExercise = async () => {
    if (!user) return
    if (!newExercise.name || !newExercise.category_id) {
      toast.error('Please fill in name and category')
      return
    }

    const result = await createExercise({
      ...newExercise,
      created_by: user.id,
      default_duration_minutes: newExercise.default_duration_minutes ? parseInt(newExercise.default_duration_minutes) : null,
      default_reps: newExercise.default_reps ? parseInt(newExercise.default_reps) : null,
      default_sets: newExercise.default_sets ? parseInt(newExercise.default_sets) : null
    })

    if (result.success) {
      setShowAddExercise(false)
      setNewExercise({
        name: '',
        description: '',
        category_id: '',
        default_duration_minutes: '',
        default_reps: '',
        default_sets: '',
        difficulty: 'intermediate'
      })
    }
  }

  const userStreak = user ? (getUserStreak(user.id) || { current_streak: 0, longest_streak: 0, total_workouts: 0 }) : { current_streak: 0, longest_streak: 0, total_workouts: 0 }
  const userStats = user ? (getWorkoutStats(user.id) || { totalWorkouts: 0, totalDuration: 0 }) : { totalWorkouts: 0, totalDuration: 0 }
  const pendingAssignments = (assignments || []).filter(a => !a.is_completed)

  // Week days for the mini calendar
  const weekDays = useMemo(() => {
    const start = startOfWeek(new Date())
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(start, i)
      return {
        date: format(date, 'yyyy-MM-dd'),
        dayName: format(date, 'EEE'),
        dayNum: format(date, 'd'),
        isToday: isToday(date),
        isSelected: selectedDate === format(date, 'yyyy-MM-dd')
      }
    })
  }, [selectedDate])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-primary-600 mb-1">Training Hub</p>
          <h1 className="text-3xl font-display tracking-wide text-slate-900">Your Training</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowLogModal(true)}
            className="btn btn-primary"
          >
            <Icon name="plus" size={18} className="mr-1" />
            Log Workout
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-4xl">🔥</span>
            <span className="badge badge-warning text-[10px]">Streak</span>
          </div>
          <div className="text-3xl font-display tracking-wide text-slate-900">{userStreak.current_streak}</div>
          <p className="text-sm font-medium text-slate-500">Day Streak</p>
        </div>

        <div className="stat-card group">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Icon name="check" size={20} className="text-primary-600" />
            </div>
            <span className="badge badge-primary text-[10px]">Week</span>
          </div>
          <div className="text-3xl font-display tracking-wide text-slate-900">{weekProgress.completed}</div>
          <p className="text-sm font-medium text-slate-500">Exercises Done</p>
          <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full transition-all duration-500"
              style={{ width: `${weekProgress.percentage}%` }}
            />
          </div>
        </div>

        <div className="stat-card group">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-success-100 rounded-lg">
              <Icon name="workouts" size={20} className="text-success-600" />
            </div>
            <span className="badge badge-success text-[10px]">Total</span>
          </div>
          <div className="text-3xl font-display tracking-wide text-slate-900">{userStats.totalWorkouts}</div>
          <p className="text-sm font-medium text-slate-500">Workouts Logged</p>
        </div>

        <div className="stat-card group">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-accent-100 rounded-lg">
              <Icon name="clock" size={20} className="text-accent-600" />
            </div>
            <span className="badge badge-accent text-[10px]">All Time</span>
          </div>
          <div className="text-3xl font-display tracking-wide text-slate-900">{userStats.totalDuration}</div>
          <p className="text-sm font-medium text-slate-500">Minutes Trained</p>
        </div>
      </div>

      {/* Week Calendar Strip */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-900">This Week</h3>
          <span className="text-sm text-slate-500">{format(new Date(), 'MMMM yyyy')}</span>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map(day => (
            <button
              key={day.date}
              onClick={() => setSelectedDate(day.date)}
              className={`p-3 rounded-xl text-center transition-all ${
                day.isSelected
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30'
                  : day.isToday
                  ? 'bg-primary-50 text-primary-700 border-2 border-primary-200'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <div className="text-xs font-medium opacity-75">{day.dayName}</div>
              <div className="text-lg font-bold">{day.dayNum}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { id: 'today', label: 'Today\'s Training', icon: 'calendar' },
          { id: 'exercises', label: 'Exercise Library', icon: 'workouts' },
          { id: 'assigned', label: `Assigned (${pendingAssignments.length})`, icon: 'check' },
          { id: 'team', label: 'Team Progress', icon: 'roster' },
          { id: 'drills', label: 'Practice Drills', icon: 'practice' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-primary-200 hover:text-primary-600'
            }`}
          >
            <Icon name={tab.icon} size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'today' && (
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="card bg-gradient-to-br from-primary-50 to-accent-50/30 border-primary-100">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900">
                  {isToday(new Date(selectedDate)) ? 'Today\'s Focus' : format(new Date(selectedDate), 'EEEE, MMM d')}
                </h3>
                <p className="text-sm text-slate-600">Check off exercises as you complete them</p>
              </div>
            </div>

            {/* Category Filter */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategory === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 border border-slate-200'
                }`}
              >
                All
              </button>
              {exerciseCategories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  {cat.icon} {cat.name}
                </button>
              ))}
            </div>

            {/* Exercise Checklist */}
            <div className="space-y-2">
              {exercisesByCategory.length === 0 ? (
                <p className="text-center py-8 text-slate-500">No exercises found</p>
              ) : (
                exercisesByCategory.slice(0, 10).map(exercise => {
                  const completed = isExerciseCompleted(exercise.id)
                  return (
                    <div
                      key={exercise.id}
                      onClick={() => handleToggleExercise(exercise.id)}
                      className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all ${
                        completed
                          ? 'bg-success-50 border-2 border-success-200'
                          : 'bg-white border-2 border-slate-100 hover:border-primary-200'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                        completed
                          ? 'bg-success-500 text-white'
                          : 'bg-slate-100 border-2 border-slate-300'
                      }`}>
                        {completed && <Icon name="check" size={14} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${completed ? 'text-success-700 line-through' : 'text-slate-900'}`}>
                            {exercise.name}
                          </span>
                          {exercise.is_dragon_boat_specific && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-primary-100 text-primary-700 rounded">
                              DB
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                          {exercise.default_duration_minutes && (
                            <span>{exercise.default_duration_minutes} min</span>
                          )}
                          {exercise.default_reps && (
                            <span>{exercise.default_reps} reps</span>
                          )}
                          {exercise.default_sets && (
                            <span>{exercise.default_sets} sets</span>
                          )}
                          <span className="capitalize">{exercise.difficulty}</span>
                        </div>
                      </div>
                      <span className="text-2xl">{exercise.category?.icon}</span>
                    </div>
                  )
                })
              )}
            </div>

            {exercisesByCategory.length > 10 && (
              <button
                onClick={() => setActiveTab('exercises')}
                className="w-full mt-4 text-center text-sm font-semibold text-primary-600 hover:text-primary-700"
              >
                View all {exercisesByCategory.length} exercises →
              </button>
            )}
          </div>

          {/* Pending Assignments */}
          {pendingAssignments.length > 0 && (
            <div className="card">
              <h3 className="font-bold text-slate-900 mb-4">
                <Icon name="check" size={18} className="inline mr-2 text-accent-600" />
                Assigned Workouts
              </h3>
              <div className="space-y-3">
                {pendingAssignments.slice(0, 3).map(assignment => (
                  <div
                    key={assignment.id}
                    className="flex items-center gap-4 p-4 bg-accent-50 rounded-xl border border-accent-100"
                  >
                    <input
                      type="checkbox"
                      checked={assignment.is_completed}
                      onChange={(e) => completeAssignment(assignment.id, e.target.checked)}
                      className="w-5 h-5 rounded border-accent-300 text-accent-600 focus:ring-accent-500"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">{assignment.title}</p>
                      <p className="text-sm text-slate-500">
                        Due: {assignment.due_date ? format(new Date(assignment.due_date), 'MMM d') : 'No deadline'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'exercises' && (
        <div className="space-y-6">
          {/* Add Exercise Button (for coaches) */}
          {(hasRole('admin') || hasRole('coach')) && (
            <div className="flex justify-end">
              <button
                onClick={() => setShowAddExercise(!showAddExercise)}
                className="btn btn-secondary"
              >
                {showAddExercise ? 'Cancel' : '+ Add Exercise'}
              </button>
            </div>
          )}

          {/* Add Exercise Form */}
          {showAddExercise && (
            <div className="card bg-primary-50 border-primary-200">
              <h3 className="font-bold text-slate-900 mb-4">Add Custom Exercise</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Exercise Name *</label>
                  <input
                    type="text"
                    value={newExercise.name}
                    onChange={(e) => setNewExercise({ ...newExercise, name: e.target.value })}
                    className="input"
                    placeholder="e.g., Box Jumps"
                  />
                </div>
                <div>
                  <label className="label">Category *</label>
                  <select
                    value={newExercise.category_id}
                    onChange={(e) => setNewExercise({ ...newExercise, category_id: e.target.value })}
                    className="input"
                  >
                    <option value="">Select category...</option>
                    {exerciseCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="label">Description</label>
                  <textarea
                    value={newExercise.description}
                    onChange={(e) => setNewExercise({ ...newExercise, description: e.target.value })}
                    className="input"
                    rows="2"
                    placeholder="Brief description..."
                  />
                </div>
                <div>
                  <label className="label">Default Duration (min)</label>
                  <input
                    type="number"
                    value={newExercise.default_duration_minutes}
                    onChange={(e) => setNewExercise({ ...newExercise, default_duration_minutes: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Default Reps</label>
                  <input
                    type="number"
                    value={newExercise.default_reps}
                    onChange={(e) => setNewExercise({ ...newExercise, default_reps: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Default Sets</label>
                  <input
                    type="number"
                    value={newExercise.default_sets}
                    onChange={(e) => setNewExercise({ ...newExercise, default_sets: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Difficulty</label>
                  <select
                    value={newExercise.difficulty}
                    onChange={(e) => setNewExercise({ ...newExercise, difficulty: e.target.value })}
                    className="input"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
              </div>
              <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={handleAddExercise} className="btn btn-primary mt-4">
                Add Exercise
              </button>
            </div>
          )}

          {/* Exercise Categories */}
          {exerciseCategories.map(category => {
            const categoryExercises = exercises.filter(e => e.category_id === category.id)
            if (categoryExercises.length === 0) return null

            return (
              <div key={category.id} className="card">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">{category.icon}</span>
                  <div>
                    <h3 className="font-bold text-slate-900">{category.name}</h3>
                    <p className="text-sm text-slate-500">{categoryExercises.length} exercises</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {categoryExercises.map(exercise => {
                    const completed = isExerciseCompleted(exercise.id)
                    return (
                      <div
                        key={exercise.id}
                        onClick={() => handleToggleExercise(exercise.id)}
                        className={`flex items-start gap-3 p-4 rounded-xl cursor-pointer transition-all ${
                          completed
                            ? 'bg-success-50 border border-success-200'
                            : 'bg-slate-50 border border-transparent hover:border-primary-200'
                        }`}
                      >
                        <div className={`w-5 h-5 mt-0.5 rounded flex-shrink-0 flex items-center justify-center ${
                          completed ? 'bg-success-500 text-white' : 'bg-white border-2 border-slate-300'
                        }`}>
                          {completed && <Icon name="check" size={12} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold ${completed ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                            {exercise.name}
                          </p>
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{exercise.description}</p>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {exercise.default_duration_minutes && (
                              <span className="px-2 py-0.5 text-xs bg-white rounded border">{exercise.default_duration_minutes} min</span>
                            )}
                            {exercise.default_reps && exercise.default_sets && (
                              <span className="px-2 py-0.5 text-xs bg-white rounded border">{exercise.default_sets}×{exercise.default_reps}</span>
                            )}
                            <span className={`px-2 py-0.5 text-xs rounded capitalize ${
                              exercise.difficulty === 'beginner' ? 'bg-green-100 text-green-700' :
                              exercise.difficulty === 'advanced' ? 'bg-red-100 text-red-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {exercise.difficulty}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {activeTab === 'assigned' && (
        <div className="space-y-4">
          {assignments.length === 0 ? (
            <div className="card text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon name="check" size={32} className="text-slate-400" />
              </div>
              <p className="text-slate-600 font-medium">No assigned workouts</p>
              <p className="text-sm text-slate-400 mt-1">Workouts assigned by coaches will appear here</p>
            </div>
          ) : (
            <>
              {/* Pending */}
              {pendingAssignments.length > 0 && (
                <div>
                  <h3 className="font-bold text-slate-900 mb-3">To Do ({pendingAssignments.length})</h3>
                  <div className="space-y-3">
                    {pendingAssignments.map(assignment => (
                      <div key={assignment.id} className="card border-l-4 border-l-accent-500">
                        <div className="flex items-start gap-4">
                          <input
                            type="checkbox"
                            checked={false}
                            onChange={() => completeAssignment(assignment.id, true)}
                            className="mt-1 w-5 h-5 rounded border-slate-300 text-primary-600"
                          />
                          <div className="flex-1">
                            <h4 className="font-semibold text-slate-900">{assignment.title}</h4>
                            {assignment.description && (
                              <p className="text-sm text-slate-600 mt-1">{assignment.description}</p>
                            )}
                            <div className="flex items-center gap-3 mt-2 text-sm text-slate-500">
                              <span>Assigned: {format(new Date(assignment.assigned_date), 'MMM d')}</span>
                              {assignment.due_date && (
                                <span className={new Date(assignment.due_date) < new Date() ? 'text-red-600 font-medium' : ''}>
                                  Due: {format(new Date(assignment.due_date), 'MMM d')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Completed */}
              {assignments.filter(a => a.is_completed).length > 0 && (
                <div>
                  <h3 className="font-bold text-slate-500 mb-3">Completed</h3>
                  <div className="space-y-2">
                    {assignments.filter(a => a.is_completed).map(assignment => (
                      <div key={assignment.id} className="card bg-slate-50 opacity-75">
                        <div className="flex items-center gap-4">
                          <div className="w-5 h-5 rounded bg-success-500 flex items-center justify-center">
                            <Icon name="check" size={12} className="text-white" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-slate-600 line-through">{assignment.title}</h4>
                            <p className="text-xs text-slate-400">
                              Completed {format(new Date(assignment.completed_at), 'MMM d, h:mm a')}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'team' && (
        <div className="space-y-6">
          <div className="card">
            <h3 className="font-bold text-slate-900 mb-4">Team Progress - {format(new Date(selectedDate), 'EEEE, MMM d')}</h3>

            {teamCompletions.length === 0 ? (
              <p className="text-center py-8 text-slate-500">No completions recorded for this day</p>
            ) : (
              <div className="space-y-3">
                {/* Group by user */}
                {Object.entries(
                  teamCompletions.reduce((acc, c) => {
                    const name = c.user?.full_name || 'Unknown'
                    if (!acc[name]) acc[name] = []
                    acc[name].push(c)
                    return acc
                  }, {})
                ).map(([userName, completions]) => (
                  <div key={userName} className="p-4 bg-slate-50 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-slate-900">{userName}</span>
                      <span className="badge badge-success">{completions.length} exercises</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {completions.map(c => (
                        <span key={c.id} className="px-2 py-1 text-xs bg-white rounded border">
                          {c.exercise?.name}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Leaderboard */}
          <div className="card">
            <h3 className="font-bold text-slate-900 mb-4">
              <span className="text-xl mr-2">🏆</span>
              Streak Leaderboard
            </h3>
            <div className="space-y-2">
              {Object.entries(streaks)
                .sort(([, a], [, b]) => b.current_streak - a.current_streak)
                .slice(0, 10)
                .map(([userId, streak], index) => (
                  <div key={userId} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      index === 0 ? 'bg-yellow-400 text-yellow-900' :
                      index === 1 ? 'bg-slate-300 text-slate-700' :
                      index === 2 ? 'bg-orange-400 text-orange-900' :
                      'bg-slate-200 text-slate-600'
                    }`}>
                      {index + 1}
                    </div>
                    <span className="flex-1 font-medium text-slate-900">{streak.user_profile?.full_name}</span>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="font-bold text-accent-600">{streak.current_streak}🔥</span>
                      <span className="text-slate-500">{streak.total_workouts} total</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'drills' && (
        <div className="space-y-6">
          <div className="card bg-gradient-to-br from-accent-50 to-primary-50 border-accent-100">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">🚣</span>
              <div>
                <h3 className="font-bold text-slate-900">Practice Drill Library</h3>
                <p className="text-sm text-slate-600">Pre-loaded drills for water practice sessions</p>
              </div>
            </div>
          </div>

          {drillCategories.map(category => {
            const categoryDrills = drills.filter(d => d.category_id === category.id)
            if (categoryDrills.length === 0) return null

            return (
              <div key={category.id} className="card">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">{category.icon}</span>
                  <div>
                    <h3 className="font-bold text-slate-900">{category.name}</h3>
                    <p className="text-sm text-slate-500">{category.description}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {categoryDrills.map(drill => (
                    <div key={drill.id} className="p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h4 className="font-semibold text-slate-900">{drill.name}</h4>
                          <p className="text-sm text-slate-600 mt-1">{drill.description}</p>
                          {drill.purpose && (
                            <p className="text-xs text-primary-600 mt-2 font-medium">
                              Purpose: {drill.purpose}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-3 flex-wrap">
                            {drill.duration_minutes && (
                              <span className="px-2 py-1 text-xs bg-white rounded border">
                                {drill.duration_minutes} min
                              </span>
                            )}
                            <span className={`px-2 py-1 text-xs rounded capitalize ${
                              drill.intensity === 'low' ? 'bg-green-100 text-green-700' :
                              drill.intensity === 'high' ? 'bg-orange-100 text-orange-700' :
                              drill.intensity === 'race_pace' ? 'bg-red-100 text-red-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {drill.intensity?.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      </div>
                      {drill.coaching_points && drill.coaching_points.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-200">
                          <p className="text-xs font-semibold text-slate-500 mb-2">Coaching Points:</p>
                          <ul className="text-xs text-slate-600 space-y-1">
                            {drill.coaching_points.map((point, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-primary-500">•</span>
                                {point}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Quick Log Modal */}
      {showLogModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-display tracking-wide text-slate-900">Quick Log</h2>
              <button onClick={() => setShowLogModal(false)} className="text-slate-400 hover:text-slate-600">
                <Icon name="close" size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label">Workout Type *</label>
                <select
                  value={quickLogForm.workout_type_id}
                  onChange={(e) => setQuickLogForm({ ...quickLogForm, workout_type_id: e.target.value })}
                  className="input"
                >
                  <option value="">Select type...</option>
                  {workoutTypes.map(type => (
                    <option key={type.id} value={type.id}>{type.icon} {type.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Title *</label>
                <input
                  type="text"
                  value={quickLogForm.title}
                  onChange={(e) => setQuickLogForm({ ...quickLogForm, title: e.target.value })}
                  className="input"
                  placeholder="e.g., Morning Run"
                />
              </div>

              <div>
                <label className="label">Duration (minutes)</label>
                <input
                  type="number"
                  value={quickLogForm.duration_minutes}
                  onChange={(e) => setQuickLogForm({ ...quickLogForm, duration_minutes: e.target.value })}
                  className="input"
                  placeholder="30"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Intensity</label>
                  <select
                    value={quickLogForm.intensity}
                    onChange={(e) => setQuickLogForm({ ...quickLogForm, intensity: e.target.value })}
                    className="input"
                  >
                    <option value="low">Low</option>
                    <option value="moderate">Moderate</option>
                    <option value="high">High</option>
                    <option value="max">Maximum</option>
                  </select>
                </div>
                <div>
                  <label className="label">Feeling</label>
                  <select
                    value={quickLogForm.feeling}
                    onChange={(e) => setQuickLogForm({ ...quickLogForm, feeling: e.target.value })}
                    className="input"
                  >
                    <option value="great">😄 Great</option>
                    <option value="good">🙂 Good</option>
                    <option value="okay">😐 Okay</option>
                    <option value="tired">😴 Tired</option>
                    <option value="sore">😰 Sore</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={() => setShowLogModal(false)} className="btn btn-secondary flex-1">
                Cancel
              </button>
              <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={handleQuickLog} className="btn btn-primary flex-1">
                Log Workout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
