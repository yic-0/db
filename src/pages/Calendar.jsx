import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useCalendarStore } from '../store/calendarStore'
import { usePracticeStore } from '../store/practiceStore'
import { useEventStore } from '../store/eventStore'
import { useDeadlineStore } from '../store/deadlineStore'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, isToday, parseISO, isPast, isFuture } from 'date-fns'
import { formatTime12Hour } from '../utils/timeFormatter'
import Icon from '../components/Icon'
import toast from 'react-hot-toast'
import { Linkify } from '../utils/linkify'

export default function Calendar() {
  const navigate = useNavigate()
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
    deleteProspectiveRace,
    deleteConfirmedRace,
    updateCalendarSettings,
    toggleRaceVisibility,
    getUpcomingDeadlines
  } = useCalendarStore()

  const { practices, fetchPractices, createPractice, updatePractice, deletePractice, togglePracticeVisibility } = usePracticeStore()
  const { events, fetchEvents, createEvent, updateEvent, deleteEvent, toggleEventVisibility } = useEventStore()
  const { deadlines, fetchDeadlines } = useDeadlineStore()

  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [activeTab, setActiveTab] = useState('calendar')
  const [showQuickAddModal, setShowQuickAddModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState(null)
  const [quickAddType, setQuickAddType] = useState('practice')
  const [quickAddRaceStatus, setQuickAddRaceStatus] = useState('prospective')
  const [editingEvent, setEditingEvent] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)
  const [eventListFilter, setEventListFilter] = useState('all')
  const [eventTypeFilter, setEventTypeFilter] = useState('all')

  // Mobile View Toggle
  const [viewMode, setViewMode] = useState('grid')

  // Bottom sheet state for selected date (mobile)
  const [sheetHeight, setSheetHeight] = useState(0)
  const [isDraggingSheet, setIsDraggingSheet] = useState(false)
  const sheetRef = useRef(null)
  const sheetDragStartY = useRef(0)
  const sheetDragStartHeight = useRef(0)

  // Swipe navigation state
  const calendarRef = useRef(null)
  const swipeStartX = useRef(0)
  const swipeStartY = useRef(0)
  const isSwiping = useRef(false)

  // Sheet snap points
  const SHEET_MIN = 0
  const SHEET_MID = typeof window !== 'undefined' ? Math.min(400, window.innerHeight * 0.5) : 400
  const SHEET_MAX = typeof window !== 'undefined' ? window.innerHeight * 0.85 : 600

  // Handle sheet drag
  const handleSheetTouchStart = useCallback((e) => {
    setIsDraggingSheet(true)
    sheetDragStartY.current = e.touches[0].clientY
    sheetDragStartHeight.current = sheetHeight
  }, [sheetHeight])

  const handleSheetTouchMove = useCallback((e) => {
    if (!isDraggingSheet) return
    const deltaY = sheetDragStartY.current - e.touches[0].clientY
    const newHeight = Math.max(SHEET_MIN, Math.min(SHEET_MAX, sheetDragStartHeight.current + deltaY))
    setSheetHeight(newHeight)
  }, [isDraggingSheet])

  const handleSheetTouchEnd = useCallback(() => {
    if (!isDraggingSheet) return
    setIsDraggingSheet(false)

    // Snap to nearest point or close
    if (sheetHeight < 100) {
      setSelectedDate(null)
      setSheetHeight(0)
    } else {
      const snapPoints = [SHEET_MID, SHEET_MAX]
      const closest = snapPoints.reduce((prev, curr) =>
        Math.abs(curr - sheetHeight) < Math.abs(prev - sheetHeight) ? curr : prev
      )
      setSheetHeight(closest)
    }
  }, [isDraggingSheet, sheetHeight])

  // Open sheet when date selected
  useEffect(() => {
    if (selectedDate && window.innerWidth < 1024) {
      setSheetHeight(SHEET_MID)
    }
  }, [selectedDate])

  // Swipe navigation handlers
  const handleCalendarTouchStart = useCallback((e) => {
    if (e.target.closest('.sheet-content')) return
    swipeStartX.current = e.touches[0].clientX
    swipeStartY.current = e.touches[0].clientY
    isSwiping.current = false
  }, [])

  const handleCalendarTouchMove = useCallback((e) => {
    if (e.target.closest('.sheet-content')) return
    const deltaX = e.touches[0].clientX - swipeStartX.current
    const deltaY = Math.abs(e.touches[0].clientY - swipeStartY.current)

    // Only trigger horizontal swipe if horizontal movement > vertical
    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > deltaY) {
      isSwiping.current = true
    }
  }, [])

  const handleCalendarTouchEnd = useCallback((e) => {
    if (!isSwiping.current) return
    const deltaX = e.changedTouches[0].clientX - swipeStartX.current

    if (deltaX > 80) {
      // Swipe right - previous month
      setCurrentMonth(prev => subMonths(prev, 1))
    } else if (deltaX < -80) {
      // Swipe left - next month
      setCurrentMonth(prev => addMonths(prev, 1))
    }
    isSwiping.current = false
  }, [])

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
    duration: 30,
    is_visible_to_members: false // Default to hidden as requested
  })

  const isCoachOrAdmin = hasRole('admin') || hasRole('coach')

  useEffect(() => {
    fetchProspectiveRaces()
    fetchConfirmedRaces()
    fetchPractices()
    fetchEvents()
    fetchDeadlines()
    if (user) {
      fetchCalendarSettings(user.id)
    }
  }, [user?.id])

  // Helper to parse date strings correctly (handles timezone issues)
  const parseDateString = (dateStr) => {
    if (!dateStr) return new Date()
    if (typeof dateStr === 'string' && dateStr.length === 10) {
      return parseISO(dateStr)
    }
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
    const dayEvents = []
    const dayStr = format(day, 'yyyy-MM-dd')

    // Add practices
    if (calendarSettings?.show_practices) {
      practices.forEach(practice => {
        const practiceDateStr = practice.date?.substring(0, 10)
        if (practiceDateStr === dayStr) {
          if (isCoachOrAdmin || practice.is_visible_to_members) {
            dayEvents.push({
              id: `practice-${practice.id}`,
              title: practice.title || 'Practice',
              type: 'practice',
              color: 'bg-blue-500',
              badgeClass: 'bg-blue-100 text-blue-700 border-blue-200',
              dotClass: 'bg-blue-500',
              data: practice
            })
          }
        }
      })
    }

    // Add prospective races
    if (calendarSettings?.show_prospective_races) {
      prospectiveRaces.forEach(race => {
        const raceDateStr = race.race_date?.substring(0, 10)
        if (raceDateStr === dayStr && race.status === 'prospective') {
          dayEvents.push({
            id: `prospective-${race.id}`,
            title: race.name,
            type: 'prospective_race',
            color: 'bg-orange-500',
            badgeClass: 'bg-orange-100 text-orange-700 border-orange-200',
            dotClass: 'bg-orange-500',
            data: race
          })
        }
      })
    }

    // Add confirmed races
    if (calendarSettings?.show_confirmed_races) {
      confirmedRaces.forEach(race => {
        const raceDateStr = race.race_date?.substring(0, 10)
        if (raceDateStr === dayStr) {
          dayEvents.push({
            id: `confirmed-${race.id}`,
            title: race.name,
            type: 'confirmed_race',
            color: 'bg-green-500',
            badgeClass: 'bg-green-100 text-green-700 border-green-200',
            dotClass: 'bg-green-500',
            data: race
          })
        }
      })
    }

    // Add workouts
    if (calendarSettings?.show_workouts) {
      events.forEach(event => {
        const eventDateStr = event.event_date?.substring(0, 10)
        if (eventDateStr === dayStr && event.event_type === 'workout') {
          if (isCoachOrAdmin || event.is_visible_to_members) {
            dayEvents.push({
              id: `workout-${event.id}`,
              title: event.title,
              type: 'workout',
              color: 'bg-amber-500',
              badgeClass: 'bg-amber-100 text-amber-700 border-amber-200',
              dotClass: 'bg-amber-500',
              data: event
            })
          }
        }
      })
    }

    // Add team events
    if (calendarSettings?.show_team_events) {
      events.forEach(event => {
        const eventDateStr = event.event_date?.substring(0, 10)
        if (eventDateStr === dayStr && event.event_type !== 'workout' && event.event_type !== 'race') {
          if (isCoachOrAdmin || event.is_visible_to_members) {
            dayEvents.push({
              id: `event-${event.id}`,
              title: event.title,
              type: 'team_event',
              color: 'bg-purple-500',
              badgeClass: 'bg-purple-100 text-purple-700 border-purple-200',
              dotClass: 'bg-purple-500',
              data: event
            })
          }
        }
      })
    }

    // Add deadlines
    if (calendarSettings?.show_deadlines) {
      prospectiveRaces.forEach(race => {
        if (race.status === 'prospective') {
          const checkDeadline = (date, label) => {
             if (date?.substring(0, 10) === dayStr) {
                dayEvents.push({
                  id: `deadline-${label}-${race.id}`,
                  title: `${label}: ${race.name}`,
                  type: 'deadline',
                  color: 'bg-red-500',
                  badgeClass: 'bg-red-100 text-red-700 border-red-200',
                  dotClass: 'bg-red-500',
                  data: { type: label, race }
                })
             }
          }
          checkDeadline(race.early_bird_deadline, 'Early Bird')
          checkDeadline(race.registration_deadline, 'Registration')
          checkDeadline(race.payment_deadline, 'Payment')
        }
      })

      confirmedRaces.forEach(race => {
         const checkDeadline = (date, label) => {
             if (date?.substring(0, 10) === dayStr) {
                dayEvents.push({
                  id: `deadline-${label}-${race.id}`,
                  title: `${label}: ${race.name}`,
                  type: 'deadline',
                  color: 'bg-red-500',
                  badgeClass: 'bg-red-100 text-red-700 border-red-200',
                  dotClass: 'bg-red-500',
                  data: { type: label, race }
                })
             }
          }
          checkDeadline(race.lineup_submission_deadline, 'Lineup Due')
          checkDeadline(race.payment_due_date, 'Payment Due')
      })

      // Add modular deadlines from deadlines table
      deadlines.forEach(deadline => {
        const deadlineDateStr = deadline.deadline_date?.substring(0, 10)
        if (deadlineDateStr === dayStr) {
          // Check visibility - only show if visible to members OR user is admin/coach
          if (isCoachOrAdmin || deadline.is_visible_to_members) {
            dayEvents.push({
              id: `modular-deadline-${deadline.id}`,
              title: deadline.title,
              type: 'deadline',
              color: 'bg-red-500',
              badgeClass: 'bg-red-100 text-red-700 border-red-200',
              dotClass: 'bg-red-500',
              data: {
                type: deadline.deadline_type || 'custom',
                deadline: deadline,
                // If deadline is associated with an event, include it for navigation
                eventId: deadline.event_id
              }
            })
          }
        }
      })
    }

    return dayEvents
  }

  // Get all events for the current month for List View
  const currentMonthEvents = useMemo(() => {
    const daysInMonth = eachDayOfInterval({
      start: startOfMonth(currentMonth),
      end: endOfMonth(currentMonth)
    })
    
    const monthEvents = []
    daysInMonth.forEach(day => {
      const events = getEventsForDay(day)
      if (events.length > 0) {
        monthEvents.push({
          date: day,
          events: events
        })
      }
    })
    return monthEvents
  }, [currentMonth, practices, prospectiveRaces, confirmedRaces, events, deadlines, calendarSettings])

  const handleToggleSetting = async (setting) => {
    if (!calendarSettings) return
    await updateCalendarSettings({
      ...calendarSettings,
      [setting]: !calendarSettings[setting]
    })
  }

  // ... [Keep existing handleQuickAdd, resetQuickAddForm, openQuickAddModal handlers] ...
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
        practice_type: 'water',
        location_name: quickAddForm.location || 'TBD',
        location_address: null,
        description: quickAddForm.description || null,
        max_capacity: 22,
        created_by: user.id,
        is_visible_to_members: quickAddForm.is_visible_to_members
      })
    } else if (quickAddType === 'workout') {
      if (!quickAddForm.title) {
        toast.error('Workout title is required')
        return
      }
      result = await createEvent({
        title: quickAddForm.title,
        event_type: 'workout',
        event_date: quickAddForm.date,
        start_time: quickAddForm.start_time || null,
        end_time: quickAddForm.end_time || null,
        location: quickAddForm.location || null,
        description: quickAddForm.description || null,
        notes: quickAddForm.workout_type ? `Workout Type: ${quickAddForm.workout_type}` : null,
        created_by: user.id,
        is_visible_to_members: quickAddForm.is_visible_to_members
      })
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
    } else if (['social', 'hiking', 'training_camp', 'other'].includes(quickAddType)) {
      if (!quickAddForm.title) {
        toast.error('Event title is required')
        return
      }
      result = await createEvent({
        title: quickAddForm.title,
        event_type: quickAddType,
        event_date: quickAddForm.date,
        start_time: quickAddForm.start_time || null,
        end_time: quickAddForm.end_time || null,
        location: quickAddForm.location || null,
        description: quickAddForm.description || null,
        status: 'planning',
        created_by: user.id,
        is_visible_to_members: quickAddForm.is_visible_to_members
      })
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
      duration: 30,
      is_visible_to_members: false
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

  // ... [Keep existing handleStartEdit, handleSaveEdit, handleCancelEdit, handleDeleteEvent, handleToggleVisibility] ...
  const handleStartEdit = (event) => {
    setEditingEvent(event)
    const data = event.data || {}

    if (event.type === 'practice') {
      setEditForm({
        title: data.title || '',
        date: data.date || '',
        start_time: data.start_time || '',
        end_time: data.end_time || '',
        location: data.location_name || '',
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
    } else if (event.type === 'team_event' || event.type === 'workout') {
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
        location_name: editForm.location || null,
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
    } else if (eventType === 'team_event' || eventType === 'workout') {
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
    if (!event?.data?.id) return

    const eventType = event.type
    const eventId = event.data.id
    let result = { success: false }

    if (eventType === 'practice') result = await deletePractice(eventId)
    else if (eventType === 'prospective_race') result = await deleteProspectiveRace(eventId)
    else if (eventType === 'confirmed_race') result = await deleteConfirmedRace(eventId)
    else if (eventType === 'team_event' || eventType === 'workout') result = await deleteEvent(eventId)

    if (result.success) {
      setShowDeleteConfirm(null)
      setSelectedDate(null)
      fetchPractices()
      fetchProspectiveRaces()
      fetchConfirmedRaces()
      fetchEvents()
    }
  }

  const handleToggleVisibility = async (event) => {
    if (!event?.data?.id) return

    const eventType = event.type
    const eventId = event.data.id
    const currentVisibility = event.data.is_visible_to_members || false
    const newVisibility = !currentVisibility

    let result = { success: false }

    if (eventType === 'practice') result = await togglePracticeVisibility(eventId, newVisibility)
    else if (eventType === 'prospective_race' || eventType === 'confirmed_race') {
      result = await toggleRaceVisibility(eventId, newVisibility, eventType === 'prospective_race' ? 'prospective' : 'confirmed')
    } else if (eventType === 'team_event' || eventType === 'workout') {
      result = await toggleEventVisibility(eventId, newVisibility)
    }

    if (result.success) {
      fetchPractices()
      fetchProspectiveRaces()
      fetchConfirmedRaces()
      fetchEvents()
    }
  }

  // Get all events list for 'All Events' tab
  const getAllEventsList = useMemo(() => {
    // ... [Same logic as before, just condensed for brevity in this replacement]
    const allEvents = []
    
    // Helper to add events
    const addToList = (items, type, subtype, color, badge, dataFn = d => d) => {
      items.forEach(item => {
        if (isCoachOrAdmin || item.is_visible_to_members) {
          allEvents.push({
            id: `${type}-${item.id}`,
            title: item.title || item.name,
            date: item.date || item.race_date || item.event_date,
            type, subtype, color,
            badgeClass: badge,
            data: dataFn(item)
          })
        }
      })
    }

    addToList(practices, 'practice', 'practice', 'bg-blue-500', 'badge-primary')
    addToList(prospectiveRaces.filter(r => r.status === 'prospective'), 'prospective_race', 'race', 'bg-orange-500', 'badge-warning')
    addToList(confirmedRaces, 'confirmed_race', 'race', 'bg-green-500', 'badge-success')
    addToList(events.filter(e => e.event_type === 'workout'), 'workout', 'workout', 'bg-amber-500', 'badge-warning')
    addToList(events.filter(e => !['workout', 'race'].includes(e.event_type)), 'team_event', 'event', 'bg-purple-500', 'badge-neutral')

    return allEvents.sort((a, b) => parseDateString(a.date) - parseDateString(b.date)).filter(event => {
       const eventDate = parseDateString(event.date)
       if (eventListFilter === 'upcoming' && isPast(eventDate) && !isToday(eventDate)) return false
       if (eventListFilter === 'past' && (isFuture(eventDate) || isToday(eventDate))) return false
       if (eventTypeFilter !== 'all' && event.subtype !== eventTypeFilter) return false
       return true
    })
  }, [practices, prospectiveRaces, confirmedRaces, events, eventListFilter, eventTypeFilter, isCoachOrAdmin])

  const getAdvancedEditUrl = (event) => {
    if (!event?.data?.id) return null
    if (event.type === 'practice') return `/practices?edit=${event.data.id}`
    if (event.type === 'team_event') return `/events/${event.data.id}?edit=true`
    if (event.type.includes('race')) return `/race?edit=${event.data.id}`
    return null
  }

  const handleViewDetails = (event) => {
    // Handle deadlines - navigate to associated event page
    if (event.type === 'deadline') {
      // Check for modular deadline with event_id first
      if (event.data?.eventId) {
        navigate(`/events/${event.data.eventId}`)
        return
      }
      // Then check for race-based deadline
      const raceId = event.data?.race?.id
      if (raceId) {
        navigate(`/events/${raceId}`)
        return
      }
      // Standalone deadline - could show a toast or do nothing
      return
    }

    if (!event?.data?.id) return

    if (event.type === 'practice') {
      navigate('/practices')
    } else if (event.type === 'team_event') {
      navigate(`/events/${event.data.id}`)
    } else if (event.type.includes('race')) {
      navigate(`/events/${event.data.id}`)
    } else if (event.type === 'workout') {
      navigate('/workouts')
    }
  }

  const handleAdvancedEdit = (event) => {
    const url = getAdvancedEditUrl(event)
    if (url) {
      navigate(url)
    } else {
        toast.error("Advanced edit not available for this event type")
    }
  }

  // Close sheet helper
  const closeSheet = () => {
    setSelectedDate(null)
    setSheetHeight(0)
    setEditingEvent(null)
  }

  // Render event card (reusable for modal and sheet)
  const renderEventCard = (event, compact = false) => (
    <div key={event.id} className={`group relative p-3 lg:p-4 rounded-xl border transition-all ${
      editingEvent?.id === event.id ? 'bg-white border-primary-500 ring-1 ring-primary-500' : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
    }`}>
      {editingEvent?.id === event.id ? (
        /* Edit Mode */
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${event.dotClass}`} />
            Editing {event.type.replace(/_/g, ' ')}
          </h3>
          <div className="space-y-2">
            <input className="input text-sm py-1.5" value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} placeholder="Title" />
            <div className="grid grid-cols-2 gap-2">
              <input type="time" className="input text-sm py-1.5" value={editForm.start_time} onChange={e => setEditForm({...editForm, start_time: e.target.value})} />
              <input type="time" className="input text-sm py-1.5" value={editForm.end_time} onChange={e => setEditForm({...editForm, end_time: e.target.value})} />
            </div>
            <input className="input text-sm py-1.5" value={editForm.location} onChange={e => setEditForm({...editForm, location: e.target.value})} placeholder="Location" />
            {!compact && (
              <textarea className="input text-sm py-1.5" rows="2" value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} placeholder="Description" />
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={handleCancelEdit} className="btn btn-secondary text-xs py-1.5">Cancel</button>
            <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={handleSaveEdit} className="btn btn-primary text-xs py-1.5">Save</button>
          </div>
        </div>
      ) : (
        /* View Mode */
        <div>
          <div className="flex justify-between items-start gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                  event.type === 'practice' ? 'bg-blue-100 text-blue-700' :
                  event.type === 'confirmed_race' ? 'bg-green-100 text-green-700' :
                  event.type === 'prospective_race' ? 'bg-orange-100 text-orange-700' :
                  event.type === 'deadline' ? 'bg-red-100 text-red-700' :
                  event.type === 'workout' ? 'bg-amber-100 text-amber-700' :
                  'bg-purple-100 text-purple-700'
                }`}>
                  {event.type.replace(/_/g, ' ')}
                </span>
                {event.type === 'deadline' && <span className="text-xs">⚠️</span>}
              </div>
              <h3
                className={`font-bold text-slate-900 leading-tight mb-1 cursor-pointer hover:text-primary-600 transition-colors ${compact ? 'text-sm' : 'text-base'}`}
                onClick={() => handleViewDetails(event)}
              >
                {event.title}
              </h3>
              <div className={`text-slate-600 flex flex-wrap gap-x-3 gap-y-0.5 ${compact ? 'text-xs' : 'text-sm'}`}>
                {(event.data?.start_time || event.data?.race_start_time) && (
                  <span className="flex items-center gap-1">
                    <Icon name="clock" size={compact ? 12 : 14} className="text-slate-400" />
                    {formatTime12Hour(event.data.start_time || event.data.race_start_time)}
                    {(event.data.end_time || event.data.race_end_time) && ` - ${formatTime12Hour(event.data.end_time || event.data.race_end_time)}`}
                  </span>
                )}
                {(event.data?.location || event.data?.location_name) && (
                  <span className="flex items-center gap-1">
                    <Icon name="location" size={compact ? 12 : 14} className="text-slate-400" />
                    <span className="truncate max-w-[150px]">{event.data.location || event.data.location_name}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {!compact && event.data?.description && (
            <div className="text-sm text-slate-600 mt-2 pt-2 border-t border-slate-100">
              <Linkify text={event.data.description} />
            </div>
          )}

          <div className={`flex items-center justify-between ${compact ? 'mt-2 pt-2' : 'mt-3 pt-3'} border-t border-slate-100`}>
            <button
              onClick={() => handleViewDetails(event)}
              className="flex items-center gap-1 text-xs text-primary-600 font-medium hover:text-primary-700"
            >
              View Details <Icon name="arrowRight" size={14} />
            </button>

            {isCoachOrAdmin && event.type !== 'deadline' && (
              <div className="flex gap-0.5">
                <button
                  onClick={() => handleToggleVisibility(event)}
                  className={`p-1.5 rounded transition-colors ${event.data?.is_visible_to_members ? 'text-green-600 hover:bg-green-50' : 'text-slate-400 hover:bg-slate-100'}`}
                  title={event.data?.is_visible_to_members ? 'Visible' : 'Hidden'}
                >
                  <Icon name={event.data?.is_visible_to_members ? 'visibility' : 'visibility_off'} size={16} />
                </button>
                <button onClick={() => handleStartEdit(event)} className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                  <Icon name="edit" size={16} />
                </button>
                <button onClick={() => setShowDeleteConfirm(event)} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                  <Icon name="trash" size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div
      className="space-y-4 pb-24 lg:pb-0"
      ref={calendarRef}
      onTouchStart={handleCalendarTouchStart}
      onTouchMove={handleCalendarTouchMove}
      onTouchEnd={handleCalendarTouchEnd}
    >
      {/* Page Header - Simplified for mobile */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Calendar</h1>
        {/* Desktop quick add button */}
        {isCoachOrAdmin && (
          <button
            onClick={() => openQuickAddModal()}
            className="hidden lg:flex btn btn-primary items-center gap-2 shadow-lg shadow-primary-600/20"
          >
            <Icon name="plus" size={18} />
            Add Event
          </button>
        )}
      </div>

      {/* Tabs - Hidden on mobile, using bottom nav instead */}
      <div className="hidden lg:flex gap-1 p-1 bg-slate-100 rounded-xl w-fit mb-4">
        {['calendar', 'all-events'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === tab
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
            }`}
          >
            {tab === 'all-events' ? 'List View' : 'Calendar View'}
          </button>
        ))}
      </div>

      {/* Mobile Tab Pills */}
      <div className="lg:hidden flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-2">
        <button
          onClick={() => { setActiveTab('calendar'); setViewMode('grid') }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'calendar' && viewMode === 'grid'
              ? 'bg-primary-600 text-white shadow-md'
              : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          <Icon name="grid" size={14} /> Month
        </button>
        <button
          onClick={() => { setActiveTab('calendar'); setViewMode('list') }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'calendar' && viewMode === 'list'
              ? 'bg-primary-600 text-white shadow-md'
              : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          <Icon name="notes" size={14} /> Agenda
        </button>
        <button
          onClick={() => setActiveTab('all-events')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'all-events'
              ? 'bg-primary-600 text-white shadow-md'
              : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          <Icon name="calendar" size={14} /> All Events
        </button>
      </div>

      {activeTab === 'calendar' && (
        <>
          {/* Month Navigation - Compact on mobile */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Month Header */}
            <div className="flex items-center justify-between p-3 lg:p-4 border-b border-slate-100">
              <button
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-primary-600 transition-all"
              >
                <Icon name="arrowLeft" size={20} />
              </button>

              <div className="flex items-center gap-3">
                <h2 className="text-lg lg:text-xl font-bold text-slate-900">
                  {format(currentMonth, 'MMMM yyyy')}
                </h2>
                <button
                  onClick={() => setCurrentMonth(new Date())}
                  className="px-2 py-1 text-[10px] font-bold text-primary-600 bg-primary-50 rounded-md uppercase tracking-wider hover:bg-primary-100 transition-colors"
                >
                  Today
                </button>
              </div>

              <button
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-primary-600 transition-all"
              >
                <Icon name="arrowRight" size={20} />
              </button>
            </div>

            {/* Swipe hint for mobile */}
            <div className="lg:hidden text-center py-1 bg-slate-50 text-[10px] text-slate-400 font-medium">
              ← Swipe to change month →
            </div>

            {/* Filter Pills - Scrollable row */}
            {calendarSettings && (
              <div className="flex gap-2 overflow-x-auto p-3 bg-slate-50/50 no-scrollbar">
                {[
                  { key: 'show_practices', label: 'Practice', color: 'blue', short: 'Prac' },
                  { key: 'show_confirmed_races', label: 'Race', color: 'green', short: 'Race' },
                  { key: 'show_prospective_races', label: 'Prospective', color: 'orange', short: 'Pros' },
                  { key: 'show_workouts', label: 'Workout', color: 'amber', short: 'Work' },
                  { key: 'show_team_events', label: 'Event', color: 'purple', short: 'Event' },
                  { key: 'show_deadlines', label: 'Deadline', color: 'red', short: 'Dead' },
                ].map(filter => (
                  <button
                    key={filter.key}
                    onClick={() => handleToggleSetting(filter.key)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all whitespace-nowrap border ${
                      calendarSettings[filter.key]
                        ? `bg-${filter.color}-50 text-${filter.color}-700 border-${filter.color}-200`
                        : 'bg-white text-slate-400 border-slate-200'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${calendarSettings[filter.key] ? `bg-${filter.color}-500` : 'bg-slate-300'}`} />
                    <span className="lg:hidden">{filter.short}</span>
                    <span className="hidden lg:inline">{filter.label}</span>
                  </button>
                ))}
              </div>
            )}

          {/* Calendar Grid View (Desktop & Mobile Grid Mode) */}
          <div className={`overflow-hidden ${viewMode === 'list' ? 'hidden lg:block' : 'block'}`}>
            <div className="grid grid-cols-7 bg-slate-200 gap-px">
              {/* Day headers */}
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                <div key={i} className="bg-slate-100 py-2 text-center text-[10px] lg:text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <span className="lg:hidden">{day}</span>
                  <span className="hidden lg:inline">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i]}</span>
                </div>
              ))}

              {calendarDays.map((day, idx) => {
                const dayEvents = getEventsForDay(day)
                const isCurrentMonth = isSameMonth(day, currentMonth)
                const isCurrentDay = isToday(day)
                const isSelected = selectedDate && isSameDay(day, selectedDate)

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedDate(day)}
                    className={`
                      min-h-[70px] lg:min-h-[120px] bg-white p-1.5 lg:p-2 transition-all cursor-pointer flex flex-col relative
                      ${!isCurrentMonth ? 'bg-slate-50/70 opacity-50' : 'hover:bg-slate-50'}
                      ${isCurrentDay ? 'bg-primary-50/50 ring-1 ring-inset ring-primary-200' : ''}
                      ${isSelected ? 'bg-primary-100/50 ring-2 ring-inset ring-primary-400' : ''}
                    `}
                  >
                    {/* Day number */}
                    <div className="flex justify-between items-start mb-1">
                      <span className={`
                        text-xs lg:text-sm font-bold w-6 h-6 lg:w-7 lg:h-7 flex items-center justify-center rounded-full transition-all
                        ${isCurrentDay
                          ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/30 scale-110'
                          : isCurrentMonth ? 'text-slate-700' : 'text-slate-400'
                        }
                      `}>
                        {format(day, 'd')}
                      </span>
                    </div>

                    {/* Desktop: Event chips */}
                    <div className="flex-1 space-y-0.5 overflow-hidden hidden lg:block">
                      {dayEvents.slice(0, 3).map(event => (
                        <div
                          key={event.id}
                          className={`text-[10px] px-1.5 py-0.5 rounded truncate font-medium ${
                            event.type === 'practice' ? 'bg-blue-100 text-blue-700' :
                            event.type === 'confirmed_race' ? 'bg-green-100 text-green-700' :
                            event.type === 'prospective_race' ? 'bg-orange-100 text-orange-700' :
                            event.type === 'deadline' ? 'bg-red-100 text-red-700' :
                            event.type === 'workout' ? 'bg-amber-100 text-amber-700' :
                            'bg-purple-100 text-purple-700'
                          }`}
                          title={event.title}
                        >
                          {event.type === 'deadline' ? '⚠ ' : ''}{event.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-[10px] font-bold text-slate-400 pl-1">
                          +{dayEvents.length - 3}
                        </div>
                      )}
                    </div>

                    {/* Mobile: Mini event chips (show first 2) + count */}
                    <div className="lg:hidden flex flex-col gap-0.5 mt-auto">
                      {dayEvents.length > 0 && (
                        <>
                          {dayEvents.slice(0, 2).map(event => (
                            <div
                              key={event.id}
                              className={`text-[8px] px-1 py-0.5 rounded truncate font-semibold leading-tight ${
                                event.type === 'practice' ? 'bg-blue-100 text-blue-600' :
                                event.type === 'confirmed_race' ? 'bg-green-100 text-green-600' :
                                event.type === 'prospective_race' ? 'bg-orange-100 text-orange-600' :
                                event.type === 'deadline' ? 'bg-red-100 text-red-600' :
                                event.type === 'workout' ? 'bg-amber-100 text-amber-600' :
                                'bg-purple-100 text-purple-600'
                              }`}
                            >
                              {event.title.length > 8 ? event.title.slice(0, 7) + '…' : event.title}
                            </div>
                          ))}
                          {dayEvents.length > 2 && (
                            <span className="text-[8px] font-bold text-slate-400 text-center">
                              +{dayEvents.length - 2}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          </div>

          {/* Mobile Agenda List View - Enhanced */}
          <div className={`lg:hidden space-y-3 ${viewMode === 'list' ? 'block' : 'hidden'}`}>
            {currentMonthEvents.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon name="calendar" size={32} className="text-slate-300" />
                </div>
                <p className="text-slate-500 font-medium">No events this month</p>
                <p className="text-sm text-slate-400 mt-1">{format(currentMonth, 'MMMM yyyy')}</p>
              </div>
            ) : (
              currentMonthEvents.map(({ date, events }) => (
                <div key={date.toString()} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  {/* Date header - sticky on scroll */}
                  <div className={`px-4 py-2.5 flex justify-between items-center sticky top-0 z-10 ${
                    isToday(date)
                      ? 'bg-primary-600 text-white'
                      : 'bg-slate-50 border-b border-slate-100'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className={`text-2xl font-bold ${isToday(date) ? 'text-white' : 'text-slate-800'}`}>
                        {format(date, 'd')}
                      </span>
                      <div className="flex flex-col">
                        <span className={`text-xs font-bold uppercase tracking-wider ${isToday(date) ? 'text-primary-100' : 'text-slate-500'}`}>
                          {format(date, 'EEEE')}
                        </span>
                        <span className={`text-[10px] ${isToday(date) ? 'text-primary-200' : 'text-slate-400'}`}>
                          {format(date, 'MMMM yyyy')}
                        </span>
                      </div>
                    </div>
                    {isToday(date) && (
                      <span className="px-2 py-0.5 bg-white/20 rounded-full text-[10px] font-bold uppercase">
                        Today
                      </span>
                    )}
                  </div>

                  {/* Events list */}
                  <div className="divide-y divide-slate-100">
                    {events.map(event => (
                      <div
                        key={event.id}
                        onClick={() => setSelectedDate(date)}
                        className="p-3 flex gap-3 hover:bg-slate-50 active:bg-slate-100 cursor-pointer transition-colors"
                      >
                        <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${event.dotClass}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-sm font-semibold text-slate-900 truncate">{event.title}</h4>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider flex-shrink-0 ${
                              event.type === 'practice' ? 'bg-blue-100 text-blue-600' :
                              event.type === 'confirmed_race' ? 'bg-green-100 text-green-600' :
                              event.type === 'prospective_race' ? 'bg-orange-100 text-orange-600' :
                              event.type === 'deadline' ? 'bg-red-100 text-red-600' :
                              event.type === 'workout' ? 'bg-amber-100 text-amber-600' :
                              'bg-purple-100 text-purple-600'
                            }`}>
                              {event.type === 'practice' ? 'Prac' :
                               event.type === 'confirmed_race' ? 'Race' :
                               event.type === 'prospective_race' ? 'Pros' :
                               event.type === 'deadline' ? 'Due' :
                               event.type === 'workout' ? 'Work' : 'Event'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                            {(event.data?.start_time || event.data?.race_start_time) && (
                              <span className="flex items-center gap-1">
                                <Icon name="clock" size={12} className="text-slate-400" />
                                {formatTime12Hour(event.data.start_time || event.data.race_start_time)}
                              </span>
                            )}
                            {(event.data?.location_name || event.data?.location) && (
                              <span className="flex items-center gap-1 truncate">
                                <Icon name="location" size={12} className="text-slate-400" />
                                {event.data.location_name || event.data.location}
                              </span>
                            )}
                          </div>
                        </div>
                        <Icon name="arrowRight" size={16} className="text-slate-300 self-center flex-shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Selected Date - Bottom Sheet (Mobile) / Modal (Desktop) */}
      {selectedDate && (
        <>
          {/* Desktop Modal */}
          <div className="hidden lg:flex fixed inset-0 bg-slate-900/50 backdrop-blur-sm items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{format(selectedDate, 'EEEE')}</h2>
                  <p className="text-sm text-slate-500">{format(selectedDate, 'MMMM d, yyyy')}</p>
                </div>
                <button onClick={closeSheet} className="p-2 bg-white hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors shadow-sm border border-slate-200">
                  <Icon name="close" size={20} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {getEventsForDay(selectedDate).length === 0 ? (
                  <div className="text-center py-10">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Icon name="calendar" size={32} className="text-slate-300" />
                    </div>
                    <p className="text-slate-500 font-medium">No events scheduled</p>
                    {isCoachOrAdmin && (
                      <button onClick={() => openQuickAddModal(selectedDate)} className="mt-4 btn btn-primary btn-sm">
                        + Add Event
                      </button>
                    )}
                  </div>
                ) : (
                  getEventsForDay(selectedDate).map(event => renderEventCard(event, false))
                )}
              </div>

              {/* Modal Footer */}
              {isCoachOrAdmin && !editingEvent && (
                <div className="p-4 border-t border-slate-100 bg-slate-50">
                  <button onClick={() => openQuickAddModal(selectedDate)} className="w-full btn btn-primary flex justify-center items-center gap-2">
                    <Icon name="plus" size={18} /> Add Event
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Bottom Sheet */}
          <div className="lg:hidden fixed inset-0 z-50">
            {/* Backdrop */}
            <div
              className={`absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity ${sheetHeight > 0 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
              onClick={closeSheet}
            />

            {/* Sheet */}
            <div
              ref={sheetRef}
              className={`
                sheet-content absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-[0_-8px_30px_-5px_rgba(0,0,0,0.2)]
                ${isDraggingSheet ? '' : 'transition-[height] duration-300 ease-out'}
              `}
              style={{ height: `${sheetHeight}px` }}
            >
              {/* Drag Handle */}
              <div
                className="w-full flex flex-col items-center pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none"
                onTouchStart={handleSheetTouchStart}
                onTouchMove={handleSheetTouchMove}
                onTouchEnd={handleSheetTouchEnd}
              >
                <div className={`w-10 h-1 rounded-full transition-colors ${isDraggingSheet ? 'bg-primary-400' : 'bg-slate-300'}`} />
              </div>

              {/* Sheet Header */}
              <div className="px-4 pb-3 flex justify-between items-center border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${
                    isToday(selectedDate) ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {format(selectedDate, 'd')}
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">{format(selectedDate, 'EEEE')}</h2>
                    <p className="text-xs text-slate-500">{format(selectedDate, 'MMMM yyyy')}</p>
                  </div>
                </div>
                <button onClick={closeSheet} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
                  <Icon name="close" size={20} />
                </button>
              </div>

              {/* Sheet Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: `calc(${sheetHeight}px - 120px)` }}>
                {getEventsForDay(selectedDate).length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Icon name="calendar" size={28} className="text-slate-300" />
                    </div>
                    <p className="text-slate-500 font-medium text-sm">No events</p>
                    {isCoachOrAdmin && (
                      <button onClick={() => openQuickAddModal(selectedDate)} className="mt-3 btn btn-primary btn-sm">
                        + Add Event
                      </button>
                    )}
                  </div>
                ) : (
                  getEventsForDay(selectedDate).map(event => renderEventCard(event, true))
                )}
              </div>

              {/* Sheet Footer */}
              {isCoachOrAdmin && !editingEvent && getEventsForDay(selectedDate).length > 0 && (
                <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-slate-100 bg-white">
                  <button onClick={() => openQuickAddModal(selectedDate)} className="w-full btn btn-primary btn-sm flex justify-center items-center gap-2">
                    <Icon name="plus" size={16} /> Add Event
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}


      {/* List View Tab (All Events) - Using updated styles */}
      {activeTab === 'all-events' && (
        <div className="space-y-4">
           {/* Filters */}
           <div className="card bg-white p-4 flex flex-wrap gap-4 items-center border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2">
                 <label className="text-sm font-medium text-slate-700">Time:</label>
                 <select className="input py-1.5 px-3 text-sm w-auto" value={eventListFilter} onChange={e => setEventListFilter(e.target.value)}>
                    <option value="all">All</option>
                    <option value="upcoming">Upcoming</option>
                    <option value="past">Past</option>
                 </select>
              </div>
              <div className="flex items-center gap-2">
                 <label className="text-sm font-medium text-slate-700">Type:</label>
                 <select className="input py-1.5 px-3 text-sm w-auto" value={eventTypeFilter} onChange={e => setEventTypeFilter(e.target.value)}>
                    <option value="all">All</option>
                    <option value="practice">Practice</option>
                    <option value="race">Race</option>
                    <option value="event">Event</option>
                 </select>
              </div>
           </div>

           <div className="space-y-3">
              {getAllEventsList.map(event => (
                 <div key={event.id} className="card p-4 flex flex-col sm:flex-row gap-4 hover:border-primary-200 transition-colors">
                    <div className="flex-1">
                       <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${event.badgeClass.replace('badge ', '')}`}>
                             {event.type.replace(/_/g, ' ')}
                          </span>
                          <span className="text-sm text-slate-500 font-medium">
                             {format(parseDateString(event.date), 'EEEE, MMMM d, yyyy')}
                          </span>
                       </div>
                       <h3 className="text-lg font-bold text-slate-900">{event.title}</h3>
                       <div className="flex gap-4 mt-2 text-sm text-slate-600">
                          {(event.data?.start_time || event.data?.race_start_time) && (
                             <span className="flex items-center gap-1.5">
                                <Icon name="clock" size={16} className="text-slate-400" />
                                {formatTime12Hour(event.data.start_time || event.data.race_start_time)}
                             </span>
                          )}
                          {event.data?.location && (
                             <span className="flex items-center gap-1.5">
                                <Icon name="location" size={16} className="text-slate-400" />
                                {event.data.location}
                             </span>
                          )}
                       </div>
                    </div>
                 </div>
              ))}
           </div>
        </div>
      )}

      {/* Quick Add Modal (Retained functionality, updated styles) */}
      {showQuickAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
             <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-900">Quick Add Event</h2>
                <button onClick={() => setShowQuickAddModal(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                   <Icon name="close" size={20} />
                </button>
             </div>
             <div className="p-6">
                {/* Event Type Chips */}
                <div className="grid grid-cols-4 gap-2 mb-6">
                   {[
                      { id: 'practice', icon: 'practice', label: 'Practice', color: 'blue' },
                      { id: 'workout', icon: 'workouts', label: 'Workout', color: 'green' },
                      { id: 'race', icon: 'trophy', label: 'Race', color: 'orange' },
                      { id: 'other', icon: 'calendar', label: 'Other', color: 'purple' }
                   ].map(type => (
                      <button
                         key={type.id}
                         type="button"
                         onClick={() => setQuickAddType(type.id)}
                         className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all ${
                            quickAddType === type.id
                               ? `border-${type.color}-500 bg-${type.color}-50 text-${type.color}-700`
                               : 'border-slate-100 hover:border-slate-200 text-slate-500 hover:bg-slate-50'
                         }`}
                      >
                         <Icon name={type.icon} size={20} className="mb-1" />
                         <span className="text-xs font-medium">{type.label}</span>
                      </button>
                   ))}
                </div>

                {/* Form Fields */}
                <form onSubmit={handleQuickAdd} className="space-y-4">
                   {quickAddType === 'race' && (
                      <div className="flex bg-slate-100 p-1 rounded-lg">
                         <button type="button" onClick={() => setQuickAddRaceStatus('prospective')} className={`flex-1 text-xs font-bold py-1.5 rounded-md transition-all ${quickAddRaceStatus === 'prospective' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Prospective</button>
                         <button type="button" onClick={() => setQuickAddRaceStatus('confirmed')} className={`flex-1 text-xs font-bold py-1.5 rounded-md transition-all ${quickAddRaceStatus === 'confirmed' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Confirmed</button>
                      </div>
                   )}

                   <div>
                      <label className="label">Title *</label>
                      <input type="text" className="input" required value={quickAddForm.title} onChange={e => setQuickAddForm({...quickAddForm, title: e.target.value})} placeholder="Event Title" />
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div>
                         <label className="label">Date *</label>
                         <input type="date" className="input" required value={quickAddForm.date} onChange={e => setQuickAddForm({...quickAddForm, date: e.target.value})} />
                      </div>
                      {quickAddType !== 'workout' && (
                         <div>
                            <label className="label">Start Time {quickAddType === 'practice' && '*'}</label>
                            <input type="time" className="input" required={quickAddType === 'practice'} value={quickAddForm.start_time} onChange={e => setQuickAddForm({...quickAddForm, start_time: e.target.value})} />
                         </div>
                      )}
                   </div>

                   <div className="flex justify-end gap-3 pt-4">
                      <button type="button" onClick={() => setShowQuickAddModal(false)} className="btn btn-secondary">Cancel</button>
                      <button type="submit" className="btn btn-primary">Create Event</button>
                   </div>
                </form>
             </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <Icon name="trash" size={24} className="text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Delete Event?</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete "{showDeleteConfirm.data?.title}"?
              This action cannot be undone.
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

      {/* Mobile FAB (Floating Action Button) */}
      {isCoachOrAdmin && !selectedDate && (
        <button
          onClick={() => openQuickAddModal()}
          className="lg:hidden fixed bottom-20 right-4 z-40 w-14 h-14 bg-primary-600 text-white rounded-full shadow-lg shadow-primary-600/40 flex items-center justify-center hover:bg-primary-700 active:scale-95 transition-all"
        >
          <Icon name="plus" size={24} />
        </button>
      )}
    </div>
  )
}