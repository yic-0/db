import { useAuthStore } from '../store/authStore'
import NotificationAdmin from '../components/NotificationAdmin'
import Icon from '../components/Icon'
import { useNavigate } from 'react-router-dom'

export default function Notifications() {
  const { hasRole } = useAuthStore()
  const navigate = useNavigate()

  if (!hasRole('admin') && !hasRole('coach')) {
    return (
      <div className="text-center py-12">
        <Icon name="lock" size={48} className="text-slate-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-slate-700 mb-2">Access Restricted</h2>
        <p className="text-slate-500 mb-4">Only admins and coaches can manage notifications.</p>
        <button onClick={() => navigate('/')} className="btn btn-primary">
          Back to Dashboard
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
        <p className="text-slate-600 mt-1">Send push notifications to team members</p>
      </div>

      <NotificationAdmin />
    </div>
  )
}
