import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'
import { useNotificationStore } from '../store/notificationStore'
import Icon from './Icon'

export default function NotificationSettings() {
  const { user } = useAuthStore()
  const {
    isSupported,
    permission,
    subscription,
    preferences,
    isLoading,
    error,
    requestPermission,
    subscribeToPush,
    unsubscribeFromPush,
    fetchPreferences,
    updatePreferences,
    checkSubscription,
    clearError
  } = useNotificationStore()

  const [localPrefs, setLocalPrefs] = useState(null)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    if (user) {
      fetchPreferences(user.id)
      checkSubscription(user.id)
    }
  }, [user])

  useEffect(() => {
    if (preferences) {
      setLocalPrefs(preferences)
    }
  }, [preferences])

  useEffect(() => {
    if (error) {
      toast.error(error)
      clearError()
    }
  }, [error])

  const handleToggleNotifications = async () => {
    // Get fresh user from store to avoid stale closure
    const currentUser = useAuthStore.getState().user
    if (!currentUser) return

    if (subscription) {
      // Unsubscribe
      const success = await unsubscribeFromPush(currentUser.id)
      if (success) {
        toast.success('Push notifications disabled')
      }
    } else {
      // Subscribe
      const result = await subscribeToPush(currentUser.id)
      if (result) {
        toast.success('Push notifications enabled!')
      }
    }
  }

  const handlePrefChange = (key, value) => {
    setLocalPrefs(prev => ({
      ...prev,
      [key]: value
    }))
    setHasChanges(true)
  }

  const handleSavePreferences = async () => {
    // Get fresh user from store to avoid stale closure
    const currentUser = useAuthStore.getState().user
    if (!currentUser || !localPrefs) return

    const result = await updatePreferences(currentUser.id, localPrefs)
    if (result) {
      toast.success('Notification preferences saved')
      setHasChanges(false)
    }
  }

  const getPermissionStatus = () => {
    if (!isSupported) {
      return { text: 'Not Supported', color: 'bg-slate-200 text-slate-600', icon: 'close' }
    }
    if (permission === 'granted' && subscription) {
      return { text: 'Enabled', color: 'bg-success-100 text-success-700', icon: 'check' }
    }
    if (permission === 'denied') {
      return { text: 'Blocked', color: 'bg-red-100 text-red-700', icon: 'close' }
    }
    return { text: 'Disabled', color: 'bg-amber-100 text-amber-700', icon: 'notifications' }
  }

  const status = getPermissionStatus()

  if (!isSupported) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <Icon name="notifications" size={24} className="text-slate-400" />
          <div>
            <p className="font-medium text-slate-700">Push Notifications Not Available</p>
            <p className="text-sm text-slate-500">
              Your browser doesn't support push notifications. Try using Chrome, Firefox, or Edge.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Main Toggle */}
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
              <Icon name="notifications" size={20} className="text-primary-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Push Notifications</h3>
              <p className="text-sm text-slate-500">
                Receive alerts for practices, events, and team updates
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${status.color}`}>
              {status.text}
            </span>
            {permission !== 'denied' && (
              <button
                onClick={handleToggleNotifications}
                disabled={isLoading}
                className={`relative w-14 h-7 rounded-full transition-colors ${
                  subscription ? 'bg-primary-600' : 'bg-slate-300'
                } ${isLoading ? 'opacity-50 cursor-wait' : ''}`}
              >
                <span
                  className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform shadow ${
                    subscription ? 'left-8' : 'left-1'
                  }`}
                />
              </button>
            )}
          </div>
        </div>

        {permission === 'denied' && (
          <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg">
            <p className="text-sm text-red-700">
              <strong>Notifications are blocked.</strong> To enable them, click the lock icon in your browser's address bar and allow notifications for this site.
            </p>
          </div>
        )}
      </div>

      {/* Notification Types */}
      {subscription && localPrefs && (
        <>
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
              <h3 className="font-semibold text-slate-900">Notification Types</h3>
              <p className="text-sm text-slate-500">Choose which notifications you want to receive</p>
            </div>

            <div className="divide-y divide-slate-100">
              <NotificationToggle
                label="Practice Reminders"
                description="Get reminded before upcoming practices"
                checked={localPrefs.notify_practice_reminders}
                onChange={(v) => handlePrefChange('notify_practice_reminders', v)}
                icon="calendar"
              />
              <NotificationToggle
                label="Practice Changes"
                description="When a practice is updated or cancelled"
                checked={localPrefs.notify_practice_changes}
                onChange={(v) => handlePrefChange('notify_practice_changes', v)}
                icon="edit"
              />
              <NotificationToggle
                label="Event Reminders"
                description="Get reminded before races and events"
                checked={localPrefs.notify_event_reminders}
                onChange={(v) => handlePrefChange('notify_event_reminders', v)}
                icon="trophy"
              />
              <NotificationToggle
                label="Event Changes"
                description="When an event is updated or cancelled"
                checked={localPrefs.notify_event_changes}
                onChange={(v) => handlePrefChange('notify_event_changes', v)}
                icon="edit"
              />
              <NotificationToggle
                label="Lineup Published"
                description="When a new lineup is posted"
                checked={localPrefs.notify_lineup_published}
                onChange={(v) => handlePrefChange('notify_lineup_published', v)}
                icon="boat"
              />
              <NotificationToggle
                label="Announcements"
                description="Important team announcements"
                checked={localPrefs.notify_announcements}
                onChange={(v) => handlePrefChange('notify_announcements', v)}
                icon="announcements"
              />
              <NotificationToggle
                label="Carpool Updates"
                description="Changes to carpools you're part of"
                checked={localPrefs.notify_carpool_updates}
                onChange={(v) => handlePrefChange('notify_carpool_updates', v)}
                icon="car"
              />
              <NotificationToggle
                label="RSVP Reminders"
                description="Reminders to RSVP for upcoming events"
                checked={localPrefs.notify_rsvp_reminders}
                onChange={(v) => handlePrefChange('notify_rsvp_reminders', v)}
                icon="check"
              />
            </div>
          </div>

          {/* Timing Preferences */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
              <h3 className="font-semibold text-slate-900">Reminder Timing</h3>
              <p className="text-sm text-slate-500">How early do you want to be reminded?</p>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Practice Reminder
                </label>
                <select
                  value={localPrefs.practice_reminder_hours || 24}
                  onChange={(e) => handlePrefChange('practice_reminder_hours', parseInt(e.target.value))}
                  className="input"
                >
                  <option value={1}>1 hour before</option>
                  <option value={2}>2 hours before</option>
                  <option value={4}>4 hours before</option>
                  <option value={12}>12 hours before</option>
                  <option value={24}>1 day before</option>
                  <option value={48}>2 days before</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Event Reminder
                </label>
                <select
                  value={localPrefs.event_reminder_hours || 48}
                  onChange={(e) => handlePrefChange('event_reminder_hours', parseInt(e.target.value))}
                  className="input"
                >
                  <option value={4}>4 hours before</option>
                  <option value={12}>12 hours before</option>
                  <option value={24}>1 day before</option>
                  <option value={48}>2 days before</option>
                  <option value={72}>3 days before</option>
                  <option value={168}>1 week before</option>
                </select>
              </div>
            </div>
          </div>

          {/* Quiet Hours */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
              <h3 className="font-semibold text-slate-900">Quiet Hours</h3>
              <p className="text-sm text-slate-500">Pause notifications during specific times</p>
            </div>

            <div className="p-4 space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localPrefs.quiet_hours_enabled || false}
                  onChange={(e) => handlePrefChange('quiet_hours_enabled', e.target.checked)}
                  className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                />
                <span className="font-medium text-slate-700">Enable Quiet Hours</span>
              </label>

              {localPrefs.quiet_hours_enabled && (
                <div className="grid grid-cols-2 gap-4 pl-8">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={localPrefs.quiet_hours_start || '22:00'}
                      onChange={(e) => handlePrefChange('quiet_hours_start', e.target.value)}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={localPrefs.quiet_hours_end || '08:00'}
                      onChange={(e) => handlePrefChange('quiet_hours_end', e.target.value)}
                      className="input"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Save Button */}
          {hasChanges && (
            <div className="flex justify-end">
              <button
                onClick={handleSavePreferences}
                disabled={isLoading}
                className="btn btn-primary"
              >
                {isLoading ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function NotificationToggle({ label, description, checked, onChange, icon }) {
  return (
    <label className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors">
      <div className="flex items-center gap-3">
        <Icon name={icon} size={20} className="text-slate-400" />
        <div>
          <span className="font-medium text-slate-700">{label}</span>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
      </div>
      <div
        onClick={(e) => {
          e.preventDefault()
          onChange(!checked)
        }}
        className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${
          checked ? 'bg-primary-600' : 'bg-slate-300'
        }`}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow ${
            checked ? 'left-6' : 'left-0.5'
          }`}
        />
      </div>
    </label>
  )
}
