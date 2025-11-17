import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useEventStore } from '../store/eventStore'
import { useAuthStore } from '../store/authStore'
import { useRosterStore } from '../store/rosterStore'
import Icon from '../components/Icon'
import { format, isPast } from 'date-fns'
import toast from 'react-hot-toast'

export default function EventDetail() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const {
    events,
    rsvps,
    carpools,
    expenses,
    payments,
    waivers,
    waiver_signatures,
    races,
    tasks,
    fetchEvents,
    fetchRSVPs,
    fetchCarpools,
    fetchExpenses,
    fetchPayments,
    fetchWaivers,
    fetchRaces,
    fetchTasks,
    setRSVP,
    createCarpool,
    joinCarpool,
    leaveCarpool,
    createExpense,
    recordPayment,
    signWaiver,
    createRace,
    updateRace,
    createTask,
    toggleTask,
    updateEvent,
    deleteEvent
  } = useEventStore()
  const { user, hasRole } = useAuthStore()
  const { members, fetchMembers } = useRosterStore()

  const [activeTab, setActiveTab] = useState('overview')
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({})

  // Carpool form
  const [showCarpoolForm, setShowCarpoolForm] = useState(false)
  const [carpoolForm, setCarpoolForm] = useState({
    vehicle_description: '',
    total_seats: '',
    departure_location: '',
    departure_time: '',
    return_time: '',
    estimated_cost_per_person: '',
    notes: ''
  })

  // Expense form
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [expenseForm, setExpenseForm] = useState({
    expense_type: 'registration_fee',
    description: '',
    amount: '',
    due_date: '',
    is_shared: false,
    notes: ''
  })

  // Race form
  const [showRaceForm, setShowRaceForm] = useState(false)
  const [raceForm, setRaceForm] = useState({
    race_name: '',
    race_number: '',
    distance: '',
    race_type: '',
    scheduled_time: '',
    notes: ''
  })

  // Task form
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    task_category: 'logistics',
    assigned_to: '',
    due_date: '',
    priority: 'medium'
  })

  const event = events.find(e => e.id === eventId)
  const eventRSVPs = rsvps[eventId] || []
  const eventCarpools = carpools[eventId] || []
  const eventExpenses = expenses[eventId] || []
  const eventPayments = payments[eventId] || []
  const eventWaivers = waivers[eventId] || []
  const eventRaces = races[eventId] || []
  const eventTasks = tasks[eventId] || []

  useEffect(() => {
    fetchEvents()
    fetchMembers()
  }, [fetchEvents, fetchMembers])

  useEffect(() => {
    if (eventId) {
      fetchRSVPs(eventId)
      fetchCarpools(eventId)
      fetchExpenses(eventId)
      fetchPayments(eventId)
      fetchWaivers(eventId)
      fetchRaces(eventId)
      fetchTasks(eventId)
    }
  }, [eventId, fetchRSVPs, fetchCarpools, fetchExpenses, fetchPayments, fetchWaivers, fetchRaces, fetchTasks])

  useEffect(() => {
    if (event && isEditing) {
      setEditForm({
        title: event.title || '',
        event_type: event.event_type || 'race',
        description: event.description || '',
        location: event.location || '',
        event_date: event.event_date || '',
        start_time: event.start_time || '',
        end_time: event.end_time || '',
        arrival_time: event.arrival_time || '',
        captains_meeting_time: event.captains_meeting_time || '',
        captains_meeting_location: event.captains_meeting_location || '',
        max_participants: event.max_participants || '',
        registration_deadline: event.registration_deadline || '',
        status: event.status || 'planning',
        notes: event.notes || '',
        event_url: event.event_url || ''
      })
    }
  }, [event, isEditing])

  if (!event) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Event not found</p>
        <button onClick={() => navigate('/events')} className="btn btn-primary mt-4">
          Back to Events
        </button>
      </div>
    )
  }

  const handleUpdateEvent = async () => {
    const result = await updateEvent(eventId, {
      ...editForm,
      max_participants: editForm.max_participants ? parseInt(editForm.max_participants) : null
    })

    if (result.success) {
      setIsEditing(false)
    }
  }

  const handleDeleteEvent = async () => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${event.title}"?\n\nThis will also delete all RSVPs, carpools, expenses, and other data. This action cannot be undone.`
    )

    if (confirmed) {
      const result = await deleteEvent(eventId)
      if (result.success) {
        navigate('/events')
      }
    }
  }

  const handleRSVP = async (status, role = null) => {
    await setRSVP(eventId, user.id, status, role)
  }

  const handleCreateCarpool = async () => {
    if (!carpoolForm.total_seats || !carpoolForm.departure_location) {
      toast.error('Please fill in required fields')
      return
    }

    const result = await createCarpool({
      event_id: eventId,
      driver_id: user.id,
      ...carpoolForm,
      total_seats: parseInt(carpoolForm.total_seats),
      available_seats: parseInt(carpoolForm.total_seats),
      estimated_cost_per_person: carpoolForm.estimated_cost_per_person ? parseFloat(carpoolForm.estimated_cost_per_person) : null
    })

    if (result.success) {
      setShowCarpoolForm(false)
      setCarpoolForm({
        vehicle_description: '',
        total_seats: '',
        departure_location: '',
        departure_time: '',
        return_time: '',
        estimated_cost_per_person: '',
        notes: ''
      })
    }
  }

  const handleCreateExpense = async () => {
    if (!expenseForm.description || !expenseForm.amount) {
      toast.error('Please fill in required fields')
      return
    }

    const result = await createExpense({
      event_id: eventId,
      ...expenseForm,
      amount: parseFloat(expenseForm.amount),
      paid_by: user.id
    })

    if (result.success) {
      setShowExpenseForm(false)
      setExpenseForm({
        expense_type: 'registration_fee',
        description: '',
        amount: '',
        due_date: '',
        is_shared: false,
        notes: ''
      })
    }
  }

  const handleCreateRace = async () => {
    if (!raceForm.race_name) {
      toast.error('Race name is required')
      return
    }

    const result = await createRace({
      event_id: eventId,
      ...raceForm,
      race_number: raceForm.race_number ? parseInt(raceForm.race_number) : null
    })

    if (result.success) {
      setShowRaceForm(false)
      setRaceForm({
        race_name: '',
        race_number: '',
        distance: '',
        race_type: '',
        scheduled_time: '',
        notes: ''
      })
    }
  }

  const handleCreateTask = async () => {
    if (!taskForm.title) {
      toast.error('Task title is required')
      return
    }

    const result = await createTask({
      event_id: eventId,
      ...taskForm,
      assigned_to: taskForm.assigned_to || null
    })

    if (result.success) {
      setShowTaskForm(false)
      setTaskForm({
        title: '',
        description: '',
        task_category: 'logistics',
        assigned_to: '',
        due_date: '',
        priority: 'medium'
      })
    }
  }

  const getUserRSVP = () => {
    return eventRSVPs.find(r => r.user_id === user?.id)
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

  const userRSVP = getUserRSVP()
  const rsvpCounts = {
    interested: eventRSVPs.filter(r => r.status === 'interested').length,
    registered: eventRSVPs.filter(r => r.status === 'registered').length,
    confirmed: eventRSVPs.filter(r => r.status === 'confirmed').length,
    declined: eventRSVPs.filter(r => r.status === 'declined').length
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/events')}
          className="text-primary-600 hover:text-primary-700 mb-4"
        >
          ← Back to Events
        </button>

        <div className="flex items-start justify-between">
          <div className="flex-1">
            {isEditing ? (
              <input
                type="text"
                className="input text-2xl font-bold"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              />
            ) : (
              <h1 className="text-3xl font-bold text-gray-900">{event.title}</h1>
            )}
            <p className="text-gray-600 mt-2">{formatDate(event.event_date)}</p>
          </div>

          {(hasRole('admin') || hasRole('coach')) && (
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <button onClick={() => setIsEditing(false)} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button onClick={handleUpdateEvent} className="btn btn-primary">
                    Save Changes
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setIsEditing(true)} className="btn btn-secondary">
                    Edit Event
                  </button>
                  <button onClick={handleDeleteEvent} className="btn bg-red-600 text-white hover:bg-red-700">
                    Delete
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* RSVP Status for Current User */}
      {user && !isEditing && (
        <div className="card mb-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-gray-900">Your RSVP Status</h3>
              <p className="text-sm text-gray-600 mt-1">
                {userRSVP ? `You are: ${userRSVP.status}` : 'You have not responded yet'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleRSVP('interested')}
                className={`btn btn-secondary text-sm ${userRSVP?.status === 'interested' ? 'bg-yellow-500 text-white hover:bg-yellow-600' : ''}`}
              >
                Interested
              </button>
              <button
                onClick={() => handleRSVP('registered')}
                className={`btn btn-secondary text-sm ${userRSVP?.status === 'registered' ? 'bg-blue-500 text-white hover:bg-blue-600' : ''}`}
              >
                Registered
              </button>
              <button
                onClick={() => handleRSVP('confirmed')}
                className={`btn btn-secondary text-sm ${userRSVP?.status === 'confirmed' ? 'bg-green-600 text-white hover:bg-green-700' : ''}`}
              >
                Confirmed
              </button>
              <button
                onClick={() => handleRSVP('declined')}
                className={`btn btn-secondary text-sm ${userRSVP?.status === 'declined' ? 'bg-red-500 text-white hover:bg-red-600' : ''}`}
              >
                Can't Make It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-4 overflow-x-auto">
          {['overview', 'participants', 'carpools', 'finances', 'waivers', 'races', 'tasks'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'participants' && ` (${eventRSVPs.length})`}
              {tab === 'carpools' && ` (${eventCarpools.length})`}
              {tab === 'races' && eventRaces.length > 0 && ` (${eventRaces.length})`}
              {tab === 'tasks' && eventTasks.length > 0 && ` (${eventTasks.filter(t => !t.completed).length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {isEditing ? (
            <div className="card space-y-4">
              <h2 className="text-xl font-semibold">Edit Event Details</h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Event Type</label>
                  <select
                    className="input"
                    value={editForm.event_type}
                    onChange={(e) => setEditForm({ ...editForm, event_type: e.target.value })}
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
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  >
                    <option value="planning">Planning</option>
                    <option value="registration_open">Registration Open</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Description</label>
                <textarea
                  className="input"
                  rows="4"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                />
              </div>

              <div>
                <label className="label">Location</label>
                <input
                  type="text"
                  className="input"
                  value={editForm.location}
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">Event Date</label>
                  <input
                    type="date"
                    className="input"
                    value={editForm.event_date}
                    onChange={(e) => setEditForm({ ...editForm, event_date: e.target.value })}
                  />
                </div>

                <div>
                  <label className="label">Start Time</label>
                  <input
                    type="time"
                    className="input"
                    value={editForm.start_time}
                    onChange={(e) => setEditForm({ ...editForm, start_time: e.target.value })}
                  />
                </div>

                <div>
                  <label className="label">End Time</label>
                  <input
                    type="time"
                    className="input"
                    value={editForm.end_time}
                    onChange={(e) => setEditForm({ ...editForm, end_time: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Arrival Time</label>
                  <input
                    type="time"
                    className="input"
                    value={editForm.arrival_time}
                    onChange={(e) => setEditForm({ ...editForm, arrival_time: e.target.value })}
                  />
                </div>

                <div>
                  <label className="label">Captain's Meeting Time</label>
                  <input
                    type="time"
                    className="input"
                    value={editForm.captains_meeting_time}
                    onChange={(e) => setEditForm({ ...editForm, captains_meeting_time: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="label">Captain's Meeting Location</label>
                <input
                  type="text"
                  className="input"
                  value={editForm.captains_meeting_location}
                  onChange={(e) => setEditForm({ ...editForm, captains_meeting_location: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Max Participants</label>
                  <input
                    type="number"
                    className="input"
                    value={editForm.max_participants}
                    onChange={(e) => setEditForm({ ...editForm, max_participants: e.target.value })}
                  />
                </div>

                <div>
                  <label className="label">Registration Deadline</label>
                  <input
                    type="datetime-local"
                    className="input"
                    value={editForm.registration_deadline}
                    onChange={(e) => setEditForm({ ...editForm, registration_deadline: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="label">Event URL</label>
                <input
                  type="url"
                  className="input"
                  value={editForm.event_url}
                  onChange={(e) => setEditForm({ ...editForm, event_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="label">Additional Notes</label>
                <textarea
                  className="input"
                  rows="3"
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                />
              </div>
            </div>
          ) : (
            <>
              {/* Event Info */}
              <div className="card">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Event Information</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Icon name="calendar" size={18} className="text-gray-600 mt-1" />
                      <div>
                        <div className="font-medium text-gray-900">Date</div>
                        <div className="text-gray-700">{formatDate(event.event_date)}</div>
                      </div>
                    </div>

                    {event.start_time && (
                      <div className="flex items-start gap-3">
                        <span className="text-gray-600 mt-1">🕐</span>
                        <div>
                          <div className="font-medium text-gray-900">Event Time</div>
                          <div className="text-gray-700">
                            {formatTime(event.start_time)}
                            {event.end_time && ` - ${formatTime(event.end_time)}`}
                          </div>
                        </div>
                      </div>
                    )}

                    {event.location && (
                      <div className="flex items-start gap-3">
                        <Icon name="location" size={18} className="text-gray-600 mt-1" />
                        <div>
                          <div className="font-medium text-gray-900">Location</div>
                          <div className="text-gray-700">{event.location}</div>
                        </div>
                      </div>
                    )}

                    {event.event_url && (
                      <div className="flex items-start gap-3">
                        <span className="text-gray-600 mt-1">🔗</span>
                        <div>
                          <div className="font-medium text-gray-900">Event Page</div>
                          <a
                            href={event.event_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary-600 hover:text-primary-700 underline"
                          >
                            View external event page
                          </a>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    {event.arrival_time && (
                      <div className="flex items-start gap-3">
                        <span className="text-gray-600 mt-1">⏰</span>
                        <div>
                          <div className="font-medium text-gray-900">Arrival Time</div>
                          <div className="text-gray-700">{formatTime(event.arrival_time)}</div>
                        </div>
                      </div>
                    )}

                    {event.captains_meeting_time && (
                      <div className="flex items-start gap-3">
                        <span className="text-gray-600 mt-1">👥</span>
                        <div>
                          <div className="font-medium text-gray-900">Captain's Meeting</div>
                          <div className="text-gray-700">
                            {formatTime(event.captains_meeting_time)}
                            {event.captains_meeting_location && ` at ${event.captains_meeting_location}`}
                          </div>
                        </div>
                      </div>
                    )}

                    {event.max_participants && (
                      <div className="flex items-start gap-3">
                        <span className="text-gray-600 mt-1">👤</span>
                        <div>
                          <div className="font-medium text-gray-900">Capacity</div>
                          <div className="text-gray-700">
                            {rsvpCounts.confirmed} confirmed / {event.max_participants} max
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {event.description && (
                  <div className="mt-6 pt-6 border-t">
                    <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                    <p className="text-gray-700 whitespace-pre-wrap">{event.description}</p>
                  </div>
                )}

                {event.notes && (
                  <div className="mt-6 pt-6 border-t">
                    <h3 className="font-semibold text-gray-900 mb-2">Additional Notes</h3>
                    <p className="text-gray-700 whitespace-pre-wrap">{event.notes}</p>
                  </div>
                )}
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="card bg-yellow-50">
                  <div className="text-2xl mb-1">🤔</div>
                  <div className="text-2xl font-bold text-yellow-600">{rsvpCounts.interested}</div>
                  <div className="text-sm text-gray-600">Interested</div>
                </div>

                <div className="card bg-blue-50">
                  <div className="text-2xl mb-1">✋</div>
                  <div className="text-2xl font-bold text-blue-600">{rsvpCounts.registered}</div>
                  <div className="text-sm text-gray-600">Registered</div>
                </div>

                <div className="card bg-green-50">
                  <div className="text-2xl mb-1">✅</div>
                  <div className="text-2xl font-bold text-green-600">{rsvpCounts.confirmed}</div>
                  <div className="text-sm text-gray-600">Confirmed</div>
                </div>

                <div className="card bg-purple-50">
                  <div className="text-2xl mb-1">🚗</div>
                  <div className="text-2xl font-bold text-purple-600">{eventCarpools.length}</div>
                  <div className="text-sm text-gray-600">Carpools</div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'participants' && (
        <div className="space-y-4">
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Participants ({eventRSVPs.length})
            </h2>

            <div className="space-y-4">
              {['confirmed', 'registered', 'interested', 'declined'].map(status => {
                const statusRSVPs = eventRSVPs.filter(r => r.status === status)
                if (statusRSVPs.length === 0) return null

                return (
                  <div key={status}>
                    <h3 className="font-medium text-gray-900 mb-2 capitalize">
                      {status} ({statusRSVPs.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {statusRSVPs.map(rsvp => (
                        <div
                          key={rsvp.id}
                          className="p-3 border rounded-lg bg-gray-50"
                        >
                          <div className="font-medium text-gray-900">
                            {rsvp.user_profile?.full_name}
                          </div>
                          {rsvp.role && (
                            <div className="text-sm text-gray-600 capitalize">{rsvp.role}</div>
                          )}
                          {rsvp.response_notes && (
                            <div className="text-sm text-gray-500 mt-1">{rsvp.response_notes}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}

              {eventRSVPs.length === 0 && (
                <p className="text-gray-600 text-center py-8">No RSVPs yet</p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'carpools' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Carpools</h2>
            {user && (
              <button
                onClick={() => setShowCarpoolForm(!showCarpoolForm)}
                className="btn btn-primary"
              >
                {showCarpoolForm ? 'Cancel' : '+ Offer Carpool'}
              </button>
            )}
          </div>

          {showCarpoolForm && (
            <div className="card bg-blue-50">
              <h3 className="font-semibold text-gray-900 mb-4">Offer a Carpool</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Vehicle Description</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g., Red Honda Civic"
                      value={carpoolForm.vehicle_description}
                      onChange={(e) => setCarpoolForm({ ...carpoolForm, vehicle_description: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="label">Total Seats Available *</label>
                    <input
                      type="number"
                      className="input"
                      min="1"
                      value={carpoolForm.total_seats}
                      onChange={(e) => setCarpoolForm({ ...carpoolForm, total_seats: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Departure Location *</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Where are you leaving from?"
                    value={carpoolForm.departure_location}
                    onChange={(e) => setCarpoolForm({ ...carpoolForm, departure_location: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Departure Time</label>
                    <input
                      type="time"
                      className="input"
                      value={carpoolForm.departure_time}
                      onChange={(e) => setCarpoolForm({ ...carpoolForm, departure_time: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="label">Return Time</label>
                    <input
                      type="time"
                      className="input"
                      value={carpoolForm.return_time}
                      onChange={(e) => setCarpoolForm({ ...carpoolForm, return_time: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Estimated Cost Per Person ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input"
                    placeholder="Gas money split"
                    value={carpoolForm.estimated_cost_per_person}
                    onChange={(e) => setCarpoolForm({ ...carpoolForm, estimated_cost_per_person: e.target.value })}
                  />
                </div>

                <div>
                  <label className="label">Notes</label>
                  <textarea
                    className="input"
                    rows="2"
                    placeholder="Any additional info..."
                    value={carpoolForm.notes}
                    onChange={(e) => setCarpoolForm({ ...carpoolForm, notes: e.target.value })}
                  />
                </div>

                <button onClick={handleCreateCarpool} className="btn btn-primary w-full">
                  Create Carpool
                </button>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {eventCarpools.map(carpool => {
              const availableSeats = carpool.available_seats
              const totalSeats = carpool.total_seats
              const passengers = carpool.passengers || []
              const isDriver = carpool.driver_id === user?.id
              const isPassenger = passengers.some(p => p.passenger_id === user?.id)

              return (
                <div key={carpool.id} className="card">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        🚗 {carpool.driver?.full_name}'s Carpool
                      </h3>
                      {carpool.vehicle_description && (
                        <p className="text-sm text-gray-600">{carpool.vehicle_description}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${availableSeats > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {availableSeats} / {totalSeats} seats available
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <span className="text-gray-600">From:</span>{' '}
                      <span className="text-gray-900">{carpool.departure_location}</span>
                    </div>
                    {carpool.departure_time && (
                      <div>
                        <span className="text-gray-600">Leaving:</span>{' '}
                        <span className="text-gray-900">{formatTime(carpool.departure_time)}</span>
                      </div>
                    )}
                    {carpool.return_time && (
                      <div>
                        <span className="text-gray-600">Returning:</span>{' '}
                        <span className="text-gray-900">{formatTime(carpool.return_time)}</span>
                      </div>
                    )}
                    {carpool.estimated_cost_per_person && (
                      <div>
                        <span className="text-gray-600">Cost:</span>{' '}
                        <span className="text-gray-900">${carpool.estimated_cost_per_person}/person</span>
                      </div>
                    )}
                  </div>

                  {passengers.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Passengers:</h4>
                      <div className="flex flex-wrap gap-2">
                        {passengers.map(p => (
                          <span key={p.id} className="px-3 py-1 bg-gray-100 rounded-full text-sm">
                            {p.passenger?.full_name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {user && !isDriver && (
                    <div className="pt-4 border-t">
                      {isPassenger ? (
                        <button
                          onClick={() => leaveCarpool(carpool.id, user.id, eventId)}
                          className="btn bg-red-600 text-white hover:bg-red-700"
                        >
                          Leave Carpool
                        </button>
                      ) : availableSeats > 0 ? (
                        <button
                          onClick={() => joinCarpool(carpool.id, user.id, eventId)}
                          className="btn btn-primary"
                        >
                          Join Carpool
                        </button>
                      ) : (
                        <button disabled className="btn btn-secondary opacity-50 cursor-not-allowed">
                          Carpool Full
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}

            {eventCarpools.length === 0 && !showCarpoolForm && (
              <div className="card text-center py-12">
                <p className="text-gray-600">No carpools offered yet</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'finances' && (
        <div className="space-y-6">
          {(hasRole('admin') || hasRole('coach')) && (
            <div className="flex justify-end">
              <button
                onClick={() => setShowExpenseForm(!showExpenseForm)}
                className="btn btn-primary"
              >
                {showExpenseForm ? 'Cancel' : '+ Add Expense'}
              </button>
            </div>
          )}

          {showExpenseForm && (
            <div className="card bg-blue-50">
              <h3 className="font-semibold text-gray-900 mb-4">Add Expense</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Expense Type *</label>
                    <select
                      className="input"
                      value={expenseForm.expense_type}
                      onChange={(e) => setExpenseForm({ ...expenseForm, expense_type: e.target.value })}
                    >
                      <option value="registration_fee">Registration Fee</option>
                      <option value="equipment_rental">Equipment Rental</option>
                      <option value="accommodation">Accommodation</option>
                      <option value="meals">Meals</option>
                      <option value="transportation">Transportation</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="label">Amount ($) *</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input"
                      value={expenseForm.amount}
                      onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Description *</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="What is this expense for?"
                    value={expenseForm.description}
                    onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Due Date</label>
                    <input
                      type="date"
                      className="input"
                      value={expenseForm.due_date}
                      onChange={(e) => setExpenseForm({ ...expenseForm, due_date: e.target.value })}
                    />
                  </div>

                  <div className="flex items-center">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={expenseForm.is_shared}
                        onChange={(e) => setExpenseForm({ ...expenseForm, is_shared: e.target.checked })}
                        className="w-5 h-5 text-primary-600 rounded"
                      />
                      <span className="text-sm text-gray-700">Split among participants</span>
                    </label>
                  </div>
                </div>

                <button onClick={handleCreateExpense} className="btn btn-primary w-full">
                  Add Expense
                </button>
              </div>
            </div>
          )}

          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Expenses</h2>

            {eventExpenses.length > 0 ? (
              <div className="space-y-3">
                {eventExpenses.map(expense => (
                  <div key={expense.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-900">{expense.description}</h4>
                        <p className="text-sm text-gray-600 capitalize">{expense.expense_type.replace('_', ' ')}</p>
                        {expense.is_shared && (
                          <span className="inline-block px-2 py-1 mt-1 text-xs bg-blue-100 text-blue-800 rounded">
                            Shared Expense
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-gray-900">${expense.amount}</div>
                        {expense.due_date && (
                          <div className="text-sm text-gray-600">
                            Due: {format(new Date(expense.due_date), 'MMM d')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-900">Total</span>
                    <span className="text-2xl font-bold text-gray-900">
                      ${eventExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-600 text-center py-8">No expenses recorded</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'waivers' && (
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Waivers & Documents</h2>
          {eventWaivers.length > 0 ? (
            <div className="space-y-4">
              {eventWaivers.map(waiver => {
                const signatures = waiver_signatures[waiver.id] || []
                const userSigned = signatures.some(s => s.user_id === user?.id)

                return (
                  <div key={waiver.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">{waiver.title}</h3>
                        {waiver.required && (
                          <span className="inline-block px-2 py-1 mt-1 text-xs bg-red-100 text-red-800 rounded">
                            Required
                          </span>
                        )}
                      </div>
                      {user && (
                        <div>
                          {userSigned ? (
                            <span className="px-3 py-1 bg-green-100 text-green-800 rounded font-medium">
                              ✓ Signed
                            </span>
                          ) : (
                            <button
                              onClick={() => signWaiver(waiver.id, user.id)}
                              className="btn btn-primary"
                            >
                              Sign Waiver
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {waiver.description && (
                      <p className="text-gray-600 text-sm mb-3">{waiver.description}</p>
                    )}

                    {waiver.waiver_url && (
                      <a
                        href={waiver.waiver_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:text-primary-700 text-sm underline"
                      >
                        View waiver document
                      </a>
                    )}

                    <div className="mt-3 pt-3 border-t text-sm text-gray-600">
                      {signatures.length} {signatures.length === 1 ? 'person has' : 'people have'} signed
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-gray-600 text-center py-8">No waivers required</p>
          )}
        </div>
      )}

      {activeTab === 'races' && (
        <div className="space-y-4">
          {(hasRole('admin') || hasRole('coach')) && (
            <div className="flex justify-end">
              <button
                onClick={() => setShowRaceForm(!showRaceForm)}
                className="btn btn-primary"
              >
                {showRaceForm ? 'Cancel' : '+ Add Race'}
              </button>
            </div>
          )}

          {showRaceForm && (
            <div className="card bg-blue-50">
              <h3 className="font-semibold text-gray-900 mb-4">Add Race</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Race Name *</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g., Heat 1 - Mixed Division"
                      value={raceForm.race_name}
                      onChange={(e) => setRaceForm({ ...raceForm, race_name: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="label">Race Number</label>
                    <input
                      type="number"
                      className="input"
                      value={raceForm.race_number}
                      onChange={(e) => setRaceForm({ ...raceForm, race_number: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Distance</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g., 200m, 500m"
                      value={raceForm.distance}
                      onChange={(e) => setRaceForm({ ...raceForm, distance: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="label">Race Type</label>
                    <select
                      className="input"
                      value={raceForm.race_type}
                      onChange={(e) => setRaceForm({ ...raceForm, race_type: e.target.value })}
                    >
                      <option value="">Select type</option>
                      <option value="heat">Heat</option>
                      <option value="semi-final">Semi-Final</option>
                      <option value="final">Final</option>
                      <option value="mixed">Mixed</option>
                      <option value="open">Open</option>
                      <option value="womens">Women's</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="label">Scheduled Time</label>
                  <input
                    type="time"
                    className="input"
                    value={raceForm.scheduled_time}
                    onChange={(e) => setRaceForm({ ...raceForm, scheduled_time: e.target.value })}
                  />
                </div>

                <div>
                  <label className="label">Notes</label>
                  <textarea
                    className="input"
                    rows="2"
                    value={raceForm.notes}
                    onChange={(e) => setRaceForm({ ...raceForm, notes: e.target.value })}
                  />
                </div>

                <button onClick={handleCreateRace} className="btn btn-primary w-full">
                  Add Race
                </button>
              </div>
            </div>
          )}

          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Race Schedule</h2>

            {eventRaces.length > 0 ? (
              <div className="space-y-3">
                {eventRaces.map(race => (
                  <div key={race.id} className="p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          {race.race_number && (
                            <span className="px-2 py-1 bg-primary-100 text-primary-800 rounded text-sm font-medium">
                              #{race.race_number}
                            </span>
                          )}
                          <h3 className="font-semibold text-gray-900">{race.race_name}</h3>
                        </div>
                        <div className="mt-1 text-sm text-gray-600 space-x-3">
                          {race.distance && <span>📏 {race.distance}</span>}
                          {race.race_type && <span className="capitalize">• {race.race_type}</span>}
                          {race.scheduled_time && <span>• ⏰ {formatTime(race.scheduled_time)}</span>}
                        </div>
                        {race.notes && (
                          <p className="mt-2 text-sm text-gray-600">{race.notes}</p>
                        )}
                      </div>
                      <div className="text-right">
                        {race.finish_position && (
                          <div className="text-2xl font-bold text-gray-900">
                            {race.finish_position === 1 && '🥇'}
                            {race.finish_position === 2 && '🥈'}
                            {race.finish_position === 3 && '🥉'}
                            {race.finish_position > 3 && `#${race.finish_position}`}
                          </div>
                        )}
                        {race.finish_time && (
                          <div className="text-sm text-gray-600">{race.finish_time}</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 text-center py-8">No races scheduled</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'tasks' && (
        <div className="space-y-4">
          {(hasRole('admin') || hasRole('coach')) && (
            <div className="flex justify-end">
              <button
                onClick={() => setShowTaskForm(!showTaskForm)}
                className="btn btn-primary"
              >
                {showTaskForm ? 'Cancel' : '+ Add Task'}
              </button>
            </div>
          )}

          {showTaskForm && (
            <div className="card bg-blue-50">
              <h3 className="font-semibold text-gray-900 mb-4">Add Task</h3>
              <div className="space-y-4">
                <div>
                  <label className="label">Task Title *</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g., Book hotel rooms"
                    value={taskForm.title}
                    onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  />
                </div>

                <div>
                  <label className="label">Description</label>
                  <textarea
                    className="input"
                    rows="2"
                    value={taskForm.description}
                    onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Category</label>
                    <select
                      className="input"
                      value={taskForm.task_category}
                      onChange={(e) => setTaskForm({ ...taskForm, task_category: e.target.value })}
                    >
                      <option value="logistics">Logistics</option>
                      <option value="equipment">Equipment</option>
                      <option value="registration">Registration</option>
                      <option value="coordination">Coordination</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="label">Priority</label>
                    <select
                      className="input"
                      value={taskForm.priority}
                      onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Assign To</label>
                    <select
                      className="input"
                      value={taskForm.assigned_to}
                      onChange={(e) => setTaskForm({ ...taskForm, assigned_to: e.target.value })}
                    >
                      <option value="">Unassigned</option>
                      {members.filter(m => m.is_active).map(member => (
                        <option key={member.id} value={member.id}>
                          {member.full_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="label">Due Date</label>
                    <input
                      type="date"
                      className="input"
                      value={taskForm.due_date}
                      onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                    />
                  </div>
                </div>

                <button onClick={handleCreateTask} className="btn btn-primary w-full">
                  Create Task
                </button>
              </div>
            </div>
          )}

          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Task Checklist</h2>

            {eventTasks.length > 0 ? (
              <div className="space-y-2">
                {eventTasks.map(task => {
                  const getPriorityColor = (priority) => {
                    switch (priority) {
                      case 'urgent': return 'bg-red-100 text-red-800'
                      case 'high': return 'bg-orange-100 text-orange-800'
                      case 'medium': return 'bg-yellow-100 text-yellow-800'
                      default: return 'bg-gray-100 text-gray-800'
                    }
                  }

                  const isDueSoon = task.due_date && !task.completed &&
                    new Date(task.due_date) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

                  return (
                    <div
                      key={task.id}
                      className={`p-4 border rounded-lg ${
                        task.completed ? 'bg-green-50 border-green-200' : 'bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={task.completed}
                          onChange={(e) => toggleTask(task.id, eventId, e.target.checked, user.id)}
                          className="w-5 h-5 mt-0.5 text-primary-600 rounded"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className={`font-semibold ${task.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                              {task.title}
                            </h4>
                            <span className={`px-2 py-0.5 text-xs rounded ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </span>
                            {task.task_category && (
                              <span className="px-2 py-0.5 text-xs rounded bg-blue-100 text-blue-800 capitalize">
                                {task.task_category}
                              </span>
                            )}
                          </div>

                          {task.description && (
                            <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                          )}

                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                            {task.assigned_to_profile && (
                              <span>👤 {task.assigned_to_profile.full_name}</span>
                            )}
                            {task.due_date && (
                              <span className={isDueSoon && !task.completed ? 'text-red-600 font-medium' : ''}>
                                <Icon name="calendar" size={14} className="inline text-gray-500 mr-1" />
                                Due: {format(new Date(task.due_date), 'MMM d')}
                              </span>
                            )}
                            {task.completed && task.completed_by_profile && (
                              <span className="text-green-600">
                                ✓ Completed by {task.completed_by_profile.full_name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-gray-600 text-center py-8">No tasks created</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
