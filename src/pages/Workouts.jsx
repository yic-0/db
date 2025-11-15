import { useState, useEffect } from 'react'
import { useWorkoutStore } from '../store/workoutStore'
import { useAuthStore } from '../store/authStore'
import { useRosterStore } from '../store/rosterStore'
import { format, startOfWeek, endOfWeek, subDays } from 'date-fns'
import toast from 'react-hot-toast'

export default function Workouts() {
  const {
    workoutLogs,
    workoutTypes,
    programs,
    challenges,
    resources,
    streaks,
    enrollments,
    assignments,
    loading,
    fetchWorkoutLogs,
    fetchWorkoutTypes,
    fetchPrograms,
    fetchChallenges,
    fetchResources,
    fetchStreaks,
    fetchEnrollments,
    fetchAssignments,
    logWorkout,
    deleteWorkout,
    enrollInProgram,
    joinChallenge,
    createChallenge,
    createResource,
    createAssignment,
    completeAssignment,
    deleteAssignment,
    bulkAssignWorkout,
    getUserStreak,
    getWorkoutStats
  } = useWorkoutStore()

  const { user, profile, hasRole } = useAuthStore()
  const { members, fetchMembers } = useRosterStore()

  const [activeTab, setActiveTab] = useState('myWorkouts')
  const [viewFilter, setViewFilter] = useState('all') // 'all', 'mine', 'team'
  const [dateRange, setDateRange] = useState('week') // 'week', 'month', 'all'

  // Log workout form
  const [showLogForm, setShowLogForm] = useState(false)
  const [workoutForm, setWorkoutForm] = useState({
    workout_type_id: '',
    title: '',
    description: '',
    workout_date: format(new Date(), 'yyyy-MM-dd'),
    duration_minutes: '',
    intensity: 'moderate',
    distance_km: '',
    calories_burned: '',
    location: '',
    is_public: true,
    external_link: '',
    notes: '',
    feeling: 'good'
  })

  // Challenge form
  const [showChallengeForm, setShowChallengeForm] = useState(false)
  const [challengeForm, setChallengeForm] = useState({
    title: '',
    description: '',
    challenge_type: 'frequency',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: format(new Date(), 'yyyy-MM-dd'),
    goal_value: '',
    goal_unit: 'workouts',
    external_link: '',
    platform: 'custom'
  })

  // Resource form
  const [showResourceForm, setShowResourceForm] = useState(false)
  const [resourceForm, setResourceForm] = useState({
    title: '',
    description: '',
    resource_type: 'video',
    url: '',
    category: 'technique',
    is_pinned: false
  })

  // Assignment form
  const [showAssignmentForm, setShowAssignmentForm] = useState(false)
  const [assignmentForm, setAssignmentForm] = useState({
    title: '',
    description: '',
    workout_type_id: '',
    assigned_date: format(new Date(), 'yyyy-MM-dd'),
    due_date: '',
    target_duration_minutes: '',
    target_distance_km: '',
    notes: ''
  })
  const [selectedMembers, setSelectedMembers] = useState([])

  // Fetch static data on mount
  useEffect(() => {
    fetchWorkoutTypes()
    fetchPrograms()
    fetchChallenges()
    fetchResources()
    fetchStreaks()
    fetchMembers()
  }, [])

  // Fetch user-specific data when user or filters change
  useEffect(() => {
    if (user) {
      // Fetch workouts based on date range
      let startDate = null
      if (dateRange === 'week') {
        startDate = format(startOfWeek(new Date()), 'yyyy-MM-dd')
      } else if (dateRange === 'month') {
        startDate = format(subDays(new Date(), 30), 'yyyy-MM-dd')
      }

      fetchWorkoutLogs(viewFilter === 'mine' ? user.id : null, startDate)
      fetchEnrollments(user.id)
      fetchAssignments(user.id)
    }
  }, [dateRange, viewFilter, user?.id])

  const handleLogWorkout = async () => {
    if (!workoutForm.workout_type_id || !workoutForm.title) {
      toast.error('Please fill in workout type and title')
      return
    }

    const result = await logWorkout({
      ...workoutForm,
      user_id: user.id,
      duration_minutes: workoutForm.duration_minutes ? parseInt(workoutForm.duration_minutes) : null,
      distance_km: workoutForm.distance_km ? parseFloat(workoutForm.distance_km) : null,
      calories_burned: workoutForm.calories_burned ? parseInt(workoutForm.calories_burned) : null
    })

    if (result.success) {
      setShowLogForm(false)
      setWorkoutForm({
        workout_type_id: '',
        title: '',
        description: '',
        workout_date: format(new Date(), 'yyyy-MM-dd'),
        duration_minutes: '',
        intensity: 'moderate',
        distance_km: '',
        calories_burned: '',
        location: '',
        is_public: true,
        external_link: '',
        notes: '',
        feeling: 'good'
      })
      fetchStreaks()
    }
  }

  const handleCreateChallenge = async () => {
    if (!challengeForm.title || !challengeForm.start_date || !challengeForm.end_date) {
      toast.error('Please fill in required fields')
      return
    }

    const result = await createChallenge({
      ...challengeForm,
      created_by: user.id,
      goal_value: challengeForm.goal_value ? parseFloat(challengeForm.goal_value) : null
    })

    if (result.success) {
      setShowChallengeForm(false)
      setChallengeForm({
        title: '',
        description: '',
        challenge_type: 'frequency',
        start_date: format(new Date(), 'yyyy-MM-dd'),
        end_date: format(new Date(), 'yyyy-MM-dd'),
        goal_value: '',
        goal_unit: 'workouts',
        external_link: '',
        platform: 'custom'
      })
    }
  }

  const handleCreateResource = async () => {
    if (!resourceForm.title || !resourceForm.url) {
      toast.error('Please fill in title and URL')
      return
    }

    const result = await createResource({
      ...resourceForm,
      created_by: user.id
    })

    if (result.success) {
      setShowResourceForm(false)
      setResourceForm({
        title: '',
        description: '',
        resource_type: 'video',
        url: '',
        category: 'technique',
        is_pinned: false
      })
    }
  }

  const handleBulkAssignWorkout = async () => {
    if (!assignmentForm.title || selectedMembers.length === 0) {
      toast.error('Please fill in title and select at least one member')
      return
    }

    const result = await bulkAssignWorkout({
      ...assignmentForm,
      created_by: user.id,
      workout_type_id: assignmentForm.workout_type_id || null, // Convert empty string to null
      due_date: assignmentForm.due_date || null, // Convert empty string to null
      target_duration_minutes: assignmentForm.target_duration_minutes ? parseInt(assignmentForm.target_duration_minutes) : null,
      target_distance_km: assignmentForm.target_distance_km ? parseFloat(assignmentForm.target_distance_km) : null
    }, selectedMembers)

    if (result.success) {
      setShowAssignmentForm(false)
      setAssignmentForm({
        title: '',
        description: '',
        workout_type_id: '',
        assigned_date: format(new Date(), 'yyyy-MM-dd'),
        due_date: '',
        target_duration_minutes: '',
        target_distance_km: '',
        notes: ''
      })
      setSelectedMembers([])
    }
  }

  const userStreak = getUserStreak(user?.id)
  const userStats = getWorkoutStats(user?.id)

  const getIntensityColor = (intensity) => {
    switch (intensity) {
      case 'low': return 'bg-green-100 text-green-800'
      case 'moderate': return 'bg-blue-100 text-blue-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'max': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getFeelingEmoji = (feeling) => {
    switch (feeling) {
      case 'great': return '😄'
      case 'good': return '🙂'
      case 'okay': return '😐'
      case 'tired': return '😴'
      case 'sore': return '😰'
      default: return '🙂'
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Workouts</h1>
          <p className="text-gray-600 mt-1">Track your training and stay motivated</p>
        </div>
        <button
          onClick={() => setShowLogForm(true)}
          className="btn btn-primary"
        >
          + Log Workout
        </button>
      </div>

      {/* Personal Stats Card */}
      {user && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="card bg-gradient-to-br from-blue-50 to-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600 mb-1">Current Streak</div>
                <div className="text-3xl font-bold text-blue-600">{userStreak.current_streak}</div>
                <div className="text-xs text-gray-500">days</div>
              </div>
              <div className="text-4xl">🔥</div>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-green-50 to-green-100">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600 mb-1">Total Workouts</div>
                <div className="text-3xl font-bold text-green-600">{userStats.totalWorkouts}</div>
                <div className="text-xs text-gray-500">all time</div>
              </div>
              <div className="text-4xl">💪</div>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-purple-50 to-purple-100">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600 mb-1">Total Duration</div>
                <div className="text-3xl font-bold text-purple-600">{userStats.totalDuration}</div>
                <div className="text-xs text-gray-500">minutes</div>
              </div>
              <div className="text-4xl">⏱️</div>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-orange-50 to-orange-100">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600 mb-1">Total Distance</div>
                <div className="text-3xl font-bold text-orange-600">{userStats.totalDistance.toFixed(1)}</div>
                <div className="text-xs text-gray-500">km</div>
              </div>
              <div className="text-4xl">🏃</div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-4 overflow-x-auto">
          {['assignments', 'myWorkouts', 'teamActivity', 'programs', 'challenges', 'resources'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab === 'assignments' && `Assigned (${assignments.filter(a => !a.is_completed).length})`}
              {tab === 'myWorkouts' && 'My Workouts'}
              {tab === 'teamActivity' && 'Team Activity'}
              {tab === 'programs' && 'Training Programs'}
              {tab === 'challenges' && `Challenges (${challenges.length})`}
              {tab === 'resources' && 'Resources'}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'assignments' && (
        <div className="space-y-4">
          {/* Admin/Coach: Create Assignment Button */}
          {(hasRole('admin') || hasRole('coach')) && (
            <div className="card">
              <button
                onClick={() => setShowAssignmentForm(!showAssignmentForm)}
                className="btn btn-primary w-full"
              >
                {showAssignmentForm ? 'Cancel' : '+ Assign Workout to Members'}
              </button>

              {showAssignmentForm && (
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="label">Workout Title *</label>
                    <input
                      type="text"
                      value={assignmentForm.title}
                      onChange={(e) => setAssignmentForm({ ...assignmentForm, title: e.target.value })}
                      className="input"
                      placeholder="e.g. Morning 5K Run"
                    />
                  </div>

                  <div>
                    <label className="label">Description</label>
                    <textarea
                      value={assignmentForm.description}
                      onChange={(e) => setAssignmentForm({ ...assignmentForm, description: e.target.value })}
                      className="input"
                      rows="3"
                      placeholder="Optional workout details..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Workout Type</label>
                      <select
                        value={assignmentForm.workout_type_id}
                        onChange={(e) => setAssignmentForm({ ...assignmentForm, workout_type_id: e.target.value })}
                        className="input"
                      >
                        <option value="">Select type...</option>
                        {workoutTypes.map(type => (
                          <option key={type.id} value={type.id}>
                            {type.icon} {type.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="label">Assigned Date *</label>
                      <input
                        type="date"
                        value={assignmentForm.assigned_date}
                        onChange={(e) => setAssignmentForm({ ...assignmentForm, assigned_date: e.target.value })}
                        className="input"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Due Date</label>
                      <input
                        type="date"
                        value={assignmentForm.due_date}
                        onChange={(e) => setAssignmentForm({ ...assignmentForm, due_date: e.target.value })}
                        className="input"
                      />
                    </div>

                    <div>
                      <label className="label">Target Duration (min)</label>
                      <input
                        type="number"
                        value={assignmentForm.target_duration_minutes}
                        onChange={(e) => setAssignmentForm({ ...assignmentForm, target_duration_minutes: e.target.value })}
                        className="input"
                        placeholder="Optional"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label">Target Distance (km)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={assignmentForm.target_distance_km}
                      onChange={(e) => setAssignmentForm({ ...assignmentForm, target_distance_km: e.target.value })}
                      className="input"
                      placeholder="Optional"
                    />
                  </div>

                  <div>
                    <label className="label">Notes</label>
                    <textarea
                      value={assignmentForm.notes}
                      onChange={(e) => setAssignmentForm({ ...assignmentForm, notes: e.target.value })}
                      className="input"
                      rows="2"
                      placeholder="Any additional notes for the team..."
                    />
                  </div>

                  <div>
                    <label className="label">Assign To *</label>
                    <div className="border rounded-lg p-4 max-h-60 overflow-y-auto space-y-2">
                      {members && members.length > 0 ? (
                        <>
                          <div className="mb-3">
                            <button
                              type="button"
                              onClick={() => {
                                const assignableMembers = members.filter(m => m.is_active !== false && !m.is_guest)
                                if (selectedMembers.length === assignableMembers.length) {
                                  setSelectedMembers([])
                                } else {
                                  setSelectedMembers(assignableMembers.map(m => m.id))
                                }
                              }}
                              className="text-sm text-primary-600 hover:text-primary-700"
                            >
                              {selectedMembers.length === members.filter(m => m.is_active !== false && !m.is_guest).length ? 'Deselect All' : 'Select All'}
                            </button>
                          </div>
                          {members.filter(m => m.is_active !== false && !m.is_guest).length === 0 ? (
                            <p className="text-sm text-gray-500">No active members found</p>
                          ) : (
                            members.filter(m => m.is_active !== false && !m.is_guest).map(member => (
                              <label key={member.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                                <input
                                  type="checkbox"
                                  checked={selectedMembers.includes(member.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedMembers([...selectedMembers, member.id])
                                    } else {
                                      setSelectedMembers(selectedMembers.filter(id => id !== member.id))
                                    }
                                  }}
                                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                />
                                <span className="text-sm text-gray-900">{member.full_name || member.email || 'Unknown Member'}</span>
                              </label>
                            ))
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-gray-500">Loading members...</p>
                      )}
                    </div>
                    {selectedMembers.length > 0 && (
                      <p className="text-sm text-gray-600 mt-2">
                        {selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''} selected
                      </p>
                    )}
                  </div>

                  <button
                    onClick={handleBulkAssignWorkout}
                    className="btn btn-primary w-full"
                  >
                    Assign to {selectedMembers.length} Member{selectedMembers.length !== 1 ? 's' : ''}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Assignment List */}
          {assignments.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-gray-600">No workout assignments yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Pending Assignments */}
              {assignments.filter(a => !a.is_completed).length > 0 && (
                <>
                  <h3 className="font-semibold text-gray-900">To Do</h3>
                  {assignments.filter(a => !a.is_completed).map(assignment => (
                    <div key={assignment.id} className="card hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-3">
                        {/* Checkbox */}
                        <input
                          type="checkbox"
                          checked={assignment.is_completed}
                          onChange={(e) => completeAssignment(assignment.id, e.target.checked)}
                          className="mt-1 h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />

                        {/* Assignment Details */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-semibold text-gray-900">{assignment.title}</h4>
                              <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                                {assignment.workout_type && (
                                  <>
                                    <span>{assignment.workout_type.icon}</span>
                                    <span>{assignment.workout_type.name}</span>
                                    <span>•</span>
                                  </>
                                )}
                                <span>Assigned: {format(new Date(assignment.assigned_date), 'MMM d')}</span>
                                {assignment.due_date && (
                                  <>
                                    <span>•</span>
                                    <span className={new Date(assignment.due_date) < new Date() ? 'text-red-600 font-medium' : ''}>
                                      Due: {format(new Date(assignment.due_date), 'MMM d')}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Delete button for admins/coaches */}
                            {(hasRole('admin') || hasRole('coach')) && (
                              <button
                                onClick={() => {
                                  if (window.confirm('Delete this assignment?')) {
                                    deleteAssignment(assignment.id)
                                  }
                                }}
                                className="text-red-600 hover:text-red-700 text-sm"
                              >
                                Delete
                              </button>
                            )}
                          </div>

                          {assignment.description && (
                            <p className="text-sm text-gray-600 mt-2">{assignment.description}</p>
                          )}

                          {/* Target Metrics */}
                          {(assignment.target_duration_minutes || assignment.target_distance_km) && (
                            <div className="flex items-center gap-4 text-sm mt-2">
                              {assignment.target_duration_minutes && (
                                <div>
                                  <span className="text-gray-600">Target:</span>{' '}
                                  <span className="font-medium text-gray-900">{assignment.target_duration_minutes} min</span>
                                </div>
                              )}
                              {assignment.target_distance_km && (
                                <div>
                                  <span className="text-gray-600">Distance:</span>{' '}
                                  <span className="font-medium text-gray-900">{assignment.target_distance_km} km</span>
                                </div>
                              )}
                            </div>
                          )}

                          {assignment.notes && (
                            <p className="text-sm text-gray-500 mt-2 italic">{assignment.notes}</p>
                          )}

                          {/* Show assigned to info for admins/coaches */}
                          {(hasRole('admin') || hasRole('coach')) && assignment.assigned_to_profile && (
                            <p className="text-xs text-gray-500 mt-2">
                              Assigned to: {assignment.assigned_to_profile.full_name}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Completed Assignments */}
              {assignments.filter(a => a.is_completed).length > 0 && (
                <>
                  <h3 className="font-semibold text-gray-900 mt-6">Completed</h3>
                  {assignments.filter(a => a.is_completed).map(assignment => (
                    <div key={assignment.id} className="card bg-gray-50 opacity-75">
                      <div className="flex items-start gap-3">
                        {/* Checkbox */}
                        <input
                          type="checkbox"
                          checked={assignment.is_completed}
                          onChange={(e) => completeAssignment(assignment.id, e.target.checked)}
                          className="mt-1 h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />

                        {/* Assignment Details */}
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-700 line-through">{assignment.title}</h4>
                          <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                            {assignment.workout_type && (
                              <>
                                <span>{assignment.workout_type.icon}</span>
                                <span>{assignment.workout_type.name}</span>
                                <span>•</span>
                              </>
                            )}
                            <span>Completed: {format(new Date(assignment.completed_at), 'MMM d, h:mm a')}</span>
                          </div>

                          {/* Show assigned to info for admins/coaches */}
                          {(hasRole('admin') || hasRole('coach')) && assignment.assigned_to_profile && (
                            <p className="text-xs text-gray-500 mt-2">
                              Assigned to: {assignment.assigned_to_profile.full_name}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'myWorkouts' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="card">
            <div className="flex items-center gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mr-2">Date Range:</label>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="input py-1"
                >
                  <option value="week">This Week</option>
                  <option value="month">Last 30 Days</option>
                  <option value="all">All Time</option>
                </select>
              </div>
            </div>
          </div>

          {/* Workout List */}
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-600">Loading workouts...</p>
            </div>
          ) : workoutLogs.filter(log => log.user_id === user?.id).length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-gray-600 mb-4">No workouts logged yet</p>
              <button onClick={() => setShowLogForm(true)} className="btn btn-primary">
                Log Your First Workout
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {workoutLogs.filter(log => log.user_id === user?.id).map(workout => (
                <div key={workout.id} className="card hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{workout.workout_type?.icon || '💪'}</span>
                        <div>
                          <h3 className="font-semibold text-gray-900">{workout.title}</h3>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span>{format(new Date(workout.workout_date), 'MMM d, yyyy')}</span>
                            <span>•</span>
                            <span className={`px-2 py-0.5 rounded text-xs ${getIntensityColor(workout.intensity)}`}>
                              {workout.intensity}
                            </span>
                            <span>{getFeelingEmoji(workout.feeling)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-3">
                        {workout.duration_minutes && (
                          <div>
                            <span className="text-gray-600">Duration:</span>{' '}
                            <span className="font-medium text-gray-900">{workout.duration_minutes} min</span>
                          </div>
                        )}
                        {workout.distance_km && (
                          <div>
                            <span className="text-gray-600">Distance:</span>{' '}
                            <span className="font-medium text-gray-900">{workout.distance_km} km</span>
                          </div>
                        )}
                        {workout.calories_burned && (
                          <div>
                            <span className="text-gray-600">Calories:</span>{' '}
                            <span className="font-medium text-gray-900">{workout.calories_burned} cal</span>
                          </div>
                        )}
                        {workout.location && (
                          <div>
                            <span className="text-gray-600">Location:</span>{' '}
                            <span className="font-medium text-gray-900">{workout.location}</span>
                          </div>
                        )}
                      </div>

                      {workout.description && (
                        <p className="text-sm text-gray-600 mt-3">{workout.description}</p>
                      )}

                      {workout.external_link && (
                        <a
                          href={workout.external_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary-600 hover:text-primary-700 mt-2 inline-block"
                        >
                          View on {workout.external_link.includes('strava') ? 'Strava' : 'External App'} →
                        </a>
                      )}
                    </div>

                    <button
                      onClick={() => deleteWorkout(workout.id, user.id)}
                      className="text-gray-400 hover:text-red-600"
                      title="Delete workout"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'teamActivity' && (
        <div className="space-y-4">
          {/* Quick Team Stats */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Team Stats (This Week)</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {workoutLogs.filter(log => {
                    const logDate = new Date(log.workout_date)
                    const weekStart = startOfWeek(new Date())
                    return logDate >= weekStart
                  }).length}
                </div>
                <div className="text-sm text-blue-800 font-medium mt-1">Total Workouts</div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg text-center">
                <div className="text-3xl font-bold text-green-600">
                  {(() => {
                    const weekLogs = workoutLogs.filter(log => {
                      const logDate = new Date(log.workout_date)
                      const weekStart = startOfWeek(new Date())
                      return logDate >= weekStart
                    })
                    return weekLogs.reduce((sum, log) => sum + (log.duration_minutes || 0), 0)
                  })()}
                </div>
                <div className="text-sm text-green-800 font-medium mt-1">Total Minutes</div>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {(() => {
                    const weekLogs = workoutLogs.filter(log => {
                      const logDate = new Date(log.workout_date)
                      const weekStart = startOfWeek(new Date())
                      return logDate >= weekStart
                    })
                    const uniqueUsers = new Set(weekLogs.map(log => log.user_id))
                    return uniqueUsers.size
                  })()}
                </div>
                <div className="text-sm text-purple-800 font-medium mt-1">Active Members</div>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg text-center">
                <div className="text-3xl font-bold text-orange-600">
                  {assignments.filter(a => {
                    if (!a.is_completed || !a.completed_at) return false
                    const completedDate = new Date(a.completed_at)
                    const weekStart = startOfWeek(new Date())
                    return completedDate >= weekStart
                  }).length}
                </div>
                <div className="text-sm text-orange-800 font-medium mt-1">Assignments Done</div>
              </div>
            </div>
          </div>

          {/* Team Leaderboard */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Team Leaderboard</h2>
            <div className="space-y-2">
              {Object.entries(streaks)
                .sort(([, a], [, b]) => b.current_streak - a.current_streak)
                .slice(0, 10)
                .map(([userId, streak], index) => (
                  <div key={userId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        index === 0 ? 'bg-yellow-400 text-yellow-900' :
                        index === 1 ? 'bg-gray-300 text-gray-700' :
                        index === 2 ? 'bg-orange-400 text-orange-900' :
                        'bg-gray-200 text-gray-600'
                      }`}>
                        {index + 1}
                      </div>
                      <span className="font-medium text-gray-900">{streak.user_profile?.full_name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Streak:</span>{' '}
                        <span className="font-bold text-orange-600">{streak.current_streak}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Total:</span>{' '}
                        <span className="font-medium text-gray-900">{streak.total_workouts} workouts</span>
                      </div>
                    </div>
                  </div>
                ))}
              {Object.entries(streaks).length === 0 && (
                <p className="text-gray-500 text-center py-4">No workout data yet</p>
              )}
            </div>
          </div>

          {/* Recent Team Activity - Combined workouts and completed assignments */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
            <div className="space-y-3">
              {(() => {
                // Combine workouts and completed assignments into one feed
                const activities = [
                  ...workoutLogs.filter(log => log.is_public).map(log => ({
                    id: `workout-${log.id}`,
                    type: 'workout',
                    date: new Date(log.workout_date),
                    userName: log.user_profile?.full_name || 'Unknown',
                    title: log.title,
                    icon: log.workout_type?.icon || '💪',
                    typeName: log.workout_type?.name,
                    duration: log.duration_minutes,
                    distance: log.distance_km
                  })),
                  ...assignments.filter(a => a.is_completed).map(a => ({
                    id: `assignment-${a.id}`,
                    type: 'assignment',
                    date: new Date(a.completed_at),
                    userName: a.assigned_to_profile?.full_name || 'Unknown',
                    title: a.title,
                    icon: a.workout_type?.icon || '✅',
                    typeName: a.workout_type?.name || 'Assignment',
                    duration: a.target_duration_minutes,
                    distance: a.target_distance_km
                  }))
                ]

                // Sort by date descending and take top 30
                return activities
                  .sort((a, b) => b.date - a.date)
                  .slice(0, 30)
                  .map(activity => (
                    <div key={activity.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{activity.icon}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-gray-900">{activity.userName}</span>
                            <span className="text-gray-600 text-sm">
                              {activity.type === 'assignment' ? 'completed assignment' : 'logged'}
                            </span>
                            <span className="font-medium text-gray-900">{activity.title}</span>
                            {activity.type === 'assignment' && (
                              <span className="px-2 py-0.5 text-xs rounded bg-green-100 text-green-700">
                                Assigned
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {format(activity.date, 'MMM d, h:mm a')}
                            {activity.duration && ` • ${activity.duration} min`}
                            {activity.distance && ` • ${activity.distance} km`}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
              })()}
              {workoutLogs.filter(log => log.is_public).length === 0 && assignments.filter(a => a.is_completed).length === 0 && (
                <p className="text-gray-500 text-center py-4">No recent activity</p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'programs' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {programs.map(program => {
              const isEnrolled = enrollments.some(e => e.program_id === program.id)

              return (
                <div key={program.id} className="card">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900 text-lg">{program.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 text-xs rounded bg-blue-100 text-blue-800 capitalize">
                          {program.program_type}
                        </span>
                        <span className="px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-800 capitalize">
                          {program.difficulty}
                        </span>
                        {program.is_required && (
                          <span className="px-2 py-0.5 text-xs rounded bg-red-100 text-red-800">
                            Required
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {program.description && (
                    <p className="text-sm text-gray-600 mb-3">{program.description}</p>
                  )}

                  {program.video_url && (
                    <a
                      href={program.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary-600 hover:text-primary-700 mb-3 inline-block"
                    >
                      📺 Watch Video Guide
                    </a>
                  )}

                  {program.checklists && program.checklists.length > 0 && (
                    <div className="text-sm text-gray-600 mb-3">
                      {program.checklists.length} exercises included
                    </div>
                  )}

                  <button
                    onClick={() => !isEnrolled && enrollInProgram(program.id, user.id)}
                    className={`btn w-full ${isEnrolled ? 'btn-secondary' : 'btn-primary'}`}
                    disabled={isEnrolled}
                  >
                    {isEnrolled ? '✓ Enrolled' : 'Enroll in Program'}
                  </button>
                </div>
              )
            })}

            {programs.length === 0 && (
              <div className="card text-center py-12 col-span-2">
                <p className="text-gray-600">No training programs available</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'challenges' && (
        <div className="space-y-4">
          {(hasRole('admin') || hasRole('coach')) && (
            <div className="flex justify-end">
              <button
                onClick={() => setShowChallengeForm(!showChallengeForm)}
                className="btn btn-primary"
              >
                {showChallengeForm ? 'Cancel' : '+ Create Challenge'}
              </button>
            </div>
          )}

          {showChallengeForm && (
            <div className="card bg-blue-50">
              <h3 className="font-semibold text-gray-900 mb-4">Create New Challenge</h3>
              <div className="space-y-4">
                <div>
                  <label className="label">Challenge Title *</label>
                  <input
                    type="text"
                    className="input"
                    value={challengeForm.title}
                    onChange={(e) => setChallengeForm({ ...challengeForm, title: e.target.value })}
                    placeholder="e.g., 30-Day Workout Streak"
                  />
                </div>

                <div>
                  <label className="label">Description</label>
                  <textarea
                    className="input"
                    rows="3"
                    value={challengeForm.description}
                    onChange={(e) => setChallengeForm({ ...challengeForm, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Start Date *</label>
                    <input
                      type="date"
                      className="input"
                      value={challengeForm.start_date}
                      onChange={(e) => setChallengeForm({ ...challengeForm, start_date: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="label">End Date *</label>
                    <input
                      type="date"
                      className="input"
                      value={challengeForm.end_date}
                      onChange={(e) => setChallengeForm({ ...challengeForm, end_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="label">Challenge Type</label>
                    <select
                      className="input"
                      value={challengeForm.challenge_type}
                      onChange={(e) => setChallengeForm({ ...challengeForm, challenge_type: e.target.value })}
                    >
                      <option value="frequency">Frequency (# of workouts)</option>
                      <option value="duration">Duration (minutes)</option>
                      <option value="distance">Distance (km)</option>
                      <option value="streak">Streak (consecutive days)</option>
                    </select>
                  </div>

                  <div>
                    <label className="label">Goal Value</label>
                    <input
                      type="number"
                      className="input"
                      value={challengeForm.goal_value}
                      onChange={(e) => setChallengeForm({ ...challengeForm, goal_value: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="label">Goal Unit</label>
                    <input
                      type="text"
                      className="input"
                      value={challengeForm.goal_unit}
                      onChange={(e) => setChallengeForm({ ...challengeForm, goal_unit: e.target.value })}
                      placeholder="workouts, km, etc."
                    />
                  </div>
                </div>

                <div>
                  <label className="label">External Link (Strava, etc.)</label>
                  <input
                    type="url"
                    className="input"
                    value={challengeForm.external_link}
                    onChange={(e) => setChallengeForm({ ...challengeForm, external_link: e.target.value })}
                    placeholder="https://..."
                  />
                </div>

                <button onClick={handleCreateChallenge} className="btn btn-primary w-full">
                  Create Challenge
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {challenges.map(challenge => {
              const isParticipant = challenge.participants?.some(p => p.user_id === user?.id)
              const participantCount = challenge.participants?.length || 0

              return (
                <div key={challenge.id} className="card">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{challenge.title}</h3>
                      <div className="text-sm text-gray-600 mt-1">
                        {format(new Date(challenge.start_date), 'MMM d')} - {format(new Date(challenge.end_date), 'MMM d, yyyy')}
                      </div>
                    </div>
                    <div className="text-2xl">🏆</div>
                  </div>

                  {challenge.description && (
                    <p className="text-sm text-gray-600 mb-3">{challenge.description}</p>
                  )}

                  <div className="flex items-center gap-4 text-sm mb-3">
                    <div>
                      <span className="text-gray-600">Goal:</span>{' '}
                      <span className="font-medium text-gray-900">
                        {challenge.goal_value} {challenge.goal_unit}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Participants:</span>{' '}
                      <span className="font-medium text-gray-900">{participantCount}</span>
                    </div>
                  </div>

                  {challenge.external_link && (
                    <a
                      href={challenge.external_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary-600 hover:text-primary-700 mb-3 inline-block"
                    >
                      View on {challenge.platform === 'strava' ? 'Strava' : 'External Platform'} →
                    </a>
                  )}

                  <button
                    onClick={() => !isParticipant && joinChallenge(challenge.id, user.id)}
                    className={`btn w-full ${isParticipant ? 'btn-secondary' : 'btn-primary'}`}
                    disabled={isParticipant}
                  >
                    {isParticipant ? '✓ Joined' : 'Join Challenge'}
                  </button>
                </div>
              )
            })}

            {challenges.length === 0 && !showChallengeForm && (
              <div className="card text-center py-12 col-span-2">
                <p className="text-gray-600">No active challenges</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'resources' && (
        <div className="space-y-4">
          {(hasRole('admin') || hasRole('coach')) && (
            <div className="flex justify-end">
              <button
                onClick={() => setShowResourceForm(!showResourceForm)}
                className="btn btn-primary"
              >
                {showResourceForm ? 'Cancel' : '+ Add Resource'}
              </button>
            </div>
          )}

          {showResourceForm && (
            <div className="card bg-blue-50">
              <h3 className="font-semibold text-gray-900 mb-4">Add Workout Resource</h3>
              <div className="space-y-4">
                <div>
                  <label className="label">Title *</label>
                  <input
                    type="text"
                    className="input"
                    value={resourceForm.title}
                    onChange={(e) => setResourceForm({ ...resourceForm, title: e.target.value })}
                  />
                </div>

                <div>
                  <label className="label">Description</label>
                  <textarea
                    className="input"
                    rows="2"
                    value={resourceForm.description}
                    onChange={(e) => setResourceForm({ ...resourceForm, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Type</label>
                    <select
                      className="input"
                      value={resourceForm.resource_type}
                      onChange={(e) => setResourceForm({ ...resourceForm, resource_type: e.target.value })}
                    >
                      <option value="video">Video</option>
                      <option value="article">Article</option>
                      <option value="plan">Training Plan</option>
                      <option value="image">Image</option>
                    </select>
                  </div>

                  <div>
                    <label className="label">Category</label>
                    <select
                      className="input"
                      value={resourceForm.category}
                      onChange={(e) => setResourceForm({ ...resourceForm, category: e.target.value })}
                    >
                      <option value="technique">Technique</option>
                      <option value="strength">Strength</option>
                      <option value="nutrition">Nutrition</option>
                      <option value="recovery">Recovery</option>
                      <option value="motivation">Motivation</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="label">URL *</label>
                  <input
                    type="url"
                    className="input"
                    value={resourceForm.url}
                    onChange={(e) => setResourceForm({ ...resourceForm, url: e.target.value })}
                    placeholder="https://youtube.com/..."
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={resourceForm.is_pinned}
                      onChange={(e) => setResourceForm({ ...resourceForm, is_pinned: e.target.checked })}
                      className="w-5 h-5 text-primary-600 rounded"
                    />
                    <span className="text-sm text-gray-700">Pin to top</span>
                  </label>
                </div>

                <button onClick={handleCreateResource} className="btn btn-primary w-full">
                  Add Resource
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {resources.map(resource => (
              <div key={resource.id} className="card">
                {resource.is_pinned && (
                  <div className="mb-2">
                    <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                      📌 Pinned
                    </span>
                  </div>
                )}

                <div className="flex items-start gap-3 mb-3">
                  <div className="text-2xl">
                    {resource.resource_type === 'video' && '📺'}
                    {resource.resource_type === 'article' && '📄'}
                    {resource.resource_type === 'plan' && '📋'}
                    {resource.resource_type === 'image' && '🖼️'}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{resource.title}</h3>
                    <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700 capitalize">
                      {resource.category}
                    </span>
                  </div>
                </div>

                {resource.description && (
                  <p className="text-sm text-gray-600 mb-3">{resource.description}</p>
                )}

                <a
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary w-full text-center"
                >
                  View Resource →
                </a>

                <div className="text-xs text-gray-500 mt-2">
                  Shared by {resource.created_by_profile?.full_name}
                </div>
              </div>
            ))}

            {resources.length === 0 && !showResourceForm && (
              <div className="card text-center py-12 col-span-3">
                <p className="text-gray-600">No resources available</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Log Workout Modal */}
      {showLogForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Log Workout</h2>
                <button
                  onClick={() => setShowLogForm(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Workout Type *</label>
                    <select
                      className="input"
                      value={workoutForm.workout_type_id}
                      onChange={(e) => setWorkoutForm({ ...workoutForm, workout_type_id: e.target.value })}
                    >
                      <option value="">Select type</option>
                      {workoutTypes.map(type => (
                        <option key={type.id} value={type.id}>
                          {type.icon} {type.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="label">Date *</label>
                    <input
                      type="date"
                      className="input"
                      value={workoutForm.workout_date}
                      onChange={(e) => setWorkoutForm({ ...workoutForm, workout_date: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Title *</label>
                  <input
                    type="text"
                    className="input"
                    value={workoutForm.title}
                    onChange={(e) => setWorkoutForm({ ...workoutForm, title: e.target.value })}
                    placeholder="e.g., Morning Run, Gym Session"
                  />
                </div>

                <div>
                  <label className="label">Description</label>
                  <textarea
                    className="input"
                    rows="3"
                    value={workoutForm.description}
                    onChange={(e) => setWorkoutForm({ ...workoutForm, description: e.target.value })}
                    placeholder="What did you do?"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="label">Duration (min)</label>
                    <input
                      type="number"
                      className="input"
                      value={workoutForm.duration_minutes}
                      onChange={(e) => setWorkoutForm({ ...workoutForm, duration_minutes: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="label">Distance (km)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="input"
                      value={workoutForm.distance_km}
                      onChange={(e) => setWorkoutForm({ ...workoutForm, distance_km: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="label">Calories</label>
                    <input
                      type="number"
                      className="input"
                      value={workoutForm.calories_burned}
                      onChange={(e) => setWorkoutForm({ ...workoutForm, calories_burned: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Intensity</label>
                    <select
                      className="input"
                      value={workoutForm.intensity}
                      onChange={(e) => setWorkoutForm({ ...workoutForm, intensity: e.target.value })}
                    >
                      <option value="low">Low</option>
                      <option value="moderate">Moderate</option>
                      <option value="high">High</option>
                      <option value="max">Maximum</option>
                    </select>
                  </div>

                  <div>
                    <label className="label">How did you feel?</label>
                    <select
                      className="input"
                      value={workoutForm.feeling}
                      onChange={(e) => setWorkoutForm({ ...workoutForm, feeling: e.target.value })}
                    >
                      <option value="great">😄 Great</option>
                      <option value="good">🙂 Good</option>
                      <option value="okay">😐 Okay</option>
                      <option value="tired">😴 Tired</option>
                      <option value="sore">😰 Sore</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="label">Location</label>
                  <input
                    type="text"
                    className="input"
                    value={workoutForm.location}
                    onChange={(e) => setWorkoutForm({ ...workoutForm, location: e.target.value })}
                    placeholder="Gym, Outdoor, Home, etc."
                  />
                </div>

                <div>
                  <label className="label">External Link (Strava, Garmin, etc.)</label>
                  <input
                    type="url"
                    className="input"
                    value={workoutForm.external_link}
                    onChange={(e) => setWorkoutForm({ ...workoutForm, external_link: e.target.value })}
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label className="label">Notes</label>
                  <textarea
                    className="input"
                    rows="2"
                    value={workoutForm.notes}
                    onChange={(e) => setWorkoutForm({ ...workoutForm, notes: e.target.value })}
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={workoutForm.is_public}
                      onChange={(e) => setWorkoutForm({ ...workoutForm, is_public: e.target.checked })}
                      className="w-5 h-5 text-primary-600 rounded"
                    />
                    <span className="text-sm text-gray-700">Make visible to team</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
                <button
                  onClick={() => setShowLogForm(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogWorkout}
                  className="btn btn-primary"
                >
                  Log Workout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
