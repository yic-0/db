import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEventStore } from '../store/eventStore'
import { useCalendarStore } from '../store/calendarStore'
import { useAuthStore } from '../store/authStore'
import { format, isPast, isFuture, isToday } from 'date-fns'
import toast from 'react-hot-toast'

export default function Events() {
  const navigate = useNavigate()
  const { events, rsvps, loading, fetchEvents, fetchRSVPs, setRSVP, createEvent } = useEventStore()
  const { prospectiveRaces, confirmedRaces, fetchProspectiveRaces, fetchConfirmedRaces } = useCalendarStore()
  const { user, hasRole } = useAuthStore()
  const [filter, setFilter] = useState('upcoming') // 'all', 'upcoming', 'past'
  const [eventTypeFilter, setEventTypeFilter] = useState('all')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [showCalendarRaces, setShowCalendarRaces] = useState(true)
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
    fetchProspectiveRaces()
    fetchConfirmedRaces()
  }, [fetchEvents])

  useEffect(() => {
    // Fetch RSVPs for all events
    events.forEach(event => {
      fetchRSVPs(event.id)
    })
  }, [events.length, fetchRSVPs])

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
        status: 'planning'
      })
    }
  }

  const handleRSVP = async (eventId, status) => {
    await setRSVP(eventId, user.id, status)
  }

  const getEventStatusBadge = (event) => {
    const eventDate = new Date(event.event_date)

    if (event.status === 'cancelled') {
      return { label: 'Cancelled', color: 'bg-red-100 text-red-800' }
    }
    if (event.status === 'completed') {
      return { label: 'Completed', color: 'bg-gray-100 text-gray-800' }
    }
    if (isToday(eventDate)) {
      return { label: 'Today!', color: 'bg-green-100 text-green-800' }
    }
    if (isPast(eventDate)) {
      return { label: 'Past', color: 'bg-gray-100 text-gray-600' }
    }
    if (event.status === 'prospective') {
      return { label: 'Prospective', color: 'bg-orange-100 text-orange-800' }
    }
    if (event.status === 'confirmed') {
      return { label: 'Confirmed', color: 'bg-blue-100 text-blue-800' }
    }
    if (event.status === 'registration_open') {
      return { label: 'Registration Open', color: 'bg-purple-100 text-purple-800' }
    }
    return { label: 'Planning', color: 'bg-yellow-100 text-yellow-800' }
  }

  const getEventTypeIcon = (type) => {
    switch (type) {
      case 'race': return '🚤'
      case 'regatta': return '🏆'
      case 'hiking': return '🥾'
      case 'social': return '🎉'
      case 'training_camp': return '💪'
      default: return '📅'
    }
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
      total: eventRSVPs.length
    }
  }

  // Convert calendar races to event-like format
  const calendarRacesAsEvents = showCalendarRaces ? [
    ...prospectiveRaces
      .filter(race => race.status === 'prospective')
      .map(race => ({
        id: `prospective-${race.id}`,
        title: race.name,
        event_type: 'race',
        description: race.description,
        location: race.location,
        event_date: race.race_date,
        start_time: null,
        end_time: null,
        status: 'prospective',
        isCalendarRace: true,
        raceType: 'prospective',
        originalData: race
      })),
    ...confirmedRaces.map(race => ({
      id: `confirmed-${race.id}`,
      title: race.name,
      event_type: 'race',
      description: race.description,
      location: race.location,
      event_date: race.race_date,
      start_time: race.race_start_time,
      end_time: race.race_end_time,
      status: 'confirmed',
      isCalendarRace: true,
      raceType: 'confirmed',
      originalData: race
    }))
  ] : []

  const allEvents = [...events, ...calendarRacesAsEvents]

  const filteredEvents = allEvents.filter(event => {
    const eventDate = new Date(event.event_date)

    // Date filter
    if (filter === 'upcoming' && isPast(eventDate) && !isToday(eventDate)) {
      return false
    }
    if (filter === 'past' && (isFuture(eventDate) || isToday(eventDate))) {
      return false
    }

    // Type filter
    if (eventTypeFilter !== 'all' && event.event_type !== eventTypeFilter) {
      return false
    }

    return true
  }).sort((a, b) => new Date(a.event_date) - new Date(b.event_date))

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

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Events & Race Days</h1>
          <p className="text-gray-600 mt-1">Races, regattas, hiking trips, and team activities</p>
        </div>
        {(hasRole('admin') || hasRole('coach')) && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn btn-primary"
          >
            + Create Event
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <label className="text-sm font-medium text-gray-700 mr-2">Show:</label>
            <div className="inline-flex gap-2">
              <button
                onClick={() => setFilter('upcoming')}
                className={`px-3 py-1 rounded text-sm ${
                  filter === 'upcoming'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Upcoming
              </button>
              <button
                onClick={() => setFilter('past')}
                className={`px-3 py-1 rounded text-sm ${
                  filter === 'past'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Past
              </button>
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 rounded text-sm ${
                  filter === 'all'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mr-2">Type:</label>
            <select
              value={eventTypeFilter}
              onChange={(e) => setEventTypeFilter(e.target.value)}
              className="input py-1"
            >
              <option value="all">All Types</option>
              <option value="race">Races</option>
              <option value="regatta">Regattas</option>
              <option value="hiking">Hiking</option>
              <option value="social">Social</option>
              <option value="training_camp">Training Camps</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={showCalendarRaces}
                onChange={(e) => setShowCalendarRaces(e.target.checked)}
                className="mr-2"
              />
              Include Calendar Races
            </label>
            {showCalendarRaces && (
              <span className="text-xs text-gray-500">
                ({prospectiveRaces.length + confirmedRaces.length} from calendar)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Events List */}
      {loading && events.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Loading events...</p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-600">No events found</p>
          {(hasRole('admin') || hasRole('coach')) && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="btn btn-primary mt-4"
            >
              Create First Event
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEvents.map(event => {
            const userRSVP = getUserRSVP(event.id)
            const rsvpCounts = getRSVPCounts(event.id)
            const statusBadge = getEventStatusBadge(event)

            return (
              <div key={event.id} className="card hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-3xl">{getEventTypeIcon(event.event_type)}</span>
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">{event.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-2 py-1 text-xs rounded font-medium ${statusBadge.color}`}>
                            {statusBadge.label}
                          </span>
                          <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700 capitalize">
                            {event.event_type.replace('_', ' ')}
                          </span>
                          {event.isCalendarRace && (
                            <span className="px-2 py-1 text-xs rounded bg-indigo-100 text-indigo-700">
                              📅 From Calendar
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-sm">
                      <div>
                        <div className="flex items-start gap-2 mb-2">
                          <span className="text-gray-600">📅</span>
                          <div>
                            <div className="font-medium text-gray-900">{formatDate(event.event_date)}</div>
                            {event.start_time && (
                              <div className="text-gray-600">
                                Start: {formatTime(event.start_time)}
                                {event.end_time && ` - ${formatTime(event.end_time)}`}
                              </div>
                            )}
                          </div>
                        </div>
                        {event.location && (
                          <div className="flex items-start gap-2 mb-2">
                            <span className="text-gray-600">📍</span>
                            <div className="text-gray-700">{event.location}</div>
                          </div>
                        )}
                      </div>

                      <div>
                        {event.arrival_time && (
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-gray-600">🕐</span>
                            <span className="text-gray-700">Arrive by: {formatTime(event.arrival_time)}</span>
                          </div>
                        )}
                        {event.captains_meeting_time && (
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-gray-600">👥</span>
                            <span className="text-gray-700">Captain's Meeting: {formatTime(event.captains_meeting_time)}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600">✅</span>
                          <span className="text-gray-700">
                            {rsvpCounts.confirmed} confirmed
                            {event.max_participants && ` / ${event.max_participants} max`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {event.description && (
                      <p className="text-gray-600 mt-3 text-sm line-clamp-2">{event.description}</p>
                    )}
                  </div>

                  <div className="ml-6 flex flex-col gap-2">
                    {event.isCalendarRace ? (
                      <button
                        onClick={() => navigate('/calendar')}
                        className="btn btn-secondary text-sm"
                      >
                        View in Calendar
                      </button>
                    ) : (
                      <button
                        onClick={() => navigate(`/events/${event.id}`)}
                        className="btn btn-secondary text-sm"
                      >
                        View Details
                      </button>
                    )}

                    {user && !event.isCalendarRace && (
                      <div className="flex flex-col gap-1">
                        <div className="text-xs text-gray-600 text-center mb-1">
                          {userRSVP ? `You're ${userRSVP.status}` : 'RSVP:'}
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleRSVP(event.id, 'interested')}
                            className={`px-2 py-1 text-xs rounded ${
                              userRSVP?.status === 'interested'
                                ? 'bg-yellow-500 text-white'
                                : 'bg-gray-100 hover:bg-yellow-100'
                            }`}
                            title="Interested"
                          >
                            🤔
                          </button>
                          <button
                            onClick={() => handleRSVP(event.id, 'registered')}
                            className={`px-2 py-1 text-xs rounded ${
                              userRSVP?.status === 'registered'
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-100 hover:bg-blue-100'
                            }`}
                            title="Registered"
                          >
                            ✋
                          </button>
                          <button
                            onClick={() => handleRSVP(event.id, 'confirmed')}
                            className={`px-2 py-1 text-xs rounded ${
                              userRSVP?.status === 'confirmed'
                                ? 'bg-green-500 text-white'
                                : 'bg-gray-100 hover:bg-green-100'
                            }`}
                            title="Confirmed"
                          >
                            ✅
                          </button>
                          <button
                            onClick={() => handleRSVP(event.id, 'declined')}
                            className={`px-2 py-1 text-xs rounded ${
                              userRSVP?.status === 'declined'
                                ? 'bg-red-500 text-white'
                                : 'bg-gray-100 hover:bg-red-100'
                            }`}
                            title="Can't make it"
                          >
                            ❌
                          </button>
                        </div>
                      </div>
                    )}

                    {user && event.isCalendarRace && (
                      <div className="text-xs text-gray-500 text-center">
                        Manage in Calendar
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Event Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Create New Event</h2>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="label">Event Title *</label>
                  <input
                    type="text"
                    className="input"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    placeholder="e.g., Summer Dragon Boat Festival 2024"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Event Type *</label>
                    <select
                      className="input"
                      value={newEvent.event_type}
                      onChange={(e) => setNewEvent({ ...newEvent, event_type: e.target.value })}
                    >
                      <option value="race">Race</option>
                      <option value="regatta">Regatta</option>
                      <option value="hiking">Hiking</option>
                      <option value="social">Social Event</option>
                      <option value="training_camp">Training Camp</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="label">Status</label>
                    <select
                      className="input"
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
                  <label className="label">Description</label>
                  <textarea
                    className="input"
                    rows="3"
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    placeholder="Event details, requirements, what to bring..."
                  />
                </div>

                <div>
                  <label className="label">Location</label>
                  <input
                    type="text"
                    className="input"
                    value={newEvent.location}
                    onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                    placeholder="Venue address or meeting point"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Event Date *</label>
                    <input
                      type="date"
                      className="input"
                      value={newEvent.event_date}
                      onChange={(e) => setNewEvent({ ...newEvent, event_date: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="label">Arrival Time</label>
                    <input
                      type="time"
                      className="input"
                      value={newEvent.arrival_time}
                      onChange={(e) => setNewEvent({ ...newEvent, arrival_time: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Start Time</label>
                    <input
                      type="time"
                      className="input"
                      value={newEvent.start_time}
                      onChange={(e) => setNewEvent({ ...newEvent, start_time: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="label">End Time</label>
                    <input
                      type="time"
                      className="input"
                      value={newEvent.end_time}
                      onChange={(e) => setNewEvent({ ...newEvent, end_time: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Captain's Meeting Time</label>
                  <input
                    type="time"
                    className="input"
                    value={newEvent.captains_meeting_time}
                    onChange={(e) => setNewEvent({ ...newEvent, captains_meeting_time: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Max Participants</label>
                    <input
                      type="number"
                      className="input"
                      value={newEvent.max_participants}
                      onChange={(e) => setNewEvent({ ...newEvent, max_participants: e.target.value })}
                      placeholder="Leave empty for unlimited"
                    />
                  </div>

                  <div>
                    <label className="label">Registration Deadline</label>
                    <input
                      type="datetime-local"
                      className="input"
                      value={newEvent.registration_deadline}
                      onChange={(e) => setNewEvent({ ...newEvent, registration_deadline: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateEvent}
                  className="btn btn-primary"
                >
                  Create Event
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
