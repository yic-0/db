import { useState, useEffect } from 'react'
import { usePracticeStore } from '../store/practiceStore'
import { useRosterStore } from '../store/rosterStore'
import { useAuthStore } from '../store/authStore'
import { differenceInHours, parseISO } from 'date-fns'
import Icon from './Icon'

export default function AttendanceModal({ isOpen, onClose, practice }) {
  const { rsvps, updatePracticeNotes, updateAttendance, addAttendance, updateMemberNotes } = usePracticeStore()
  const { members, fetchMembers } = useRosterStore()
  const { user, hasRole } = useAuthStore()

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
      setMemberNotes({})
    }
  }, [practice])

  useEffect(() => {
    if (!isOpen) {
      setPracticeNotes('')
      setMemberNotes({})
    }
  }, [isOpen])

  if (!isOpen || !practice) return null

  const practiceRsvps = rsvps[practice.id] || []

  // Check if user is admin/coach/manager
  const isAdminOrCoach = hasRole('admin') || hasRole('coach') || hasRole('manager')

  // Check if RSVPs are visible based on timing
  const areRSVPsVisible = () => {
    if (isAdminOrCoach) return true // Always visible to admin/coach/manager

    const visibilityHours = practice.rsvp_visibility_hours ?? 0
    if (visibilityHours === 0) {
      // Visible on day of practice (00:00)
      const practiceDateTime = parseISO(`${practice.date}T00:00:00`)
      const now = new Date()
      return now >= practiceDateTime
    } else {
      // Visible X hours before practice start time
      const practiceDateTime = parseISO(`${practice.date}T${practice.start_time}`)
      const hoursUntilPractice = differenceInHours(practiceDateTime, new Date())
      return hoursUntilPractice <= visibilityHours
    }
  }

  const rsvpsVisible = areRSVPsVisible()

  // Format name with privacy (First Name + Last Initial, handle duplicates)
  const formatNamePrivate = (fullName, allNames = []) => {
    if (!fullName) return 'Unknown'
    const parts = fullName.trim().split(' ')
    if (parts.length === 1) return parts[0]

    const firstName = parts[0]
    const lastName = parts[parts.length - 1]
    const lastInitial = lastName[0]

    // Check for duplicates with same first name + last initial
    const shortFormat = `${firstName} ${lastInitial}.`
    const duplicates = allNames.filter(name => {
      if (!name || name === fullName) return false
      const nameParts = name.trim().split(' ')
      if (nameParts.length < 2) return false
      return nameParts[0] === firstName && nameParts[nameParts.length - 1][0] === lastInitial
    })

    // If there are duplicates, show first 2 characters of last name
    if (duplicates.length > 0) {
      const lastTwoChars = lastName.substring(0, 2)
      return `${firstName} ${lastTwoChars}.`
    }

    return shortFormat
  }

  const getMembersWithStatus = () => {
    const activeMembers = members.filter(m => m.is_active)
    return activeMembers.map(member => {
      const rsvp = practiceRsvps.find(r => r.user_id === member.id)

      // For regular paddlers: only show "yes" RSVPs when visible
      let rsvpStatus = rsvp?.status || 'no_response'
      if (!isAdminOrCoach && !rsvpsVisible) {
        rsvpStatus = 'no_response' // Hide all RSVPs if not yet visible
      } else if (!isAdminOrCoach && rsvp && rsvp.status !== 'yes') {
        rsvpStatus = 'no_response' // Hide "no" and "maybe" for regular paddlers
      }

      return {
        ...member,
        rsvpStatus,
        attended: rsvp?.attended || false,
        memberNotes: rsvp?.member_notes || '',
        hasRsvp: !!rsvp
      }
    })
  }

  const membersWithStatus = getMembersWithStatus()

  const filteredMembers = membersWithStatus.filter(member => {
    const matchesSearch = member.full_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTab = selectedTab === 'all' || member.hasRsvp
    return matchesSearch && matchesTab
  })

  const sortedMembers = [...filteredMembers].sort((a, b) => {
    if (a.rsvpStatus === 'yes' && b.rsvpStatus !== 'yes') return -1
    if (a.rsvpStatus !== 'yes' && b.rsvpStatus === 'yes') return 1
    if (a.attended && !b.attended) return -1
    if (!a.attended && b.attended) return 1
    return a.full_name.localeCompare(b.full_name)
  })

  // Get all member names for duplicate detection
  const allMemberNames = membersWithStatus.map(m => m.full_name).filter(Boolean)

  const handleSavePracticeNotes = async () => {
    await updatePracticeNotes(practice.id, practiceNotes)
  }

  const handleToggleAttendance = async (member) => {
    if (member.attended) {
      await updateAttendance(practice.id, member.id, false, member.memberNotes, user.id)
    } else {
      if (member.hasRsvp) {
        await updateAttendance(practice.id, member.id, true, member.memberNotes, user.id)
      } else {
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
        return { label: 'Yes', className: 'badge badge-success' }
      case 'maybe':
        return { label: 'Maybe', className: 'badge badge-warning' }
      case 'no':
        return { label: 'No', className: 'badge badge-danger' }
      default:
        return { label: 'No RSVP', className: 'badge badge-neutral' }
    }
  }

  const attendedCount = membersWithStatus.filter(m => m.attended).length
  const rsvpYesCount = membersWithStatus.filter(m => m.rsvpStatus === 'yes').length
  const attendanceRate = rsvpYesCount > 0 ? Math.round((attendedCount / rsvpYesCount) * 100) : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-5xl max-h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden ring-1 ring-slate-900/5">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white z-10">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{practice.title}</h2>
            <p className="text-sm text-slate-500">Attendance & Performance Tracking</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
          >
            <span className="sr-only">Close</span>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          
          {/* RSVP Visibility Notice for Regular Paddlers */}
          {!isAdminOrCoach && !rsvpsVisible && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-start gap-3">
              <Icon name="clock" size={20} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-amber-900 mb-1">RSVP List Not Yet Available</h4>
                <p className="text-sm text-amber-800">
                  {practice.rsvp_visibility_hours && practice.rsvp_visibility_hours > 0
                    ? `The list of attendees will be visible ${practice.rsvp_visibility_hours} hours before practice starts.`
                    : 'The list of attendees will be visible on the day of practice.'}
                </p>
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="stat-card">
              <p className="text-sm font-medium text-slate-500">RSVP'd Yes</p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">{rsvpYesCount}</span>
                <span className="text-xs text-slate-400">paddlers</span>
              </div>
            </div>
            <div className="stat-card">
              <p className="text-sm font-medium text-slate-500">Checked In</p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className={`text-2xl font-bold ${attendedCount >= rsvpYesCount ? 'text-success-600' : 'text-primary-600'}`}>
                  {attendedCount}
                </span>
                <span className="text-xs text-slate-400">paddlers</span>
              </div>
            </div>
            <div className="stat-card">
              <p className="text-sm font-medium text-slate-500">Attendance Rate</p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className={`text-2xl font-bold ${attendanceRate >= 80 ? 'text-success-600' : 'text-amber-600'}`}>
                  {attendanceRate}%
                </span>
                <span className="text-xs text-slate-400">of expected</span>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Column: Notes */}
            <div className="lg:col-span-1 space-y-6">
              <div className="card">
                <label htmlFor="practiceNotes" className="label flex items-center gap-2">
                  <Icon name="notes" size={16} className="text-primary-500" />
                  Coach's Notes
                </label>
                <textarea
                  id="practiceNotes"
                  className="input min-h-[120px] text-sm resize-y"
                  placeholder="Record drills, water conditions, or general feedback..."
                  value={practiceNotes}
                  onChange={(e) => setPracticeNotes(e.target.value)}
                  onBlur={handleSavePracticeNotes}
                />
                <p className="text-xs text-slate-400 mt-2">Notes are saved automatically on blur.</p>
              </div>
            </div>

            {/* Right Column: Member List */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Toolbar */}
                <div className="p-4 border-b border-slate-100 bg-white flex flex-col sm:flex-row gap-4 justify-between items-center sticky top-0 z-10">
                  <div className="flex p-1 bg-slate-100 rounded-lg">
                    <button
                      onClick={() => setSelectedTab('rsvp')}
                      className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                        selectedTab === 'rsvp'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Expected
                    </button>
                    <button
                      onClick={() => setSelectedTab('all')}
                      className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                        selectedTab === 'all'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      All Roster
                    </button>
                  </div>
                  <div className="relative w-full sm:w-64">
                    <input
                      type="text"
                      className="input pl-9 py-2 text-sm"
                      placeholder="Search paddlers..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <div className="absolute left-3 top-2.5 text-slate-400">
                      <Icon name="search" size={16} />
                    </div>
                  </div>
                </div>

                {/* List */}
                <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                  {sortedMembers.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">
                      No members found matching your filters.
                    </div>
                  ) : (
                    sortedMembers.map((member) => {
                      const badge = getRsvpBadge(member.rsvpStatus)
                      const currentNotes = memberNotes[member.id] !== undefined
                        ? memberNotes[member.id]
                        : member.memberNotes

                      return (
                        <div
                          key={member.id}
                          className={`p-4 transition-colors hover:bg-slate-50 group ${
                            member.attended ? 'bg-primary-50/30' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-slate-900 truncate">
                                  {isAdminOrCoach ? member.full_name : formatNamePrivate(member.full_name, allMemberNames)}
                                </h4>
                                {member.is_guest && (
                                  <span className="badge badge-warning text-[10px] uppercase tracking-wider">Guest</span>
                                )}
                                <span className={badge.className}>
                                  {badge.label}
                                </span>
                              </div>
                              
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 mb-2">
                                {member.skill_level && <span>{member.skill_level}</span>}
                                {member.preferred_side && <span>Side: {member.preferred_side}</span>}
                              </div>

                              <div className="relative">
                                <input
                                  type="text"
                                  className="w-full bg-transparent border-b border-transparent hover:border-slate-200 focus:border-primary-300 focus:ring-0 text-sm py-1 px-0 transition-colors placeholder:text-slate-300"
                                  placeholder="Add note..."
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

                            <div className="flex items-center">
                              <button
                                onClick={() => handleToggleAttendance(member)}
                                className={`h-10 px-4 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
                                  member.attended
                                    ? 'bg-white border border-slate-200 text-slate-700 hover:border-red-200 hover:text-red-600 hover:bg-red-50'
                                    : 'bg-slate-900 text-white hover:bg-slate-800 shadow-sm hover:shadow'
                                }`}
                              >
                                {member.attended ? (
                                  <>
                                    <Icon name="check" size={16} className="text-success-500" />
                                    <span>Checked In</span>
                                  </>
                                ) : (
                                  <span>Check In</span>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button onClick={onClose} className="btn btn-secondary">
            Done
          </button>
        </div>
      </div>
    </div>
  )
}