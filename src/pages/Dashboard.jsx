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
        const today = new Date()
        const thirtyDaysAgo = subDays(today, 30)

        // Fetch RSVPs for all practices in the last 30 days (for stats calculation)
        const recentPractices = practices.filter(p => {
          const practiceDate = new Date(p.date)
          return isBefore(practiceDate, today) && isAfter(practiceDate, thirtyDaysAgo)
        })

        await Promise.all(
          recentPractices.map(practice => fetchRSVPs(practice.id))
        )
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
        color: 'accent',
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

  const getActivityColor = (color) => {
    const colors = {
      primary: { bg: 'bg-primary-50', border: 'border-primary-200', icon: 'text-primary-600' },
      success: { bg: 'bg-success-50', border: 'border-success-200', icon: 'text-success-600' },
      accent: { bg: 'bg-accent-50', border: 'border-accent-200', icon: 'text-accent-600' },
      amber: { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'text-amber-600' },
    }
    return colors[color] || colors.primary
  }

  return (
    <div className="space-y-6 lg:space-y-8 relative pb-20 lg:pb-0">
      {/* Welcome Section - Athletic Hero */}
      <div className="relative overflow-hidden rounded-xl lg:rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-primary-950 p-5 md:p-8 lg:p-10 text-white shadow-2xl">
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_25%,rgba(8,145,178,0.05)_25%,rgba(8,145,178,0.05)_50%,transparent_50%,transparent_75%,rgba(8,145,178,0.05)_75%)] bg-[length:40px_40px]" />

        <div className="relative z-10 flex flex-col lg:flex-row gap-8 lg:items-center">
          <div className="flex-1 space-y-5">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-bold uppercase tracking-wider text-white/90 backdrop-blur-sm">
              <Icon name="boat" size={14} className="text-primary-300" />
              <span>Season Momentum</span>
            </span>
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-display tracking-wide text-white">
                {getGreeting()}, {firstName}
              </h1>
              <p className="text-slate-300 max-w-2xl mt-2 md:mt-4 text-sm md:text-base lg:text-lg leading-relaxed">
                Ready to set the pace? Keep the crew aligned with live attendance, workouts, and race readiness.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <span className="inline-flex items-center px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm font-medium text-slate-300 backdrop-blur-sm">
                <span className="w-2 h-2 rounded-full bg-primary-400 mr-2.5 animate-pulse" />
                {loading ? '...' : `${stats.upcomingPractices} practices`} this week
              </span>
              <span className="inline-flex items-center px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm font-medium text-slate-300 backdrop-blur-sm">
                <span className="w-2 h-2 rounded-full bg-success-400 mr-2.5" />
                {loading ? '...' : `${stats.activeMembers} active paddlers`}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link to="/practices" className="btn btn-primary shadow-xl shadow-primary-900/30 w-full sm:w-auto justify-center">
                <Icon name="calendar" size={16} className="mr-2 sm:hidden" />
                Plan Session
              </Link>
              <Link
                to="/calendar"
                className="btn bg-white/10 text-white hover:bg-white/20 border-2 border-white/20 backdrop-blur-sm hover:border-white/30 w-full sm:w-auto justify-center"
              >
                <Icon name="events" size={16} className="mr-2 sm:hidden" />
                Crew Calendar
              </Link>
            </div>
          </div>

          {/* Stats Card - Hidden on mobile, shown on lg+ */}
          <div className="hidden lg:block lg:w-[340px]">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
              <h3 className="text-xs font-bold uppercase tracking-widest text-primary-300 mb-5">Rhythm Snapshot</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-xl p-4 border border-white/5 hover:bg-white/10 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Readiness</p>
                    <Icon name="check" size={16} className="text-success-400" />
                  </div>
                  <p className="text-3xl font-display tracking-wide text-white">{loading ? '...' : `${stats.attendanceRate}%`}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4 border border-white/5 hover:bg-white/10 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Energy</p>
                    <Icon name="fire" size={16} className="text-accent-400" />
                  </div>
                  <p className="text-3xl font-display tracking-wide text-white">{loading ? '...' : stats.workoutStreak}<span className="text-lg text-slate-400 ml-1">days</span></p>
                </div>
                <div className="bg-gradient-to-r from-primary-500/10 to-accent-500/10 rounded-xl p-4 border border-white/5 col-span-2">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Icon name="trophy" size={16} className="text-accent-400" />
                    <p className="text-sm font-bold text-white">Race Hungry</p>
                  </div>
                  <p className="text-sm text-slate-400">Keep syncing RSVPs to stay podium-ready.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <div className="stat-card group p-3 lg:p-5">
          <div className="flex items-center justify-between mb-2 lg:mb-4">
            <div className="p-2 lg:p-3 bg-gradient-to-br from-primary-100 to-primary-50 rounded-lg lg:rounded-xl group-hover:scale-105 transition-transform">
              <Icon name="calendar" size={18} className="text-primary-600 lg:hidden" />
              <Icon name="calendar" size={22} className="text-primary-600 hidden lg:block" />
            </div>
            <span className="badge badge-primary text-[9px] lg:text-[10px]">Week</span>
          </div>
          <div className="text-2xl lg:text-3xl font-display tracking-wide text-slate-900">
            {loading ? '...' : stats.upcomingPractices}
          </div>
          <p className="text-xs lg:text-sm font-medium text-slate-500 mt-0.5 lg:mt-1">Practices</p>
        </div>

        <div className="stat-card group p-3 lg:p-5">
          <div className="flex items-center justify-between mb-2 lg:mb-4">
            <div className="p-2 lg:p-3 bg-gradient-to-br from-success-100 to-success-50 rounded-lg lg:rounded-xl group-hover:scale-105 transition-transform">
              <Icon name="roster" size={18} className="text-success-600 lg:hidden" />
              <Icon name="roster" size={22} className="text-success-600 hidden lg:block" />
            </div>
            <span className="badge badge-success text-[9px] lg:text-[10px]">Active</span>
          </div>
          <div className="text-2xl lg:text-3xl font-display tracking-wide text-slate-900">
            {loading ? '...' : stats.activeMembers}
          </div>
          <p className="text-xs lg:text-sm font-medium text-slate-500 mt-0.5 lg:mt-1">Paddlers</p>
        </div>

        <div className="stat-card group p-3 lg:p-5">
          <div className="flex items-center justify-between mb-2 lg:mb-4">
            <div className="p-2 lg:p-3 bg-gradient-to-br from-accent-100 to-accent-50 rounded-lg lg:rounded-xl group-hover:scale-105 transition-transform">
              <Icon name="target" size={18} className="text-accent-600 lg:hidden" />
              <Icon name="target" size={22} className="text-accent-600 hidden lg:block" />
            </div>
            <span className="badge badge-accent text-[9px] lg:text-[10px]">30d</span>
          </div>
          <div className="text-2xl lg:text-3xl font-display tracking-wide text-slate-900">
            {loading ? '...' : `${stats.attendanceRate}%`}
          </div>
          <p className="text-xs lg:text-sm font-medium text-slate-500 mt-0.5 lg:mt-1">Attendance</p>
        </div>

        <div className="stat-card group p-3 lg:p-5">
          <div className="flex items-center justify-between mb-2 lg:mb-4">
            <div className="p-2 lg:p-3 bg-gradient-to-br from-amber-100 to-amber-50 rounded-lg lg:rounded-xl group-hover:scale-105 transition-transform">
              <Icon name="fire" size={18} className="text-amber-600 lg:hidden" />
              <Icon name="fire" size={22} className="text-amber-600 hidden lg:block" />
            </div>
            <span className="badge badge-warning text-[9px] lg:text-[10px]">Streak</span>
          </div>
          <div className="text-2xl lg:text-3xl font-display tracking-wide text-slate-900">
            {loading ? '...' : stats.workoutStreak}
          </div>
          <p className="text-xs lg:text-sm font-medium text-slate-500 mt-0.5 lg:mt-1">Workout Days</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/practices" className="card-interactive group">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl shadow-lg shadow-primary-500/30 group-hover:shadow-xl group-hover:shadow-primary-500/40 transition-all group-hover:scale-105">
              <Icon name="practice" size={28} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-slate-900 group-hover:text-primary-600 transition-colors">
                View Practices
              </h3>
              <p className="text-sm text-slate-500 truncate">Check upcoming sessions</p>
            </div>
            <Icon name="arrowRight" size={20} className="text-slate-300 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
          </div>
        </Link>

        <Link to="/workouts" className="card-interactive group">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-gradient-to-br from-success-500 to-success-600 rounded-xl shadow-lg shadow-success-500/30 group-hover:shadow-xl group-hover:shadow-success-500/40 transition-all group-hover:scale-105">
              <Icon name="workouts" size={28} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-slate-900 group-hover:text-success-600 transition-colors">
                Log Workout
              </h3>
              <p className="text-sm text-slate-500 truncate">Track your training</p>
            </div>
            <Icon name="arrowRight" size={20} className="text-slate-300 group-hover:text-success-500 group-hover:translate-x-1 transition-all" />
          </div>
        </Link>

        <Link to="/calendar" className="card-interactive group">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-gradient-to-br from-accent-500 to-accent-600 rounded-xl shadow-lg shadow-accent-500/30 group-hover:shadow-xl group-hover:shadow-accent-500/40 transition-all group-hover:scale-105">
              <Icon name="events" size={28} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-slate-900 group-hover:text-accent-600 transition-colors">
                Team Calendar
              </h3>
              <p className="text-sm text-slate-500 truncate">Races & events</p>
            </div>
            <Icon name="arrowRight" size={20} className="text-slate-300 group-hover:text-accent-500 group-hover:translate-x-1 transition-all" />
          </div>
        </Link>
      </div>

      {/* Activity Feed */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-primary-600 mb-1">Pulse</p>
            <h2 className="text-2xl font-display tracking-wide text-slate-900">Recent Activity</h2>
          </div>
          <Link to="/announcements" className="text-sm text-primary-600 hover:text-primary-700 font-bold hover:underline">
            View all
          </Link>
        </div>

        <div className="space-y-3">
          {recentActivity.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Icon name="calendar" size={24} className="text-slate-400" />
              </div>
              <p className="text-slate-500 font-medium">No recent activity</p>
              <p className="text-sm text-slate-400">Your team updates will appear here</p>
            </div>
          ) : (
            recentActivity.map((activity, idx) => {
              const colors = getActivityColor(activity.color)
              return (
                <div
                  key={activity.id}
                  className={`flex items-start gap-4 p-4 bg-slate-50/50 rounded-xl border border-slate-100 hover:bg-white hover:shadow-sm hover:border-slate-200 transition-all animate-slide-up stagger-${idx + 1}`}
                >
                  <div className={`p-2.5 rounded-xl ${colors.bg} border ${colors.border}`}>
                    <Icon name={activity.icon} size={18} className={colors.icon} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900">{activity.title}</p>
                    <p className="text-sm text-slate-600 mt-0.5">{activity.description}</p>
                    <p className="text-xs text-slate-400 mt-2 font-medium">{getTimeAgo(activity.date)}</p>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
