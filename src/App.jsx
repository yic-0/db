import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './store/authStore'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Practices from './pages/Practices'
import PracticePrep from './pages/PracticePrep'
import Roster from './pages/Roster'
import Lineups from './pages/Lineups'
import Profile from './pages/Profile'
import Announcements from './pages/Announcements'
import Events from './pages/Events'
import EventDetail from './pages/EventDetail'
import Workouts from './pages/Workouts'
import Calendar from './pages/Calendar'
import CogDemoPage from './pages/CogDemoPage'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuthStore()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}

function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="practices" element={<Practices />} />
            <Route path="practice-prep" element={<PracticePrep />} />
            <Route path="roster" element={<Roster />} />
            <Route path="lineups" element={<Lineups />} />
            <Route path="events" element={<Events />} />
            <Route path="events/:eventId" element={<EventDetail />} />
            <Route path="workouts" element={<Workouts />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="cog-demo" element={<CogDemoPage />} />
            <Route path="announcements" element={<Announcements />} />
            <Route path="profile" element={<Profile />} />
          </Route>
        </Routes>
      </BrowserRouter>

      <Toaster position="top-right" />
    </>
  )
}

export default App
