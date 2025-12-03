import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { usePracticeStore } from '../store/practiceStore'
import { useRosterStore } from '../store/rosterStore'
import { useAuthStore } from '../store/authStore'
import { useSettingsStore } from '../store/settingsStore'
import CreatePracticeModal from '../components/CreatePracticeModal'
import EditPracticeModal from '../components/EditPracticeModal'
import AttendanceModal from '../components/AttendanceModal'
import PracticeLineupsManager from '../components/PracticeLineupsManager'
import MemberHistoryModal from '../components/MemberHistoryModal'
import CheckInButton from '../components/CheckInButton'
import Icon from '../components/Icon'
import { Linkify } from '../utils/linkify'
import { format, isToday, differenceInHours, differenceInDays, parseISO } from 'date-fns'

// Weather icons mapping
const weatherIcons = {
  0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
  45: '🌫️', 48: '🌫️',
  51: '🌧️', 53: '🌧️', 55: '🌧️',
  61: '🌧️', 63: '🌧️', 65: '🌧️',
  71: '❄️', 73: '❄️', 75: '❄️',
  80: '🌦️', 81: '🌦️', 82: '🌦️',
  95: '⛈️', 96: '⛈️', 99: '⛈️'
}

const weatherDescriptions = {
  0: 'Clear', 1: 'Mainly Clear', 2: 'Partly Cloudy', 3: 'Overcast',
  45: 'Foggy', 48: 'Foggy',
  51: 'Light Drizzle', 53: 'Drizzle', 55: 'Heavy Drizzle',
  61: 'Light Rain', 63: 'Rain', 65: 'Heavy Rain',
  71: 'Light Snow', 73: 'Snow', 75: 'Heavy Snow',
  80: 'Light Showers', 81: 'Showers', 82: 'Heavy Showers',
  95: 'Thunderstorm', 96: 'Thunderstorm', 99: 'Severe Thunderstorm'
}

