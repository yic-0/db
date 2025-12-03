import { useState, useEffect, useMemo, useRef } from 'react'
import { useWorkoutStore } from '../store/workoutStore'
import { useAuthStore } from '../store/authStore'
import { format, startOfWeek, endOfWeek } from 'date-fns'
import Icon from '../components/Icon'
import {
  WeekCalendarStrip,
  AssignedExerciseCard,
  ExerciseDetailModal,
  TeamProgressCard,
  ChallengeCard,
  ChallengeTierPicker,
  AssignExercisesModal,
  CreateChallengeModal
} from '../components/workouts'

export default function Workouts() {
  // Store state
  const exercises = useWorkoutStore(state => state.exercises)
  const exerciseCategories = useWorkoutStore(state => state.exerciseCategories)
  const exerciseCompletions = useWorkoutStore(state => state.exerciseCompletions)
  const streaks = useWorkoutStore(state => state.streaks)
  const trainingChallenges = useWorkoutStore(state => state.trainingChallenges)
  const challengeEnrollments = useWorkoutStore(state => state.challengeEnrollments)
  const weeklyAssignments = useWorkoutStore(state => state.weeklyAssignments)
  const teamWeeklyCompletions = useWorkoutStore(state => state.teamWeeklyCompletions)

  // Store actions
  const fetchExercises = useWorkoutStore(state => state.fetchExercises)
  const fetchExerciseCategories = useWorkoutStore(state => state.fetchExerciseCategories)
  const fetchExerciseCompletions = useWorkoutStore(state => state.fetchExerciseCompletions)
  const toggleExerciseCompletion = useWorkoutStore(state => state.toggleExerciseCompletion)
  const fetchStreaks = useWorkoutStore(state => state.fetchStreaks)
  const getUserStreak = useWorkoutStore(state => state.getUserStreak)
  const createExercise = useWorkoutStore(state => state.createExercise)
  const deleteExercise = useWorkoutStore(state => state.deleteExercise)
  const updateExerciseDragonBoatBenefit = useWorkoutStore(state => state.updateExerciseDragonBoatBenefit)
  const exportExercises = useWorkoutStore(state => state.exportExercises)
  const importExercises = useWorkoutStore(state => state.importExercises)
  const getExerciseTemplates = useWorkoutStore(state => state.getExerciseTemplates)
  const importTemplate = useWorkoutStore(state => state.importTemplate)

  // New challenge functions
  const fetchTrainingChallenges = useWorkoutStore(state => state.fetchTrainingChallenges)
  const fetchChallengeEnrollments = useWorkoutStore(state => state.fetchChallengeEnrollments)
  const joinTrainingChallenge = useWorkoutStore(state => state.joinTrainingChallenge)
  const updateEnrollmentTier = useWorkoutStore(state => state.updateEnrollmentTier)
  const leaveChallenge = useWorkoutStore(state => state.leaveChallenge)
  const fetchWeeklyAssignments = useWorkoutStore(state => state.fetchWeeklyAssignments)
  const fetchTeamCompletionsForWeek = useWorkoutStore(state => state.fetchTeamCompletionsForWeek)
  const getWeeklyCompletionCount = useWorkoutStore(state => state.getWeeklyCompletionCount)
  const getCurrentWeekStart = useWorkoutStore(state => state.getCurrentWeekStart)
  const getActiveChallenges = useWorkoutStore(state => state.getActiveChallenges)
  const getUserEnrollment = useWorkoutStore(state => state.getUserEnrollment)
  const assignExercisesToWeek = useWorkoutStore(state => state.assignExercisesToWeek)
  const createTrainingChallenge = useWorkoutStore(state => state.createTrainingChallenge)

  const { user, profile, hasRole } = useAuthStore()
  const isAdmin = hasRole('admin') || hasRole('coach')

  // Local state
  const [activeTab, setActiveTab] = useState('week')
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [weekStart, setWeekStart] = useState(getCurrentWeekStart())

  // Modal states
  const [detailExercise, setDetailExercise] = useState(null)
  const [tierPickerChallenge, setTierPickerChallenge] = useState(null)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showCreateChallenge, setShowCreateChallenge] = useState(false)
  const [showAddExercise, setShowAddExercise] = useState(false)
  const [editingBenefit, setEditingBenefit] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null) // exercise id to confirm delete
  const [showTemplates, setShowTemplates] = useState(false)
  const [importingTemplate, setImportingTemplate] = useState(null)
  const fileInputRef = useRef(null)

  // Add exercise form
  const [newExercise, setNewExercise] = useState({
    name: '',
    description: '',
    category_id: '',
    dragon_boat_benefit: '',
    default_duration_minutes: '',
    default_reps: '',
    default_sets: '',
    difficulty: 'intermediate',
    is_dragon_boat_specific: true
  })

  // Load data on mount
  useEffect(() => {
    fetchExerciseCategories()
    fetchExercises()
    fetchStreaks()
    fetchTrainingChallenges()
  }, [])

  // Load user-specific data
  useEffect(() => {
    if (user) {
      const start = format(startOfWeek(new Date()), 'yyyy-MM-dd')
      const end = format(endOfWeek(new Date()), 'yyyy-MM-dd')
      fetchExerciseCompletions(user.id, start, end)
      fetchChallengeEnrollments(user.id)
    }
  }, [user?.id])

  // Load weekly data
  useEffect(() => {
    fetchWeeklyAssignments(weekStart)
    fetchTeamCompletionsForWeek(weekStart)
  }, [weekStart])

  // Get user streak
  const userStreak = user
    ? (getUserStreak(user.id) || { current_streak: 0, longest_streak: 0, total_workouts: 0 })
    : { current_streak: 0, longest_streak: 0, total_workouts: 0 }

  // Get active challenges
  const activeChallenges = getActiveChallenges()

  // Get user's primary challenge enrollment
  const primaryEnrollment = useMemo(() => {
    if (!activeChallenges.length || !user) return null
    const challenge = activeChallenges[0]
    return getUserEnrollment(challenge.id, user.id)
  }, [activeChallenges, user, trainingChallenges])

  // Calculate user's weekly progress
  const userWeeklyCount = user ? getWeeklyCompletionCount(user.id, weekStart) : 0
  const tierTarget = primaryEnrollment
    ? activeChallenges[0]?.[`${primaryEnrollment.tier}_target`] || 4
    : 4

  // Get completed dates for calendar
  const completedDates = useMemo(() => {
    if (!exerciseCompletions.length) return []
    const dates = new Set(exerciseCompletions.map(c => c.completion_date))
    return Array.from(dates)
  }, [exerciseCompletions])

  // Team progress stats
  const teamStats = useMemo(() => {
    const byUser = {}
    teamWeeklyCompletions.forEach(c => {
      if (!byUser[c.user_id]) {
        byUser[c.user_id] = { id: c.user_id, name: c.user?.full_name, count: 0 }
      }
      byUser[c.user_id].count++
    })
    const topContributors = Object.values(byUser).sort((a, b) => b.count - a.count)
    return {
      total: teamWeeklyCompletions.length,
      topContributors
    }
  }, [teamWeeklyCompletions])

  // Check if exercise is completed on selected date
  const isExerciseCompleted = (exerciseId) => {
    return exerciseCompletions.some(c =>
      c.exercise_id === exerciseId &&
      c.completion_date === selectedDate
    )
  }

  // Get teammates who completed an exercise
  const getTeammatesCompleted = (exerciseId) => {
    return teamWeeklyCompletions.filter(c =>
      c.exercise_id === exerciseId && c.user_id !== user?.id
    ).length
  }

  // Handle exercise toggle
  const handleToggleExercise = async (exerciseId) => {
    if (!user) return
    const isCompleted = isExerciseCompleted(exerciseId)
    await toggleExerciseCompletion(user.id, exerciseId, selectedDate, !isCompleted)
    // Refresh team data
    fetchTeamCompletionsForWeek(weekStart)
  }

  // Handle joining challenge
  const handleJoinChallenge = (challenge) => {
    setTierPickerChallenge(challenge)
  }

  // Handle tier selection
  const handleTierSelect = async (tier) => {
    if (!user || !tierPickerChallenge) return
    const existingEnrollment = getUserEnrollment(tierPickerChallenge.id, user.id)
    if (existingEnrollment) {
      await updateEnrollmentTier(existingEnrollment.id, user.id, tier)
    } else {
      await joinTrainingChallenge(tierPickerChallenge.id, user.id, tier)
    }
  }

  // Handle leaving challenge
  const handleLeaveChallenge = async (challenge) => {
    if (!user) return
    const enrollment = getUserEnrollment(challenge.id, user.id)
    if (enrollment) {
      await leaveChallenge(enrollment.id, user.id)
    }
  }

  // Handle assigning exercises (admin)
  const handleAssignExercises = async (exerciseIds, weekStartDate) => {
    if (!user) return
    await assignExercisesToWeek(exerciseIds, weekStartDate, user.id)
  }

  // Handle creating challenge (admin)
  const handleCreateChallenge = async (challengeData) => {
    if (!user) return
    await createTrainingChallenge({
      ...challengeData,
      created_by: user.id
    })
  }

  // Handle adding exercise (admin)
  const handleAddExercise = async () => {
    if (!user || !newExercise.name || !newExercise.category_id) return

    await createExercise({
      ...newExercise,
      created_by: user.id,
      default_duration_minutes: newExercise.default_duration_minutes ? parseInt(newExercise.default_duration_minutes) : null,
      default_reps: newExercise.default_reps ? parseInt(newExercise.default_reps) : null,
      default_sets: newExercise.default_sets ? parseInt(newExercise.default_sets) : null
    })

    setShowAddExercise(false)
    setNewExercise({
      name: '',
      description: '',
      category_id: '',
      dragon_boat_benefit: '',
      default_duration_minutes: '',
      default_reps: '',
      default_sets: '',
      difficulty: 'intermediate',
      is_dragon_boat_specific: true
    })
  }

  // Handle file import
  const handleFileImport = async (event) => {
    const file = event.target.files?.[0]
    if (!file || !user) return

    try {
      const text = await file.text()
      await importExercises(text, user.id)
    } catch (error) {
      console.error('Error reading file:', error)
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Handle template import
  const handleTemplateImport = async (templateId) => {
    if (!user) return
    setImportingTemplate(templateId)
    await importTemplate(templateId, user.id)
    setImportingTemplate(null)
  }

  // Get exercises to display based on tab and filters
  const displayExercises = useMemo(() => {
    if (activeTab === 'week') {
      // Show assigned exercises first, then all exercises
      const assignedIds = weeklyAssignments.map(a => a.exercise_id)
      const assigned = exercises.filter(e => assignedIds.includes(e.id))
      const unassigned = exercises.filter(e => !assignedIds.includes(e.id))

      if (selectedCategory === 'all') {
        return { assigned, unassigned }
      }
      return {
        assigned: assigned.filter(e => e.category_id === selectedCategory),
        unassigned: unassigned.filter(e => e.category_id === selectedCategory)
      }
    }

    // Library tab - all exercises
    if (selectedCategory === 'all') return { all: exercises }
    return { all: exercises.filter(e => e.category_id === selectedCategory) }
  }, [exercises, weeklyAssignments, activeTab, selectedCategory])

  return (
    <div className="space-y-4 sm:space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary-600 mb-0.5">Team Training</p>
          <h1 className="text-2xl sm:text-3xl font-display tracking-wide text-slate-900">Workouts</h1>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowAssignModal(true)}
              className="btn btn-secondary text-sm"
            >
              <Icon name="calendar" size={16} className="mr-1" />
              Assign Week
            </button>
            <button
              onClick={() => setShowCreateChallenge(true)}
              className="btn btn-primary text-sm"
            >
              <Icon name="plus" size={16} className="mr-1" />
              Challenge
            </button>
          </div>
        )}
      </div>

      {/* Week Calendar */}
      <WeekCalendarStrip
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        completedDates={completedDates}
      />

      {/* Progress Card */}
      <TeamProgressCard
        weeklyTotal={teamStats.total}
        weeklyGoal={50}
        topContributors={teamStats.topContributors}
        streak={userStreak.current_streak}
        personalCount={userWeeklyCount}
        tierTarget={tierTarget}
      />

      {/* Active Challenge (compact) */}
      {activeChallenges.length > 0 && (
        <ChallengeCard
          challenge={activeChallenges[0]}
          userEnrollment={primaryEnrollment}
          userProgress={userWeeklyCount}
          teamProgress={{
            total: teamStats.total,
            goal: activeChallenges[0].team_goal || 200,
            percentage: Math.min(100, Math.round((teamStats.total / (activeChallenges[0].team_goal || 200)) * 100))
          }}
          onJoin={() => handleJoinChallenge(activeChallenges[0])}
          onChangeTier={() => setTierPickerChallenge(activeChallenges[0])}
          onLeave={() => handleLeaveChallenge(activeChallenges[0])}
          compact
        />
      )}

      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {[
          { id: 'week', label: 'This Week', icon: 'calendar' },
          { id: 'team', label: 'Team', icon: 'roster' },
          { id: 'challenges', label: 'Challenges', icon: 'trophy' },
          { id: 'library', label: 'Library', icon: 'workouts' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white/80 text-slate-600 border border-slate-200/60 hover:border-slate-300'
            }`}
          >
            <Icon name={tab.icon} size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'week' && (
        <div className="space-y-4">
          {/* Category Filter */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === 'all'
                  ? 'bg-slate-800 text-white'
                  : 'bg-white text-slate-500 border border-slate-200'
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
                    ? 'bg-slate-800 text-white'
                    : 'bg-white text-slate-500 border border-slate-200'
                }`}
              >
                {cat.icon} {cat.name}
              </button>
            ))}
          </div>

          {/* Assigned Exercises */}
          {displayExercises.assigned?.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                <Icon name="check" size={12} />
                Assigned This Week
              </h3>
              <div className="space-y-2">
                {displayExercises.assigned.map(exercise => (
                  <AssignedExerciseCard
                    key={exercise.id}
                    exercise={exercise}
                    isCompleted={isExerciseCompleted(exercise.id)}
                    onToggle={() => handleToggleExercise(exercise.id)}
                    teammatesCompleted={getTeammatesCompleted(exercise.id)}
                    onShowDetails={setDetailExercise}
                    isRequired
                  />
                ))}
              </div>
            </div>
          )}

          {/* Other Exercises */}
          {displayExercises.unassigned?.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                More Exercises
              </h3>
              <div className="space-y-2">
                {displayExercises.unassigned.slice(0, 8).map(exercise => (
                  <AssignedExerciseCard
                    key={exercise.id}
                    exercise={exercise}
                    isCompleted={isExerciseCompleted(exercise.id)}
                    onToggle={() => handleToggleExercise(exercise.id)}
                    teammatesCompleted={getTeammatesCompleted(exercise.id)}
                    onShowDetails={setDetailExercise}
                    isRequired={false}
                  />
                ))}
              </div>
              {displayExercises.unassigned.length > 8 && (
                <button
                  onClick={() => setActiveTab('library')}
                  className="w-full mt-3 py-2 text-sm font-semibold text-primary-600 hover:text-primary-700"
                >
                  View all {displayExercises.unassigned.length} exercises
                </button>
              )}
            </div>
          )}

          {displayExercises.assigned?.length === 0 && displayExercises.unassigned?.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <Icon name="workouts" size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">No exercises found</p>
              <p className="text-sm mt-1">Check back later or browse the library</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'team' && (
        <div className="space-y-4">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200/60 p-4">
            <h3 className="font-bold text-slate-800 mb-3">Team Activity This Week</h3>

            {teamStats.topContributors.length > 0 ? (
              <div className="space-y-2">
                {teamStats.topContributors.map((contributor, idx) => (
                  <div
                    key={contributor.id}
                    className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
                  >
                    <span className="text-lg w-6 text-center">
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`}
                    </span>
                    <div className="flex-1">
                      <span className="font-medium text-slate-800">{contributor.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-20 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-500 rounded-full"
                          style={{ width: `${Math.min(100, (contributor.count / tierTarget) * 100)}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-primary-600 min-w-[40px] text-right">
                        {contributor.count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <p>No activity yet this week</p>
                <p className="text-sm mt-1">Be the first to complete an exercise!</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'challenges' && (
        <div className="space-y-4">
          {isAdmin && (
            <button
              onClick={() => setShowCreateChallenge(true)}
              className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm font-semibold text-slate-500 hover:border-primary-300 hover:text-primary-600 transition-colors"
            >
              <Icon name="plus" size={16} className="inline mr-1" />
              Create New Challenge
            </button>
          )}

          {trainingChallenges.length > 0 ? (
            <div className="space-y-4">
              {trainingChallenges.map(challenge => (
                <ChallengeCard
                  key={challenge.id}
                  challenge={challenge}
                  userEnrollment={user ? getUserEnrollment(challenge.id, user.id) : null}
                  userProgress={user ? getWeeklyCompletionCount(user.id, weekStart) : 0}
                  teamProgress={{
                    total: teamStats.total,
                    goal: challenge.team_goal || 200,
                    percentage: Math.min(100, Math.round((teamStats.total / (challenge.team_goal || 200)) * 100))
                  }}
                  onJoin={() => handleJoinChallenge(challenge)}
                  onChangeTier={() => setTierPickerChallenge(challenge)}
                  onLeave={() => handleLeaveChallenge(challenge)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500">
              <span className="text-4xl block mb-3">🏆</span>
              <p className="font-medium">No active challenges</p>
              {isAdmin && (
                <p className="text-sm mt-1">Create one to motivate the team!</p>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'library' && (
        <div className="space-y-4">
          {/* Admin: Import/Export and Templates */}
          {isAdmin && (
            <>
              {/* Hidden file input for import */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.json"
                onChange={handleFileImport}
                className="hidden"
              />

              {/* Action buttons row */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setShowAddExercise(!showAddExercise)}
                  className="flex-1 sm:flex-none py-2.5 px-4 border-2 border-dashed border-slate-200 rounded-xl text-sm font-semibold text-slate-500 hover:border-primary-300 hover:text-primary-600 transition-colors"
                >
                  {showAddExercise ? 'Cancel' : '+ Add Exercise'}
                </button>
                <button
                  onClick={() => setShowTemplates(!showTemplates)}
                  className="flex items-center gap-1.5 py-2.5 px-4 bg-amber-50 border border-amber-200 rounded-xl text-sm font-semibold text-amber-700 hover:bg-amber-100 transition-colors"
                >
                  <Icon name="star" size={14} />
                  Templates
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 py-2.5 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                  title="Import from CSV or JSON file"
                >
                  <Icon name="upload" size={14} />
                  Import CSV
                </button>
                <button
                  onClick={exportExercises}
                  className="flex items-center gap-1.5 py-2.5 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                  title="Export to CSV file"
                >
                  <Icon name="download" size={14} />
                  Export CSV
                </button>
              </div>

              {/* Templates Section */}
              {showTemplates && (
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                      <span className="text-xl">📦</span>
                      Exercise Templates
                    </h3>
                    <button
                      onClick={() => setShowTemplates(false)}
                      className="p-1 hover:bg-amber-100 rounded"
                    >
                      <Icon name="close" size={16} className="text-slate-500" />
                    </button>
                  </div>
                  <p className="text-sm text-slate-600">
                    Quick-start your library with pre-built exercise sets. Duplicates will be skipped. You can also import/export CSV files.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {getExerciseTemplates().map(template => (
                      <button
                        key={template.id}
                        onClick={() => handleTemplateImport(template.id)}
                        disabled={importingTemplate === template.id}
                        className="text-left p-3 bg-white rounded-lg border border-amber-200 hover:border-amber-300 hover:shadow-sm transition-all disabled:opacity-50"
                      >
                        <div className="font-semibold text-slate-800 text-sm">{template.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{template.description}</div>
                        <div className="text-xs text-amber-600 mt-1 font-medium">
                          {importingTemplate === template.id ? (
                            <span className="flex items-center gap-1">
                              <span className="w-3 h-3 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                              Importing...
                            </span>
                          ) : (
                            `${template.exercises.length} exercises`
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {showAddExercise && (
                <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200/60 p-4 space-y-4">
                  <h3 className="font-bold text-slate-800">Add New Exercise</h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Exercise name"
                      value={newExercise.name}
                      onChange={(e) => setNewExercise(prev => ({ ...prev, name: e.target.value }))}
                      className="input"
                    />
                    <select
                      value={newExercise.category_id}
                      onChange={(e) => setNewExercise(prev => ({ ...prev, category_id: e.target.value }))}
                      className="input"
                    >
                      <option value="">Select category</option>
                      {exerciseCategories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                      ))}
                    </select>
                  </div>

                  <textarea
                    placeholder="Description"
                    value={newExercise.description}
                    onChange={(e) => setNewExercise(prev => ({ ...prev, description: e.target.value }))}
                    rows={2}
                    className="input resize-none"
                  />

                  <textarea
                    placeholder="🚣 How does this help paddling?"
                    value={newExercise.dragon_boat_benefit}
                    onChange={(e) => setNewExercise(prev => ({ ...prev, dragon_boat_benefit: e.target.value }))}
                    rows={2}
                    className="input resize-none"
                  />

                  <div className="grid grid-cols-3 gap-3">
                    <input
                      type="number"
                      placeholder="Duration (min)"
                      value={newExercise.default_duration_minutes}
                      onChange={(e) => setNewExercise(prev => ({ ...prev, default_duration_minutes: e.target.value }))}
                      className="input"
                    />
                    <input
                      type="number"
                      placeholder="Reps"
                      value={newExercise.default_reps}
                      onChange={(e) => setNewExercise(prev => ({ ...prev, default_reps: e.target.value }))}
                      className="input"
                    />
                    <input
                      type="number"
                      placeholder="Sets"
                      value={newExercise.default_sets}
                      onChange={(e) => setNewExercise(prev => ({ ...prev, default_sets: e.target.value }))}
                      className="input"
                    />
                  </div>

                  <div className="flex gap-3">
                    <select
                      value={newExercise.difficulty}
                      onChange={(e) => setNewExercise(prev => ({ ...prev, difficulty: e.target.value }))}
                      className="input flex-1"
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                    <label className="flex items-center gap-2 px-3">
                      <input
                        type="checkbox"
                        checked={newExercise.is_dragon_boat_specific}
                        onChange={(e) => setNewExercise(prev => ({ ...prev, is_dragon_boat_specific: e.target.checked }))}
                        className="rounded border-slate-300"
                      />
                      <span className="text-sm text-slate-600">DB Specific</span>
                    </label>
                  </div>

                  <button
                    onClick={handleAddExercise}
                    disabled={!newExercise.name || !newExercise.category_id}
                    className="btn btn-primary w-full"
                  >
                    Add Exercise
                  </button>
                </div>
              )}
            </>
          )}

          {/* Category Filter */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === 'all'
                  ? 'bg-slate-800 text-white'
                  : 'bg-white text-slate-500 border border-slate-200'
              }`}
            >
              All ({exercises.length})
            </button>
            {exerciseCategories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-slate-800 text-white'
                    : 'bg-white text-slate-500 border border-slate-200'
                }`}
              >
                {cat.icon} {cat.name}
              </button>
            ))}
          </div>

          {/* Exercise Grid */}
          <div className="space-y-2">
            {(displayExercises.all || []).map(exercise => (
              <div
                key={exercise.id}
                className="bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200/60 p-4 hover:border-slate-300 transition-all"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{exercise.category?.icon || ''}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-800">{exercise.name}</span>
                      {exercise.is_dragon_boat_specific && (
                        <span className="px-1.5 py-0.5 text-[9px] font-bold bg-cyan-100 text-cyan-700 rounded">DB</span>
                      )}
                      <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${
                        exercise.difficulty === 'beginner'
                          ? 'bg-green-100 text-green-700'
                          : exercise.difficulty === 'intermediate'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {exercise.difficulty}
                      </span>
                    </div>
                    {exercise.description && (
                      <p className="text-sm text-slate-500 mt-1 line-clamp-2">{exercise.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                      {exercise.default_duration_minutes && (
                        <span>{exercise.default_duration_minutes} min</span>
                      )}
                      {exercise.default_reps && (
                        <span>{exercise.default_reps} reps</span>
                      )}
                      {exercise.default_sets && (
                        <span>{exercise.default_sets} sets</span>
                      )}
                    </div>

                    {/* Dragon Boat Benefit */}
                    {exercise.dragon_boat_benefit && (
                      <div className="mt-2 p-2 bg-cyan-50/50 rounded-lg">
                        <p className="text-xs text-cyan-700">
                          <span className="font-semibold">🚣 Paddling benefit:</span> {exercise.dragon_boat_benefit}
                        </p>
                      </div>
                    )}

                    {/* Admin: Edit benefit */}
                    {isAdmin && !exercise.dragon_boat_benefit && (
                      <button
                        onClick={() => setEditingBenefit(exercise.id)}
                        className="mt-2 text-xs text-primary-600 hover:text-primary-700 font-medium"
                      >
                        + Add paddling benefit
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setDetailExercise(exercise)}
                      className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                    >
                      <Icon name="information" size={16} className="text-slate-400" />
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => setDeleteConfirm(exercise.id)}
                        className="p-2 rounded-lg bg-slate-50 hover:bg-red-50 transition-colors group"
                        title="Delete exercise"
                      >
                        <Icon name="trash" size={16} className="text-slate-400 group-hover:text-red-500" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Delete confirmation */}
                {deleteConfirm === exercise.id && (
                  <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-100">
                    <p className="text-sm text-red-700 mb-2">Delete "{exercise.name}"?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          await deleteExercise(exercise.id)
                          setDeleteConfirm(null)
                        }}
                        className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-white rounded-lg border border-slate-200 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Inline benefit editor */}
                {editingBenefit === exercise.id && (
                  <div className="mt-3 flex gap-2">
                    <input
                      type="text"
                      placeholder="How does this help paddling?"
                      className="input flex-1 text-sm"
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter' && e.target.value) {
                          await updateExerciseDragonBoatBenefit(exercise.id, e.target.value)
                          setEditingBenefit(null)
                        }
                        if (e.key === 'Escape') {
                          setEditingBenefit(null)
                        }
                      }}
                      autoFocus
                    />
                    <button
                      onClick={() => setEditingBenefit(null)}
                      className="px-3 text-sm text-slate-500"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      <ExerciseDetailModal
        exercise={detailExercise}
        isOpen={!!detailExercise}
        onClose={() => setDetailExercise(null)}
      />

      <ChallengeTierPicker
        challenge={tierPickerChallenge}
        isOpen={!!tierPickerChallenge}
        onClose={() => setTierPickerChallenge(null)}
        onSelect={handleTierSelect}
        currentTier={tierPickerChallenge && user ? getUserEnrollment(tierPickerChallenge.id, user.id)?.tier : null}
      />

      <AssignExercisesModal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        exercises={exercises}
        categories={exerciseCategories}
        currentAssignments={weeklyAssignments}
        weekStart={weekStart}
        onAssign={handleAssignExercises}
      />

      <CreateChallengeModal
        isOpen={showCreateChallenge}
        onClose={() => setShowCreateChallenge(false)}
        onCreate={handleCreateChallenge}
      />
    </div>
  )
}
