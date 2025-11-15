import { Outlet, NavLink } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export default function Layout() {
  const { profile, signOut, hasRole } = useAuthStore()

  const navLinks = [
    { to: '/', label: 'Dashboard', icon: '📊' },
    { to: '/calendar', label: 'Calendar', icon: '📅' },
    { to: '/practices', label: 'Practices', icon: '🚣' },
    // Only show Practice Management for coaches and admins
    ...(hasRole('admin') || hasRole('coach')
      ? [{ to: '/practice-prep', label: 'Manage Practice', icon: '📝' }]
      : []
    ),
    { to: '/events', label: 'Events', icon: '🏆' },
    { to: '/workouts', label: 'Workouts', icon: '💪' },
    { to: '/roster', label: 'Roster', icon: '👥' },
    { to: '/lineups', label: 'Lineups', icon: '📋' },
    { to: '/announcements', label: 'Announcements', icon: '📢' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">
                🐉 Dragon Boat Team
              </h1>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                {profile?.full_name}
              </span>
              <NavLink
                to="/profile"
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                Profile
              </NavLink>
              <button
                onClick={signOut}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-2 py-4 px-1 border-b-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`
                }
              >
                <span>{link.icon}</span>
                {link.label}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  )
}
