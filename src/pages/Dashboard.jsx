import { useEffect, useState, useMemo } from 'react'
import { useAuthStore } from '../store/authStore'
import { usePracticeStore } from '../store/practiceStore'
import { useRosterStore } from '../store/rosterStore'
import { useWorkoutStore } from '../store/workoutStore'
import { useCalendarStore } from '../store/calendarStore'
import Icon from '../components/Icon'
import { Link } from 'react-router-dom'
import { format, isAfter, isBefore, addDays, subDays, differenceInDays } from 'date-fns'

export default function Dashboard() {
  const { user, profile } = useAuthStore()
  const { practices, fetchPractices, rsvps, fetchRSVPs } = usePracticeStore()
  const { members, fetchMembers } = useRosterStore()
  const { workoutLogs, fetchWorkoutLogs } = useWorkoutStore()
  const { confirmedRaces, fetchConfirmedRaces } = useCalendarStore()

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        await Promise.all([
          fetchPractices(),
          fetchMembers(),
          user && fetchWorkoutLogs(user.id),
          fetchConfirmedRaces()
        ])
      } catch (error) {
        console.error('Error loading dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [user?.id])

  // Fetch RSVPs after practices are loaded
  useEffect(() => {
    const loadRSVPs = async () => {
      if (user && practices.length > 0) {
        const recentPractices = practices
          .filter(p => isBefore(new Date(p.date), new Date()))
          .slice(-10)

        for (const practice of recentPractices) {
          await fetchRSVPs(practice.id)
        }
      }
    }
    loadRSVPs()
  }, [practices, user?.id])

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  // Calculate real statistics
  const stats = useMemo(() => {
    const today = new Date()
    const weekEnd = addDays(today, 7)

    // Upcoming practices this week
    const upcomingPractices = practices.filter(p => {
      const practiceDate = new Date(p.date)
      return isAfter(practiceDate, today) && isBefore(practiceDate, weekEnd)
    }).length

    // Active team members (non-guest, active)
    const activeMembers = members.filter(m =>
      m.is_active !== false && !m.is_guest
    ).length

    // User's attendance rate (last 30 days)
    const thirtyDaysAgo = subDays(today, 30)
    const recentPractices = practices.filter(p => {
      const practiceDate = new Date(p.date)
      return isBefore(practiceDate, today) && isAfter(practiceDate, thirtyDaysAgo)
    })

    let attendanceRate = 0
    if (recentPractices.length > 0 && user) {
      const attended = recentPractices.filter(p => {
        const practiceRsvps = rsvps[p.id] || []
        const userRsvp = practiceRsvps.find(r => r.user_id === user.id)
        return userRsvp?.attended || userRsvp?.status === 'yes'
      }).length
      attendanceRate = Math.round((attended / recentPractices.length) * 100)
    }

    // Workout streak (consecutive days with workouts)
    let streak = 0
    if (workoutLogs.length > 0) {
      const sortedLogs = [...workoutLogs].sort((a, b) =>
        new Date(b.workout_date) - new Date(a.workout_date)
      )

      let checkDate = today
      for (let i = 0; i < 30; i++) {
        const dateStr = format(checkDate, 'yyyy-MM-dd')
        const hasWorkout = sortedLogs.some(log => log.workout_date === dateStr)

        if (hasWorkout) {
          streak++
          checkDate = subDays(checkDate, 1)
        } else if (i === 0) {
          // Check yesterday if no workout today
          checkDate = subDays(checkDate, 1)
        } else {
          break
        }
      }
    }

    return {
      upcomingPractices,
      activeMembers,
      attendanceRate,
      workoutStreak: streak
    }
  }, [practices, members, rsvps, workoutLogs, user])

  // Recent activity feed
  const recentActivity = useMemo(() => {
    const activities = []
    const today = new Date()

    // Add recent practices
    practices
      .filter(p => isAfter(new Date(p.date), today))
      .slice(0, 2)
      .forEach(p => {
        activities.push({
          id: `practice-${p.id}`,
          type: 'practice',
          title: 'Practice scheduled',
          description: `${p.title} on ${format(new Date(p.date), 'EEEE')} at ${p.start_time}`,
          icon: 'practice',
          color: 'primary',
          date: new Date(p.created_at || p.date)
        })
      })

    // Add recent workout logs
    if (workoutLogs.length > 0) {
      const latestWorkout = workoutLogs[0]
      activities.push({
        id: `workout-${latestWorkout.id}`,
        type: 'workout',
        title: 'Workout completed',
        description: `You logged a ${latestWorkout.duration_minutes}-minute ${latestWorkout.workout_type?.name || 'workout'} session`,
        icon: 'check',
        color: 'success',
        date: new Date(latestWorkout.created_at || latestWorkout.workout_date)
      })
    }

    // Add recent races
    confirmedRaces.slice(0, 1).forEach(race => {
      activities.push({
        id: `race-${race.id}`,
        type: 'race',
        title: 'Upcoming race',
        description: `${race.name} - ${format(new Date(race.race_date), 'MMM d, yyyy')}`,
        icon: 'trophy',
        color: 'amber',
        date: new Date(race.created_at || race.race_date)
      })
    })

    // Sort by date and return top 3
    return activities
      .sort((a, b) => b.date - a.date)
      .slice(0, 3)
  }, [practices, workoutLogs, confirmedRaces])

  const firstName = profile?.full_name?.split(' ')[0] || 'Paddler'

  const getTimeAgo = (date) => {
    const now = new Date()
    const diff = differenceInDays(now, date)

    if (diff === 0) return 'Today'
    if (diff === 1) return 'Yesterday'
    if (diff < 7) return `${diff} days ago`
    return format(date, 'MMM d')
  }

  return (
    <div className="space-y-10 relative">
      {/* Welcome Section */}
      <div className="relative overflow-hidden rounded-3xl border border-white/50 bg-gradient-to-br from-primary-700 via-primary-600 to-accent-500 p-8 md:p-10 text-white shadow-xl shadow-primary-600/20">
        <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.35),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.25),transparent_30%)]" aria-hidden="true" />
        <div className="relative z-10 flex flex-col lg:flex-row gap-8 lg:items-center">
          <div className="flex-1 space-y-5">
            <span className="chip bg-white/15 border-white/40 text-white">
              <Icon name="boat" size={16} className="text-white" />
              Season Momentum
            </span>
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                {getGreeting()}, {firstName}. Ready to set the pace?
              </h1>
              <p className="text-primary-100/90 max-w-3xl mt-2">
                Keep the crew aligned with live attendance, playful workouts, and race readiness - all in one sleek cockpit built for paddlers.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <span className="pill bg-white/15 border-white/30 text-white">
                {loading ? '...' : `${stats.upcomingPractices} practices`} this week
              </span>
              <span className="pill bg-white/15 border-white/30 text-white">
                {loading ? '...' : `${stats.activeMembers} active crew`}
              </span>
              <span className="pill bg-white/15 border-white/30 text-white">
                {loading ? '...' : `${stats.attendanceRate}% attendance`}
              </span>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/practice-prep" className="btn bg-white text-primary-700 hover:bg-primary-50 hover:text-primary-800 shadow-lg shadow-primary-700/20">
                Plan the next session
              </Link>
              <Link
                to="/calendar"
                className="btn btn-secondary bg-white/15 border-white/50 text-white hover:bg-white/25 hover:text-white hover:border-white/70"
              >
                Open crew calendar
              </Link>
            </div>
          </div>

          <div className="lg:w-[360px]">
            <div className="bg-white/10 border border-white/20 rounded-2xl p-5 shadow-lg shadow-primary-800/10 backdrop-blur">
              <h3 className="text-sm font-semibold text-white/80 mb-3">Rhythm snapshot</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/10 rounded-xl p-3 border border-white/10">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-white/70">Readiness</p>
                    <Icon name="check" size={16} className="text-white" />
                  </div>
                  <p className="text-2xl font-bold">{loading ? '...' : `${stats.attendanceRate}%`}</p>
                  <p className="text-xs text-white/60 mt-1">Attendance this month</p>
                </div>
                <div className="bg-white/10 rounded-xl p-3 border border-white/10">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-white/70">Energy</p>
                    <Icon name="fire" size={16} className="text-white" />
                  </div>
                  <p className="text-2xl font-bold">{loading ? '...' : stats.workoutStreak}</p>
                  <p className="text-xs text-white/60 mt-1">Day workout streak</p>
                </div>
                <div className="bg-white/10 rounded-xl p-3 border border-white/10 col-span-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-white/70">Crew vibe</p>
                    <Icon name="trophy" size={16} className="text-white" />
                  </div>
                  <p className="text-lg font-semibold mt-1">Aligned & race hungry</p>
                  <p className="text-xs text-white/60 mt-1">Keep syncing RSVPs to stay podium-ready.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-contrast gradient-border relative overflow-hidden group">
          <div className="absolute right-2 top-2 w-20 h-20 bg-primary-100 rounded-full blur-2xl opacity-70 group-hover:opacity-90 transition" aria-hidden="true" />
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-primary-50 rounded-xl group-hover:bg-primary-100 transition-colors">
              <Icon name="calendar" size={24} className="text-primary-600" />
            </div>
            <span className="badge badge-primary">This week</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {loading ? '...' : stats.upcomingPractices}
          </p>
          <p className="text-sm text-gray-600 mt-1">Upcoming practices</p>
        </div>

        <div className="card-contrast gradient-border relative overflow-hidden group">
          <div className="absolute -left-4 top-2 w-24 h-24 bg-success-100 rounded-full blur-2xl opacity-70 group-hover:opacity-90 transition" aria-hidden="true" />
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-success-50 rounded-xl group-hover:bg-success-100 transition-colors">
              <Icon name="roster" size={24} className="text-success-600" />
            </div>
            <span className="badge badge-success">Active</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {loading ? '...' : stats.activeMembers}
          </p>
          <p className="text-sm text-gray-600 mt-1">Team members</p>
        </div>

        <div className="card-contrast gradient-border relative overflow-hidden group">
          <div className="absolute right-0 bottom-0 w-28 h-28 bg-accent-100 rounded-full blur-2xl opacity-70 group-hover:opacity-90 transition" aria-hidden="true" />
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-accent-50 rounded-xl group-hover:bg-accent-100 transition-colors">
              <Icon name="target" size={24} className="text-accent-600" />
            </div>
            <span className="badge bg-accent-100 text-accent-700">30 days</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {loading ? '...' : `${stats.attendanceRate}%`}
          </p>
          <p className="text-sm text-gray-600 mt-1">Your attendance</p>
        </div>

        <div className="card-contrast gradient-border relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-100 rounded-full blur-2xl opacity-70 group-hover:opacity-90 transition" aria-hidden="true" />
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-amber-50 rounded-xl group-hover:bg-amber-100 transition-colors">
              <Icon name="fire" size={24} className="text-amber-600" />
            </div>
            <span className="badge badge-warning">Streak</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {loading ? '...' : stats.workoutStreak}
          </p>
          <p className="text-sm text-gray-600 mt-1">Day workout streak</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link to="/practices" className="card group cursor-pointer hover:border-primary-200 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-24 h-24 bg-primary-100/60 blur-2xl opacity-80" aria-hidden="true" />
          <div className="flex items-center gap-4">
            <div className="p-4 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl shadow-lg shadow-primary-500/25">
              <Icon name="practice" size={28} className="text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                View Practices
              </h3>
              <p className="text-sm text-gray-500">Check upcoming sessions</p>
            </div>
            <Icon name="arrowRight" size={20} className="text-gray-400 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
          </div>
        </Link>

        <Link to="/workouts" className="card group cursor-pointer hover:border-success-200 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-24 h-24 bg-success-100/60 blur-2xl opacity-80" aria-hidden="true" />
          <div className="flex items-center gap-4">
            <div className="p-4 bg-gradient-to-br from-success-500 to-success-600 rounded-xl shadow-lg shadow-success-500/25">
              <Icon name="workouts" size={28} className="text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 group-hover:text-success-600 transition-colors">
                Log Workout
              </h3>
              <p className="text-sm text-gray-500">Track your training</p>
            </div>
            <Icon name="arrowRight" size={20} className="text-gray-400 group-hover:text-success-500 group-hover:translate-x-1 transition-all" />
          </div>
        </Link>

        <Link to="/calendar" className="card group cursor-pointer hover:border-accent-200 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-24 h-24 bg-accent-100/60 blur-2xl opacity-80" aria-hidden="true" />
          <div className="flex items-center gap-4">
            <div className="p-4 bg-gradient-to-br from-accent-500 to-accent-600 rounded-xl shadow-lg shadow-accent-500/25">
              <Icon name="events" size={28} className="text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 group-hover:text-accent-600 transition-colors">
                Team Calendar
              </h3>
              <p className="text-sm text-gray-500">Races & events</p>
            </div>
            <Icon name="arrowRight" size={20} className="text-gray-400 group-hover:text-accent-500 group-hover:translate-x-1 transition-all" />
          </div>
        </Link>
      </div>

      {/* Activity Feed */}
      <div className="card-contrast gradient-border">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="tagline text-primary-700">Pulse</p>
            <h2 className="section-header">Recent Activity</h2>
          </div>
          <Link to="/announcements" className="text-sm text-primary-600 hover:text-primary-700 font-semibold">
            View all
          </Link>
        </div>

        <div className="space-y-4">
          {recentActivity.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No recent activity</p>
          ) : (
            recentActivity.map(activity => (
              <div key={activity.id} className="flex items-start gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className={`p-2 rounded-lg bg-${activity.color}-50 border border-${activity.color}-100`}>
                  <Icon name={activity.icon} size={18} className={`text-${activity.color}-600`} />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{activity.title}</p>
                  <p className="text-sm text-gray-600">{activity.description}</p>
                  <p className="text-xs text-gray-400 mt-1">{getTimeAgo(activity.date)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
