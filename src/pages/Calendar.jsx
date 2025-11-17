import { useState, useEffect, useMemo } from 'react'
import { useAuthStore } from '../store/authStore'
import { useCalendarStore } from '../store/calendarStore'
import { usePracticeStore } from '../store/practiceStore'
import { useEventStore } from '../store/eventStore'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, isToday, parseISO, isPast, isFuture } from 'date-fns'
import Icon from '../components/Icon'
import toast from 'react-hot-toast'

export default function Calendar() {
  const { user, hasRole } = useAuthStore()
  const {
    prospectiveRaces,
    confirmedRaces,
    calendarSettings,
    fetchProspectiveRaces,
    fetchConfirmedRaces,
    fetchCalendarSettings,
    createProspectiveRace,
    createConfirmedRace,
    updateProspectiveRace,
    updateConfirmedRace,
    convertToConfirmed,
    updateCalendarSettings,
    toggleRaceVisibility,
    deleteProspectiveRace,
    deleteConfirmedRace,
    joinRace,
    leaveRace,
    getUpcomingDeadlines
  } = useCalendarStore()

  const { practices, fetchPractices, createPractice, updatePractice, deletePractice } = usePracticeStore()
  const { events, fetchEvents, updateEvent, deleteEvent } = useEventStore()

  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [activeTab, setActiveTab] = useState('calendar')
  const [showProspectiveForm, setShowProspectiveForm] = useState(false)
  const [showConfirmedForm, setShowConfirmedForm] = useState(false)
  const [showConvertModal, setShowConvertModal] = useState(false)
  const [showQuickAddModal, setShowQuickAddModal] = useState(false)
  const [selectedRace, setSelectedRace] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)
  const [quickAddType, setQuickAddType] = useState('practice')
  const [quickAddRaceStatus, setQuickAddRaceStatus] = useState('prospective') // 'prospective' | 'confirmed'
  const [editingEvent, setEditingEvent] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)
  const [eventListFilter, setEventListFilter] = useState('all') // 'all' | 'upcoming' | 'past'
  const [eventTypeFilter, setEventTypeFilter] = useState('all') // 'all' | 'practice' | 'race' | 'event'
  const [editForm, setEditForm] = useState({
    title: '',
    date: '',
    start_time: '',
    end_time: '',
    location: '',
    description: ''
  })

  const [quickAddForm, setQuickAddForm] = useState({
    title: '',
    date: '',
    start_time: '',
    end_time: '',
    location: '',
    description: '',
    workout_type: 'strength',
    duration: 30
  })

  const [prospectiveForm, setProspectiveForm] = useState({
    name: '',
    location: '',
    description: '',
    race_date: '',
    early_bird_deadline: '',
    registration_deadline: '',
    payment_deadline: '',
    estimated_cost: '',
    early_bird_cost: '',
    external_link: '',
    notes: '',
    is_visible_to_members: false
  })

  const [confirmedForm, setConfirmedForm] = useState({
    name: '',
    location: '',
    venue_address: '',
    description: '',
    race_date: '',
    race_start_time: '',
    race_end_time: '',
    captains_meeting_date: '',
    team_briefing_date: '',
    lineup_submission_deadline: '',
    payment_due_date: '',
    total_cost: '',
    per_person_cost: '',
    external_link: '',
    notes: '',
    is_visible_to_members: true
  })

  const [convertFormData, setConvertFormData] = useState({
    race_start_time: '',
    captains_meeting_date: '',
    team_briefing_date: '',
    lineup_submission_deadline: '',
    payment_due_date: '',
    venue_address: ''
  })

  const isCoachOrAdmin = hasRole('admin') || hasRole('coach')

  useEffect(() => {
    fetchProspectiveRaces()
    fetchConfirmedRaces()
    fetchPractices()
    fetchEvents()
    if (user) {
      fetchCalendarSettings(user.id)
    }
  }, [user?.id])

  // Helper to parse date strings correctly (handles timezone issues)
  const parseDateString = (dateStr) => {
    if (!dateStr) return new Date()
    // If it's a date-only string (YYYY-MM-DD), use parseISO to parse in local timezone
    if (typeof dateStr === 'string' && dateStr.length === 10) {
      return parseISO(dateStr)
    }
    // Otherwise parse as-is (datetime strings or Date objects)
    return new Date(dateStr)
  }

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const startDate = startOfWeek(monthStart)
    const endDate = endOfWeek(monthEnd)

    return eachDayOfInterval({ start: startDate, end: endDate })
  }, [currentMonth])

  // Get events for a specific day
  const getEventsForDay = (day) => {
    const events = []
    const dayStr = format(day, 'yyyy-MM-dd')

    // Add practices
    if (calendarSettings?.show_practices) {
      practices.forEach(practice => {
        if (practice.date === dayStr) {
          events.push({
            id: `practice-${practice.id}`,
            title: 'Practice',
            type: 'practice',
            color: 'bg-blue-500',
            data: practice
          })
        }
      })
    }

    // Add prospective races
    if (calendarSettings?.show_prospective_races) {
      prospectiveRaces.forEach(race => {
        if (race.race_date === dayStr && race.status === 'prospective') {
          events.push({
            id: `prospective-${race.id}`,
            title: race.name,
            type: 'prospective_race',
            color: 'bg-orange-500',
            data: race
          })
        }
      })
    }

    // Add confirmed races
    if (calendarSettings?.show_confirmed_races) {
      confirmedRaces.forEach(race => {
        if (race.race_date === dayStr) {
          events.push({
            id: `confirmed-${race.id}`,
            title: race.name,
            type: 'confirmed_race',
            color: 'bg-green-500',
            data: race
          })
        }
      })
    }

    // Add team events from eventStore
    if (calendarSettings?.show_team_events) {
      const teamEvents = useEventStore.getState().events
      teamEvents.forEach(event => {
        if (event.event_date === dayStr) {
          events.push({
            id: `event-${event.id}`,
            title: event.title,
            type: 'team_event',
            color: 'bg-purple-500',
            data: event
          })
        }
      })
    }

    // Add deadlines
    if (calendarSettings?.show_deadlines) {
      // Prospective race deadlines
      prospectiveRaces.forEach(race => {
        if (race.status === 'prospective') {
          if (race.early_bird_deadline === dayStr) {
            events.push({
              id: `deadline-eb-${race.id}`,
              title: `Early Bird: ${race.name}`,
              type: 'deadline',
              color: 'bg-red-500',
              data: { type: 'Early Bird', race }
            })
          }
          if (race.registration_deadline === dayStr) {
            events.push({
              id: `deadline-reg-${race.id}`,
              title: `Registration: ${race.name}`,
              type: 'deadline',
              color: 'bg-red-500',
              data: { type: 'Registration', race }
            })
          }
          if (race.payment_deadline === dayStr) {
            events.push({
              id: `deadline-pay-${race.id}`,
              title: `Payment: ${race.name}`,
              type: 'deadline',
              color: 'bg-red-500',
              data: { type: 'Payment', race }
            })
          }
        }
      })

      // Confirmed race deadlines
      confirmedRaces.forEach(race => {
        if (race.lineup_submission_deadline && format(new Date(race.lineup_submission_deadline), 'yyyy-MM-dd') === dayStr) {
          events.push({
            id: `deadline-lineup-${race.id}`,
            title: `Lineup Due: ${race.name}`,
            type: 'deadline',
            color: 'bg-red-500',
            data: { type: 'Lineup', race }
          })
        }
        if (race.payment_due_date === dayStr) {
          events.push({
            id: `deadline-cpay-${race.id}`,
            title: `Payment Due: ${race.name}`,
            type: 'deadline',
            color: 'bg-red-500',
            data: { type: 'Payment', race }
          })
        }
      })
    }

    return events
  }

  const handleCreateProspective = async (e) => {
    e.preventDefault()
    if (!prospectiveForm.name || !prospectiveForm.race_date) {
      toast.error('Name and race date are required')
      return
    }

    const result = await createProspectiveRace({
      ...prospectiveForm,
      created_by: user.id,
      estimated_cost: prospectiveForm.estimated_cost ? parseFloat(prospectiveForm.estimated_cost) : null,
      early_bird_cost: prospectiveForm.early_bird_cost ? parseFloat(prospectiveForm.early_bird_cost) : null,
      early_bird_deadline: prospectiveForm.early_bird_deadline || null,
      registration_deadline: prospectiveForm.registration_deadline || null,
      payment_deadline: prospectiveForm.payment_deadline || null
    })

    if (result.success) {
      setShowProspectiveForm(false)
      setProspectiveForm({
        name: '',
        location: '',
        description: '',
        race_date: '',
        early_bird_deadline: '',
        registration_deadline: '',
        payment_deadline: '',
        estimated_cost: '',
        early_bird_cost: '',
        external_link: '',
        notes: '',
        is_visible_to_members: false
      })
    }
  }

  const handleCreateConfirmed = async (e) => {
    e.preventDefault()
    if (!confirmedForm.name || !confirmedForm.race_date) {
      toast.error('Name and race date are required')
      return
    }

    const result = await createConfirmedRace({
      ...confirmedForm,
      created_by: user.id,
      total_cost: confirmedForm.total_cost ? parseFloat(confirmedForm.total_cost) : null,
      per_person_cost: confirmedForm.per_person_cost ? parseFloat(confirmedForm.per_person_cost) : null,
      captains_meeting_date: confirmedForm.captains_meeting_date || null,
      team_briefing_date: confirmedForm.team_briefing_date || null,
      lineup_submission_deadline: confirmedForm.lineup_submission_deadline || null,
      payment_due_date: confirmedForm.payment_due_date || null,
      race_start_time: confirmedForm.race_start_time || null,
      race_end_time: confirmedForm.race_end_time || null
    })

    if (result.success) {
      setShowConfirmedForm(false)
      setConfirmedForm({
        name: '',
        location: '',
        venue_address: '',
        description: '',
        race_date: '',
        race_start_time: '',
        race_end_time: '',
        captains_meeting_date: '',
        team_briefing_date: '',
        lineup_submission_deadline: '',
        payment_due_date: '',
        total_cost: '',
        per_person_cost: '',
        external_link: '',
        notes: '',
        is_visible_to_members: true
      })
    }
  }

  const handleConvertRace = async (e) => {
    e.preventDefault()
    if (!selectedRace) return

    const result = await convertToConfirmed(selectedRace.id, {
      ...convertFormData,
      captains_meeting_date: convertFormData.captains_meeting_date || null,
      team_briefing_date: convertFormData.team_briefing_date || null,
      lineup_submission_deadline: convertFormData.lineup_submission_deadline || null,
      payment_due_date: convertFormData.payment_due_date || null,
      race_start_time: convertFormData.race_start_time || null
    })

    if (result.success) {
      setShowConvertModal(false)
      setSelectedRace(null)
      setConvertFormData({
        race_start_time: '',
        captains_meeting_date: '',
        team_briefing_date: '',
        lineup_submission_deadline: '',
        payment_due_date: '',
        venue_address: ''
      })
    }
  }

  const handleToggleSetting = async (setting) => {
    if (!calendarSettings) return
    await updateCalendarSettings(user.id, {
      ...calendarSettings,
      [setting]: !calendarSettings[setting]
    })
  }

  const handleQuickAdd = async (e) => {
    e.preventDefault()
    if (!quickAddForm.date) {
      toast.error('Date is required')
      return
    }

    let result = { success: false }

    if (quickAddType === 'practice') {
      if (!quickAddForm.title || !quickAddForm.start_time) {
        toast.error('Title and start time are required for practices')
        return
      }
      result = await createPractice({
        title: quickAddForm.title,
        date: quickAddForm.date,
        start_time: quickAddForm.start_time,
        end_time: quickAddForm.end_time || null,
        location: quickAddForm.location || null,
        description: quickAddForm.description || null,
        created_by: user.id
      })
    } else if (quickAddType === 'workout') {
      // For now, show a message that this feature is coming soon
      // Workout assignments require additional database setup
      toast.success('Workout reminder added! Members can log their workouts in the Workouts section.')
      result = { success: true }
    } else if (quickAddType === 'race') {
      if (!quickAddForm.title) {
        toast.error('Race name is required')
        return
      }
      if (quickAddRaceStatus === 'prospective') {
        result = await createProspectiveRace({
          name: quickAddForm.title,
          race_date: quickAddForm.date,
          location: quickAddForm.location || null,
          description: quickAddForm.description || null,
          status: 'prospective',
          created_by: user.id,
          is_visible_to_members: true
        })
      } else {
        result = await createConfirmedRace({
          name: quickAddForm.title,
          race_date: quickAddForm.date,
          location: quickAddForm.location || null,
          description: quickAddForm.description || null,
          race_start_time: quickAddForm.start_time || null,
          race_end_time: quickAddForm.end_time || null,
          created_by: user.id,
          is_visible_to_members: true
        })
      }
    }

    if (result.success) {
      setShowQuickAddModal(false)
      resetQuickAddForm()
    }
  }

  const resetQuickAddForm = () => {
    setQuickAddForm({
      title: '',
      date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '',
      start_time: '',
      end_time: '',
      location: '',
      description: '',
      workout_type: 'strength',
      duration: 30
    })
    setQuickAddType('practice')
    setQuickAddRaceStatus('prospective')
  }

  const openQuickAddModal = (date = null) => {
    if (date) {
      setQuickAddForm(prev => ({
        ...prev,
        date: format(date, 'yyyy-MM-dd')
      }))
    }
    setShowQuickAddModal(true)
  }

  const handleStartEdit = (event) => {
    setEditingEvent(event)
    const data = event.data || {}

    // Map event data to edit form based on event type
    if (event.type === 'practice') {
      setEditForm({
        title: data.title || '',
        date: data.date || '',
        start_time: data.start_time || '',
        end_time: data.end_time || '',
        location: data.location || '',
        description: data.description || ''
      })
    } else if (event.type === 'prospective_race' || event.type === 'confirmed_race') {
      setEditForm({
        title: data.name || '',
        date: data.race_date || '',
        start_time: data.race_start_time || '',
        end_time: data.race_end_time || '',
        location: data.location || '',
        description: data.description || ''
      })
    } else if (event.type === 'team_event') {
      setEditForm({
        title: data.title || '',
        date: data.event_date || '',
        start_time: data.start_time || '',
        end_time: data.end_time || '',
        location: data.location || '',
        description: data.description || ''
      })
    }
  }

  const handleSaveEdit = async () => {
    if (!editingEvent) return

    const eventType = editingEvent.type
    const eventId = editingEvent.data?.id

    if (!eventId) {
      toast.error('Cannot update event: missing ID')
      return
    }

    let result = { success: false }

    if (eventType === 'practice') {
      result = await updatePractice(eventId, {
        title: editForm.title,
        date: editForm.date,
        start_time: editForm.start_time || null,
        end_time: editForm.end_time || null,
        location: editForm.location || null,
        description: editForm.description || null
      })
    } else if (eventType === 'prospective_race') {
      result = await updateProspectiveRace(eventId, {
        name: editForm.title,
        race_date: editForm.date,
        location: editForm.location || null,
        description: editForm.description || null
      })
    } else if (eventType === 'confirmed_race') {
      result = await updateConfirmedRace(eventId, {
        name: editForm.title,
        race_date: editForm.date,
        race_start_time: editForm.start_time || null,
        race_end_time: editForm.end_time || null,
        location: editForm.location || null,
        description: editForm.description || null
      })
    } else if (eventType === 'team_event') {
      result = await updateEvent(eventId, {
        title: editForm.title,
        event_date: editForm.date,
        start_time: editForm.start_time || null,
        end_time: editForm.end_time || null,
        location: editForm.location || null,
        description: editForm.description || null
      })
    }

    if (result.success) {
      setEditingEvent(null)
      // Refresh the calendar
      fetchPractices()
      fetchProspectiveRaces()
      fetchConfirmedRaces()
      fetchEvents()
    }
  }

  const handleCancelEdit = () => {
    setEditingEvent(null)
  }

  const handleDeleteEvent = async (event) => {
    if (!event?.data?.id) {
      toast.error('Cannot delete: missing event ID')
      return
    }

    const eventType = event.type
    const eventId = event.data.id

    let result = { success: false }

    if (eventType === 'practice') {
      result = await deletePractice(eventId)
    } else if (eventType === 'prospective_race') {
      result = await deleteProspectiveRace(eventId)
    } else if (eventType === 'confirmed_race') {
      result = await deleteConfirmedRace(eventId)
    } else if (eventType === 'team_event') {
      result = await deleteEvent(eventId)
    }

    if (result.success) {
      setShowDeleteConfirm(null)
      setSelectedDate(null)
      // Refresh data
      fetchPractices()
      fetchProspectiveRaces()
      fetchConfirmedRaces()
      fetchEvents()
    }
  }

  // Get all events as a unified list for the "All Events" tab
  const getAllEventsList = useMemo(() => {
    const allEvents = []

    // Add practices
    practices.forEach(practice => {
      allEvents.push({
        id: `practice-${practice.id}`,
        title: practice.title || 'Practice',
        date: practice.date,
        type: 'practice',
        subtype: 'practice',
        color: 'bg-blue-500',
        textColor: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        data: practice
      })
    })

    // Add prospective races (visible ones or all if admin)
    prospectiveRaces.forEach(race => {
      if (race.status === 'prospective' && (isCoachOrAdmin || race.is_visible_to_members)) {
        allEvents.push({
          id: `prospective-${race.id}`,
          title: race.name,
          date: race.race_date,
          type: 'prospective_race',
          subtype: 'race',
          color: 'bg-orange-500',
          textColor: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          data: race
        })
      }
    })

    // Add confirmed races
    confirmedRaces.forEach(race => {
      if (isCoachOrAdmin || race.is_visible_to_members) {
        allEvents.push({
          id: `confirmed-${race.id}`,
          title: race.name,
          date: race.race_date,
          type: 'confirmed_race',
          subtype: 'race',
          color: 'bg-green-500',
          textColor: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          data: race
        })
      }
    })

    // Add team events
    events.forEach(event => {
      allEvents.push({
        id: `event-${event.id}`,
        title: event.title,
        date: event.event_date,
        type: 'team_event',
        subtype: 'event',
        color: 'bg-purple-500',
        textColor: 'text-purple-600',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200',
        data: event
      })
    })

    // Sort by date
    allEvents.sort((a, b) => parseDateString(a.date) - parseDateString(b.date))

    // Apply filters
    return allEvents.filter(event => {
      const eventDate = parseDateString(event.date)

      // Date filter
      if (eventListFilter === 'upcoming' && isPast(eventDate) && !isToday(eventDate)) {
        return false
      }
      if (eventListFilter === 'past' && (isFuture(eventDate) || isToday(eventDate))) {
        return false
      }

      // Type filter
      if (eventTypeFilter !== 'all' && event.subtype !== eventTypeFilter) {
        return false
      }

      return true
    })
  }, [practices, prospectiveRaces, confirmedRaces, events, eventListFilter, eventTypeFilter, isCoachOrAdmin])

  const getAdvancedEditUrl = (event) => {
    if (!event?.data?.id) return null

    switch (event.type) {
      case 'practice':
        return `/practices?edit=${event.data.id}`
      case 'team_event':
        return `/events/${event.data.id}`
      case 'confirmed_race':
        return `/calendar?tab=confirmed&race=${event.data.id}`
      default:
        return null
    }
  }

  const upcomingDeadlines = getUpcomingDeadlines().slice(0, 10)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="page-header">Team Calendar</h1>

        <div className="flex gap-2">
          {isCoachOrAdmin && (
            <button
              onClick={() => openQuickAddModal()}
              className="btn btn-primary flex items-center gap-2"
            >
              <Icon name="plus" size={18} />
              Quick Add
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {['calendar', 'all-events', 'prospective', 'confirmed', 'deadlines'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 px-1 border-b-2 font-medium text-sm capitalize whitespace-nowrap ${
                activeTab === tab
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab === 'prospective' ? 'Prospective Races' : tab === 'confirmed' ? 'Confirmed Races' : tab === 'all-events' ? 'All Events' : tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Calendar Visibility Toggles */}
      {activeTab === 'calendar' && calendarSettings && (
        <div className="card">
          <h3 className="font-medium text-gray-900 mb-2">Show on Calendar</h3>
          <p className="text-xs text-gray-500 mb-3">Tap a legend chip to toggle visibility.</p>
          <div className="flex flex-wrap gap-3 text-xs text-gray-700">
            <button
              type="button"
              onClick={() => handleToggleSetting('show_practices')}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-full border transition ${
                calendarSettings.show_practices
                  ? 'bg-blue-50 border-blue-300 text-blue-800'
                  : 'bg-white border-gray-200 text-gray-500'
              }`}
            >
              <span className="w-3 h-3 bg-blue-500 rounded-sm"></span>
              Practice
            </button>
            <button
              type="button"
              onClick={() => handleToggleSetting('show_confirmed_races')}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-full border transition ${
                calendarSettings.show_confirmed_races
                  ? 'bg-green-50 border-green-300 text-green-800'
                  : 'bg-white border-gray-200 text-gray-500'
              }`}
            >
              <span className="w-3 h-3 bg-green-500 rounded-sm"></span>
              Confirmed race
            </button>
            {isCoachOrAdmin && (
              <button
                type="button"
                onClick={() => handleToggleSetting('show_prospective_races')}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-full border transition ${
                  calendarSettings.show_prospective_races
                    ? 'bg-orange-50 border-orange-300 text-orange-800'
                    : 'bg-white border-gray-200 text-gray-500'
                }`}
              >
                <span className="w-3 h-3 bg-orange-500 rounded-sm"></span>
                Prospective race
              </button>
            )}
            <button
              type="button"
              onClick={() => handleToggleSetting('show_deadlines')}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-full border transition ${
                calendarSettings.show_deadlines
                  ? 'bg-red-50 border-red-300 text-red-800'
                  : 'bg-white border-gray-200 text-gray-500'
              }`}
            >
              <span className="w-3 h-3 bg-red-500 rounded-sm"></span>
              Deadlines
            </button>
            <button
              type="button"
              onClick={() => handleToggleSetting('show_team_events')}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-full border transition ${
                calendarSettings.show_team_events
                  ? 'bg-purple-50 border-purple-300 text-purple-800'
                  : 'bg-white border-gray-200 text-gray-500'
              }`}
            >
              <span className="w-3 h-3 bg-purple-500 rounded-sm"></span>
              Team event
            </button>
          </div>
        </div>
      )}

      {/* Calendar View */}
      {activeTab === 'calendar' && (
        <div className="card">
          {/* Month Navigation */}
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-2 hover:bg-gray-100 rounded"
            >
              &larr;
            </button>
            <h2 className="text-xl font-semibold text-gray-900">
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-2 hover:bg-gray-100 rounded"
            >
              &rarr;
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Day Headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}

            {/* Calendar Days */}
            {calendarDays.map((day, idx) => {
              const dayEvents = getEventsForDay(day)
              const isCurrentMonth = isSameMonth(day, currentMonth)
              const isCurrentDay = isToday(day)

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedDate(day)}
                  className={`min-h-24 p-1 border rounded cursor-pointer hover:bg-gray-50 ${
                    !isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'bg-white'
                  } ${isCurrentDay ? 'ring-2 ring-primary-500' : ''}`}
                >
                  <div className={`text-sm font-medium ${isCurrentDay ? 'text-primary-600' : ''}`}>
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-1 mt-1">
                    {dayEvents.slice(0, 3).map(event => (
                      <div
                        key={event.id}
                        className={`text-xs text-white px-1 py-0.5 rounded truncate ${event.color}`}
                        title={event.title}
                      >
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-xs text-gray-500">
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Selected Date Events Popup Modal */}
      {selectedDate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Icon name="calendar" size={24} className="text-primary-600" />
                  {format(selectedDate, 'MMMM d, yyyy')}
                </h2>
                <div className="flex items-center gap-2">
                  {isCoachOrAdmin && !editingEvent && (
                    <button
                      onClick={() => openQuickAddModal(selectedDate)}
                      className="btn btn-primary text-sm flex items-center gap-1"
                    >
                      <Icon name="plus" size={16} />
                      Add Event
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setSelectedDate(null)
                      setEditingEvent(null)
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <Icon name="close" size={20} className="text-gray-500" />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {getEventsForDay(selectedDate).length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No events scheduled for this day</p>
                    {isCoachOrAdmin && (
                      <button
                        onClick={() => openQuickAddModal(selectedDate)}
                        className="btn btn-secondary text-sm mt-4"
                      >
                        + Add an event
                      </button>
                    )}
                  </div>
                ) : (
                  getEventsForDay(selectedDate).map(event => (
                    <div key={event.id} className="p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-primary-200 transition-colors">
                      {editingEvent?.id === event.id ? (
                        // Edit Form
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`w-4 h-4 rounded-full ${event.color}`}></span>
                            <span className="text-sm font-medium text-gray-600">Editing {event.type.replace(/_/g, ' ')}</span>
                          </div>

                          <div>
                            <label className="label">Title/Name *</label>
                            <input
                              type="text"
                              value={editForm.title}
                              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                              className="input"
                              required
                            />
                          </div>

                          <div>
                            <label className="label">Date *</label>
                            <input
                              type="date"
                              value={editForm.date}
                              onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                              className="input"
                              required
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="label">Start Time</label>
                              <input
                                type="time"
                                value={editForm.start_time}
                                onChange={(e) => setEditForm({ ...editForm, start_time: e.target.value })}
                                className="input"
                              />
                            </div>
                            <div>
                              <label className="label">End Time</label>
                              <input
                                type="time"
                                value={editForm.end_time}
                                onChange={(e) => setEditForm({ ...editForm, end_time: e.target.value })}
                                className="input"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="label">Location</label>
                            <input
                              type="text"
                              value={editForm.location}
                              onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                              className="input"
                            />
                          </div>

                          <div>
                            <label className="label">Description</label>
                            <textarea
                              value={editForm.description}
                              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                              className="input"
                              rows={3}
                            />
                          </div>

                          <div className="flex justify-between items-center pt-2">
                            <div>
                              {getAdvancedEditUrl(event) && (
                                <button
                                  onClick={() => {
                                    window.location.href = getAdvancedEditUrl(event)
                                  }}
                                  className="btn btn-secondary text-xs"
                                >
                                  Advanced Options (Fees, RSVPs, etc.)
                                </button>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={handleCancelEdit}
                                className="btn btn-secondary text-sm"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={handleSaveEdit}
                                className="btn btn-primary text-sm"
                              >
                                Save Changes
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        // Display View
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`w-4 h-4 rounded-full ${event.color}`}></span>
                              <span className="text-lg font-semibold text-gray-900">{event.title}</span>
                            </div>
                            <div className="space-y-1 ml-6">
                              <div className="text-sm text-gray-600">
                                <span className="font-medium">Type:</span> {event.type.replace(/_/g, ' ')}
                              </div>
                              {(event.data?.start_time || event.data?.race_start_time) && (
                                <div className="text-sm text-gray-600">
                                  <span className="font-medium">Time:</span> {event.data.start_time || event.data.race_start_time}
                                  {(event.data.end_time || event.data.race_end_time) && ` - ${event.data.end_time || event.data.race_end_time}`}
                                </div>
                              )}
                              {event.data?.location && (
                                <div className="text-sm text-gray-600">
                                  <span className="font-medium">Location:</span> {event.data.location}
                                </div>
                              )}
                              {event.data?.description && (
                                <div className="text-sm text-gray-600 mt-2">
                                  <span className="font-medium">Description:</span>
                                  <p className="mt-1">{event.data.description}</p>
                                </div>
                              )}
                            </div>
                          </div>
                          {isCoachOrAdmin && event.type !== 'deadline' && (
                            <div className="flex flex-col gap-2">
                              <button
                                onClick={() => handleStartEdit(event)}
                                className="btn btn-secondary text-xs flex items-center gap-1"
                              >
                                <Icon name="manage" size={14} />
                                Edit
                              </button>
                              <button
                                onClick={() => setShowDeleteConfirm(event)}
                                className="btn bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 text-xs flex items-center gap-1"
                              >
                                <Icon name="close" size={14} />
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* All Events List */}
      {activeTab === 'all-events' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="card">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mr-2">Time:</label>
                <select
                  value={eventListFilter}
                  onChange={(e) => setEventListFilter(e.target.value)}
                  className="input py-1 px-3 text-sm"
                >
                  <option value="all">All Time</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="past">Past</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mr-2">Type:</label>
                <select
                  value={eventTypeFilter}
                  onChange={(e) => setEventTypeFilter(e.target.value)}
                  className="input py-1 px-3 text-sm"
                >
                  <option value="all">All Types</option>
                  <option value="practice">Practices</option>
                  <option value="race">Races</option>
                  <option value="event">Team Events</option>
                </select>
              </div>
              <div className="text-sm text-gray-500">
                Showing {getAllEventsList.length} events
              </div>
            </div>
          </div>

          {/* Events List */}
          {getAllEventsList.length === 0 ? (
            <div className="card text-center py-8">
              <p className="text-gray-500">No events found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {getAllEventsList.map(event => (
                <div key={event.id} className={`card border ${event.borderColor} ${event.bgColor} hover:shadow-md transition-shadow`}>
                  {editingEvent?.id === event.id ? (
                    // Inline Edit Form
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`w-4 h-4 rounded-full ${event.color}`}></span>
                        <span className="text-sm font-medium text-gray-600">Editing {event.type.replace(/_/g, ' ')}</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="label">Title/Name *</label>
                          <input
                            type="text"
                            value={editForm.title}
                            onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                            className="input"
                            required
                          />
                        </div>
                        <div>
                          <label className="label">Date *</label>
                          <input
                            type="date"
                            value={editForm.date}
                            onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                            className="input"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="label">Start Time</label>
                          <input
                            type="time"
                            value={editForm.start_time}
                            onChange={(e) => setEditForm({ ...editForm, start_time: e.target.value })}
                            className="input"
                          />
                        </div>
                        <div>
                          <label className="label">End Time</label>
                          <input
                            type="time"
                            value={editForm.end_time}
                            onChange={(e) => setEditForm({ ...editForm, end_time: e.target.value })}
                            className="input"
                          />
                        </div>
                        <div>
                          <label className="label">Location</label>
                          <input
                            type="text"
                            value={editForm.location}
                            onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                            className="input"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="label">Description</label>
                        <textarea
                          value={editForm.description}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          className="input"
                          rows={2}
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          onClick={handleCancelEdit}
                          className="btn btn-secondary text-sm"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveEdit}
                          className="btn btn-primary text-sm"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Display View
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <span className={`w-4 h-4 rounded-full ${event.color} flex-shrink-0`}></span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-gray-900">{event.title}</h3>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${event.bgColor} ${event.textColor} border ${event.borderColor}`}>
                              {event.type.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                            <span className="flex items-center gap-1">
                              <Icon name="calendar" size={14} />
                              {format(parseDateString(event.date), 'MMM d, yyyy')}
                            </span>
                            {(event.data?.start_time || event.data?.race_start_time) && (
                              <span className="flex items-center gap-1">
                                <Icon name="clock" size={14} />
                                {event.data.start_time || event.data.race_start_time}
                              </span>
                            )}
                            {event.data?.location && (
                              <span className="flex items-center gap-1 truncate">
                                <Icon name="location" size={14} />
                                {event.data.location}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {isCoachOrAdmin && (
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() => handleStartEdit(event)}
                            className="btn btn-secondary text-xs flex items-center gap-1"
                          >
                            <Icon name="manage" size={14} />
                            Edit
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(event)}
                            className="btn bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 text-xs flex items-center gap-1"
                          >
                            <Icon name="close" size={14} />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Prospective Races List */}
      {activeTab === 'prospective' && (
        <div className="space-y-4">
          {!isCoachOrAdmin && (
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded">
              <p className="text-sm text-yellow-800">
                Only coaches and admins can view and manage prospective races.
              </p>
            </div>
          )}

          {isCoachOrAdmin && prospectiveRaces.filter(r => r.status === 'prospective').length === 0 ? (
            <div className="card text-center py-8">
              <p className="text-gray-500">No prospective races yet</p>
              <button
                onClick={() => setShowProspectiveForm(true)}
                className="btn-primary mt-4"
              >
                Add First Prospective Race
              </button>
            </div>
          ) : (
            isCoachOrAdmin && prospectiveRaces.filter(r => r.status === 'prospective').map(race => (
              <div key={race.id} className="card">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{race.name}</h3>
                    <p className="text-sm text-gray-600">{race.location}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Race Date: {format(parseDateString(race.race_date), 'MMMM d, yyyy')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleStartEdit({
                        id: `prospective-${race.id}`,
                        type: 'prospective_race',
                        title: race.name,
                        data: race
                      })}
                      className="btn-secondary text-sm flex items-center gap-1"
                    >
                      <Icon name="manage" size={14} />
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setSelectedRace(race)
                        setShowConvertModal(true)
                      }}
                      className="btn-primary text-sm"
                    >
                      Convert to Confirmed
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm({
                        id: `prospective-${race.id}`,
                        type: 'prospective_race',
                        title: race.name,
                        data: race
                      })}
                      className="btn bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Deadlines */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                  {race.early_bird_deadline && (
                    <div className="p-2 bg-orange-50 rounded">
                      <div className="text-xs font-medium text-orange-800">Early Bird Deadline</div>
                      <div className="text-sm text-orange-900">
                        {format(parseDateString(race.early_bird_deadline), 'MMM d, yyyy')}
                      </div>
                      {race.early_bird_cost && (
                        <div className="text-xs text-orange-700">
                          Cost: ${race.early_bird_cost}
                        </div>
                      )}
                    </div>
                  )}
                  {race.registration_deadline && (
                    <div className="p-2 bg-blue-50 rounded">
                      <div className="text-xs font-medium text-blue-800">Registration Deadline</div>
                      <div className="text-sm text-blue-900">
                        {format(parseDateString(race.registration_deadline), 'MMM d, yyyy')}
                      </div>
                    </div>
                  )}
                  {race.payment_deadline && (
                    <div className="p-2 bg-red-50 rounded">
                      <div className="text-xs font-medium text-red-800">Payment Deadline</div>
                      <div className="text-sm text-red-900">
                        {format(parseDateString(race.payment_deadline), 'MMM d, yyyy')}
                      </div>
                      {race.estimated_cost && (
                        <div className="text-xs text-red-700">
                          Est. Cost: ${race.estimated_cost}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Visibility Toggle */}
                <div className="mt-4 flex items-center gap-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={race.is_visible_to_members}
                      onChange={() => toggleRaceVisibility(race.id, true, !race.is_visible_to_members)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">Visible to team members</span>
                  </label>
                </div>

                {race.external_link && (
                  <a
                    href={race.external_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-2 text-sm text-primary-600 hover:underline"
                  >
                    Race Website &rarr;
                  </a>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Confirmed Races List */}
      {activeTab === 'confirmed' && (
        <div className="space-y-4">
          {confirmedRaces.length === 0 ? (
            <div className="card text-center py-8">
              <p className="text-gray-500">No confirmed races yet</p>
              {isCoachOrAdmin && (
                <button
                  onClick={() => setShowConfirmedForm(true)}
                  className="btn-primary mt-4"
                >
                  Add First Confirmed Race
                </button>
              )}
            </div>
          ) : (
            confirmedRaces.map(race => {
              const userParticipant = race.participants?.find(p => p.user_id === user?.id)

              return (
                <div key={race.id} className="card">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{race.name}</h3>
                      <p className="text-sm text-gray-600">{race.location}</p>
                      {race.venue_address && (
                        <p className="text-xs text-gray-500">{race.venue_address}</p>
                      )}
                      <p className="text-sm text-gray-500 mt-1">
                        Race Date: {format(parseDateString(race.race_date), 'MMMM d, yyyy')}
                        {race.race_start_time && ` at ${race.race_start_time}`}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {!userParticipant ? (
                        <button
                          onClick={() => joinRace(race.id, user.id)}
                          className="btn-primary text-sm"
                        >
                          I'm Interested
                        </button>
                      ) : (
                        <button
                          onClick={() => leaveRace(race.id, user.id)}
                          className="btn-secondary text-sm"
                        >
                          Leave Race
                        </button>
                      )}
                      {isCoachOrAdmin && (
                        <>
                          <button
                            onClick={() => handleStartEdit({
                              id: `confirmed-${race.id}`,
                              type: 'confirmed_race',
                              title: race.name,
                              data: race
                            })}
                            className="btn-secondary text-sm flex items-center gap-1"
                          >
                            <Icon name="manage" size={14} />
                            Edit
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm({
                              id: `confirmed-${race.id}`,
                              type: 'confirmed_race',
                              title: race.name,
                              data: race
                            })}
                            className="btn bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 text-sm"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Important Dates */}
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
                    {race.captains_meeting_date && (
                      <div className="p-2 bg-purple-50 rounded">
                        <div className="text-xs font-medium text-purple-800">Captain's Meeting</div>
                        <div className="text-sm text-purple-900">
                          {format(new Date(race.captains_meeting_date), 'MMM d, yyyy h:mm a')}
                        </div>
                      </div>
                    )}
                    {race.team_briefing_date && (
                      <div className="p-2 bg-indigo-50 rounded">
                        <div className="text-xs font-medium text-indigo-800">Team Briefing</div>
                        <div className="text-sm text-indigo-900">
                          {format(new Date(race.team_briefing_date), 'MMM d, yyyy h:mm a')}
                        </div>
                      </div>
                    )}
                    {race.lineup_submission_deadline && (
                      <div className="p-2 bg-yellow-50 rounded">
                        <div className="text-xs font-medium text-yellow-800">Lineup Submission</div>
                        <div className="text-sm text-yellow-900">
                          {format(new Date(race.lineup_submission_deadline), 'MMM d, yyyy h:mm a')}
                        </div>
                      </div>
                    )}
                    {race.payment_due_date && (
                      <div className="p-2 bg-red-50 rounded">
                        <div className="text-xs font-medium text-red-800">Payment Due</div>
                        <div className="text-sm text-red-900">
                          {format(parseDateString(race.payment_due_date), 'MMM d, yyyy')}
                        </div>
                        {race.per_person_cost && (
                          <div className="text-xs text-red-700">
                            ${race.per_person_cost}/person
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Participants */}
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">
                      Participants ({race.participants?.length || 0})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {race.participants?.slice(0, 10).map(p => (
                        <span
                          key={p.id}
                          className={`text-xs px-2 py-1 rounded ${
                            p.status === 'confirmed'
                              ? 'bg-green-100 text-green-800'
                              : p.status === 'paid'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {p.user_profile?.full_name || 'Unknown'}
                        </span>
                      ))}
                      {(race.participants?.length || 0) > 10 && (
                        <span className="text-xs text-gray-500">
                          +{race.participants.length - 10} more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Visibility Toggle (Admin only) */}
                  {isCoachOrAdmin && (
                    <div className="mt-4 flex items-center gap-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={race.is_visible_to_members}
                          onChange={() => toggleRaceVisibility(race.id, false, !race.is_visible_to_members)}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-700">Visible to team members</span>
                      </label>
                    </div>
                  )}

                  {race.external_link && (
                    <a
                      href={race.external_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-2 text-sm text-primary-600 hover:underline"
                    >
                      Race Website &rarr;
                    </a>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Upcoming Deadlines */}
      {activeTab === 'deadlines' && (
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Upcoming Deadlines</h2>
          {upcomingDeadlines.length === 0 ? (
            <p className="text-gray-500">No upcoming deadlines</p>
          ) : (
            <div className="space-y-3">
              {upcomingDeadlines.map((deadline, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 bg-red-50 rounded border border-red-100">
                  <div>
                    <div className="font-medium text-red-900">{deadline.type}</div>
                    <div className="text-sm text-red-800">{deadline.raceName}</div>
                  </div>
                  <div className="text-sm text-red-700">
                    {format(deadline.date, 'MMM d, yyyy')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Prospective Race Modal */}
      {showProspectiveForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Add Prospective Race</h2>
                <button
                  onClick={() => setShowProspectiveForm(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleCreateProspective} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Race Name *</label>
                    <input
                      type="text"
                      value={prospectiveForm.name}
                      onChange={(e) => setProspectiveForm({ ...prospectiveForm, name: e.target.value })}
                      className="input mt-1"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Race Date *</label>
                    <input
                      type="date"
                      value={prospectiveForm.race_date}
                      onChange={(e) => setProspectiveForm({ ...prospectiveForm, race_date: e.target.value })}
                      className="input mt-1"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Location</label>
                  <input
                    type="text"
                    value={prospectiveForm.location}
                    onChange={(e) => setProspectiveForm({ ...prospectiveForm, location: e.target.value })}
                    className="input mt-1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={prospectiveForm.description}
                    onChange={(e) => setProspectiveForm({ ...prospectiveForm, description: e.target.value })}
                    className="input mt-1"
                    rows={3}
                  />
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-medium text-gray-900 mb-3">Deadlines</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Early Bird Deadline</label>
                      <input
                        type="date"
                        value={prospectiveForm.early_bird_deadline}
                        onChange={(e) => setProspectiveForm({ ...prospectiveForm, early_bird_deadline: e.target.value })}
                        className="input mt-1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Registration Deadline</label>
                      <input
                        type="date"
                        value={prospectiveForm.registration_deadline}
                        onChange={(e) => setProspectiveForm({ ...prospectiveForm, registration_deadline: e.target.value })}
                        className="input mt-1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Payment Deadline</label>
                      <input
                        type="date"
                        value={prospectiveForm.payment_deadline}
                        onChange={(e) => setProspectiveForm({ ...prospectiveForm, payment_deadline: e.target.value })}
                        className="input mt-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-medium text-gray-900 mb-3">Costs</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Estimated Cost ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={prospectiveForm.estimated_cost}
                        onChange={(e) => setProspectiveForm({ ...prospectiveForm, estimated_cost: e.target.value })}
                        className="input mt-1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Early Bird Cost ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={prospectiveForm.early_bird_cost}
                        onChange={(e) => setProspectiveForm({ ...prospectiveForm, early_bird_cost: e.target.value })}
                        className="input mt-1"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Race Website URL</label>
                  <input
                    type="url"
                    value={prospectiveForm.external_link}
                    onChange={(e) => setProspectiveForm({ ...prospectiveForm, external_link: e.target.value })}
                    className="input mt-1"
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    value={prospectiveForm.notes}
                    onChange={(e) => setProspectiveForm({ ...prospectiveForm, notes: e.target.value })}
                    className="input mt-1"
                    rows={2}
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={prospectiveForm.is_visible_to_members}
                      onChange={(e) => setProspectiveForm({ ...prospectiveForm, is_visible_to_members: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">Make visible to team members</span>
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowProspectiveForm(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Add Prospective Race
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Create Confirmed Race Modal */}
      {showConfirmedForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Add Confirmed Race</h2>
                <button
                  onClick={() => setShowConfirmedForm(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleCreateConfirmed} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Race Name *</label>
                    <input
                      type="text"
                      value={confirmedForm.name}
                      onChange={(e) => setConfirmedForm({ ...confirmedForm, name: e.target.value })}
                      className="input mt-1"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Race Date *</label>
                    <input
                      type="date"
                      value={confirmedForm.race_date}
                      onChange={(e) => setConfirmedForm({ ...confirmedForm, race_date: e.target.value })}
                      className="input mt-1"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Start Time</label>
                    <input
                      type="time"
                      value={confirmedForm.race_start_time}
                      onChange={(e) => setConfirmedForm({ ...confirmedForm, race_start_time: e.target.value })}
                      className="input mt-1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">End Time</label>
                    <input
                      type="time"
                      value={confirmedForm.race_end_time}
                      onChange={(e) => setConfirmedForm({ ...confirmedForm, race_end_time: e.target.value })}
                      className="input mt-1"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Location</label>
                  <input
                    type="text"
                    value={confirmedForm.location}
                    onChange={(e) => setConfirmedForm({ ...confirmedForm, location: e.target.value })}
                    className="input mt-1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Venue Address</label>
                  <textarea
                    value={confirmedForm.venue_address}
                    onChange={(e) => setConfirmedForm({ ...confirmedForm, venue_address: e.target.value })}
                    className="input mt-1"
                    rows={2}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={confirmedForm.description}
                    onChange={(e) => setConfirmedForm({ ...confirmedForm, description: e.target.value })}
                    className="input mt-1"
                    rows={3}
                  />
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-medium text-gray-900 mb-3">Important Dates</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Captain's Meeting</label>
                      <input
                        type="datetime-local"
                        value={confirmedForm.captains_meeting_date}
                        onChange={(e) => setConfirmedForm({ ...confirmedForm, captains_meeting_date: e.target.value })}
                        className="input mt-1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Team Briefing</label>
                      <input
                        type="datetime-local"
                        value={confirmedForm.team_briefing_date}
                        onChange={(e) => setConfirmedForm({ ...confirmedForm, team_briefing_date: e.target.value })}
                        className="input mt-1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Lineup Submission Deadline</label>
                      <input
                        type="datetime-local"
                        value={confirmedForm.lineup_submission_deadline}
                        onChange={(e) => setConfirmedForm({ ...confirmedForm, lineup_submission_deadline: e.target.value })}
                        className="input mt-1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Payment Due Date</label>
                      <input
                        type="date"
                        value={confirmedForm.payment_due_date}
                        onChange={(e) => setConfirmedForm({ ...confirmedForm, payment_due_date: e.target.value })}
                        className="input mt-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-medium text-gray-900 mb-3">Costs</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Total Cost ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={confirmedForm.total_cost}
                        onChange={(e) => setConfirmedForm({ ...confirmedForm, total_cost: e.target.value })}
                        className="input mt-1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Per Person Cost ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={confirmedForm.per_person_cost}
                        onChange={(e) => setConfirmedForm({ ...confirmedForm, per_person_cost: e.target.value })}
                        className="input mt-1"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Race Website URL</label>
                  <input
                    type="url"
                    value={confirmedForm.external_link}
                    onChange={(e) => setConfirmedForm({ ...confirmedForm, external_link: e.target.value })}
                    className="input mt-1"
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    value={confirmedForm.notes}
                    onChange={(e) => setConfirmedForm({ ...confirmedForm, notes: e.target.value })}
                    className="input mt-1"
                    rows={2}
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={confirmedForm.is_visible_to_members}
                      onChange={(e) => setConfirmedForm({ ...confirmedForm, is_visible_to_members: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">Make visible to team members</span>
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowConfirmedForm(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Create Confirmed Race
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Convert to Confirmed Modal */}
      {showConvertModal && selectedRace && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Convert to Confirmed Race</h2>
                <button
                  onClick={() => {
                    setShowConvertModal(false)
                    setSelectedRace(null)
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  &times;
                </button>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                Converting <strong>{selectedRace.name}</strong> to a confirmed race.
                Add additional details below (optional).
              </p>

              <form onSubmit={handleConvertRace} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Race Start Time</label>
                  <input
                    type="time"
                    value={convertFormData.race_start_time}
                    onChange={(e) => setConvertFormData({ ...convertFormData, race_start_time: e.target.value })}
                    className="input mt-1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Venue Address</label>
                  <textarea
                    value={convertFormData.venue_address}
                    onChange={(e) => setConvertFormData({ ...convertFormData, venue_address: e.target.value })}
                    className="input mt-1"
                    rows={2}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Captain's Meeting</label>
                  <input
                    type="datetime-local"
                    value={convertFormData.captains_meeting_date}
                    onChange={(e) => setConvertFormData({ ...convertFormData, captains_meeting_date: e.target.value })}
                    className="input mt-1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Team Briefing</label>
                  <input
                    type="datetime-local"
                    value={convertFormData.team_briefing_date}
                    onChange={(e) => setConvertFormData({ ...convertFormData, team_briefing_date: e.target.value })}
                    className="input mt-1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Lineup Submission Deadline</label>
                  <input
                    type="datetime-local"
                    value={convertFormData.lineup_submission_deadline}
                    onChange={(e) => setConvertFormData({ ...convertFormData, lineup_submission_deadline: e.target.value })}
                    className="input mt-1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Payment Due Date</label>
                  <input
                    type="date"
                    value={convertFormData.payment_due_date}
                    onChange={(e) => setConvertFormData({ ...convertFormData, payment_due_date: e.target.value })}
                    className="input mt-1"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowConvertModal(false)
                      setSelectedRace(null)
                    }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Confirm Race
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <Icon name="close" size={24} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Delete Event</h3>
                <p className="text-sm text-gray-600">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-gray-700 mb-6">
              Are you sure you want to delete <strong>"{showDeleteConfirm.title}"</strong>?
              {showDeleteConfirm.type === 'confirmed_race' && showDeleteConfirm.data?.participants?.length > 0 && (
                <span className="block mt-2 text-red-600 text-sm">
                  Warning: This race has {showDeleteConfirm.data.participants.length} registered participants.
                </span>
              )}
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteEvent(showDeleteConfirm)}
                className="btn bg-red-600 text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Event Modal */}
      {showQuickAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Quick Add Event</h2>
                <button
                  onClick={() => {
                    setShowQuickAddModal(false)
                    resetQuickAddForm()
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <Icon name="close" size={20} className="text-gray-500" />
                </button>
              </div>

              {/* Event Type Selector */}
              <div className="mb-6">
                <label className="label">Event Type</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setQuickAddType('practice')}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      quickAddType === 'practice'
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Icon name="practice" size={24} className={quickAddType === 'practice' ? 'text-primary-600' : 'text-gray-500'} />
                    <div className="text-sm font-medium mt-1">Practice</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickAddType('workout')}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      quickAddType === 'workout'
                        ? 'border-success-500 bg-success-50 text-success-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Icon name="workouts" size={24} className={quickAddType === 'workout' ? 'text-success-600' : 'text-gray-500'} />
                    <div className="text-sm font-medium mt-1">Workout</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickAddType('race')}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      quickAddType === 'race'
                        ? 'border-accent-500 bg-accent-50 text-accent-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Icon name="trophy" size={24} className={quickAddType === 'race' ? 'text-accent-600' : 'text-gray-500'} />
                    <div className="text-sm font-medium mt-1">Race</div>
                  </button>
                </div>
              </div>

              {quickAddType === 'race' && (
                <div className="mb-4">
                  <label className="label">Race Status</label>
                  <div className="inline-flex rounded-full border border-accent-200 bg-accent-50 p-1 text-sm">
                    <button
                      type="button"
                      onClick={() => setQuickAddRaceStatus('prospective')}
                      className={`px-3 py-1 rounded-full transition ${quickAddRaceStatus === 'prospective' ? 'bg-orange-500 text-white shadow-sm' : 'text-orange-700 hover:bg-orange-100'}`}
                    >
                      Prospective
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickAddRaceStatus('confirmed')}
                      className={`px-3 py-1 rounded-full transition ${quickAddRaceStatus === 'confirmed' ? 'bg-accent-600 text-white shadow-sm' : 'text-accent-700 hover:bg-accent-100'}`}
                    >
                      Confirmed
                    </button>
                  </div>
                </div>
              )}

              <form onSubmit={handleQuickAdd} className="space-y-4">
                <div>
                  <label className="label">
                    {quickAddType === 'practice' ? 'Practice Title' : quickAddType === 'workout' ? 'Workout Title' : 'Race Name'} *
                  </label>
                  <input
                    type="text"
                    value={quickAddForm.title}
                    onChange={(e) => setQuickAddForm({ ...quickAddForm, title: e.target.value })}
                    className="input"
                    placeholder={
                      quickAddType === 'practice'
                        ? 'e.g., Morning Practice'
                        : quickAddType === 'workout'
                        ? 'e.g., Core Strength Workout'
                        : quickAddRaceStatus === 'prospective'
                        ? 'e.g., Summer Festival (prospective)'
                        : 'e.g., Dragon Boat Festival'
                    }
                    required
                  />
                </div>

                <div>
                  <label className="label">Date *</label>
                  <input
                    type="date"
                    value={quickAddForm.date}
                    onChange={(e) => setQuickAddForm({ ...quickAddForm, date: e.target.value })}
                    className="input"
                    required
                  />
                </div>

                {quickAddType !== 'workout' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Start Time {quickAddType === 'practice' && '*'}</label>
                      <input
                        type="time"
                        value={quickAddForm.start_time}
                        onChange={(e) => setQuickAddForm({ ...quickAddForm, start_time: e.target.value })}
                        className="input"
                        required={quickAddType === 'practice'}
                      />
                    </div>
                    <div>
                      <label className="label">End Time</label>
                      <input
                        type="time"
                        value={quickAddForm.end_time}
                        onChange={(e) => setQuickAddForm({ ...quickAddForm, end_time: e.target.value })}
                        className="input"
                      />
                    </div>
                  </div>
                )}

                {quickAddType === 'workout' && (
                  <>
                    <div>
                      <label className="label">Workout Type</label>
                      <select
                        value={quickAddForm.workout_type}
                        onChange={(e) => setQuickAddForm({ ...quickAddForm, workout_type: e.target.value })}
                        className="input"
                      >
                        <option value="strength">Strength</option>
                        <option value="cardio">Cardio</option>
                        <option value="flexibility">Flexibility</option>
                        <option value="technique">Technique</option>
                        <option value="recovery">Recovery</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">Duration (minutes)</label>
                      <input
                        type="number"
                        value={quickAddForm.duration}
                        onChange={(e) => setQuickAddForm({ ...quickAddForm, duration: parseInt(e.target.value) || 0 })}
                        className="input"
                        min="5"
                        step="5"
                      />
                    </div>
                  </>
                )}

                {(quickAddType === 'practice' || quickAddType === 'race') && (
                  <div>
                    <label className="label">Location</label>
                    <input
                      type="text"
                      value={quickAddForm.location}
                      onChange={(e) => setQuickAddForm({ ...quickAddForm, location: e.target.value })}
                      className="input"
                      placeholder="e.g., Lake Park"
                    />
                  </div>
                )}

                <div>
                  <label className="label">Description</label>
                  <textarea
                    value={quickAddForm.description}
                    onChange={(e) => setQuickAddForm({ ...quickAddForm, description: e.target.value })}
                    className="input"
                    rows={3}
                    placeholder="Add any additional details..."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowQuickAddModal(false)
                      resetQuickAddForm()
                    }}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`btn ${
                      quickAddType === 'practice'
                        ? 'btn-primary'
                        : quickAddType === 'workout'
                        ? 'btn-success'
                        : quickAddRaceStatus === 'prospective'
                        ? 'bg-orange-600 text-white hover:bg-orange-700'
                        : 'btn-accent'
                    }`}
                  >
                    Create {quickAddType === 'practice' ? 'Practice' : quickAddType === 'workout' ? 'Workout' : quickAddRaceStatus === 'prospective' ? 'Prospective Race' : 'Confirmed Race'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
