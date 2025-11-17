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
    <div className="min-h-screen relative overflow-hidden">
      <div className="beam" aria-hidden="true" />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/60 bg-white/85 backdrop-blur-2xl shadow-md shadow-primary-500/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-600 via-accent-500 to-success-500 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/20 border border-white/60">
                <Icon name="boat" size={26} className="text-white" />
              </div>
              <div>
                <p className="tagline">Dragon Boat Ops</p>
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight bg-gradient-to-r from-gray-900 via-primary-700 to-gray-800 bg-clip-text text-transparent">
                  Crew Command Center
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-white to-primary-50 px-3 py-1.5 rounded-full border border-white/70 shadow-sm">
                <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-semibold text-gray-700">
                  {profile?.full_name || 'Crew Member'}
                </span>
              </div>
              <NavLink
                to="/profile"
                className="p-2 hover:bg-primary-50 rounded-xl transition-colors border border-transparent hover:border-primary-100"
                title="Profile"
              >
                <Icon name="profile" size={20} className="text-gray-700" />
              </NavLink>
              <button
                onClick={signOut}
                className="p-2 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-100 group"
                title="Sign Out"
              >
                <Icon name="logout" size={20} className="text-gray-700 group-hover:text-red-600" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="relative border-b border-white/60 backdrop-blur-xl">
        <div className="absolute inset-0 bg-gradient-to-r from-primary-50/90 via-white/95 to-accent-50/80 pointer-events-none" aria-hidden="true" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="flex gap-1 overflow-x-auto py-2 scrollbar-hide">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                  `nav-link whitespace-nowrap rounded-2xl ${
                    isActive
                      ? 'nav-link-active shadow-md shadow-primary-500/10 border border-primary-100'
                      : 'nav-link-inactive border border-transparent'
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative">
        <Outlet />
      </main>
    </div>
  )
}
