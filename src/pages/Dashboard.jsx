import { useAuthStore } from '../store/authStore'
import Icon from '../components/Icon'
import { Link } from 'react-router-dom'

export default function Dashboard() {
  const { profile, hasRole } = useAuthStore()

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 via-primary-700 to-accent-600 p-8 text-white">
        <div className="relative z-10">
          <h1 className="text-3xl font-bold mb-2">
            {getGreeting()}, {profile?.full_name?.split(' ')[0]}!
          </h1>
          <p className="text-primary-100 text-lg">
            Ready to make some waves today?
          </p>
        </div>
        <div className="absolute right-0 top-0 w-64 h-64 opacity-10">
          <svg viewBox="0 0 200 200" className="w-full h-full">
            <path d="M 0 100 Q 25 90 50 100 T 100 100 T 150 100 T 200 100 V 200 H 0 Z" fill="currentColor" />
            <path d="M 0 120 Q 25 110 50 120 T 100 120 T 150 120 T 200 120 V 200 H 0 Z" fill="currentColor" opacity="0.5" />
          </svg>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-primary-50 rounded-xl group-hover:bg-primary-100 transition-colors">
              <Icon name="calendar" size={24} className="text-primary-600" />
            </div>
            <span className="badge badge-primary">This week</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">3</p>
          <p className="text-sm text-gray-600 mt-1">Upcoming Practices</p>
        </div>

        <div className="stat-card group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-success-50 rounded-xl group-hover:bg-success-100 transition-colors">
              <Icon name="roster" size={24} className="text-success-600" />
            </div>
            <span className="badge badge-success">Active</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">24</p>
          <p className="text-sm text-gray-600 mt-1">Team Members</p>
        </div>

        <div className="stat-card group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-accent-50 rounded-xl group-hover:bg-accent-100 transition-colors">
              <Icon name="target" size={24} className="text-accent-600" />
            </div>
            <span className="badge bg-accent-100 text-accent-700">30 days</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">92%</p>
          <p className="text-sm text-gray-600 mt-1">Your Attendance</p>
        </div>

        <div className="stat-card group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-amber-50 rounded-xl group-hover:bg-amber-100 transition-colors">
              <Icon name="fire" size={24} className="text-amber-600" />
            </div>
            <span className="badge badge-warning">Streak</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">7</p>
          <p className="text-sm text-gray-600 mt-1">Day Workout Streak</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link to="/practices" className="card group cursor-pointer hover:border-primary-200">
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

        <Link to="/workouts" className="card group cursor-pointer hover:border-success-200">
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

        <Link to="/calendar" className="card group cursor-pointer hover:border-accent-200">
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
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="section-header">Recent Activity</h2>
          <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
            View all
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Icon name="announcements" size={18} className="text-primary-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">New practice scheduled</p>
              <p className="text-sm text-gray-600">Saturday morning practice at 7:00 AM</p>
              <p className="text-xs text-gray-400 mt-1">2 hours ago</p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
            <div className="p-2 bg-success-100 rounded-lg">
              <Icon name="check" size={18} className="text-success-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">Workout completed</p>
              <p className="text-sm text-gray-600">You logged a 45-minute strength session</p>
              <p className="text-xs text-gray-400 mt-1">Yesterday</p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Icon name="trophy" size={18} className="text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">New race added</p>
              <p className="text-sm text-gray-600">Dragon Boat Festival 2025 - Registration open</p>
              <p className="text-xs text-gray-400 mt-1">3 days ago</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
