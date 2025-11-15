import { useAuthStore } from '../store/authStore'

export default function Dashboard() {
  const { profile } = useAuthStore()

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        Welcome, {profile?.full_name}!
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Quick Stats */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Upcoming Practices
          </h3>
          <p className="text-3xl font-bold text-primary-600">3</p>
          <p className="text-sm text-gray-500 mt-1">This week</p>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Team Members
          </h3>
          <p className="text-3xl font-bold text-primary-600">24</p>
          <p className="text-sm text-gray-500 mt-1">Active paddlers</p>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Your Attendance
          </h3>
          <p className="text-3xl font-bold text-primary-600">92%</p>
          <p className="text-sm text-gray-500 mt-1">Last 30 days</p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Recent Activity
        </h2>
        <div className="card">
          <p className="text-gray-600">
            Activity feed coming soon... This will show recent practices,
            lineups, and announcements.
          </p>
        </div>
      </div>
    </div>
  )
}