export default function Practices() {
  const {
    practices,
    rsvps,
    loading,
    fetchPractices,
    fetchRSVPs,
    setRSVP,
    deleteRSVP,
    getRSVPCount,
    getUserRSVP,
    deletePractice,
    deleteSingleInstance,
    deleteEntireSeries,
    updatePracticeNotes,
    updateAttendance,
    addAttendance,
    updateMemberNotes,
    togglePracticeVisibility
  } = usePracticeStore()

  const { members, fetchMembers } = useRosterStore()
  const { user, profile, hasRole } = useAuthStore()
  const { settings, fetchSettings, updateSetting } = useSettingsStore()
  const [searchParams, setSearchParams] = useSearchParams()

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false)
  const [historyModalMember, setHistoryModalMember] = useState(null)

  // State
  const [selectedPractice, setSelectedPractice] = useState(null)
  const [expandedPractice, setExpandedPractice] = useState(null)
  const [showDeleteSeriesChoice, setShowDeleteSeriesChoice] = useState(null)
  const [activeTab, setActiveTab] = useState('schedule') // 'schedule', 'attendance'
  const [practiceNotes, setPracticeNotes] = useState('')
  const [memberNotesState, setMemberNotesState] = useState({})
  const [openMenuId, setOpenMenuId] = useState(null) // For dropdown menu
  const [showPracticeNotes, setShowPracticeNotes] = useState(false) // Collapsible practice notes
  const [expandedMemberNotes, setExpandedMemberNotes] = useState({})
  const [rosterFilter, setRosterFilter] = useState('all') // 'all', 'yes', 'attended', 'no-shows'

  // Weather state
  const [weather, setWeather] = useState(null)
  const [weatherLoading, setWeatherLoading] = useState(false)

  // Get privacy settings from database
  const showAttendeeCount = settings['privacy_show_attendee_count'] ?? true
  const showAttendeeNames = settings['privacy_show_attendee_names'] ?? true

  useEffect(() => {
    fetchPractices()
    fetchSettings()
    fetchMembers()
  }, [fetchPractices, fetchSettings, fetchMembers])

  useEffect(() => {
    if (practices.length > 0) {
      const editId = searchParams.get('edit')
      if (editId) {
        const practiceToEdit = practices.find(p => p.id === editId)
        if (practiceToEdit) {
          setSelectedPractice(practiceToEdit)
          setIsEditModalOpen(true)
          // Clear param so it doesn't reopen on refresh/nav
          setSearchParams({}, { replace: true })
        }
      }
    }
  }, [practices, searchParams, setSearchParams])

  // Keep selected practice in sync with latest store data
  useEffect(() => {
    if (!selectedPractice) return
    const latest = practices.find(p => p.id === selectedPractice.id)
    if (latest && latest !== selectedPractice) {
      setSelectedPractice(latest)
      setPracticeNotes(latest.coach_notes || '')
    }
  }, [practices, selectedPractice])

  // Load practice notes when practice is selected
  useEffect(() => {
    if (selectedPractice) {
      fetchRSVPs(selectedPractice.id)
      setPracticeNotes(selectedPractice.coach_notes || '')
    }
  }, [selectedPractice, fetchRSVPs])

  // Fetch weather for selected practice
  useEffect(() => {
    const fetchWeather = async () => {
      if (!selectedPractice?.date) {
        setWeather(null)
        return
      }

      // Parse coordinates
      const lat = selectedPractice?.location_lat ? parseFloat(selectedPractice.location_lat) : null
      const lng = selectedPractice?.location_lng ? parseFloat(selectedPractice.location_lng) : null
      const hasCoords = lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)

      // Need coordinates or location name to fetch weather
      if (!hasCoords && !selectedPractice?.location_name && !selectedPractice?.location_address) {
        setWeather(null)
        return
      }

      // Parse date to avoid timezone issues
      const practiceDate = parseISO(selectedPractice.date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const practiceStartOfDay = new Date(practiceDate)
      practiceStartOfDay.setHours(0, 0, 0, 0)
      const daysUntil = differenceInDays(practiceStartOfDay, today)

      // Only fetch weather if practice is within 14 days and not past
      if (daysUntil > 14 || daysUntil < 0) {
        setWeather(null)
        return
      }

      setWeatherLoading(true)
      try {
        let latitude, longitude

        if (hasCoords) {
          latitude = lat
          longitude = lng
        } else {
          // Try geocoding the location
          const locationStr = selectedPractice.location_address || selectedPractice.location_name
          const geoResponse = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(locationStr)}&count=1`
          )
          const geoData = await geoResponse.json()

          if (!geoData?.results || geoData.results.length === 0) {
            setWeatherLoading(false)
            setWeather(null)
            return
          }

          latitude = geoData.results[0].latitude
          longitude = geoData.results[0].longitude
        }

        // Fetch weather forecast (temperature in Fahrenheit)
        const weatherResponse = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=14&temperature_unit=fahrenheit`
        )
        const weatherData = await weatherResponse.json()

        if (weatherData.daily) {
          const dateStr = selectedPractice.date.split('T')[0]
          const dayIndex = weatherData.daily.time.indexOf(dateStr)

          if (dayIndex !== -1) {
            setWeather({
              code: weatherData.daily.weathercode[dayIndex],
              tempHigh: Math.round(weatherData.daily.temperature_2m_max[dayIndex]),
              tempLow: Math.round(weatherData.daily.temperature_2m_min[dayIndex]),
              precipChance: weatherData.daily.precipitation_probability_max[dayIndex]
            })
          } else {
            setWeather(null)
          }
        }
      } catch (error) {
        console.error('Weather fetch error:', error)
        setWeather(null)
      } finally {
        setWeatherLoading(false)
      }
    }

    fetchWeather()
  }, [selectedPractice?.id, selectedPractice?.date, selectedPractice?.location_lat, selectedPractice?.location_lng])

  // Fetch RSVPs for all practices when practices are loaded
  useEffect(() => {
    if (practices.length > 0) {
      practices.forEach(practice => {
        fetchRSVPs(practice.id)
      })
    }
  }, [practices.length, fetchRSVPs])

  // ========== Privacy Settings Handlers ==========
  const handleToggleAttendeeCount = async (checked) => {
    const currentUser = useAuthStore.getState().user
    if (!currentUser) return
    await updateSetting('privacy_show_attendee_count', checked, currentUser.id)
  }

  const handleToggleAttendeeNames = async (checked) => {
    const currentUser = useAuthStore.getState().user
    if (!currentUser) return
    await updateSetting('privacy_show_attendee_names', checked, currentUser.id)
  }

  // ========== RSVP Handlers ==========
  const handleRSVP = async (practiceId, status) => {
    // Get fresh user from store to avoid stale closure
    const currentUser = useAuthStore.getState().user
    if (!currentUser) return
    await setRSVP(practiceId, currentUser.id, status)
  }

  // Manual RSVP for admins/coaches to RSVP on behalf of others
  const handleManualRSVP = async (practiceId, memberId, status) => {
    await setRSVP(practiceId, memberId, status)
    await fetchRSVPs(practiceId)
  }

  // ========== Practice Management Handlers ==========
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

  const handleManagePractice = async (practice) => {
    setSelectedPractice(practice)
    if (!rsvps[practice.id]) {
      await fetchRSVPs(practice.id)
    }
    setActiveTab('attendance')
  }

  const handleDeletePractice = async (practice) => {
    const isPartOfSeries = practice.parent_practice_id || practice.is_recurring

    if (isPartOfSeries) {
      setShowDeleteSeriesChoice(practice)
    } else {
      const confirmed = window.confirm(
        `Are you sure you want to delete "${practice.title}"?\n\nThis will also delete all RSVPs for this practice. This action cannot be undone.`
      )
      if (confirmed) {
        await deletePractice(practice.id)
      }
    }
  }

  const handleDeleteSingleInstance = async () => {
    if (!showDeleteSeriesChoice) return
    const confirmed = window.confirm(
      `Delete only this instance of "${showDeleteSeriesChoice.title}"?\n\nOther practices in the series will not be affected.`
    )
    if (confirmed) {
      await deleteSingleInstance(showDeleteSeriesChoice.id)
      setShowDeleteSeriesChoice(null)
    }
  }

  const handleDeleteEntireSeries = async () => {
    if (!showDeleteSeriesChoice) return
    const parentId = showDeleteSeriesChoice.parent_practice_id || showDeleteSeriesChoice.id
    const seriesCount = practices.filter(p => p.parent_practice_id === parentId || p.id === parentId).length
    const confirmed = window.confirm(
      `Delete the ENTIRE series "${showDeleteSeriesChoice.title}"?\n\nThis will delete ${seriesCount} practices and all their RSVPs. This action cannot be undone.`
    )
    if (confirmed) {
      await deleteEntireSeries(parentId)
      setShowDeleteSeriesChoice(null)
    }
  }

  const handleToggleVisibility = async (practice) => {
    if (!practice?.id) return
    const currentVisibility = practice.is_visible_to_members || false
    const newVisibility = !currentVisibility
    await togglePracticeVisibility(practice.id, newVisibility)
  }

  // ========== Attendance Management Handlers ==========
  const handleSavePracticeNotes = async () => {
    if (!selectedPractice) return
    await updatePracticeNotes(selectedPractice.id, practiceNotes)
  }

  const handleToggleAttendance = async (member) => {
    if (member.attended) {
      await updateAttendance(
        selectedPractice.id,
        member.id,
        false,
        member.memberNotes,
        user.id
      )
    } else {
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

  // ========== Expand/Collapse Handlers ==========
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

  // ========== Helper Functions ==========
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
      water: { name: 'boat', color: 'text-primary-600', bg: 'bg-primary-50' },
      land: { name: 'workouts', color: 'text-amber-600', bg: 'bg-amber-50' },
      gym: { name: 'fire', color: 'text-rose-600', bg: 'bg-rose-50' },
      meeting: { name: 'announcements', color: 'text-indigo-600', bg: 'bg-indigo-50' },
      default: { name: 'practice', color: 'text-gray-600', bg: 'bg-gray-50' }
    }
    const icon = map[type] || map.default
    return (
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${icon.bg} border border-white/50 shadow-sm`}>
        <Icon name={icon.name} size={20} className={icon.color} />
      </div>
    )
  }

  const getRsvpBadge = (status) => {
    switch (status) {
      case 'yes':
        return { label: 'Yes', className: 'badge badge-success' }
      case 'no':
        return { label: 'No', className: 'badge badge-danger' }
      case 'maybe':
        return { label: 'Maybe', className: 'badge badge-warning' }
      default:
        return { label: 'No RSVP', className: 'badge badge-neutral' }
    }
  }

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

  // Check if practice is eligible for self check-in (today, or within 2 hours before/after)
  const isCheckInEligible = (practice) => {
    if (!practice?.date || !practice?.start_time) return false
    try {
      const practiceDate = parseISO(practice.date)
      if (!isToday(practiceDate)) return false

      // Parse start time and create full datetime
      const [hours, minutes] = practice.start_time.split(':').map(Number)
      const practiceDateTime = new Date(practiceDate)
      practiceDateTime.setHours(hours, minutes, 0, 0)

      const now = new Date()
      const hoursDiff = differenceInHours(now, practiceDateTime)

      // Allow check-in from 2 hours before to 4 hours after practice start
      return hoursDiff >= -2 && hoursDiff <= 4
    } catch {
      return false
    }
  }

  // Check if RSVPs are visible based on timing
  const areRSVPsVisible = (practice) => {
    if (!practice) return false
    const isAdminOrCoach = hasRole('admin') || hasRole('coach') || hasRole('manager')
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

  const getMembersWithStatus = () => {
    const practiceRsvps = rsvps[selectedPractice?.id] || []
    const activeMembers = members.filter(m => m.is_active !== false)
    const isAdminOrCoach = hasRole('admin') || hasRole('coach') || hasRole('manager')
    const rsvpsVisible = areRSVPsVisible(selectedPractice)

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
        hasRsvp: !!rsvp,
        checkedInAt: rsvp?.checked_in_at,
        checkedInBy: rsvp?.checked_in_by_profile
      }
    })
  }

  // ========== Render Loading State ==========
  if (loading && practices.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500">Loading practices...</p>
        </div>
      </div>
    )
  }

  // ========== Render Attendance & Lineups Tab Content ==========
  const renderAttendanceTab = () => {
    if (!selectedPractice) {
      return (
        <div className="card text-center py-16 flex flex-col items-center justify-center min-h-[400px]">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <Icon name="practice" size={32} className="text-slate-300" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">No Practice Selected</h3>
          <p className="text-slate-500 max-w-md mb-6">Select a practice from the Schedule tab to manage attendance, view the roster, and create lineups.</p>
          <button
            onClick={() => setActiveTab('schedule')}
            className="btn btn-primary"
          >
            Go to Schedule
          </button>
        </div>
      )
    }

    const membersWithStatus = getMembersWithStatus()
    const attendedMembers = membersWithStatus.filter(m => m.attended)
    const rsvpdYes = membersWithStatus.filter(m => m.rsvpStatus === 'yes')
    const rsvpdMaybe = membersWithStatus.filter(m => m.rsvpStatus === 'maybe')

    return (
      <div className="space-y-4 md:space-y-6">
        {/* Practice Header - Compact on mobile */}
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 md:pb-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setSelectedPractice(null)
                setActiveTab('schedule')
              }}
              className="flex items-center gap-1.5 text-xs md:text-sm text-slate-500 hover:text-primary-600 transition-colors group"
            >
              <Icon name="arrowLeft" size={14} className="group-hover:-translate-x-1 transition-transform" />
              <span className="hidden sm:inline">Back to schedule</span>
              <span className="sm:hidden">Back</span>
            </button>
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="btn btn-secondary btn-sm text-xs"
            >
              <Icon name="edit" size={14} className="mr-1" />
              <span className="hidden sm:inline">Edit Details</span>
              <span className="sm:hidden">Edit</span>
            </button>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h2 className="text-lg md:text-2xl font-bold text-slate-900">{selectedPractice.title}</h2>
              {(selectedPractice.is_recurring || selectedPractice.parent_practice_id) && (
                <span className="badge badge-neutral text-[10px]">Recurring</span>
              )}
              {isToday(new Date(selectedPractice.date)) && (
                <span className="px-2 py-0.5 bg-primary-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-full">
                  Today
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs md:text-sm text-slate-500">
              <span className="flex items-center gap-1">
                <Icon name="calendar" size={14} className="text-slate-400" />
                {formatDate(selectedPractice.date)}
              </span>
              <span className="w-1 h-1 rounded-full bg-slate-300" />
              <span className="flex items-center gap-1">
                <Icon name="clock" size={14} className="text-slate-400" />
                {formatTime(selectedPractice.start_time)}
              </span>
            </div>
          </div>
        </div>

        {/* Weather Card */}
        {weather && (
          <div className="p-4 bg-gradient-to-br from-sky-50 to-blue-50 rounded-xl border border-sky-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{weatherIcons[weather.code] || '🌡️'}</span>
                <div>
                  <div className="font-bold text-slate-900">
                    {weatherDescriptions[weather.code] || 'Weather'}
                  </div>
                  <div className="text-sm text-slate-600">
                    {weather.tempHigh}° / {weather.tempLow}°F
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-sm text-slate-600">
                  <Icon name="droplet" size={14} className="text-sky-500" />
                  {weather.precipChance}% rain
                </div>
              </div>
            </div>
          </div>
        )}
        {weatherLoading && (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-200 rounded-lg" />
              <div className="flex-1">
                <div className="h-4 bg-slate-200 rounded w-24 mb-2" />
                <div className="h-3 bg-slate-200 rounded w-16" />
              </div>
            </div>
          </div>
        )}

        {/* Stats Dashboard - Compact with icons */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
          <div className="stat-card group p-2.5 md:p-4">
            <div className="flex items-center justify-between mb-1.5 md:mb-2">
              <div className="p-1.5 md:p-2 bg-gradient-to-br from-primary-100 to-primary-50 rounded-lg">
                <Icon name="check" size={14} className="text-primary-600 md:hidden" />
                <Icon name="check" size={18} className="text-primary-600 hidden md:block" />
              </div>
              <span className="text-[9px] md:text-[10px] font-bold text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded-full uppercase">Live</span>
            </div>
            <div className="text-xl md:text-2xl font-bold text-slate-900">{attendedMembers.length}</div>
            <p className="text-[10px] md:text-xs text-slate-500 font-medium">Checked In</p>
          </div>

          <div className="stat-card group p-2.5 md:p-4 border-l-3 border-l-success-500">
            <div className="flex items-center justify-between mb-1.5 md:mb-2">
              <div className="p-1.5 md:p-2 bg-gradient-to-br from-success-100 to-success-50 rounded-lg">
                <Icon name="check" size={14} className="text-success-600 md:hidden" />
                <Icon name="check" size={18} className="text-success-600 hidden md:block" />
              </div>
            </div>
            <div className="text-xl md:text-2xl font-bold text-success-600">{rsvpdYes.length}</div>
            <p className="text-[10px] md:text-xs text-slate-500 font-medium">RSVP Yes</p>
          </div>

          <div className="stat-card group p-2.5 md:p-4 border-l-3 border-l-amber-500">
            <div className="flex items-center justify-between mb-1.5 md:mb-2">
              <div className="p-1.5 md:p-2 bg-gradient-to-br from-amber-100 to-amber-50 rounded-lg">
                <Icon name="clock" size={14} className="text-amber-600 md:hidden" />
                <Icon name="clock" size={18} className="text-amber-600 hidden md:block" />
              </div>
            </div>
            <div className="text-xl md:text-2xl font-bold text-amber-600">{rsvpdMaybe.length}</div>
            <p className="text-[10px] md:text-xs text-slate-500 font-medium">Maybe</p>
          </div>

          <div className="stat-card group p-2.5 md:p-4">
            <div className="flex items-center justify-between mb-1.5 md:mb-2">
              <div className="p-1.5 md:p-2 bg-gradient-to-br from-slate-100 to-slate-50 rounded-lg">
                <Icon name="roster" size={14} className="text-slate-600 md:hidden" />
                <Icon name="roster" size={18} className="text-slate-600 hidden md:block" />
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className={`text-xl md:text-2xl font-bold ${attendedMembers.length > selectedPractice.max_capacity ? 'text-red-600' : 'text-slate-900'}`}>
                {attendedMembers.length}
              </span>
              <span className="text-xs md:text-sm text-slate-400">/{selectedPractice.max_capacity}</span>
            </div>
            <p className="text-[10px] md:text-xs text-slate-500 font-medium">Capacity</p>
          </div>
        </div>

        {/* Overall Practice Notes - Collapsible */}
        <div className="card p-0 overflow-hidden">
          <button
            onClick={() => setShowPracticeNotes(!showPracticeNotes)}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Icon name="notes" size={20} className="text-primary-600" />
              <h3 className="font-semibold text-slate-900">Coach's Notes</h3>
            </div>
            <Icon name={showPracticeNotes ? 'chevron-up' : 'chevron-down'} size={20} className="text-slate-400" />
          </button>
          {showPracticeNotes && (
            <div className="p-4 border-t border-slate-100 bg-slate-50/50">
              <textarea
                className="input text-sm min-h-[100px]"
                placeholder="Overall notes about today's practice (conditions, focus areas, achievements, issues)..."
                value={practiceNotes}
                onChange={(e) => setPracticeNotes(e.target.value)}
                onBlur={handleSavePracticeNotes}
              />
              <p className="text-xs text-slate-500 mt-2">Notes save automatically when you click outside</p>
            </div>
          )}
        </div>

        {/* Practice Lineups Section */}
        <div className="mb-4 md:mb-6">
          <PracticeLineupsManager practice={selectedPractice} />
        </div>

        {/* Quick Filters - Mobile pill style */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-2">
          <button
            onClick={() => setRosterFilter('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
              rosterFilter === 'all'
                ? 'bg-slate-800 text-white shadow-md'
                : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            <Icon name="roster" size={12} />
            All <span className="opacity-70">({membersWithStatus.length})</span>
          </button>
          <button
            onClick={() => setRosterFilter('yes')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
              rosterFilter === 'yes'
                ? 'bg-success-600 text-white shadow-md'
                : 'bg-white text-success-700 border border-success-200'
            }`}
          >
            <Icon name="check" size={12} />
            RSVP Yes <span className="opacity-70">({rsvpdYes.length})</span>
          </button>
          <button
            onClick={() => setRosterFilter('attended')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
              rosterFilter === 'attended'
                ? 'bg-primary-600 text-white shadow-md'
                : 'bg-white text-primary-700 border border-primary-200'
            }`}
          >
            <Icon name="check" size={12} />
            Checked In <span className="opacity-70">({attendedMembers.length})</span>
          </button>
          <button
            onClick={() => setRosterFilter('no-shows')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
              rosterFilter === 'no-shows'
                ? 'bg-red-600 text-white shadow-md'
                : 'bg-white text-red-700 border border-red-200'
            }`}
          >
            <Icon name="close" size={12} />
            No-Shows <span className="opacity-70">({rsvpdYes.filter(m => !m.attended).length})</span>
          </button>
        </div>

        {/* Paddler List */}
        <div className="card overflow-hidden">
          <div className="p-3 md:p-4 border-b border-slate-100 bg-white flex justify-between items-center">
            <h3 className="font-bold text-slate-900 text-sm md:text-base">
              {rosterFilter === 'all' ? 'Team Roster' :
               rosterFilter === 'yes' ? 'RSVP Yes' :
               rosterFilter === 'attended' ? 'Checked In' : 'No-Shows'}
            </h3>
            <div className="text-[10px] md:text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
              {rosterFilter === 'all' ? membersWithStatus.length :
               rosterFilter === 'yes' ? rsvpdYes.length :
               rosterFilter === 'attended' ? attendedMembers.length :
               rsvpdYes.filter(m => !m.attended).length} paddlers
            </div>
          </div>

          <div className="divide-y divide-slate-100 max-h-[500px] md:max-h-[600px] overflow-y-auto">
            {membersWithStatus
              .filter(member => {
                if (rosterFilter === 'yes') return member.rsvpStatus === 'yes'
                if (rosterFilter === 'attended') return member.attended
                if (rosterFilter === 'no-shows') return member.rsvpStatus === 'yes' && !member.attended
                return true
              })
              .map(member => {
              const badge = getRsvpBadge(member.rsvpStatus)
              const currentNotes = memberNotesState[member.id] !== undefined
                ? memberNotesState[member.id]
                : member.memberNotes
              const isNotesExpanded = expandedMemberNotes[member.id] || false

              return (
                <div
                  key={member.id}
                  className={`p-3 md:p-4 transition-colors ${
                    member.attended
                      ? 'bg-gradient-to-r from-success-50 to-white border-l-4 border-l-success-500'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  {/* Top Row: Name + Check-in Button */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      {/* Check-in indicator */}
                      <div className={`w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                        member.attended
                          ? 'bg-success-500 text-white'
                          : 'bg-slate-100 text-slate-400'
                      }`}>
                        <Icon name={member.attended ? 'check' : 'roster'} size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-bold text-sm text-slate-900 truncate">{member.full_name}</h4>
                          {member.is_guest && (
                            <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1 py-0.5 rounded">GUEST</span>
                          )}
                        </div>
                        <div className="text-[10px] md:text-xs text-slate-500 flex items-center gap-1.5">
                          <span className={badge.className}>{badge.label}</span>
                          {member.skill_level && <span className="hidden sm:inline">• {member.skill_level}</span>}
                          {member.preferred_side && <span className="hidden sm:inline">• {member.preferred_side}</span>}
                        </div>
                      </div>
                    </div>

                    {/* Check-in Button - Prominent */}
                    <button
                      onClick={() => handleToggleAttendance(member)}
                      className={`px-3 py-2 md:px-4 md:py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        member.attended
                          ? 'bg-white border border-slate-200 text-slate-600 hover:border-red-300 hover:text-red-600 hover:bg-red-50'
                          : 'bg-primary-600 text-white shadow-md shadow-primary-600/30 hover:bg-primary-700 active:scale-95'
                      }`}
                    >
                      <Icon name={member.attended ? 'close' : 'check'} size={14} />
                      <span className="hidden sm:inline">{member.attended ? 'Undo' : 'Check In'}</span>
                      <span className="sm:hidden">{member.attended ? 'Undo' : 'In'}</span>
                    </button>
                  </div>

                  {/* Bottom Row: RSVP buttons + History */}
                  <div className="flex items-center gap-2 pl-10 md:pl-11">
                    {/* RSVP Toggle Pills */}
                    <div className="flex bg-slate-100 rounded-lg p-0.5 gap-0.5 flex-1">
                      {[
                        { status: 'yes', icon: 'check', label: 'Yes', activeClass: 'bg-white text-success-700 shadow-sm ring-1 ring-success-200' },
                        { status: 'maybe', icon: 'clock', label: 'Maybe', activeClass: 'bg-white text-amber-700 shadow-sm ring-1 ring-amber-200' },
                        { status: 'no', icon: 'close', label: 'No', activeClass: 'bg-white text-red-700 shadow-sm ring-1 ring-red-200' }
                      ].map(({ status, icon, label, activeClass }) => (
                        <button
                          key={status}
                          onClick={() => handleManualRSVP(
                            selectedPractice.id,
                            member.id,
                            member.rsvpStatus === status ? null : status
                          )}
                          className={`flex-1 px-2 py-1.5 rounded-md text-[10px] md:text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                            member.rsvpStatus === status ? activeClass : 'text-slate-400 hover:bg-white/50'
                          }`}
                        >
                          <Icon name={icon} size={12} className={member.rsvpStatus === status ? '' : 'opacity-50'} />
                          <span className="hidden sm:inline">{label}</span>
                        </button>
                      ))}
                    </div>

                    {/* History button */}
                    <button
                      onClick={() => setHistoryModalMember(member)}
                      className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors flex-shrink-0"
                      title="View History"
                    >
                      <Icon name="clock" size={16} />
                    </button>
                  </div>

                  {/* Notes - Inline, subtle */}
                  <div className="mt-2 pl-10 md:pl-11">
                    <input
                      type="text"
                      className="w-full bg-transparent border-b border-dashed border-slate-200 hover:border-slate-300 focus:border-primary-500 focus:ring-0 text-[11px] md:text-xs py-1 text-slate-600 placeholder:text-slate-300 transition-colors"
                      placeholder="Add notes..."
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
    )
  }


  // ========== Render Schedule Tab Content ==========
  const renderScheduleTab = () => {
    return (
      <div className="space-y-6">
        {/* Privacy Settings - Admin Only */}
        {hasRole('admin') && (
          <div className="card bg-slate-50 border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-slate-900">Privacy Settings</h3>
                <p className="text-xs text-slate-500">Control what regular paddlers can see</p>
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showAttendeeCount}
                    onChange={(e) => handleToggleAttendeeCount(e.target.checked)}
                    className="rounded text-primary-600 focus:ring-primary-500 border-slate-300"
                  />
                  <span className="text-sm font-medium text-slate-700">Show counts</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showAttendeeNames}
                    onChange={(e) => handleToggleAttendeeNames(e.target.checked)}
                    className="rounded text-primary-600 focus:ring-primary-500 border-slate-300"
                  />
                  <span className="text-sm font-medium text-slate-700">Show names</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Practice List */}
        {practices.length === 0 ? (
          <div className="card text-center py-16 flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <Icon name="calendar" size={32} className="text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No Practices Scheduled</h3>
            <p className="text-slate-500 max-w-md mb-6">Get the team moving by scheduling your first practice session.</p>
            {hasRole('admin') && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="btn btn-primary"
              >
                <Icon name="plus" size={18} className="mr-2" /> Create First Practice
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
                <div key={practice.id} className={`card p-0 overflow-hidden transition-all hover:shadow-md ${
                  isToday(new Date(practice.date))
                    ? 'ring-2 ring-primary-400 border-l-4 border-l-primary-600 bg-primary-50/30'
                    : practice.practice_type === 'water'
                      ? 'border-l-4 border-l-primary-500'
                      : practice.practice_type === 'land'
                        ? 'border-l-4 border-l-amber-500'
                        : 'border-l-4 border-l-slate-300'
                }`}>
                  {/* Main Row */}
                  <div className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4 sm:items-start">
                    {/* Left: Date Box (Desktop) & Info */}
                    <div className="flex gap-4 flex-1">
                      {/* Date Box */}
                      <div className="hidden sm:flex flex-col items-center justify-center w-16 h-16 bg-slate-50 rounded-xl border border-slate-100 shrink-0 text-slate-700">
                        <span className="text-xs font-bold uppercase tracking-wider">{format(new Date(practice.date), 'MMM')}</span>
                        <span className="text-xl font-bold leading-none">{format(new Date(practice.date), 'd')}</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Header Line */}
                        <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
                          <div className="flex flex-col">
                             <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-lg font-bold text-slate-900">{practice.title}</h3>
                                {isToday(new Date(practice.date)) && (
                                  <span className="px-2 py-0.5 bg-primary-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-full shadow-sm">
                                    Today
                                  </span>
                                )}
                                {(practice.parent_practice_id || practice.is_recurring) && (
                                  <Icon name="events" size={14} className="text-blue-500" />
                                )}
                             </div>
                             <div className="sm:hidden text-sm text-slate-500 font-medium">
                                {format(new Date(practice.date), 'EEE, MMM d')} • {formatTime(practice.start_time)}
                             </div>
                          </div>
                          
                          {/* User RSVP Status */}
                          {userRSVP && (
                             <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wide ${userRSVP.status === 'yes' ? 'bg-green-100 text-green-700' : userRSVP.status === 'no' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                {userRSVP.status}
                             </span>
                          )}
                        </div>

                        {/* Meta Info */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600 mt-1">
                          <span className="hidden sm:flex items-center gap-1.5">
                            <Icon name="clock" size={16} className="text-slate-400" />
                            {formatTime(practice.start_time)}
                            {practice.end_time && ` - ${formatTime(practice.end_time)}`}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Icon name="location" size={16} className="text-slate-400" />
                            {practice.location_link ? (
                              <a
                                href={practice.location_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-primary-600 hover:underline"
                              >
                                {practice.location_name}
                              </a>
                            ) : (
                              practice.location_name
                            )}
                          </span>
                          {(() => {
                            const isAdmin = hasRole('admin') || hasRole('coach') || hasRole('manager')
                            const rsvpsVisible = areRSVPsVisible(practice)
                            const canSeeCount = isAdmin || (rsvpsVisible && showAttendeeCount)
                            return canSeeCount && (
                              <span className="flex items-center gap-1.5 font-medium text-primary-600 bg-primary-50 px-2 py-0.5 rounded-md">
                                <Icon name="roster" size={14} />
                                {counts.yes} / {practice.max_capacity}
                              </span>
                            )
                          })()}
                        </div>
                        
                        {/* Description Teaser */}
                        {practice.description && (
                           <p className="text-sm text-slate-500 mt-2 line-clamp-1">{practice.description}</p>
                        )}

                        {/* Food Location */}
                        {practice.food_location_name && (
                          <div className="flex items-center gap-2 mt-2 text-sm">
                            <span className="text-orange-500">🍜</span>
                            <span className="text-slate-600">
                              Post-practice food:
                              {practice.food_location_link ? (
                                <a
                                  href={practice.food_location_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="ml-1 text-primary-600 hover:underline font-medium"
                                >
                                  {practice.food_location_name}
                                </a>
                              ) : (
                                <span className="ml-1 font-medium">{practice.food_location_name}</span>
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex flex-col gap-2 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                       {/* RSVP Buttons - Prominent on mobile */}
                       <div className="flex bg-slate-100 p-1 rounded-xl w-full">
                          <button
                            type="button"
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => { e.stopPropagation(); handleRSVP(practice.id, 'yes'); }}
                            className={`flex-1 px-3 py-2 sm:py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                              userRSVP?.status === 'yes'
                                ? 'bg-white text-success-700 shadow-sm ring-1 ring-success-200'
                                : 'text-slate-500 hover:bg-white/50'
                            }`}
                          >
                            <Icon name="check" size={14} className={userRSVP?.status === 'yes' ? 'text-success-600' : ''} />
                            <span className="sm:hidden">Going</span>
                            <span className="hidden sm:inline">Yes</span>
                          </button>
                          <button
                            type="button"
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => { e.stopPropagation(); handleRSVP(practice.id, 'maybe'); }}
                            className={`flex-1 px-3 py-2 sm:py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                              userRSVP?.status === 'maybe'
                                ? 'bg-white text-amber-700 shadow-sm ring-1 ring-amber-200'
                                : 'text-slate-500 hover:bg-white/50'
                            }`}
                          >
                            <Icon name="clock" size={14} className={userRSVP?.status === 'maybe' ? 'text-amber-600' : ''} />
                            Maybe
                          </button>
                          <button
                            type="button"
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => { e.stopPropagation(); handleRSVP(practice.id, 'no'); }}
                            className={`flex-1 px-3 py-2 sm:py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                              userRSVP?.status === 'no'
                                ? 'bg-white text-red-700 shadow-sm ring-1 ring-red-200'
                                : 'text-slate-500 hover:bg-white/50'
                            }`}
                          >
                            <Icon name="close" size={14} className={userRSVP?.status === 'no' ? 'text-red-600' : ''} />
                            <span className="sm:hidden">Can't</span>
                            <span className="hidden sm:inline">No</span>
                          </button>
                       </div>

                       {/* Self Check-in Button - Only for today's practices */}
                       {isCheckInEligible(practice) && (
                         <CheckInButton
                           practiceId={practice.id}
                           userRSVP={userRSVP}
                           venue={practice.venue_lat && practice.venue_lng ? {
                             lat: practice.venue_lat,
                             lng: practice.venue_lng,
                             radius: practice.check_in_radius || 500
                           } : null}
                           size="small"
                         />
                       )}

                       {/* Bottom row: Expand + Admin controls */}
                       <div className="flex items-center gap-2">
                         {/* Expand Toggle */}
                         <button onClick={() => toggleExpand(practice.id)} className="flex-1 sm:flex-none btn btn-sm btn-secondary text-xs flex items-center justify-center gap-1">
                            {isExpanded ? 'Hide' : 'View'} Roster <Icon name={isExpanded ? 'chevron-up' : 'chevron-down'} size={14} />
                         </button>

                         {/* Admin Controls - Inline on mobile */}
                         {(hasRole('admin') || hasRole('coach')) && (
                            <>
                               <button onClick={() => handleManagePractice(practice)} className="btn btn-sm btn-primary flex items-center gap-1">
                                  <Icon name="roster" size={14} />
                                  <span className="hidden sm:inline">Manage</span>
                               </button>
                               {hasRole('admin') && (
                                  <div className="hidden sm:flex gap-1">
                                     <button onClick={() => handleEditPractice(practice)} className="btn btn-sm btn-secondary">
                                        <Icon name="edit" size={14} />
                                     </button>
                                     <button onClick={() => handleToggleVisibility(practice)} className={`btn btn-sm ${practice.is_visible_to_members ? 'text-green-600 bg-green-50 hover:bg-green-100' : 'text-slate-400 bg-slate-100 hover:bg-slate-200'}`}>
                                        <Icon name="visibility" size={14} />
                                     </button>
                                     <button onClick={() => handleDeletePractice(practice)} className="btn btn-sm bg-red-50 text-red-600 hover:bg-red-100 border-transparent">
                                        <Icon name="trash" size={14} />
                                     </button>
                                  </div>
                               )}
                            </>
                         )}

                         {/* Mobile-only: More actions dropdown */}
                         {hasRole('admin') && (
                           <div className="sm:hidden relative">
                             <button
                               onClick={() => setOpenMenuId(openMenuId === practice.id ? null : practice.id)}
                               className="btn btn-sm btn-secondary"
                             >
                               <Icon name="more" size={14} />
                             </button>
                             {openMenuId === practice.id && (
                               <div className="absolute right-0 bottom-full mb-1 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-50 min-w-[140px]">
                                 <button
                                   onClick={() => { handleEditPractice(practice); setOpenMenuId(null); }}
                                   className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                 >
                                   <Icon name="edit" size={14} /> Edit
                                 </button>
                                 <button
                                   onClick={() => { handleToggleVisibility(practice); setOpenMenuId(null); }}
                                   className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                 >
                                   <Icon name="visibility" size={14} /> {practice.is_visible_to_members ? 'Hide' : 'Show'}
                                 </button>
                                 <button
                                   onClick={() => { handleDeletePractice(practice); setOpenMenuId(null); }}
                                   className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                 >
                                   <Icon name="trash" size={14} /> Delete
                                 </button>
                               </div>
                             )}
                           </div>
                         )}
                       </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="bg-slate-50 border-t border-slate-200 p-4 sm:p-6">
                      {(() => {
                        const isAdmin = hasRole('admin') || hasRole('coach') || hasRole('manager')
                        const rsvpsVisible = areRSVPsVisible(practice)
                        const canSeeCount = isAdmin || (rsvpsVisible && showAttendeeCount)
                        const canSeeNames = isAdmin || (rsvpsVisible && showAttendeeNames)
                        const allRsvpNames = practiceRSVPs.map(r => r.user?.full_name).filter(Boolean)

                        // If not visible yet for regular paddlers, show notice
                        if (!isAdmin && !rsvpsVisible) {
                          return (
                            <div className="text-center py-8">
                              <Icon name="clock" size={32} className="mx-auto mb-3 text-amber-400" />
                              <h4 className="font-bold text-slate-900 mb-2">Roster Not Yet Available</h4>
                              <p className="text-sm text-slate-600">
                                {practice.rsvp_visibility_hours && practice.rsvp_visibility_hours > 0
                                  ? `The roster will be visible ${practice.rsvp_visibility_hours} hours before practice starts.`
                                  : 'The roster will be visible on the day of practice.'}
                              </p>
                            </div>
                          )
                        }

                        // Show roster based on privacy settings
                        return (
                          <>
                            {canSeeNames ? (
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {[
                                  { label: 'Yes', count: counts.yes, items: practiceRSVPs.filter(r => r.status === 'yes'), color: 'success', icon: 'check' },
                                  { label: 'Maybe', count: counts.maybe, items: practiceRSVPs.filter(r => r.status === 'maybe'), color: 'amber', icon: 'clock' },
                                  { label: 'No', count: counts.no, items: practiceRSVPs.filter(r => r.status === 'no'), color: 'red', icon: 'close' }
                                ].map((group) => (
                                  <div key={group.label} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                    <div className={`px-3 py-2 border-b border-slate-100 flex justify-between items-center bg-${group.color}-50`}>
                                      <div className="flex items-center gap-2">
                                        <span className={`text-${group.color}-600`}><Icon name={group.icon} size={14} /></span>
                                        <span className={`text-sm font-bold text-${group.color}-900`}>{group.label}</span>
                                      </div>
                                      <span className={`text-xs font-bold text-${group.color}-700 bg-white px-2 py-0.5 rounded-full`}>
                                        {canSeeCount ? group.count : '-'}
                                      </span>
                                    </div>
                                    <ul className="p-2 space-y-1 max-h-[200px] overflow-y-auto">
                                      {group.items.length > 0 ? (
                                        group.items.map(r => (
                                          <li key={r.id} className="text-xs text-slate-700 px-2 py-1.5 rounded hover:bg-slate-50 flex items-center gap-2">
                                            <div className={`w-1.5 h-1.5 rounded-full bg-${group.color}-500`}></div>
                                            {isAdmin ? r.user?.full_name : formatNamePrivate(r.user?.full_name, allRsvpNames)}
                                          </li>
                                        ))
                                      ) : (
                                        <li className="text-xs text-slate-400 italic px-2 py-1">No one yet</li>
                                      )}
                                    </ul>
                                  </div>
                                ))}
                              </div>
                            ) : canSeeCount ? (
                              <div className="text-center py-8">
                                <div className="inline-flex items-center gap-6 bg-white px-6 py-4 rounded-xl border border-slate-200">
                                  <div className="text-center">
                                    <div className="text-3xl font-bold text-success-600">{counts.yes}</div>
                                    <div className="text-xs text-slate-500 mt-1">Yes</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-3xl font-bold text-amber-600">{counts.maybe}</div>
                                    <div className="text-xs text-slate-500 mt-1">Maybe</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-3xl font-bold text-red-600">{counts.no}</div>
                                    <div className="text-xs text-slate-500 mt-1">No</div>
                                  </div>
                                </div>
                                <p className="text-sm text-slate-500 mt-4">Attendee names are hidden</p>
                              </div>
                            ) : (
                              <div className="text-center py-8 text-slate-500">
                                <Icon name="lock" size={24} className="mx-auto mb-2 text-slate-300" />
                                <p className="text-sm">Roster information is hidden</p>
                              </div>
                            )}
                          </>
                        )
                      })()}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ========== Main Render ==========
  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Practices</h1>
        {/* Desktop create button */}
        {hasRole('admin') && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="hidden md:flex btn btn-primary items-center gap-2 shadow-lg shadow-primary-600/20"
          >
            <Icon name="plus" size={18} />
            Create Practice
          </button>
        )}
      </div>

      {/* Desktop Tabs */}
      <div className="hidden md:flex gap-1 p-1 bg-slate-100 rounded-xl w-fit mb-6">
        <button
          onClick={() => setActiveTab('schedule')}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'schedule'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
        >
          Schedule
        </button>
        {(hasRole('admin') || hasRole('coach')) && (
          <button
            onClick={() => setActiveTab('attendance')}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'attendance'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
          >
            Manage
          </button>
        )}
      </div>

      {/* Mobile Tab Pills */}
      <div className="md:hidden flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-2 mb-4">
        <button
          onClick={() => setActiveTab('schedule')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'schedule'
              ? 'bg-primary-600 text-white shadow-md'
              : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          <Icon name="calendar" size={14} /> Schedule
        </button>
        {(hasRole('admin') || hasRole('coach')) && (
          <button
            onClick={() => setActiveTab('attendance')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === 'attendance'
                ? 'bg-primary-600 text-white shadow-md'
                : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            <Icon name="roster" size={14} /> Manage
          </button>
        )}
      </div>

      {/* Tab Content */}
      {activeTab === 'schedule' && renderScheduleTab()}
      {activeTab === 'attendance' && renderAttendanceTab()}

      {/* Modals */}
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

      <MemberHistoryModal
        member={historyModalMember}
        isOpen={!!historyModalMember}
        onClose={() => setHistoryModalMember(null)}
      />

      {/* Delete Series Choice Modal */}
      {showDeleteSeriesChoice && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Delete Recurring Practice</h2>
            <p className="text-slate-600 mb-6">
              This practice is part of a recurring series. How would you like to delete it?
            </p>

            <div className="space-y-3">
              <button
                onClick={handleDeleteSingleInstance}
                className="w-full p-4 rounded-xl border border-slate-200 hover:border-primary-500 hover:bg-primary-50 transition-all text-left group"
              >
                <span className="block font-bold text-slate-900 group-hover:text-primary-700">This practice only</span>
                <span className="block text-xs text-slate-500 mt-1">
                  Delete just this specific date. The rest of the series stays.
                </span>
              </button>

              <button
                onClick={handleDeleteEntireSeries}
                className="w-full p-4 rounded-xl border border-red-200 hover:border-red-500 hover:bg-red-50 transition-all text-left group"
              >
                <span className="block font-bold text-red-700">Delete entire series</span>
                <span className="block text-xs text-red-500 mt-1">
                  Delete all future practices in this series.
                </span>
              </button>
            </div>

            <button
              onClick={() => setShowDeleteSeriesChoice(null)}
              className="w-full mt-4 btn btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Mobile FAB (Floating Action Button) */}
      {hasRole('admin') && activeTab === 'schedule' && (
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="md:hidden fixed bottom-20 right-4 z-40 w-14 h-14 bg-primary-600 text-white rounded-full shadow-lg shadow-primary-600/40 flex items-center justify-center hover:bg-primary-700 active:scale-95 transition-all"
        >
          <Icon name="plus" size={24} />
        </button>
      )}
    </div>
  )
}
