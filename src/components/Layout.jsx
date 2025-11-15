import { Outlet, NavLink } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import Icon from './Icon'

export default function Layout() {
  const { profile, signOut, hasRole } = useAuthStore()

  const navLinks = [
    { to: '/', label: 'Dashboard', icon: 'dashboard' },
    { to: '/calendar', label: 'Calendar', icon: 'calendar' },
    { to: '/practices', label: 'Practices', icon: 'practice' },
    // Only show Practice Management for coaches and admins
    ...(hasRole('admin') || hasRole('coach')
      ? [{ to: '/practice-prep', label: 'Manage', icon: 'manage' }]
      : []
    ),
    { to: '/events', label: 'Events', icon: 'events' },
    { to: '/workouts', label: 'Workouts', icon: 'workouts' },
    { to: '/roster', label: 'Roster', icon: 'roster' },
    { to: '/lineups', label: 'Lineups', icon: 'lineups' },
    { to: '/announcements', label: 'News', icon: 'announcements' },
  ]

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="glass sticky top-0 z-50 border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/20">
                <Icon name="boat" size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Dragon Boat Team
                </h1>
                <p className="text-xs text-gray-500 -mt-0.5">Team Management</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg">
                <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-gray-700">
                  {profile?.full_name}
                </span>
              </div>
              <NavLink
                to="/profile"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Profile"
              >
                <Icon name="profile" size={20} className="text-gray-600" />
              </NavLink>
              <button
                onClick={signOut}
                className="p-2 hover:bg-red-50 rounded-lg transition-colors group"
                title="Sign Out"
              >
                <Icon name="logout" size={20} className="text-gray-600 group-hover:text-red-600" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="glass border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto py-2 scrollbar-hide">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                  `nav-link whitespace-nowrap ${
                    isActive ? 'nav-link-active' : 'nav-link-inactive'
                  }`
                }
              >
                <Icon name={link.icon} size={18} />
                <span>{link.label}</span>
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
