import { useState, useEffect } from 'react'
import { usePracticeStore } from '../store/practiceStore'
import { useRosterStore } from '../store/rosterStore'
import { useAuthStore } from '../store/authStore'

export default function AttendanceModal({ isOpen, onClose, practice }) {
  const { rsvps, updatePracticeNotes, updateAttendance, addAttendance, updateMemberNotes } = usePracticeStore()
  const { members, fetchMembers } = useRosterStore()
  const { user } = useAuthStore()

  console.log('AttendanceModal render:', { isOpen, practice, rsvps, members })

  const [practiceNotes, setPracticeNotes] = useState('')
  const [memberNotes, setMemberNotes] = useState({})
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTab, setSelectedTab] = useState('rsvp') // 'rsvp' or 'all'

  // Fetch members when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchMembers()
    }
  }, [isOpen, fetchMembers])

  useEffect(() => {
    if (practice) {
      setPracticeNotes(practice.coach_notes || '')
      // Reset member note overrides when switching practices to avoid leaking notes between sessions
      setMemberNotes({})
    }
  }, [practice])

  // Clear state when closing to avoid carrying notes into the next open
  useEffect(() => {
    if (!isOpen) {
      setPracticeNotes('')
      setMemberNotes({})
    }
  }, [isOpen])

  if (!isOpen || !practice) return null

  const practiceRsvps = rsvps[practice.id] || []

  console.log('Practice RSVPs:', { practiceId: practice.id, practiceRsvps, allRsvps: rsvps })

  // Get members with their RSVP and attendance status
  const getMembersWithStatus = () => {
    const activeMembers = members.filter(m => m.is_active)

    console.log('Active members:', activeMembers.length)

    return activeMembers.map(member => {
      const rsvp = practiceRsvps.find(r => r.user_id === member.id)
      console.log(`Member ${member.full_name}:`, { rsvp, hasRsvp: !!rsvp })
      return {
        ...member,
        rsvpStatus: rsvp?.status || 'no_response',
        attended: rsvp?.attended || false,
        memberNotes: rsvp?.member_notes || '',
        hasRsvp: !!rsvp
      }
    })
  }

  const membersWithStatus = getMembersWithStatus()

  console.log('Members with status:', membersWithStatus)

  // Filter members based on tab and search
  const filteredMembers = membersWithStatus.filter(member => {
    const matchesSearch = member.full_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTab = selectedTab === 'all' || member.hasRsvp
    return matchesSearch && matchesTab
  })

  // Sort: RSVP'd yes first, then attended, then by name
  const sortedMembers = [...filteredMembers].sort((a, b) => {
    if (a.rsvpStatus === 'yes' && b.rsvpStatus !== 'yes') return -1
    if (a.rsvpStatus !== 'yes' && b.rsvpStatus === 'yes') return 1
    if (a.attended && !b.attended) return -1
    if (!a.attended && b.attended) return 1
    return a.full_name.localeCompare(b.full_name)
  })

  const handleSavePracticeNotes = async () => {
    await updatePracticeNotes(practice.id, practiceNotes)
  }

  const handleToggleAttendance = async (member) => {
    console.log('Toggle attendance for:', member.full_name, { hasRsvp: member.hasRsvp, attended: member.attended })

    if (member.attended) {
      // If already attended, mark as not attended
      await updateAttendance(practice.id, member.id, false, member.memberNotes, user.id)
    } else {
      // If not attended yet, mark as attended
      if (member.hasRsvp) {
        await updateAttendance(practice.id, member.id, true, member.memberNotes, user.id)
      } else {
        // Add attendance for member who didn't RSVP
        await addAttendance(practice.id, member.id, '', user.id)
      }
    }
  }

  const handleSaveMemberNotes = async (memberId, notes) => {
    await updateMemberNotes(practice.id, memberId, notes)
  }

  const handleMemberNotesChange = (memberId, notes) => {
    setMemberNotes(prev => ({ ...prev, [memberId]: notes }))
  }

  const getRsvpBadge = (status) => {
    switch (status) {
      case 'yes':
        return { label: 'Yes', color: 'bg-green-100 text-green-800' }
      case 'maybe':
        return { label: 'Maybe', color: 'bg-yellow-100 text-yellow-800' }
      case 'no':
        return { label: 'No', color: 'bg-red-100 text-red-800' }
      default:
        return { label: 'No RSVP', color: 'bg-gray-100 text-gray-800' }
    }
  }

  const attendedCount = membersWithStatus.filter(m => m.attended).length
  const rsvpYesCount = membersWithStatus.filter(m => m.rsvpStatus === 'yes').length

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
      <div className="bg-white/95 rounded-2xl shadow-2xl border border-white/70 backdrop-blur max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{practice.title}</h2>
              <p className="text-sm text-gray-600 mt-1">
                Attendance Tracking & Notes
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs text-gray-600">RSVP'd Yes</p>
              <p className="text-2xl font-bold text-blue-600">{rsvpYesCount}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <p className="text-xs text-gray-600">Attended</p>
              <p className="text-2xl font-bold text-green-600">{attendedCount}</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-3">
              <p className="text-xs text-gray-600">Attendance Rate</p>
              <p className="text-2xl font-bold text-purple-600">
                {rsvpYesCount > 0 ? Math.round((attendedCount / rsvpYesCount) * 100) : 0}%
              </p>
            </div>
          </div>

          {/* Practice Notes */}
          <div className="mb-6">
            <label htmlFor="practiceNotes" className="label">
              Practice Notes (Coach Only)
            </label>
            <textarea
              id="practiceNotes"
              className="input"
              rows="4"
              placeholder="Overall practice observations, drills used, performance notes..."
              value={practiceNotes}
              onChange={(e) => setPracticeNotes(e.target.value)}
            />
            <button
              onClick={handleSavePracticeNotes}
              className="btn btn-secondary mt-2"
            >
              Save Practice Notes
            </button>
          </div>

          {/* Member Attendance Section */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Member Attendance</h3>

            {/* Tabs */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setSelectedTab('rsvp')}
                className={`px-4 py-2 rounded-lg font-medium ${
                  selectedTab === 'rsvp'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                RSVP'd Members
              </button>
              <button
                onClick={() => setSelectedTab('all')}
                className={`px-4 py-2 rounded-lg font-medium ${
                  selectedTab === 'all'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Members
              </button>
            </div>

            {/* Search */}
            <input
              type="text"
              className="input mb-4"
              placeholder="Search members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            {/* Member List */}
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {sortedMembers.map((member) => {
                const badge = getRsvpBadge(member.rsvpStatus)
                const currentNotes = memberNotes[member.id] !== undefined
                  ? memberNotes[member.id]
                  : member.memberNotes

                return (
                  <div
                    key={member.id}
                    className={`border rounded-lg p-4 ${
                      member.attended ? 'bg-green-50 border-green-200' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h4 className="font-semibold text-gray-900">{member.full_name}</h4>
                          {member.is_guest && (
                            <span className="px-2 py-1 text-xs rounded bg-orange-200 text-orange-800 font-bold">
                              GUEST
                            </span>
                          )}
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

                    {/* Member Notes */}
                    <div className="mt-3">
                      <textarea
                        className="input text-sm"
                        rows="2"
                        placeholder="Individual notes (performance, issues, observations)..."
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

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-6 mt-6 border-t">
            <button
              onClick={onClose}
              className="btn btn-secondary"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

