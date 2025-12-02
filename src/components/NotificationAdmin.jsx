import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { useNotificationStore } from '../store/notificationStore'
import Icon from './Icon'

export default function NotificationAdmin() {
  const { hasRole } = useAuthStore()
  const { showLocalNotification } = useNotificationStore()

  const [activeTab, setActiveTab] = useState('send')
  const [subscribers, setSubscribers] = useState([])
  const [recentNotifications, setRecentNotifications] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [stats, setStats] = useState({ total: 0, withPush: 0 })

  // Notification form
  const [notification, setNotification] = useState({
    title: '',
    body: '',
    type: 'announcement',
    targetAudience: 'all', // all, active, specific
    linkUrl: '',
    scheduledFor: '', // empty = send now
  })

  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    if (hasRole('admin') || hasRole('coach')) {
      fetchSubscribers()
      fetchRecentNotifications()
    }
  }, [])

  const fetchSubscribers = async () => {
    try {
      // Get all profiles with their push subscription status
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, is_active')
        .order('full_name')

      if (profileError) throw profileError

      // Get push subscriptions
      const { data: subscriptions, error: subError } = await supabase
        .from('push_subscriptions')
        .select('user_id')
        .eq('is_active', true)

      if (subError && subError.code !== 'PGRST116') throw subError

      const subscribedUserIds = new Set((subscriptions || []).map(s => s.user_id))

      const enrichedProfiles = (profiles || []).map(p => ({
        ...p,
        hasPush: subscribedUserIds.has(p.id)
      }))

      setSubscribers(enrichedProfiles)
      setStats({
        total: profiles?.length || 0,
        withPush: subscribedUserIds.size
      })
    } catch (error) {
      console.error('Error fetching subscribers:', error)
    }
  }

  const fetchRecentNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notification_log')
        .select('*, profiles(full_name)')
        .order('created_at', { ascending: false })
        .limit(20)

      if (error && error.code !== 'PGRST116') throw error
      setRecentNotifications(data || [])
    } catch (error) {
      console.error('Error fetching notifications:', error)
    }
  }

  const handlePreview = () => {
    if (!notification.title.trim()) {
      toast.error('Please enter a notification title')
      return
    }
    setShowPreview(true)
  }

  const handleTestNotification = async () => {
    // Send a local notification to the admin as a test
    const success = await showLocalNotification(notification.title, {
      body: notification.body,
      tag: 'test-notification',
      data: { url: notification.linkUrl || '/' }
    })

    if (success) {
      toast.success('Test notification sent to your device')
    } else {
      toast.error('Could not send test notification. Check your browser permissions.')
    }
  }

  const handleSendNotification = async () => {
    if (!notification.title.trim()) {
      toast.error('Please enter a notification title')
      return
    }

    setIsLoading(true)
    try {
      // Get target users based on audience
      let targetUsers = subscribers

      if (notification.targetAudience === 'active') {
        targetUsers = subscribers.filter(s => s.is_active)
      } else if (notification.targetAudience === 'push_enabled') {
        targetUsers = subscribers.filter(s => s.hasPush)
      }

      // Only send to users with push enabled
      const pushUsers = targetUsers.filter(s => s.hasPush)

      if (pushUsers.length === 0) {
        toast.error('No users with push notifications enabled')
        setIsLoading(false)
        return
      }

      // Create notification log entries
      const logEntries = pushUsers.map(user => ({
        user_id: user.id,
        notification_type: notification.type,
        title: notification.title,
        body: notification.body || null,
        data: {
          url: notification.linkUrl || '/',
          type: notification.type
        },
        status: 'pending'
      }))

      const { error: logError } = await supabase
        .from('notification_log')
        .insert(logEntries)

      if (logError) throw logError

      // In a real implementation, you would call a Supabase Edge Function here
      // to actually send the push notifications using web-push
      // For now, we'll just log them and show success

      toast.success(`Notification queued for ${pushUsers.length} members`)

      // Reset form
      setNotification({
        title: '',
        body: '',
        type: 'announcement',
        targetAudience: 'all',
        linkUrl: '',
        scheduledFor: ''
      })
      setShowPreview(false)

      // Refresh recent notifications
      fetchRecentNotifications()
    } catch (error) {
      console.error('Error sending notification:', error)
      toast.error('Failed to send notification')
    } finally {
      setIsLoading(false)
    }
  }

  if (!hasRole('admin') && !hasRole('coach')) {
    return (
      <div className="text-center py-8 text-slate-500">
        You don't have permission to manage notifications.
      </div>
    )
  }

  const notificationTypes = [
    { value: 'announcement', label: 'Announcement', icon: 'announcements' },
    { value: 'practice_reminder', label: 'Practice Reminder', icon: 'practice' },
    { value: 'event_reminder', label: 'Event Reminder', icon: 'events' },
    { value: 'lineup_published', label: 'Lineup Published', icon: 'lineups' },
    { value: 'schedule_change', label: 'Schedule Change', icon: 'calendar' },
  ]

  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
              <Icon name="users" size={20} className="text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
              <p className="text-sm text-slate-500">Total Members</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-success-100 rounded-full flex items-center justify-center">
              <Icon name="notifications" size={20} className="text-success-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.withPush}</p>
              <p className="text-sm text-slate-500">Push Enabled</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('send')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'send'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Send Notification
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'history'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          History
        </button>
        <button
          onClick={() => setActiveTab('subscribers')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'subscribers'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Subscribers
        </button>
      </div>

      {/* Send Notification Tab */}
      {activeTab === 'send' && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
            <h3 className="font-semibold text-slate-900">Compose Notification</h3>
            <p className="text-sm text-slate-500">Send a push notification to team members</p>
          </div>

          <div className="p-4 space-y-4">
            {/* Notification Type */}
            <div>
              <label className="label">Notification Type</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {notificationTypes.map(type => (
                  <button
                    key={type.value}
                    onClick={() => setNotification({ ...notification, type: type.value })}
                    className={`flex items-center gap-2 p-3 rounded-lg border text-left transition-colors ${
                      notification.type === type.value
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <Icon name={type.icon} size={18} />
                    <span className="text-sm font-medium">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="label">Title *</label>
              <input
                type="text"
                value={notification.title}
                onChange={(e) => setNotification({ ...notification, title: e.target.value })}
                className="input"
                placeholder="e.g., Practice Cancelled Tomorrow"
                maxLength={50}
              />
              <p className="text-xs text-slate-500 mt-1">{notification.title.length}/50 characters</p>
            </div>

            {/* Body */}
            <div>
              <label className="label">Message (Optional)</label>
              <textarea
                value={notification.body}
                onChange={(e) => setNotification({ ...notification, body: e.target.value })}
                className="input"
                rows={3}
                placeholder="Add more details..."
                maxLength={200}
              />
              <p className="text-xs text-slate-500 mt-1">{notification.body.length}/200 characters</p>
            </div>

            {/* Target Audience */}
            <div>
              <label className="label">Send To</label>
              <select
                value={notification.targetAudience}
                onChange={(e) => setNotification({ ...notification, targetAudience: e.target.value })}
                className="input"
              >
                <option value="all">All Members with Push Enabled ({stats.withPush})</option>
                <option value="active">Active Members Only</option>
              </select>
            </div>

            {/* Link URL */}
            <div>
              <label className="label">Link (Optional)</label>
              <input
                type="text"
                value={notification.linkUrl}
                onChange={(e) => setNotification({ ...notification, linkUrl: e.target.value })}
                className="input"
                placeholder="/practices or /events/123"
              />
              <p className="text-xs text-slate-500 mt-1">Where to take users when they tap the notification</p>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-200">
              <button
                onClick={handleTestNotification}
                className="btn"
              >
                <Icon name="notifications" size={16} className="mr-2" />
                Test on My Device
              </button>
              <button
                onClick={handlePreview}
                className="btn btn-primary"
              >
                Preview & Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
            <h3 className="font-semibold text-slate-900">Recent Notifications</h3>
          </div>

          {recentNotifications.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <Icon name="notifications-off" size={32} className="mx-auto mb-2 opacity-50" />
              <p>No notifications sent yet</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentNotifications.map(notif => (
                <div key={notif.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-slate-900">{notif.title}</p>
                      {notif.body && (
                        <p className="text-sm text-slate-600 mt-1">{notif.body}</p>
                      )}
                      <p className="text-xs text-slate-500 mt-2">
                        To: {notif.profiles?.full_name || 'Unknown'} &bull; {' '}
                        {new Date(notif.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      notif.status === 'sent' ? 'bg-success-100 text-success-700' :
                      notif.status === 'failed' ? 'bg-red-100 text-red-700' :
                      notif.status === 'clicked' ? 'bg-primary-100 text-primary-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {notif.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Subscribers Tab */}
      {activeTab === 'subscribers' && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
            <h3 className="font-semibold text-slate-900">Push Notification Status</h3>
            <p className="text-sm text-slate-500">See who can receive push notifications</p>
          </div>

          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {subscribers.map(member => (
              <div key={member.id} className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    member.hasPush ? 'bg-success-100' : 'bg-slate-100'
                  }`}>
                    <Icon
                      name={member.hasPush ? 'notifications' : 'notifications-off'}
                      size={16}
                      className={member.hasPush ? 'text-success-600' : 'text-slate-400'}
                    />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{member.full_name || 'Unnamed'}</p>
                    <p className="text-xs text-slate-500">
                      {member.is_active ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                </div>
                <span className={`text-xs font-medium ${
                  member.hasPush ? 'text-success-600' : 'text-slate-400'
                }`}>
                  {member.hasPush ? 'Enabled' : 'Not enabled'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-900">Preview Notification</h3>
            </div>

            <div className="p-4">
              {/* Phone mockup */}
              <div className="bg-slate-100 rounded-xl p-4 mb-4">
                <div className="bg-white rounded-lg shadow p-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-sm">DB</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 text-sm">DB Team</p>
                      <p className="font-medium text-slate-800">{notification.title}</p>
                      {notification.body && (
                        <p className="text-sm text-slate-600 mt-1">{notification.body}</p>
                      )}
                      <p className="text-xs text-slate-400 mt-2">now</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-amber-800">
                  <strong>This will send to {stats.withPush} members</strong> who have push notifications enabled.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowPreview(false)}
                  className="btn flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendNotification}
                  disabled={isLoading}
                  className="btn btn-primary flex-1"
                >
                  {isLoading ? 'Sending...' : 'Send Now'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
