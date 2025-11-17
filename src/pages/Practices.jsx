import { useState, useEffect } from 'react'
import { usePracticeStore } from '../store/practiceStore'
import { useAuthStore } from '../store/authStore'
import { useSettingsStore } from '../store/settingsStore'
import CreatePracticeModal from '../components/CreatePracticeModal'
import EditPracticeModal from '../components/EditPracticeModal'
import AttendanceModal from '../components/AttendanceModal'
import Icon from '../components/Icon'
import { format } from 'date-fns'

export default function Practices() {
  const { practices, rsvps, loading, fetchPractices, fetchRSVPs, setRSVP, getRSVPCount, getUserRSVP, deletePractice } = usePracticeStore()
  const { user, profile, hasRole } = useAuthStore()
  const { settings, fetchSettings, updateSetting } = useSettingsStore()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false)
  const [selectedPractice, setSelectedPractice] = useState(null)
  const [expandedPractice, setExpandedPractice] = useState(null)

  // Get privacy settings from database
  const showAttendeeCount = settings['privacy_show_attendee_count'] ?? true
  const showAttendeeNames = settings['privacy_show_attendee_names'] ?? true

  useEffect(() => {
    fetchPractices()
    fetchSettings()
  }, [fetchPractices, fetchSettings])

  // Fetch RSVPs for all practices when practices are loaded
  useEffect(() => {
    if (practices.length > 0) {
      practices.forEach(practice => {
        fetchRSVPs(practice.id)
      })
    }
  }, [practices.length, fetchRSVPs])

  // Handle privacy setting changes (admin only)
  const handleToggleAttendeeCount = async (checked) => {
    if (!user) return
    await updateSetting('privacy_show_attendee_count', checked, user.id)
  }

  const handleToggleAttendeeNames = async (checked) => {
    if (!user) return
    await updateSetting('privacy_show_attendee_names', checked, user.id)
  }

  const handleRSVP = async (practiceId, status) => {
    if (!user) return
    await setRSVP(practiceId, user.id, status)
  }

  const handleEditPractice = (practice) => {
    setSelectedPractice(practice)
    setIsEditModalOpen(true)
  }

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false)
    setSelectedPractice(null)
  }

  const handleManageAttendance = async (practice) => {
    setSelectedPractice(practice)
    // Fetch RSVPs if not already loaded
    if (!rsvps[practice.id]) {
      await fetchRSVPs(practice.id)
    }
    setIsAttendanceModalOpen(true)
  }

  const handleCloseAttendanceModal = () => {
    setIsAttendanceModalOpen(false)
    setSelectedPractice(null)
  }

  const handleDeletePractice = async (practice) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${practice.title}"?\n\nThis will also delete all RSVPs for this practice. This action cannot be undone.`
    )

    if (confirmed) {
      await deletePractice(practice.id)
    }
  }

  const toggleExpand = async (practiceId) => {
    if (expandedPractice === practiceId) {
      setExpandedPractice(null)
    } else {
      setExpandedPractice(practiceId)
      if (!rsvps[practiceId]) {
        await fetchRSVPs(practiceId)
      }
    }
  }

  const formatDate = (dateStr) => {
    try {
      return format(new Date(dateStr), 'EEEE, MMM d, yyyy')
    } catch {
      return dateStr
    }
  }

  const formatTime = (timeStr) => {
    if (!timeStr) return ''
    try {
      const [hours, minutes] = timeStr.split(':')
      const hour = parseInt(hours)
      const ampm = hour >= 12 ? 'PM' : 'AM'
      const displayHour = hour % 12 || 12
      return `${displayHour}:${minutes} ${ampm}`
    } catch {
      return timeStr
    }
  }

  const renderPracticeTypeIcon = (type) => {
    const map = {
      water: { name: 'boat', bg: 'bg-primary-50', color: 'text-primary-600' },
      land: { name: 'workouts', bg: 'bg-amber-50', color: 'text-amber-600' },
      gym: { name: 'fire', bg: 'bg-rose-50', color: 'text-rose-600' },
      meeting: { name: 'announcements', bg: 'bg-indigo-50', color: 'text-indigo-600' },
      default: { name: 'practice', bg: 'bg-gray-50', color: 'text-gray-600' }
    }
    const icon = map[type] || map.default
    return (
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${icon.bg}`}>
        <Icon name={icon.name} size={20} className={icon.color} />
      </div>
    )
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'yes': return 'bg-green-100 text-green-800 border-green-300'
      case 'no': return 'bg-red-100 text-red-800 border-red-300'
      case 'maybe': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const formatNamePrivate = (fullName) => {
    if (!fullName) return 'Unknown'
    const parts = fullName.trim().split(' ')
    if (parts.length === 1) return parts[0]
    const firstName = parts[0]
    const lastInitial = parts[parts.length - 1][0]
    return `${firstName} ${lastInitial}.`
  }

  if (loading && practices.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-600">Loading practices...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Practices</h1>
        {hasRole('admin') && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn btn-primary"
          >
            + Create Practice
          </button>
        )}
      </div>

      {/* Privacy Settings - Admin Only */}
      {hasRole('admin') && (
        <div className="card mb-6 bg-gray-50">
          <h3 className="font-semibold text-gray-900 mb-3">Privacy Settings (Admin Only)</h3>
          <p className="text-xs text-gray-600 mb-3">These settings affect what all users see</p>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showAttendeeCount}
                onChange={(e) => handleToggleAttendeeCount(e.target.checked)}
                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">Show attendee counts</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showAttendeeNames}
                onChange={(e) => handleToggleAttendeeNames(e.target.checked)}
                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">Show attendee names (First I.)</span>
            </label>
          </div>
        </div>
      )}

      {practices.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-600 text-lg mb-4">No practices scheduled yet</p>
          {hasRole('admin') && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="btn btn-primary"
            >
              Create First Practice
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {practices.map((practice) => {
            const userRSVP = getUserRSVP(practice.id, user?.id)
            const counts = getRSVPCount(practice.id)
            const isExpanded = expandedPractice === practice.id
            const practiceRSVPs = rsvps[practice.id] || []

            return (
              <div key={practice.id} className="card">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {renderPracticeTypeIcon(practice.practice_type)}
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xl font-semibold text-gray-900">
                            {practice.title}
                          </h3>
                          {(hasRole('admin') || hasRole('coach')) && (
                            <div className="flex gap-3">
                              <button
                                onClick={() => handleManageAttendance(practice)}
                                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                              >
                                Manage Attendance
                              </button>
                              {hasRole('admin') && (
                                <>
                                  <button
                                    onClick={() => handleEditPractice(practice)}
                                    className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeletePractice(practice)}
                                    className="text-sm text-red-600 hover:text-red-700 font-medium"
                                  >
                                    Delete
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Icon name="calendar" size={16} className="text-gray-500" />
                          <span>
                            {formatDate(practice.date)} • {formatTime(practice.start_time)}
                            {practice.end_time && ` - ${formatTime(practice.end_time)}`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {practice.description && (
                      <p className="text-gray-700 mb-3 whitespace-pre-wrap">{practice.description}</p>
                    )}

                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-2">
                        <Icon name="location" size={16} className="text-gray-500" />
                        {practice.location_name}
                      </span>
                      {(hasRole('admin') || showAttendeeCount) && (
                        <span className="flex items-center gap-2">
                          <Icon name="roster" size={16} className="text-gray-500" />
                          {counts.yes}/{practice.max_capacity}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="ml-4">
                    {userRSVP && (
                      <div className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(userRSVP.status)}`}>
                        {userRSVP.status ? userRSVP.status.toUpperCase() : 'NO RESPONSE'}
                      </div>
                    )}
                  </div>
                </div>

                {/* RSVP Buttons */}
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => handleRSVP(practice.id, 'yes')}
                    className={`btn flex items-center gap-2 ${userRSVP?.status === 'yes' ? 'bg-green-600 text-white' : 'btn-secondary'}`}
                  >
                    <Icon name="check" size={16} className={userRSVP?.status === 'yes' ? 'text-white' : 'text-green-600'} />
                    <span>Yes {(hasRole('admin') || showAttendeeCount) && `(${counts.yes})`}</span>
                  </button>
                  <button
                    onClick={() => handleRSVP(practice.id, 'no')}
                    className={`btn flex items-center gap-2 ${userRSVP?.status === 'no' ? 'bg-red-600 text-white' : 'btn-secondary'}`}
                  >
                    <Icon name="close" size={16} className={userRSVP?.status === 'no' ? 'text-white' : 'text-red-600'} />
                    <span>No {(hasRole('admin') || showAttendeeCount) && `(${counts.no})`}</span>
                  </button>
                  <button
                    onClick={() => handleRSVP(practice.id, 'maybe')}
                    className={`btn flex items-center gap-2 ${userRSVP?.status === 'maybe' ? 'bg-yellow-600 text-white' : 'btn-secondary'}`}
                  >
                    <Icon name="clock" size={16} className={userRSVP?.status === 'maybe' ? 'text-white' : 'text-amber-600'} />
                    <span>Maybe {(hasRole('admin') || showAttendeeCount) && `(${counts.maybe})`}</span>
                  </button>

                  <button
                    onClick={() => toggleExpand(practice.id)}
                    className="btn btn-secondary ml-auto"
                  >
                    {isExpanded ? 'Hide' : 'Show'} Attendees {(hasRole('admin') || showAttendeeCount) && `(${counts.total})`}
                  </button>
                </div>

                {/* Expanded Attendee List */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-3">Who's Coming</h4>

                    {(hasRole('admin') || showAttendeeNames) ? (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Yes */}
                        <div>
                          <h5 className="text-sm font-medium text-green-700 mb-2">
                            Yes {(hasRole('admin') || showAttendeeCount) && `(${counts.yes})`}
                          </h5>
                          <ul className="space-y-1">
                            {practiceRSVPs
                              .filter(r => r.status === 'yes')
                              .map(r => (
                                <li key={r.id} className="text-sm text-gray-700">
                                  {hasRole('admin') ? r.user?.full_name : formatNamePrivate(r.user?.full_name)}
                                </li>
                              ))}
                          </ul>
                        </div>

                        {/* Maybe */}
                        <div>
                          <h5 className="text-sm font-medium text-yellow-700 mb-2">
                            Maybe {(hasRole('admin') || showAttendeeCount) && `(${counts.maybe})`}
                          </h5>
                          <ul className="space-y-1">
                            {practiceRSVPs
                              .filter(r => r.status === 'maybe')
                              .map(r => (
                                <li key={r.id} className="text-sm text-gray-700">
                                  {hasRole('admin') ? r.user?.full_name : formatNamePrivate(r.user?.full_name)}
                                </li>
                              ))}
                          </ul>
                        </div>

                        {/* No */}
                        <div>
                          <h5 className="text-sm font-medium text-red-700 mb-2">
                            No {(hasRole('admin') || showAttendeeCount) && `(${counts.no})`}
                          </h5>
                          <ul className="space-y-1">
                            {practiceRSVPs
                              .filter(r => r.status === 'no')
                              .map(r => (
                                <li key={r.id} className="text-sm text-gray-700">
                                  {hasRole('admin') ? r.user?.full_name : formatNamePrivate(r.user?.full_name)}
                                </li>
                              ))}
                          </ul>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        {(hasRole('admin') || showAttendeeCount) ? (
                          <div className="space-y-2 text-left inline-block">
                            <p className="text-sm flex items-center gap-2">
                              <Icon name="check" size={16} className="text-green-600" /> Yes: {counts.yes}
                            </p>
                            <p className="text-sm flex items-center gap-2">
                              <Icon name="clock" size={16} className="text-amber-600" /> Maybe: {counts.maybe}
                            </p>
                            <p className="text-sm flex items-center gap-2">
                              <Icon name="close" size={16} className="text-red-600" /> No: {counts.no}
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm italic">Names and counts are hidden</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <CreatePracticeModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      <EditPracticeModal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        practice={selectedPractice}
      />

      <AttendanceModal
        isOpen={isAttendanceModalOpen}
        onClose={handleCloseAttendanceModal}
        practice={selectedPractice}
      />
    </div>
  )
}
