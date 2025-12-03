import { useEffect, useRef } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { supabase, pingSupabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import Icon from './Icon'
import logo from '../assets/images/logo.svg'

export default function Layout() {
  const { profile, signOut, hasRole } = useAuthStore()
  const isAdminOrCoach = hasRole('admin') || hasRole('coach')
  const lastVisibleTime = useRef(Date.now())

  // Global fix for browser tab switching breaking Supabase connections
  // When user switches tabs and returns, Supabase connections can become stale
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        const hiddenDuration = Date.now() - lastVisibleTime.current

        // Only check connection if tab was hidden for more than 60 seconds
        if (hiddenDuration > 60000) {
          console.log(`🔄 Tab became visible after ${Math.round(hiddenDuration / 1000)}s - checking connection`)

          // Quick ping to see if connection is alive
          const isAlive = await pingSupabase()

          if (!isAlive) {
            console.log('⚠️ Connection is stale, auto-reloading to restore')
            toast.loading('Reconnecting...', { id: 'reconnecting' })
            // Auto-reload to restore fresh connection
            setTimeout(() => window.location.reload(), 1000)
          } else {
            console.log('✅ Connection is alive')
          }
        }
      } else {
        // Tab is being hidden, record the time
        lastVisibleTime.current = Date.now()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  const navLinks = [
    { to: '/', label: 'Dashboard', icon: 'dashboard' },
    { to: '/calendar', label: 'Calendar', icon: 'calendar' },
    { to: '/practices', label: 'Practices', icon: 'practice' },
    { to: '/race', label: 'Race', icon: 'events' },
    { to: '/workouts', label: 'Workouts', icon: 'workouts' },
    { to: '/roster', label: 'Roster', icon: 'roster' },
    { to: '/lineups', label: 'Lineups', icon: 'lineups' },
    { to: '/announcements', label: 'News', icon: 'announcements' },
    // Admin/Coach only
    ...(isAdminOrCoach ? [{ to: '/experimental', label: 'Lab', icon: 'settings', adminOnly: true }] : []),
  ]

  return (
    <div className="min-h-screen relative flex flex-col">

      {/* Header - Athletic Design */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-200/50 shadow-sm">
        {/* Accent gradient line at top */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-500 via-primary-400 to-accent-500" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo Area */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <img src={logo} alt="Logo" className="h-11 w-auto object-contain relative z-10" />
                {/* Subtle glow behind logo */}
                <div className="absolute inset-0 bg-primary-500/10 blur-xl rounded-full scale-150" />
              </div>
              <div className="hidden sm:block">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary-600 leading-none mb-1">JPMC Azure Dragons</p>
                <h1 className="text-xl font-display text-slate-900 leading-none tracking-wide">
                  Command Center
                </h1>
              </div>
            </div>

            {/* User Actions */}
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-slate-50 to-slate-100 rounded-full border border-slate-200/80 mr-2">
                <div className="w-2.5 h-2.5 bg-success-500 rounded-full animate-pulse-subtle shadow-sm shadow-success-500/50"></div>
                <span className="text-sm font-semibold text-slate-700">
                  {profile?.full_name || 'Crew Paddler'}
                </span>
              </div>

              {isAdminOrCoach && (
                <NavLink
                  to="/notifications"
                  className={({ isActive }) =>
                    `p-2.5 rounded-xl transition-all duration-200 ${
                      isActive
                        ? 'text-primary-600 bg-primary-50 shadow-sm'
                        : 'text-slate-500 hover:text-primary-600 hover:bg-primary-50/50'
                    }`
                  }
                  title="Send Notifications"
                >
                  <Icon name="notifications" size={20} />
                </NavLink>
              )}
              <NavLink
                to="/profile"
                className="p-2.5 text-slate-500 hover:text-primary-600 hover:bg-primary-50/50 rounded-xl transition-all duration-200"
                title="Profile"
              >
                <Icon name="profile" size={20} />
              </NavLink>
              <button
                onClick={signOut}
                className="p-2.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200"
                title="Sign Out"
              >
                <Icon name="logout" size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Secondary Navigation Bar (Desktop) */}
        <div className="hidden md:block border-t border-slate-100/80 bg-gradient-to-r from-slate-50/50 via-white to-slate-50/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex gap-1 overflow-x-auto py-1.5">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === '/'}
                  className={({ isActive }) =>
                    `group flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'text-primary-700 bg-primary-50 shadow-sm'
                        : 'text-slate-600 hover:text-primary-700 hover:bg-primary-50/50'
                    }`
                  }
                >
                  <Icon name={link.icon} size={17} className="group-hover:text-primary-500" />
                  <span>{link.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Bar (Bottom Fixed) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t border-slate-200/50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {/* Accent line at top of mobile nav */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary-400 to-transparent opacity-50" />

        <div className="flex items-center gap-0.5 p-2 overflow-x-auto no-scrollbar">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                `flex-shrink-0 flex flex-col items-center justify-center w-[20%] min-w-[68px] p-2 rounded-xl text-[10px] font-semibold transition-all duration-200 ${
                  isActive
                    ? 'text-primary-600 bg-primary-50'
                    : 'text-slate-500 hover:bg-slate-50 active:bg-slate-100'
                }`
              }
            >
              <Icon name={link.icon} size={22} className="mb-1" />
              <span className="truncate w-full text-center leading-tight">{link.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 mb-32 md:mb-0 relative z-10">
        <Outlet />
      </main>
    </div>
  )
}
