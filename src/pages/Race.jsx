import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useEventStore } from '../store/eventStore'
import { useAuthStore } from '../store/authStore'
import { format, isPast, isFuture, isToday, parseISO, differenceInDays } from 'date-fns'
import toast from 'react-hot-toast'
import Icon from '../components/Icon'
import { Linkify } from '../utils/linkify'

export default function Race() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { events, rsvps, loading, fetchEvents, fetchRSVPs, setRSVP, createEvent, updateEvent, deleteEvent } = useEventStore()
  const { user, hasRole } = useAuthStore()
  const [filter, setFilter] = useState('upcoming')
  const [eventTypeFilter, setEventTypeFilter] = useState('all')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingEventId, setEditingEventId] = useState(null)
  const [expandedCardId, setExpandedCardId] = useState(null)
  const [editForm, setEditForm] = useState({
    title: '',
    event_date: '',
    start_time: '',
    end_time: '',
    location: '',
    description: ''
  })
  const [newEvent, setNewEvent] = useState({
    title: '',
    event_type: 'race',
    description: '',
    location: '',
    event_date: '',
    start_time: '',
    end_time: '',
    arrival_time: '',
    captains_meeting_time: '',
    max_participants: '',
    registration_deadline: '',
    status: 'prospective'
  })

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  useEffect(() => {
    events.forEach(event => {
      fetchRSVPs(event.id)
    })
  }, [events.length, fetchRSVPs])

  useEffect(() => {
    if (events.length > 0) {
      const editId = searchParams.get('edit')
      if (editId) {
        const eventToEdit = events.find(e => e.id === editId)
        if (eventToEdit) {
          handleStartEdit(eventToEdit)
          setSearchParams({}, { replace: true })
        }
      }
    }
  }, [events, searchParams, setSearchParams])

  const handleCreateEvent = async () => {
    if (!newEvent.title || !newEvent.event_date) {
      toast.error('Event title and date are required')
      return
    }

    const result = await createEvent({
      ...newEvent,
      max_participants: newEvent.max_participants ? parseInt(newEvent.max_participants) : null,
      created_by: user.id
    })

    if (result.success) {
      setIsCreateModalOpen(false)
      setNewEvent({
        title: '',
        event_type: 'race',
        description: '',
        location: '',
        event_date: '',
        start_time: '',
        end_time: '',
        arrival_time: '',
        captains_meeting_time: '',
        max_participants: '',
        registration_deadline: '',
        status: 'prospective'
      })
      fetchEvents()
    }
  }

  const handleRSVP = async (eventId, status) => {
    await setRSVP(eventId, user.id, status)
  }

  const handleStartEdit = (event) => {
    setEditingEventId(event.id)
    setEditForm({
      title: event.title || '',
      event_date: event.event_date || '',
      start_time: event.start_time || '',
      end_time: event.end_time || '',
      location: event.location || '',
      description: event.description || ''
    })
  }

  const handleSaveEdit = async (event) => {
    if (!editingEventId) return

    const result = await updateEvent(event.id, {
      title: editForm.title,
      event_date: editForm.event_date,
      start_time: editForm.start_time?.trim() || null,
      end_time: editForm.end_time?.trim() || null,
      location: editForm.location?.trim() || null,
      description: editForm.description?.trim() || null
    })

    if (result.success) {
      setEditingEventId(null)
      fetchEvents()
    }
  }

  const handleCancelEdit = () => {
    setEditingEventId(null)
  }

  const handleDeleteEvent = async (event) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${event.title}"?\n\nThis will also delete all RSVPs, carpools, expenses, and other related data. This action cannot be undone.`
    )

    if (confirmed) {
      const result = await deleteEvent(event.id)
      if (result.success) {
        toast.success('Race deleted successfully')
        fetchEvents()
      }
    }
  }

  const parseDateString = (dateStr) => {
    if (!dateStr) return new Date()
    return typeof dateStr === 'string' && dateStr.length === 10
      ? parseISO(dateStr)
      : new Date(dateStr)
  }

  const getEventStatusBadge = (event) => {
    const eventDate = parseDateString(event.event_date)

    if (event.status === 'cancelled') {
      return { label: 'Cancelled', color: 'bg-red-100 text-red-700 border-red-200' }
    }
    if (event.status === 'completed') {
      return { label: 'Completed', color: 'bg-slate-100 text-slate-600 border-slate-200' }
    }
    if (isToday(eventDate)) {
      return { label: 'Today!', color: 'bg-success-100 text-success-700 border-success-200' }
    }
    if (isPast(eventDate)) {
      return { label: 'Past', color: 'bg-slate-100 text-slate-500 border-slate-200' }
    }
    if (event.status === 'prospective') {
      return { label: 'Prospective', color: 'bg-orange-100 text-orange-700 border-orange-200' }
    }
    if (event.status === 'confirmed') {
      return { label: 'Confirmed', color: 'bg-primary-100 text-primary-700 border-primary-200' }
    }
    if (event.status === 'registration_open') {
      return { label: 'Registration Open', color: 'bg-purple-100 text-purple-700 border-purple-200' }
    }
    return { label: 'Planning', color: 'bg-amber-100 text-amber-700 border-amber-200' }
  }

  const getEventTypeIcon = (type) => {
    const icons = {
      race: { name: 'boat', color: 'text-primary-600', bg: 'bg-primary-100' }
    }
    return icons[type] || icons.race
  }

  const getUserRSVP = (eventId) => {
    const eventRSVPs = rsvps[eventId] || []
    return eventRSVPs.find(r => r.user_id === user?.id)
  }

  const getRSVPCounts = (eventId) => {
    const eventRSVPs = rsvps[eventId] || []
    return {
      registered: eventRSVPs.filter(r => r.status === 'registered').length,
      confirmed: eventRSVPs.filter(r => r.status === 'confirmed').length,
      interested: eventRSVPs.filter(r => r.status === 'interested').length,
      yes: eventRSVPs.filter(r => r.status === 'yes').length,
      total: eventRSVPs.length
    }
  }

  const getCountdown = (event) => {
    const eventDate = parseDateString(event.event_date)
    const days = differenceInDays(eventDate, new Date())
    if (days < 0) return null
    if (days === 0) return 'Today'
    if (days === 1) return '1 day'
    return `${days} days`
  }

  const allEvents = events.filter(e => e.event_type === 'race')

  const filteredEvents = allEvents.filter(event => {
    const eventDate = parseDateString(event.event_date)

    if (filter === 'upcoming' && isPast(eventDate) && !isToday(eventDate)) {
      return false
    }
    if (filter === 'past' && (isFuture(eventDate) || isToday(eventDate))) {
      return false
    }

    if (eventTypeFilter !== 'all' && event.event_type !== eventTypeFilter) {
      return false
    }

    return true
  }).sort((a, b) => {
    const dateA = parseDateString(a.event_date)
    const dateB = parseDateString(b.event_date)
    return filter === 'past' ? dateB - dateA : dateA - dateB
  })

  const formatDate = (dateStr) => {
    try {
      const date = typeof dateStr === 'string' && dateStr.length === 10
        ? parseISO(dateStr)
        : new Date(dateStr)
      return format(date, 'EEE, MMM d')
    } catch {
      return dateStr
    }
  }

  const formatDateFull = (dateStr) => {
    try {
      const date = typeof dateStr === 'string' && dateStr.length === 10
        ? parseISO(dateStr)
        : new Date(dateStr)
      return format(date, 'EEEE, MMMM d, yyyy')
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

  const isCoachOrAdmin = hasRole('admin') || hasRole('coach')

  return (
    <div className="space-y-4 pb-24 md:pb-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Races</h1>
          <p className="text-sm text-slate-500 mt-0.5 hidden sm:block">Race management & registration</p>
        </div>
        {/* Desktop create button */}
        {isCoachOrAdmin && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="hidden md:flex btn btn-primary items-center gap-2 shadow-lg shadow-primary-600/20"
          >
            <Icon name="plus" size={18} />
            Create Race
          </button>
        )}
      </div>

      {/* Mobile Filter Pills */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-2">
        {/* Time Filters */}
        <button
          onClick={() => setFilter('upcoming')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
            filter === 'upcoming'
              ? 'bg-primary-600 text-white shadow-md'
              : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          <Icon name="calendar" size={12} />
          Upcoming
        </button>
        <button
          onClick={() => setFilter('past')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
            filter === 'past'
              ? 'bg-slate-700 text-white shadow-md'
              : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          <Icon name="clock" size={12} />
          Past
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
            filter === 'all'
              ? 'bg-slate-700 text-white shadow-md'
              : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          All
        </button>

        <div className="w-px bg-slate-200 mx-1" />

        {/* Type Filters */}
        <button
          onClick={() => setEventTypeFilter('all')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
            eventTypeFilter === 'all'
              ? 'bg-accent-600 text-white shadow-md'
              : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          All Types
        </button>
        <button
          onClick={() => setEventTypeFilter('race')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
            eventTypeFilter === 'race'
              ? 'bg-primary-600 text-white shadow-md'
              : 'bg-white text-primary-600 border border-primary-200'
          }`}
        >
          <Icon name="boat" size={12} />
          Races
        </button>
      </div>

      {/* Events List */}
      {loading && events.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500">Loading races...</p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon name="boat" size={40} className="text-slate-300" />
          </div>
          <h3 className="text-lg font-bold text-slate-700 mb-2">No races found</h3>
          <p className="text-slate-500 text-sm mb-6">
            {filter === 'upcoming' ? 'No upcoming races scheduled' : 'No races match your filters'}
          </p>
          {isCoachOrAdmin && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="btn btn-primary"
            >
              <Icon name="plus" size={18} className="mr-2" />
              Create First Race
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEvents.map(event => {
            const userRSVP = getUserRSVP(event.id)
            const rsvpCounts = getRSVPCounts(event.id)
            const statusBadge = getEventStatusBadge(event)
            const isEditing = editingEventId === event.id
            const typeIcon = getEventTypeIcon(event.event_type)
            const eventDate = parseDateString(event.event_date)
            const isEventToday = isToday(eventDate)
            const isExpanded = expandedCardId === event.id
            const countdown = getCountdown(event)

            return (
              <div
                key={event.id}
                className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all ${
                  isEventToday
                    ? 'ring-2 ring-primary-400 border-primary-300'
                    : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
                }`}
              >
                {isEditing ? (
                  // ========== EDIT MODE ==========
                  <div className="p-4 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <h3 className="font-bold text-slate-900 flex items-center gap-2">
                        <Icon name="edit" size={18} className="text-primary-500" />
                        Editing Race
                      </h3>
                      <button
                        onClick={handleCancelEdit}
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                      >
                        <Icon name="close" size={18} />
                      </button>
                    </div>

                    <div>
                      <label className="label text-xs">Title</label>
                      <input
                        type="text"
                        value={editForm.title}
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                        className="input text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="label text-xs">Date</label>
                        <input
                          type="date"
                          value={editForm.event_date}
                          onChange={(e) => setEditForm({ ...editForm, event_date: e.target.value })}
                          className="input text-sm"
                        />
                      </div>
                      <div>
                        <label className="label text-xs">Start Time</label>
                        <input
                          type="time"
                          value={editForm.start_time}
                          onChange={(e) => setEditForm({ ...editForm, start_time: e.target.value })}
                          className="input text-sm"
                        />
                      </div>
                      <div>
                        <label className="label text-xs">End Time</label>
                        <input
                          type="time"
                          value={editForm.end_time}
                          onChange={(e) => setEditForm({ ...editForm, end_time: e.target.value })}
                          className="input text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="label text-xs">Location</label>
                      <input
                        type="text"
                        value={editForm.location}
                        onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                        className="input text-sm"
                      />
                    </div>

                    <div>
                      <label className="label text-xs">Description</label>
                      <textarea
                        value={editForm.description}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        className="input text-sm"
                        rows={2}
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-slate-100">
                      <button
                        onClick={() => navigate(`/events/${event.id}`)}
                        className="btn btn-secondary text-xs flex-1 justify-center"
                      >
                        <Icon name="manage" size={14} className="mr-1.5" />
                        Advanced Options
                      </button>
                      <button
                        onClick={() => handleDeleteEvent(event)}
                        className="btn bg-red-50 text-red-600 hover:bg-red-100 border-red-200 text-xs flex-1 justify-center"
                      >
                        <Icon name="trash" size={14} className="mr-1.5" />
                        Delete
                      </button>
                      <button
                        onClick={() => handleSaveEdit(event)}
                        className="btn btn-primary text-xs flex-1 justify-center"
                      >
                        <Icon name="check" size={14} className="mr-1.5" />
                        Save Changes
                      </button>
                    </div>
                  </div>
                ) : (
                  // ========== VIEW MODE ==========
                  <>
                    {/* Main Card Content */}
                    <div className="p-4">
                      {/* Top Row: Icon, Title, Status */}
                      <div className="flex items-start gap-3 mb-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${typeIcon.bg}`}>
                          <Icon name={typeIcon.name} size={24} className={typeIcon.color} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3
                              className="text-base sm:text-lg font-bold text-slate-900 leading-tight cursor-pointer hover:text-primary-600 transition-colors"
                              onClick={() => navigate(`/events/${event.id}`)}
                            >
                              {event.title}
                            </h3>
                            {countdown && !isPast(eventDate) && (
                              <span className="text-[10px] font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full uppercase tracking-wider flex-shrink-0">
                                {countdown}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${statusBadge.color}`}>
                              {statusBadge.label}
                            </span>
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-600 capitalize">
                              {event.event_type}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Info Row */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600 mb-3">
                        <span className="flex items-center gap-1.5">
                          <Icon name="calendar" size={14} className="text-slate-400" />
                          {formatDate(event.event_date)}
                        </span>
                        {event.start_time && (
                          <span className="flex items-center gap-1.5">
                            <Icon name="clock" size={14} className="text-slate-400" />
                            {formatTime(event.start_time)}
                          </span>
                        )}
                        {event.location && (
                          <span className="flex items-center gap-1.5 truncate max-w-[200px]">
                            <Icon name="location" size={14} className="text-slate-400" />
                            {event.location}
                          </span>
                        )}
                      </div>

                      {/* Signup Deadline Alert - for prospective races */}
                      {event.status === 'prospective' && event.registration_deadline && (
                        <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg mb-3 ${
                          isPast(parseISO(event.registration_deadline))
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          <Icon name="clock" size={14} />
                          <span className="font-medium">
                            {isPast(parseISO(event.registration_deadline))
                              ? 'Signup deadline passed'
                              : `Sign up by ${formatDate(event.registration_deadline)}`
                            }
                          </span>
                        </div>
                      )}

                      {/* RSVP Stats Row */}
                      <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-success-500" />
                          {rsvpCounts.yes + rsvpCounts.confirmed} going
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-primary-400" />
                          {rsvpCounts.interested} interested
                        </span>
                        {event.max_participants && (
                          <span className="text-slate-400">
                            / {event.max_participants} max
                          </span>
                        )}
                      </div>

                      {/* RSVP Buttons - Always visible */}
                      {user && (
                        <div className="flex bg-slate-100 p-1 rounded-xl mb-3">
                          <button
                            onClick={() => handleRSVP(event.id, 'interested')}
                            className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                              userRSVP?.status === 'interested'
                                ? 'bg-white text-primary-700 shadow-sm ring-1 ring-primary-200'
                                : 'text-slate-500 hover:bg-white/50'
                            }`}
                          >
                            <Icon name="target" size={14} className={userRSVP?.status === 'interested' ? 'text-primary-500' : ''} />
                            <span className="hidden sm:inline">Interested</span>
                            <span className="sm:hidden">?</span>
                          </button>
                          <button
                            onClick={() => handleRSVP(event.id, 'yes')}
                            className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                              userRSVP?.status === 'yes'
                                ? 'bg-white text-success-700 shadow-sm ring-1 ring-success-200'
                                : 'text-slate-500 hover:bg-white/50'
                            }`}
                          >
                            <Icon name="check" size={14} className={userRSVP?.status === 'yes' ? 'text-success-500' : ''} />
                            Going
                          </button>
                          <button
                            onClick={() => handleRSVP(event.id, 'no')}
                            className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                              userRSVP?.status === 'no'
                                ? 'bg-white text-red-700 shadow-sm ring-1 ring-red-200'
                                : 'text-slate-500 hover:bg-white/50'
                            }`}
                          >
                            <Icon name="close" size={14} className={userRSVP?.status === 'no' ? 'text-red-500' : ''} />
                            <span className="hidden sm:inline">Can't Go</span>
                            <span className="sm:hidden">No</span>
                          </button>
                        </div>
                      )}

                      {/* Action Buttons Row */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/events/${event.id}`)}
                          className="btn btn-primary btn-sm flex-1 justify-center text-xs"
                        >
                          <Icon name="view" size={14} className="mr-1.5" />
                          View Details
                        </button>
                        <button
                          onClick={() => navigate(`/lineups?event=${event.id}&eventName=${encodeURIComponent(event.title)}`)}
                          className="btn bg-purple-600 text-white hover:bg-purple-700 btn-sm text-xs"
                          title="Create lineup"
                        >
                          <Icon name="boat" size={14} />
                          <span className="hidden sm:inline ml-1.5">Lineup</span>
                        </button>
                        {isCoachOrAdmin && (
                          <>
                            <button
                              onClick={() => handleStartEdit(event)}
                              className="btn btn-secondary btn-sm text-xs"
                            >
                              <Icon name="edit" size={14} />
                            </button>
                            <button
                              onClick={() => setExpandedCardId(isExpanded ? null : event.id)}
                              className="btn btn-secondary btn-sm text-xs"
                            >
                              <Icon name={isExpanded ? 'chevron-up' : 'more'} size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Expanded Section (Admin Only) */}
                    {isExpanded && isCoachOrAdmin && (
                      <div className="px-4 pb-4 pt-2 border-t border-slate-100 bg-slate-50/50 space-y-3">
                        {event.description && (
                          <div>
                            <p className="text-xs text-slate-500 font-medium mb-1">Description</p>
                            <p className="text-sm text-slate-700">
                              <Linkify text={event.description} />
                            </p>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-3 text-xs">
                          {event.arrival_time && (
                            <div>
                              <p className="text-slate-500 font-medium">Arrival</p>
                              <p className="text-slate-700 font-semibold">{formatTime(event.arrival_time)}</p>
                            </div>
                          )}
                          {event.captains_meeting_time && (
                            <div>
                              <p className="text-slate-500 font-medium">Captain's Meeting</p>
                              <p className="text-slate-700 font-semibold">{formatTime(event.captains_meeting_time)}</p>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 pt-2">
                          {event.status === 'prospective' && (
                            <button
                              onClick={async () => {
                                if (window.confirm('Convert this race to confirmed status? This will notify interested members.')) {
                                  await updateEvent(event.id, { status: 'confirmed' })
                                  toast.success('Race converted to confirmed!')
                                }
                              }}
                              className="btn bg-success-50 text-success-600 hover:bg-success-100 border-success-200 text-xs flex-1 justify-center"
                            >
                              <Icon name="check" size={14} className="mr-1.5" />
                              Confirm Race
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteEvent(event)}
                            className="btn bg-red-50 text-red-600 hover:bg-red-100 border-red-200 text-xs flex-1 justify-center"
                          >
                            <Icon name="trash" size={14} className="mr-1.5" />
                            Delete Race
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Create Event Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsCreateModalOpen(false)} />
          <div className="relative w-full sm:max-w-lg max-h-[90vh] bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-900">Create New Race</h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <label className="label text-xs">Race Title *</label>
                <input
                  type="text"
                  className="input text-sm"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  placeholder="e.g., Summer Dragon Boat Festival"
                />
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="label text-xs">Status</label>
                  <select
                    className="input text-sm"
                    value={newEvent.status}
                    onChange={(e) => setNewEvent({ ...newEvent, status: e.target.value })}
                  >
                    <option value="prospective">Prospective</option>
                    <option value="planning">Planning</option>
                    <option value="registration_open">Registration Open</option>
                    <option value="confirmed">Confirmed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label text-xs">Description</label>
                <textarea
                  className="input text-sm"
                  rows="2"
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  placeholder="Event details..."
                />
              </div>

              <div>
                <label className="label text-xs">Location</label>
                <input
                  type="text"
                  className="input text-sm"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                  placeholder="Venue address"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label text-xs">Event Date *</label>
                  <input
                    type="date"
                    className="input text-sm"
                    value={newEvent.event_date}
                    onChange={(e) => setNewEvent({ ...newEvent, event_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label text-xs">Arrival Time</label>
                  <input
                    type="time"
                    className="input text-sm"
                    value={newEvent.arrival_time}
                    onChange={(e) => setNewEvent({ ...newEvent, arrival_time: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label text-xs">Start Time</label>
                  <input
                    type="time"
                    className="input text-sm"
                    value={newEvent.start_time}
                    onChange={(e) => setNewEvent({ ...newEvent, start_time: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label text-xs">End Time</label>
                  <input
                    type="time"
                    className="input text-sm"
                    value={newEvent.end_time}
                    onChange={(e) => setNewEvent({ ...newEvent, end_time: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label text-xs">Captain's Meeting</label>
                  <input
                    type="time"
                    className="input text-sm"
                    value={newEvent.captains_meeting_time}
                    onChange={(e) => setNewEvent({ ...newEvent, captains_meeting_time: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label text-xs">Max Participants</label>
                  <input
                    type="number"
                    className="input text-sm"
                    value={newEvent.max_participants}
                    onChange={(e) => setNewEvent({ ...newEvent, max_participants: e.target.value })}
                    placeholder="Optional"
                  />
                </div>
              </div>

              {/* Signup Deadline - Important for prospective races */}
              {newEvent.status === 'prospective' && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <label className="label text-xs text-amber-700">Signup Deadline</label>
                  <input
                    type="date"
                    className="input text-sm"
                    value={newEvent.registration_deadline}
                    onChange={(e) => setNewEvent({ ...newEvent, registration_deadline: e.target.value })}
                  />
                  <p className="text-[10px] text-amber-600 mt-1">Members need to sign up by this date to gauge interest</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="btn btn-secondary flex-1 justify-center"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateEvent}
                className="btn btn-primary flex-1 justify-center"
              >
                <Icon name="plus" size={16} className="mr-1.5" />
                Create Race
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile FAB */}
      {isCoachOrAdmin && (
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
