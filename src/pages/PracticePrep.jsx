import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePracticeStore } from '../store/practiceStore'
import { useRosterStore } from '../store/rosterStore'
import { useAuthStore } from '../store/authStore'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import PracticeLineupsManager from '../components/PracticeLineupsManager'
import MemberHistoryModal from '../components/MemberHistoryModal'

export default function PracticePrep() {
  const navigate = useNavigate()
  const {
    practices,
    rsvps,
    fetchPractices,
    fetchRSVPs,
    updatePracticeNotes,
    updateAttendance,
    addAttendance,
    updateMemberNotes
  } = usePracticeStore()
  const { members, fetchMembers } = useRosterStore()
  const { hasRole, user } = useAuthStore()
  const [selectedPractice, setSelectedPractice] = useState(null)
  const [practiceNotes, setPracticeNotes] = useState('')
  const [memberNotesState, setMemberNotesState] = useState({})
  const [activeTab, setActiveTab] = useState('attendance') // 'attendance' or 'lineup'
  const [historyModalMember, setHistoryModalMember] = useState(null)

  useEffect(() => {
    fetchPractices()
    fetchMembers()
  }, [fetchPractices, fetchMembers])

  useEffect(() => {
    if (selectedPractice) {
      fetchRSVPs(selectedPractice.id)
      setPracticeNotes(selectedPractice.coach_notes || '')
    }
  }, [selectedPractice, fetchRSVPs])

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

  const handleSavePracticeNotes = async () => {
    if (!selectedPractice) return
    await updatePracticeNotes(selectedPractice.id, practiceNotes)
  }

  const handleToggleAttendance = async (member) => {
    if (member.attended) {
      // Remove attendance
      await updateAttendance(
        selectedPractice.id,
        member.id,
        false,
        member.memberNotes,
        user.id
      )
    } else {
      // Add attendance
      if (member.hasRsvp) {
        await updateAttendance(
          selectedPractice.id,
          member.id,
          true,
          member.memberNotes,
          user.id
        )
      } else {
        await addAttendance(selectedPractice.id, member.id, '', user.id)
      }
    }
    // Refresh RSVPs to get updated attendance
    await fetchRSVPs(selectedPractice.id)
  }

  const handleMemberNotesChange = (memberId, notes) => {
    setMemberNotesState(prev => ({
      ...prev,
      [memberId]: notes
    }))
  }

  const handleSaveMemberNotes = async (memberId, notes) => {
    await updateMemberNotes(selectedPractice.id, memberId, notes)
    await fetchRSVPs(selectedPractice.id)
  }

  const getMembersWithStatus = () => {
    const practiceRsvps = rsvps[selectedPractice?.id] || []
    // Filter active members (is_active !== false includes NULL/undefined as active)
    const activeMembers = members.filter(m => m.is_active !== false)

    return activeMembers.map(member => {
      const rsvp = practiceRsvps.find(r => r.user_id === member.id)
      return {
        ...member,
        rsvpStatus: rsvp?.status || 'no_response',
        attended: rsvp?.attended || false,
        memberNotes: rsvp?.member_notes || '',
        hasRsvp: !!rsvp,
        checkedInAt: rsvp?.checked_in_at,
        checkedInBy: rsvp?.checked_in_by_profile
      }
    })
  }

  const getRsvpBadge = (status) => {
    switch (status) {
      case 'yes':
        return { label: 'Yes', color: 'bg-green-100 text-green-800' }
      case 'no':
        return { label: 'No', color: 'bg-red-100 text-red-800' }
      case 'maybe':
        return { label: 'Maybe', color: 'bg-yellow-100 text-yellow-800' }
      default:
        return { label: 'No RSVP', color: 'bg-gray-100 text-gray-800' }
    }
  }

  // Filter practices to show upcoming and recent (last 7 days)
  const relevantPractices = practices.filter(p => {
    const practiceDate = new Date(p.date)
    const today = new Date()
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    sevenDaysAgo.setHours(0, 0, 0, 0)
    return practiceDate >= sevenDaysAgo
  }).sort((a, b) => new Date(a.date) - new Date(b.date))

  if (!hasRole('admin') && !hasRole('coach')) {
    return (
      <div className="card text-center py-12">
        <p className="text-gray-600 text-lg">This page is only accessible to coaches and admins.</p>
      </div>
    )
  }

  if (!selectedPractice) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Practice Management</h1>
        <p className="text-gray-600 mb-6">Select a practice to manage attendance, lineup, and notes</p>

        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Select a Practice</h2>

          {relevantPractices.length === 0 ? (
            <p className="text-gray-600">No upcoming or recent practices</p>
          ) : (
            <div className="space-y-3">
              {relevantPractices.map(practice => {
                const practiceRsvps = rsvps[practice.id] || []
                const yesCount = practiceRsvps.filter(r => r.status === 'yes').length
                const attendedCount = practiceRsvps.filter(r => r.attended).length
                const isPast = new Date(practice.date) < new Date()

                return (
                  <button
                    key={practice.id}
                    onClick={() => setSelectedPractice(practice)}
                    className="w-full text-left p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">{practice.title}</h3>
                        <p className="text-sm text-gray-600">
                          {formatDate(practice.date)} • {formatTime(practice.start_time)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {isPast ? (
                            `${attendedCount} attended • ${yesCount} RSVP'd`
                          ) : (
                            `${yesCount} RSVP'd yes`
                          )}
                        </p>
                      </div>
                      <div>
                        <span className="text-primary-600 font-medium">Manage →</span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  const membersWithStatus = getMembersWithStatus()
  const attendedMembers = membersWithStatus.filter(m => m.attended)
  const rsvpdYes = membersWithStatus.filter(m => m.rsvpStatus === 'yes')
  const rsvpdMaybe = membersWithStatus.filter(m => m.rsvpStatus === 'maybe')

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <button
            onClick={() => setSelectedPractice(null)}
            className="text-sm text-primary-600 hover:text-primary-700 mb-2"
          >
            ← Back to practices
          </button>
          <h1 className="text-3xl font-bold text-gray-900">{selectedPractice.title}</h1>
          <p className="text-gray-600">
            {formatDate(selectedPractice.date)} • {formatTime(selectedPractice.start_time)}
          </p>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="card bg-green-50">
          <h3 className="text-sm font-medium text-gray-600 mb-1">Attended</h3>
          <p className="text-3xl font-bold text-green-600">{attendedMembers.length}</p>
        </div>
        <div className="card bg-blue-50">
          <h3 className="text-sm font-medium text-gray-600 mb-1">RSVP'd Yes</h3>
          <p className="text-3xl font-bold text-blue-600">{rsvpdYes.length}</p>
        </div>
        <div className="card bg-yellow-50">
          <h3 className="text-sm font-medium text-gray-600 mb-1">Maybe</h3>
          <p className="text-3xl font-bold text-yellow-600">{rsvpdMaybe.length}</p>
        </div>
        <div className="card bg-purple-50">
          <h3 className="text-sm font-medium text-gray-600 mb-1">Capacity</h3>
          <p className="text-3xl font-bold text-purple-600">
            {attendedMembers.length}/{selectedPractice.max_capacity}
          </p>
        </div>
      </div>

      {/* Overall Practice Notes */}
      <div className="card mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Practice Notes</h2>
        <textarea
          className="input"
          rows="4"
          placeholder="Overall notes about today's practice (conditions, focus areas, achievements, issues)..."
          value={practiceNotes}
          onChange={(e) => setPracticeNotes(e.target.value)}
          onBlur={handleSavePracticeNotes}
        />
        <p className="text-xs text-gray-500 mt-2">Notes save automatically when you click outside</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('attendance')}
          className={`px-4 py-2 rounded-lg font-medium ${
            activeTab === 'attendance'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Attendance & Notes
        </button>
        <button
          onClick={() => setActiveTab('lineup')}
          className={`px-4 py-2 rounded-lg font-medium ${
            activeTab === 'lineup'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Lineup
        </button>
      </div>

      {/* Attendance Tab */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          {/* Quick Filters */}
          <div className="card">
            <div className="flex gap-2 flex-wrap">
              <span className="text-sm font-medium text-gray-700">Quick view:</span>
              <button className="text-sm text-primary-600 hover:text-primary-700">
                All ({membersWithStatus.length})
              </button>
              <span className="text-gray-400">•</span>
              <button className="text-sm text-primary-600 hover:text-primary-700">
                RSVP'd Yes ({rsvpdYes.length})
              </button>
              <span className="text-gray-400">•</span>
              <button className="text-sm text-primary-600 hover:text-primary-700">
                Attended ({attendedMembers.length})
              </button>
              <span className="text-gray-400">•</span>
              <button className="text-sm text-primary-600 hover:text-primary-700">
                No-Shows ({rsvpdYes.filter(m => !m.attended).length})
              </button>
            </div>
          </div>

          {/* Member List */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Team Members</h2>

            <div className="space-y-3">
              {membersWithStatus.map(member => {
                const badge = getRsvpBadge(member.rsvpStatus)
                const currentNotes = memberNotesState[member.id] !== undefined
                  ? memberNotesState[member.id]
                  : member.memberNotes

                return (
                  <div
                    key={member.id}
                    className={`border rounded-lg p-4 ${
                      member.attended ? 'bg-green-50 border-green-200' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900">{member.full_name}</h4>
                          {member.is_guest && (
                            <span className="px-2 py-1 text-xs rounded bg-orange-200 text-orange-800 font-bold">
                              GUEST
                            </span>
                          )}
                          <button
                            onClick={() => setHistoryModalMember(member)}
                            className="text-blue-600 hover:text-blue-700 text-xs underline"
                            title="View previous notes"
                          >
                            📋 History
                          </button>
                          <span className={`px-2 py-1 text-xs rounded ${badge.color}`}>
                            {badge.label}
                          </span>
                          {member.attended && (
                            <>
                              <span className="px-2 py-1 text-xs rounded bg-green-600 text-white">
                                ✓ Attended
                              </span>
                              {member.rsvpStatus === 'no_response' && (
                                <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800">
                                  Walk-in
                                </span>
                              )}
                            </>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          {member.skill_level && `${member.skill_level} • `}
                          {member.preferred_side && `Prefers ${member.preferred_side}`}
                        </p>
                        {member.checkedInAt && (
                          <p className="text-xs text-gray-500 mt-1">
                            Checked in at {format(new Date(member.checkedInAt), 'h:mm a')}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleToggleAttendance(member)}
                        className={`btn ${
                          member.attended
                            ? 'bg-red-600 text-white hover:bg-red-700'
                            : 'btn-primary'
                        }`}
                      >
                        {member.attended ? 'Remove' : 'Check In'}
                      </button>
                    </div>

                    {/* Individual Member Notes */}
                    <div>
                      <textarea
                        className="input text-sm"
                        rows="2"
                        placeholder="Individual notes (performance, technique, observations)..."
                        value={currentNotes}
                        onChange={(e) => handleMemberNotesChange(member.id, e.target.value)}
                        onBlur={() => {
                          if (currentNotes !== member.memberNotes) {
                            handleSaveMemberNotes(member.id, currentNotes)
                          }
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Lineup Tab */}
      {activeTab === 'lineup' && (
        <div className="card">
          <PracticeLineupsManager practice={selectedPractice} />
        </div>
      )}

      {/* Member History Modal */}
      <MemberHistoryModal
        member={historyModalMember}
        isOpen={!!historyModalMember}
        onClose={() => setHistoryModalMember(null)}
      />
    </div>
  )
}
