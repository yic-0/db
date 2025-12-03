import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useEventStore } from '../store/eventStore'
import { useAuthStore } from '../store/authStore'
import { useRosterStore } from '../store/rosterStore'
import { useLineupStore } from '../store/lineupStore'
import { usePracticeStore } from '../store/practiceStore'
import { useDeadlineStore } from '../store/deadlineStore'
import Icon from '../components/Icon'
import LineupViewer from '../components/LineupViewer'
import EventRegistrationForm from '../components/EventRegistrationForm'
import CheckInButton from '../components/CheckInButton'
import CarpoolMap from '../components/CarpoolMap'
import VenueMap from '../components/VenueMap'
import AddressSearchInput from '../components/AddressSearchInput'
import { format, isPast, isToday, isTomorrow, differenceInDays, differenceInHours, differenceInMinutes, parseISO } from 'date-fns'
import toast from 'react-hot-toast'
import { Linkify } from '../utils/linkify'
import { parseGoogleMapsLink } from '../utils/parseGoogleMapsLink'
import { supabase } from '../lib/supabase'

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

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000 // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c // Distance in meters
}

// Format distance for display
function formatDistance(meters) {
  if (meters < 1000) {
    return `${Math.round(meters)}m`
  }
  return `${(meters / 1000).toFixed(1)}km`
}

export default function EventDetail() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const {
    events,
    loading: eventsLoading,
    rsvps,
    carpools,
    expenses,
    payments,
    waivers,
    waiver_signatures,
    races,
    teams,
    tasks,
    fetchEvents,
    fetchRSVPs,
    fetchCarpools,
    fetchExpenses,
    fetchPayments,
    fetchWaivers,
    fetchRaces,
    fetchEventTeams,
    createEventTeam,
    updateEventTeam,
    deleteEventTeam,
    addTeamMember,
    removeTeamMember,
    updateTeamMemberRole,
    fetchTasks,
    setRSVP,
    createCarpool,
    updateCarpool,
    joinCarpool,
    leaveCarpool,
    deleteCarpool,
    toggleCarpoolVisibility,
    addPassengerToCarpool,
    createExpense,
    recordPayment,
    signWaiver,
    createRace,
    updateRace,
    deleteRace,
    createTask,
    toggleTask,
    updateEvent,
    deleteEvent,
    uploadEventPhoto,
    deleteEventPhoto,
    packingItems,
    fetchPackingItems,
    addPackingItem,
    updatePackingItem,
    deletePackingItem,
    updateTeamRequirements,
    validateAgainstRequirements,
    // Accommodations
    accommodations,
    fetchEventAccommodations,
    createAccommodation,
    updateAccommodation,
    deleteAccommodation,
    createRoom,
    deleteRoom,
    assignMemberToAccommodation,
    removeAccommodationAssignment
  } = useEventStore()
  const { user, hasRole } = useAuthStore()
  const { members, fetchMembers } = useRosterStore()
  const {
    lineups: allLineups,
    fetchLineups,
    fetchEventLineups,
    linkLineupToEvent,
    unlinkLineupFromEvent,
    toggleLineupVisibility
  } = useLineupStore()
  const { selfCheckInEvent, undoEventCheckIn, adminToggleEventCheckIn } = usePracticeStore()
  const {
    deadlines,
    fetchDeadlines,
    createDeadline,
    updateDeadline,
    deleteDeadline,
    toggleDeadlineVisibility,
    getDeadlinesByEvent
  } = useDeadlineStore()

  // Tab state - consolidated tabs (read initial tab from URL hash)
  // New tab names: event (overview), attendance (team), carpools (travel), raceday, accommodation, photos, manage (admin)
  const validTabs = ['event', 'attendance', 'carpools', 'raceday', 'accommodation', 'photos', 'manage']
  const getInitialTab = () => {
    const hash = window.location.hash.slice(1) // Remove '#' from hash
    // Support legacy tab names for backwards compatibility
    const legacyMap = { 'overview': 'event', 'team': 'attendance', 'travel': 'carpools', 'admin': 'manage' }
    const mappedHash = legacyMap[hash] || hash
    console.log('🔍 Reading initial tab from hash:', { fullHash: window.location.hash, parsedHash: mappedHash, isValid: validTabs.includes(mappedHash) })
    return validTabs.includes(mappedHash) ? mappedHash : 'event'
  }
  const [activeTab, setActiveTab] = useState(getInitialTab())

  // Ensure hash is read on mount (in case useState didn't catch it)
  useEffect(() => {
    const hash = window.location.hash.slice(1)
    const legacyMap = { 'overview': 'event', 'team': 'attendance', 'travel': 'carpools', 'admin': 'manage' }
    const mappedHash = legacyMap[hash] || hash
    if (mappedHash && validTabs.includes(mappedHash) && activeTab !== mappedHash) {
      console.log('🔄 Correcting tab from hash on mount:', mappedHash)
      setActiveTab(mappedHash)
    }
  }, []) // Run once on mount

  const [eventLineups, setEventLineups] = useState([])
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [selectedLineupId, setSelectedLineupId] = useState('')
  const [boatName, setBoatName] = useState('')
  const [linkingLoading, setLinkingLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [initialLoadComplete, setInitialLoadComplete] = useState(false)

  // Event registration state
  const [showRegistrationForm, setShowRegistrationForm] = useState(false)
  const [registrationConfig, setRegistrationConfig] = useState(null)
  const [existingRegistration, setExistingRegistration] = useState(null)
  const [allEventRegistrations, setAllEventRegistrations] = useState([])
  const [registrationLoading, setRegistrationLoading] = useState(false)

  // Weather state
  const [weather, setWeather] = useState(null)
  const [weatherLoading, setWeatherLoading] = useState(false)

  // Photo upload state
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState(null)

  // Collapsible sections state (for mobile-friendly compact view)
  const [expandedSections, setExpandedSections] = useState({
    notes: true,
    instructions: true,
    description: true
  })
  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  // "View as Paddler" mode - allows admin/coach to see what regular members see
  const [viewAsPaddler, setViewAsPaddler] = useState(false)

  // Saved locations state (for carpool map)
  const [savedLocations, setSavedLocations] = useState([])

  // Packing list state - checked items (for both admin items and personal items)
  const [packingList, setPackingList] = useState(() => {
    const saved = localStorage.getItem(`packing-${eventId}`)
    return saved ? JSON.parse(saved) : {}
  })
  // Personal packing items (stored in localStorage)
  const [personalPackingItems, setPersonalPackingItems] = useState(() => {
    const saved = localStorage.getItem(`packing-personal-${eventId}`)
    return saved ? JSON.parse(saved) : []
  })
  const [showPackingForm, setShowPackingForm] = useState(false)
  const [packingFormItem, setPackingFormItem] = useState('')
  const [packingFormCategory, setPackingFormCategory] = useState('general')
  const [packingFormRequired, setPackingFormRequired] = useState(true)

  // Form states
  const [showCarpoolForm, setShowCarpoolForm] = useState(false)
  const [editingCarpoolId, setEditingCarpoolId] = useState(null)
  const [isSavingCarpool, setIsSavingCarpool] = useState(false)
  const [carpoolForm, setCarpoolForm] = useState({
    vehicle_description: '',
    total_seats: '',
    departure_location: '',
    departure_lat: null,
    departure_lng: null,
    final_destination: '',
    final_lat: null,
    final_lng: null,
    pickup_stops: [],
    dropoff_stops: [],
    departure_time: '',
    return_time: '',
    estimated_cost_per_person: '',
    notes: '',
    carpool_direction: 'both', // 'to', 'from', or 'both'
    whatsapp_link: ''
  })

  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [expenseForm, setExpenseForm] = useState({
    expense_type: 'registration_fee',
    description: '',
    amount: '',
    due_date: '',
    is_shared: false,
    notes: ''
  })

  const [showRaceForm, setShowRaceForm] = useState(false)
  const [editingRaceId, setEditingRaceId] = useState(null)
  const [raceForm, setRaceForm] = useState({
    race_name: '',
    race_number: '',
    distance: '',
    race_type: '',
    scheduled_time: '',
    team_id: '',
    notes: ''
  })
  const [isImportingRaces, setIsImportingRaces] = useState(false)
  const raceImportInputRef = useRef(null)

  // Team management state
  const [showTeamForm, setShowTeamForm] = useState(false)
  const [editingTeamId, setEditingTeamId] = useState(null)
  const [teamForm, setTeamForm] = useState({
    team_name: '',
    team_color: '#3B82F6',
    notes: ''
  })
  const [expandedTeamIds, setExpandedTeamIds] = useState(new Set())
  const [editingTeamRequirementsId, setEditingTeamRequirementsId] = useState(null)
  const [teamRequirementsForm, setTeamRequirementsForm] = useState({
    division_name: '',
    min_paddlers: '',
    max_paddlers: '',
    gender_ratio: '',
    min_female: '',
    max_female: '',
    min_male: '',
    max_male: '',
    min_age: '',
    max_age: '',
    corporate_only: false
  })
  const [teamFilter, setTeamFilter] = useState('all') // 'all' or team_id

  const [showTaskForm, setShowTaskForm] = useState(false)
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    task_category: 'logistics',
    assigned_to: '',
    due_date: '',
    priority: 'medium'
  })

  // Deadline form state
  const [showDeadlineForm, setShowDeadlineForm] = useState(false)
  const [editingDeadlineId, setEditingDeadlineId] = useState(null)
  const [deadlineForm, setDeadlineForm] = useState({
    title: '',
    deadline_date: '',
    deadline_time: '',
    description: '',
    deadline_type: 'custom',
    is_visible_to_members: false
  })

  // Accommodation state
  const [showAccommodationForm, setShowAccommodationForm] = useState(false)
  const [editingAccommodationId, setEditingAccommodationId] = useState(null)
  const [accommodationForm, setAccommodationForm] = useState({
    name: '',
    address: '',
    booking_link: '',
    check_in: '',
    check_out: '',
    price_info: '',
    total_capacity: '',
    notes: '',
    contact_info: '',
    is_primary: false
  })
  const [expandedAccommodationId, setExpandedAccommodationId] = useState(null)
  const [assigningToAccommodationId, setAssigningToAccommodationId] = useState(null)
  // Room management state
  const [showRoomFormFor, setShowRoomFormFor] = useState(null) // accommodation id
  const [roomForm, setRoomForm] = useState({ room_label: '', capacity: 2, notes: '' })
  const [assigningToRoomId, setAssigningToRoomId] = useState(null)
  // Drag and drop state for room assignments
  const [draggingMember, setDraggingMember] = useState(null) // { userId, name, fromAccommodationId, fromRoomId }
  const [dragOverRoomId, setDragOverRoomId] = useState(null)
  const [dragOverUnassignedId, setDragOverUnassignedId] = useState(null) // accommodation id for unassigned drop zone

  const event = events.find(e => e.id === eventId)
  const isAdminOrCoach = hasRole('admin') || hasRole('coach')
  // Effective admin status - false when viewing as paddler
  const effectiveIsAdmin = isAdminOrCoach && !viewAsPaddler
  const eventRSVPs = rsvps[eventId] || []
  const allEventCarpools = carpools[eventId] || []
  // Filter carpools by visibility for non-admin users
  const eventCarpools = isAdminOrCoach
    ? allEventCarpools
    : allEventCarpools.filter(c => c.is_visible !== false)
  const eventExpenses = expenses[eventId] || []
  const eventPayments = payments[eventId] || []
  const eventWaivers = waivers[eventId] || []
  const eventRaces = races[eventId] || []
  const eventTeams = teams[eventId] || []
  const eventTasks = tasks[eventId] || []
  const eventAccommodations = accommodations[eventId] || []

  // Calculate which members are on multiple teams (for duplicate indicator)
  const memberTeamCounts = useMemo(() => {
    const counts = {}
    eventTeams.forEach(team => {
      team.members?.forEach(member => {
        if (!counts[member.user_id]) {
          counts[member.user_id] = []
        }
        counts[member.user_id].push(team.team_name)
      })
    })
    return counts
  }, [eventTeams])

  // Helper to check if team has any requirements set
  const teamHasRequirements = (team) => {
    return team.min_paddlers || team.max_paddlers ||
           team.min_female || team.max_female ||
           team.min_male || team.max_male ||
           team.gender_ratio || team.min_age || team.max_age ||
           team.corporate_only
  }

  // Validate each team against its own requirements
  const teamValidations = useMemo(() => {
    const validations = {}
    eventTeams.forEach(team => {
      // Skip if team has no requirements set
      if (!teamHasRequirements(team)) {
        validations[team.id] = null
        return
      }

      // Map team members to format needed for validation
      const membersForValidation = (team.members || []).map(m => ({
        ...m.profile,
        exclude_from_count: m.exclude_from_count,
        position_role: m.position_role
      }))

      // Use the team's own requirements
      const teamRequirements = {
        min_paddlers: team.min_paddlers,
        max_paddlers: team.max_paddlers,
        min_female: team.min_female,
        max_female: team.max_female,
        min_male: team.min_male,
        max_male: team.max_male,
        gender_ratio: team.gender_ratio,
        min_age: team.min_age,
        max_age: team.max_age,
        corporate_only: team.corporate_only
      }

      validations[team.id] = validateAgainstRequirements(
        membersForValidation,
        teamRequirements,
        event?.event_date
      )
    })
    return validations
  }, [eventTeams, event?.event_date, validateAgainstRequirements])

  // Get deadlines for this event (filtered by visibility for non-admins)
  const eventDeadlines = deadlines.filter(d => {
    if (d.event_id !== eventId) return false
    if (isAdminOrCoach) return true
    return d.is_visible_to_members
  })

  // User's RSVP - moved before conditional returns for hook consistency
  const userRSVP = eventRSVPs.find(r => r.user_id === user?.id)

  // Default packing items for dragon boat
  const defaultPackingItems = [
    { id: 'paddle', name: 'Paddle', category: 'equipment' },
    { id: 'pfd', name: 'PFD / Life Jacket', category: 'equipment' },
    { id: 'seat_pad', name: 'Seat Pad', category: 'equipment' },
    { id: 'team_jersey', name: 'Team Jersey', category: 'clothing' },
    { id: 'shorts', name: 'Shorts/Racing Bottoms', category: 'clothing' },
    { id: 'water_shoes', name: 'Water Shoes', category: 'clothing' },
    { id: 'change_clothes', name: 'Change of Clothes', category: 'clothing' },
    { id: 'towel', name: 'Towel', category: 'personal' },
    { id: 'sunscreen', name: 'Sunscreen', category: 'personal' },
    { id: 'sunglasses', name: 'Sunglasses', category: 'personal' },
    { id: 'hat', name: 'Hat/Cap', category: 'personal' },
    { id: 'water_bottle', name: 'Water Bottle', category: 'personal' },
    { id: 'snacks', name: 'Snacks/Food', category: 'personal' },
    { id: 'cash', name: 'Cash for Food/Parking', category: 'personal' },
    { id: 'phone_bag', name: 'Waterproof Phone Bag', category: 'optional' },
    { id: 'rain_jacket', name: 'Rain Jacket', category: 'optional' },
  ]

  // Fix for browser tab switching breaking click events
  // When user switches away and back, pointer events can get "stuck"
  const [visibilityKey, setVisibilityKey] = useState(0)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Force a state update to "wake up" React's event system
        setVisibilityKey(k => k + 1)
        // Also dispatch a synthetic pointer event to clear any stuck states
        document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }))
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  useEffect(() => {
    const loadInitialData = async () => {
      await fetchEvents()
      setInitialLoadComplete(true)
    }
    loadInitialData()
    fetchMembers()
    fetchLineups()
    fetchDeadlines()
    if (eventId) {
      fetchPackingItems(eventId)
      fetchEventAccommodations(eventId)
    }
  }, [fetchEvents, fetchMembers, fetchLineups, fetchDeadlines, eventId, fetchPackingItems, fetchEventAccommodations])

  // Sync activeTab with URL hash (persist tab on refresh)
  useEffect(() => {
    // Update URL hash when tab changes (without triggering navigation)
    const newHash = activeTab === 'overview' ? '' : `#${activeTab}`
    const desiredPath = `${location.pathname}${newHash}`

    // Only update if the path is different
    if (window.location.pathname + window.location.hash !== desiredPath) {
      window.history.replaceState(null, '', desiredPath)
    }
  }, [activeTab, location.pathname])

  // Listen for hash changes and update activeTab (for browser back/forward)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1) // Remove '#'
      if (hash && validTabs.includes(hash)) {
        setActiveTab(hash)
      } else if (!hash) {
        setActiveTab('overview')
      }
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [validTabs])

  // Load user's saved locations for carpool map
  useEffect(() => {
    const loadSavedLocations = async () => {
      if (!user?.id) return
      try {
        const { data, error } = await supabase
          .from('user_saved_locations')
          .select('*')
          .eq('user_id', user.id)
          .order('is_default', { ascending: false })
          .order('label')
        if (!error && data) {
          setSavedLocations(data)
        }
      } catch (err) {
        console.error('Error loading saved locations:', err)
      }
    }
    loadSavedLocations()
  }, [user?.id])

  // Refetch event-specific data when eventId changes (e.g., navigating between events)
  useEffect(() => {
    if (eventId) {
      // Refetch the main events to ensure we have fresh data
      fetchEvents()

      // Fetch all event-specific data
      Promise.all([
        fetchRSVPs(eventId),
        fetchCarpools(eventId),
        fetchExpenses(eventId),
        fetchPayments(eventId),
        fetchWaivers(eventId),
        fetchRaces(eventId),
        fetchEventTeams(eventId),
        fetchTasks(eventId)
      ])
    }
  }, [eventId, fetchEvents, fetchRSVPs, fetchCarpools, fetchExpenses, fetchPayments, fetchWaivers, fetchRaces, fetchEventTeams, fetchTasks])

  useEffect(() => {
    const loadEventLineups = async () => {
      if (eventId) {
        const result = await fetchEventLineups(eventId)
        if (result.success) {
          setEventLineups(result.data)
        }
      }
    }
    loadEventLineups()
  }, [eventId, fetchEventLineups])

  // Fetch event registration config and user's existing registration
  useEffect(() => {
    const fetchRegistrationData = async () => {
      if (!eventId) return
      setRegistrationLoading(true)
      try {
        // Fetch registration config for this event (maybeSingle to avoid 406 if not found)
        const { data: configData } = await supabase
          .from('event_registration_config')
          .select('*')
          .eq('event_id', eventId)
          .maybeSingle()

        setRegistrationConfig(configData)

        // Fetch user's existing registration
        if (user) {
          const { data: regData } = await supabase
            .from('event_registrations')
            .select('*')
            .eq('event_id', eventId)
            .eq('user_id', user.id)
            .maybeSingle()

          setExistingRegistration(regData)
        }

        // Fetch ALL event registrations (for carpool display)
        const { data: allRegs } = await supabase
          .from('event_registrations')
          .select(`
            *,
            profile:profiles(id, full_name, phone)
          `)
          .eq('event_id', eventId)

        setAllEventRegistrations(allRegs || [])
      } catch (error) {
        // No config or registration exists - that's fine
      } finally {
        setRegistrationLoading(false)
      }
    }
    fetchRegistrationData()
  }, [eventId, user])

  // Fetch weather based on location (uses stored coordinates if available, else geocodes)
  useEffect(() => {
    const fetchWeather = async () => {
      if (!event?.event_date) {
        console.log('Weather: No event date')
        return
      }

      // Parse coordinates (might be stored as strings)
      const venueLat = event?.venue_lat ? parseFloat(event.venue_lat) : null
      const venueLng = event?.venue_lng ? parseFloat(event.venue_lng) : null
      const hasCoords = venueLat !== null && venueLng !== null && !isNaN(venueLat) && !isNaN(venueLng)

      // Need either stored coordinates or a location name to geocode
      if (!hasCoords && !event?.location) {
        console.log('Weather: No coordinates or location')
        return
      }

      // Parse date properly to avoid timezone issues
      const eventDate = parseISO(event.event_date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const eventStartOfDay = new Date(eventDate)
      eventStartOfDay.setHours(0, 0, 0, 0)
      const daysUntil = differenceInDays(eventStartOfDay, today)

      console.log('Weather: Event date check -', { eventDate: event.event_date, daysUntil, hasCoords, venueLat, venueLng })

      // Only fetch weather if event is within 14 days and not past
      if (daysUntil > 14 || daysUntil < 0) {
        console.log('Weather: Event outside 14-day window')
        return
      }

      setWeatherLoading(true)
      try {
        let latitude, longitude, locationName

        // Use stored coordinates if available (more reliable)
        if (hasCoords) {
          latitude = venueLat
          longitude = venueLng
          locationName = event.location || 'Event venue'
          console.log('Weather: Using stored coordinates', { latitude, longitude })
        } else if (event.location) {
          // Fall back to geocoding - try progressively simpler location strings
          let geoData = null
          const locationVariants = [
            event.location, // Full location string
            event.location.split(',').slice(-2).join(',').trim(), // Last 2 parts (city, state/country)
            event.location.split(',').slice(-1)[0].trim(), // Last part only
            event.location.split(',')[0].trim() // First part (might be venue/city name)
          ].filter(s => s && s.length >= 2)

          for (const locStr of locationVariants) {
            try {
              const geoResponse = await fetch(
                `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(locStr)}&count=1`
              )
              geoData = await geoResponse.json()
              if (geoData.results && geoData.results.length > 0) {
                console.log('Weather: Geocoded using:', locStr)
                break
              }
            } catch (e) {
              console.warn('Geocoding failed for:', locStr)
            }
          }

          if (!geoData?.results || geoData.results.length === 0) {
            console.warn('Weather: Could not geocode:', event.location)
            setWeatherLoading(false)
            return
          }

          latitude = geoData.results[0].latitude
          longitude = geoData.results[0].longitude
          locationName = geoData.results[0].name
        } else {
          setWeatherLoading(false)
          return
        }

        // Fetch weather forecast (temperature in Fahrenheit)
        const weatherResponse = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=14&temperature_unit=fahrenheit`
        )
        const weatherData = await weatherResponse.json()

        if (weatherData.daily) {
          // Find the weather for the event date - use original string for exact match
          const dateStr = event.event_date.split('T')[0] // Handle both "2024-12-03" and "2024-12-03T00:00:00"
          const dayIndex = weatherData.daily.time.indexOf(dateStr)
          console.log('Weather: Looking for date', dateStr, 'in', weatherData.daily.time.slice(0, 5), 'found at index', dayIndex)

          if (dayIndex !== -1) {
            setWeather({
              code: weatherData.daily.weathercode[dayIndex],
              tempHigh: Math.round(weatherData.daily.temperature_2m_max[dayIndex]),
              tempLow: Math.round(weatherData.daily.temperature_2m_min[dayIndex]),
              precipChance: weatherData.daily.precipitation_probability_max[dayIndex],
              location: locationName
            })
          }
        }
      } catch (error) {
        console.error('Weather fetch error:', error)
      } finally {
        setWeatherLoading(false)
      }
    }

    fetchWeather()
  }, [event?.location, event?.event_date, event?.venue_lat, event?.venue_lng])

  useEffect(() => {
    if (event && isEditing) {
      setEditForm({
        title: event.title || '',
        event_type: event.event_type || 'race',
        description: event.description || '',
        location: event.location || '',
        location_link: event.location_link || '',
        venue_lat: event.venue_lat || null,
        venue_lng: event.venue_lng || null,
        event_date: event.event_date || '',
        start_time: event.start_time || '',
        end_time: event.end_time || '',
        arrival_time: event.arrival_time || '',
        captains_meeting_time: event.captains_meeting_time || '',
        captains_meeting_location: event.captains_meeting_location || '',
        max_participants: event.max_participants || '',
        registration_deadline: event.registration_deadline?.substring(0, 10) || '',
        status: event.status || 'planning',
        notes: event.notes || '',
        instructions: event.instructions || '',
        event_url: event.event_url || '',
        // Visibility toggles
        show_carpools: event.show_carpools !== false, // default true
        show_accommodation: event.show_accommodation || false, // default false
        show_attendance_to_members: event.show_attendance_to_members !== false, // default true
        show_team_composition: event.show_team_composition || false, // default false - hidden until published
        external_album_url: event.external_album_url || '',
        // Accommodation
        accommodation_info: event.accommodation_info || '',
        accommodation_address: event.accommodation_address || '',
        accommodation_checkin: event.accommodation_checkin || '',
        accommodation_checkout: event.accommodation_checkout || '',
        food_location_name: event.food_location_name || '',
        food_location_link: event.food_location_link || '',
        food_spots: event.food_spots || []
      })
    }
  }, [event, isEditing])

  // Save packing list to localStorage
  useEffect(() => {
    localStorage.setItem(`packing-${eventId}`, JSON.stringify(packingList))
  }, [packingList, eventId])

  // Save personal packing items to localStorage
  useEffect(() => {
    localStorage.setItem(`packing-personal-${eventId}`, JSON.stringify(personalPackingItems))
  }, [personalPackingItems, eventId])

  // Get admin-defined packing items for this event
  const eventPackingItems = packingItems[eventId] || []

  // My checklist calculations - must be before conditional returns (Rules of Hooks)
  const myChecklist = useMemo(() => {
    // Return empty if still loading
    if (!event) return []

    const items = []

    // RSVP status
    items.push({
      id: 'rsvp',
      label: 'RSVP',
      completed: !!userRSVP,
      status: userRSVP ? (userRSVP.status === 'yes' ? 'Going' : userRSVP.status === 'interested' ? 'Interested' : userRSVP.status === 'maybe' ? 'Maybe' : 'Not going') : 'Not responded'
    })

    // Carpool status
    const inCarpool = eventCarpools.some(c =>
      c.driver_id === user?.id || c.passengers?.some(p => p.passenger_id === user?.id)
    )
    items.push({
      id: 'carpool',
      label: 'Carpool',
      completed: inCarpool,
      status: inCarpool ? 'Sorted' : 'Need ride?'
    })

    // Waiver status
    const requiredWaivers = eventWaivers.filter(w => w.required)
    const signedWaivers = requiredWaivers.filter(w =>
      (waiver_signatures[w.id] || []).some(s => s.user_id === user?.id)
    )
    if (requiredWaivers.length > 0) {
      items.push({
        id: 'waiver',
        label: 'Waivers',
        completed: signedWaivers.length === requiredWaivers.length,
        status: `${signedWaivers.length}/${requiredWaivers.length} signed`
      })
    }

    // Packing status
    const packedCount = Object.values(packingList).filter(Boolean).length
    const totalItems = defaultPackingItems.length
    items.push({
      id: 'packing',
      label: 'Packed',
      completed: packedCount === totalItems,
      status: `${packedCount}/${totalItems} items`
    })

    return items
  }, [event, userRSVP, eventCarpools, eventWaivers, waiver_signatures, packingList, user?.id, defaultPackingItems.length])

  const checklistCompletion = myChecklist.length > 0
    ? Math.round((myChecklist.filter(i => i.completed).length / myChecklist.length) * 100)
    : 0

  // Show loading if:
  // 1. Events haven't been loaded yet (hard refresh scenario) - wait for initial load
  // 2. Or we're actively fetching and don't have the event yet
  const isLoading = (!initialLoadComplete && events.length === 0) || (eventsLoading && !event)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading event...</p>
        </div>
      </div>
    )
  }

  // Show not found only after loading is complete and event doesn't exist
  if (!event) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Icon name="events" size={32} className="text-slate-300" />
        </div>
        <p className="text-slate-600 mb-4">Event not found</p>
        <button onClick={() => navigate(-1)} className="btn btn-primary">
          Go Back
        </button>
      </div>
    )
  }

  // ========== Helper Functions ==========
  const formatDate = (dateStr) => {
    try {
      // Use parseISO for date-only strings to avoid timezone issues
      // parseISO treats date-only strings as local time, not UTC
      const date = dateStr.includes('T') ? new Date(dateStr) : parseISO(dateStr)
      return format(date, 'EEEE, MMM d, yyyy')
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

  const rsvpCounts = {
    yes: eventRSVPs.filter(r => r.status === 'yes').length,
    interested: eventRSVPs.filter(r => r.status === 'interested').length,
    maybe: eventRSVPs.filter(r => r.status === 'maybe').length,
    no: eventRSVPs.filter(r => r.status === 'no').length,
    total: eventRSVPs.length
  }

  // Countdown calculation
  const getCountdown = () => {
    // Parse as local date to avoid timezone issues with YYYY-MM-DD format
    const eventDate = parseISO(event.event_date)
    const now = new Date()

    // Set both dates to start of day for accurate day comparison
    const eventStartOfDay = new Date(eventDate)
    eventStartOfDay.setHours(0, 0, 0, 0)
    const nowStartOfDay = new Date(now)
    nowStartOfDay.setHours(0, 0, 0, 0)

    if (nowStartOfDay > eventStartOfDay) {
      return { isPast: true, text: 'Event has passed', days: 0 }
    }

    const days = differenceInDays(eventStartOfDay, nowStartOfDay)

    if (days > 1) {
      return { isPast: false, days, text: `${days} days` }
    } else if (days === 1) {
      return { isPast: false, days: 1, text: '1 day' }
    } else {
      // Today - show hours/minutes until event time (if available) or just "Today"
      return { isPast: false, days: 0, text: 'Today' }
    }
  }

  const countdown = getCountdown()

  // Helper to format name as "FirstName L."
  const formatShortName = (fullName) => {
    if (!fullName) return 'Unknown'
    const parts = fullName.trim().split(' ')
    if (parts.length === 1) return parts[0]
    const firstName = parts[0]
    const lastInitial = parts[parts.length - 1][0]
    return `${firstName} ${lastInitial}.`
  }

  // Check if event is eligible for self check-in (today or within event date range)
  const isEventCheckInEligible = () => {
    if (!event?.event_date) return false
    try {
      const eventDate = parseISO(event.event_date)
      // For single-day events, check if it's today
      if (!event.end_date) {
        return isToday(eventDate)
      }
      // For multi-day events, check if current date is within range
      const endDate = parseISO(event.end_date)
      const now = new Date()
      now.setHours(0, 0, 0, 0)
      return now >= eventDate && now <= endDate
    } catch {
      return false
    }
  }

  // ========== Event Handlers ==========
  const handleUpdateEvent = async () => {
    // Parse food location link if provided
    const foodLocationParsed = editForm.food_location_link
      ? parseGoogleMapsLink(editForm.food_location_link)
      : { lat: null, lng: null, name: null }

    const updatePayload = {
      ...editForm,
      start_time: editForm.start_time?.trim() || null,
      end_time: editForm.end_time?.trim() || null,
      arrival_time: editForm.arrival_time?.trim() || null,
      captains_meeting_time: editForm.captains_meeting_time?.trim() || null,
      location: editForm.location?.trim() || null,
      captains_meeting_location: editForm.captains_meeting_location?.trim() || null,
      event_url: editForm.event_url?.trim() || null,
      notes: editForm.notes?.trim() || null,
      instructions: editForm.instructions?.trim() || null,
      description: editForm.description?.trim() || null,
      max_participants: editForm.max_participants ? parseInt(editForm.max_participants) : null,
      registration_deadline: editForm.registration_deadline?.trim() || null,
      // Visibility toggles
      show_carpools: editForm.show_carpools ?? true,
      show_accommodation: editForm.show_accommodation ?? false,
      show_attendance_to_members: editForm.show_attendance_to_members ?? true,
      show_team_composition: editForm.show_team_composition ?? false,
      external_album_url: editForm.external_album_url?.trim() || null,
      // Accommodation details
      accommodation_info: editForm.accommodation_info?.trim() || null,
      accommodation_address: editForm.accommodation_address?.trim() || null,
      accommodation_checkin: editForm.accommodation_checkin?.trim() || null,
      accommodation_checkout: editForm.accommodation_checkout?.trim() || null,
      // Food locations
      food_location_name: editForm.food_location_name?.trim() || foodLocationParsed.name || null,
      food_location_link: editForm.food_location_link?.trim() || null,
      food_location_lat: foodLocationParsed.lat,
      food_location_lng: foodLocationParsed.lng,
      food_spots: editForm.food_spots || []
    }

    const result = await updateEvent(eventId, updatePayload)

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
        navigate(-1)
      }
    }
  }

  // Deadline handlers
  const handleCreateDeadline = async () => {
    if (!deadlineForm.title || !deadlineForm.deadline_date) {
      toast.error('Please provide a title and date')
      return
    }

    const result = await createDeadline({
      title: deadlineForm.title,
      deadline_date: deadlineForm.deadline_date,
      deadline_time: deadlineForm.deadline_time || null,
      description: deadlineForm.description || null,
      deadline_type: deadlineForm.deadline_type,
      event_id: eventId,
      is_visible_to_members: deadlineForm.is_visible_to_members
    })

    if (result.success) {
      setShowDeadlineForm(false)
      resetDeadlineForm()
    }
  }

  const handleEditDeadline = async () => {
    if (!deadlineForm.title || !deadlineForm.deadline_date) {
      toast.error('Please provide a title and date')
      return
    }

    const result = await updateDeadline(editingDeadlineId, {
      title: deadlineForm.title,
      deadline_date: deadlineForm.deadline_date,
      deadline_time: deadlineForm.deadline_time || null,
      description: deadlineForm.description || null,
      deadline_type: deadlineForm.deadline_type,
      is_visible_to_members: deadlineForm.is_visible_to_members
    })

    if (result.success) {
      setShowDeadlineForm(false)
      setEditingDeadlineId(null)
      resetDeadlineForm()
    }
  }

  const handleDeleteDeadline = async (deadlineId) => {
    const confirmed = window.confirm('Delete this deadline? This cannot be undone.')
    if (confirmed) {
      await deleteDeadline(deadlineId)
    }
  }

  const startEditDeadline = (deadline) => {
    setEditingDeadlineId(deadline.id)
    setDeadlineForm({
      title: deadline.title,
      deadline_date: deadline.deadline_date?.substring(0, 10) || '',
      deadline_time: deadline.deadline_time || '',
      description: deadline.description || '',
      deadline_type: deadline.deadline_type || 'custom',
      is_visible_to_members: deadline.is_visible_to_members || false
    })
    setShowDeadlineForm(true)
  }

  const resetDeadlineForm = () => {
    setDeadlineForm({
      title: '',
      deadline_date: '',
      deadline_time: '',
      description: '',
      deadline_type: 'custom',
      is_visible_to_members: false
    })
    setEditingDeadlineId(null)
  }

  const handleRSVP = async (status) => {
    await setRSVP(eventId, user.id, status)
  }

  // Photo upload handler
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB')
      return
    }

    setIsUploadingPhoto(true)
    await uploadEventPhoto(eventId, file)
    setIsUploadingPhoto(false)
    e.target.value = '' // Reset input
  }

  // Photo delete handler
  const handlePhotoDelete = async (photo) => {
    if (!confirm('Delete this photo?')) return
    await deleteEventPhoto(eventId, photo.id, photo.storage_path)
    setSelectedPhoto(null)
  }

  const handleRegistrationComplete = async () => {
    setShowRegistrationForm(false)
    // Refresh registration data
    const { data: regData } = await supabase
      .from('event_registrations')
      .select('*')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .maybeSingle()
    setExistingRegistration(regData)

    // Refresh ALL event registrations (for carpool display)
    const { data: allRegs } = await supabase
      .from('event_registrations')
      .select(`
        *,
        profile:profiles(id, full_name, phone)
      `)
      .eq('event_id', eventId)
    setAllEventRegistrations(allRegs || [])

    // Sync registration location to user's carpool (if they have one)
    if (regData && (regData.carpool_needs === 'can_drive')) {
      const userCarpool = eventCarpools.find(c => c.driver_id === user.id)
      if (userCarpool) {
        // Map registration fields to carpool fields
        const carpoolUpdates = {}
        if (regData.carpool_departure_lat) {
          carpoolUpdates.departure_lat = regData.carpool_departure_lat
          carpoolUpdates.departure_lng = regData.carpool_departure_lng
          carpoolUpdates.departure_location = regData.carpool_departure_location
        }
        if (regData.carpool_return_lat) {
          carpoolUpdates.final_lat = regData.carpool_return_lat
          carpoolUpdates.final_lng = regData.carpool_return_lng
          carpoolUpdates.final_location = regData.carpool_return_location
        }

        if (Object.keys(carpoolUpdates).length > 0) {
          await updateCarpool(userCarpool.id, eventId, carpoolUpdates)
        }
      }
    }
  }

  const handleCreateCarpool = async () => {
    if (!carpoolForm.total_seats || !carpoolForm.departure_location) {
      toast.error('Please fill in required fields')
      return
    }

    const result = await createCarpool({
      event_id: eventId,
      driver_id: user.id,
      vehicle_description: carpoolForm.vehicle_description || null,
      total_seats: parseInt(carpoolForm.total_seats),
      available_seats: parseInt(carpoolForm.total_seats),
      departure_location: carpoolForm.departure_location,
      final_destination: carpoolForm.final_destination || null,
      pickup_stops: carpoolForm.pickup_stops || [],
      dropoff_stops: carpoolForm.dropoff_stops || [],
      departure_time: carpoolForm.departure_time || null,
      return_time: carpoolForm.return_time || null,
      estimated_cost_per_person: carpoolForm.estimated_cost_per_person ? parseFloat(carpoolForm.estimated_cost_per_person) : null,
      notes: carpoolForm.notes || null,
      carpool_direction: carpoolForm.carpool_direction || 'both'
    })

    if (result.success) {
      setShowCarpoolForm(false)
      setCarpoolForm({
        vehicle_description: '',
        total_seats: '',
        departure_location: '',
        final_destination: '',
        pickup_stops: [],
        dropoff_stops: [],
        departure_time: '',
        return_time: '',
        estimated_cost_per_person: '',
        notes: '',
        carpool_direction: 'both',
        whatsapp_link: ''
      })
    }
  }

  const handleEditCarpool = (carpool) => {
    setEditingCarpoolId(carpool.id)
    setCarpoolForm({
      vehicle_description: carpool.vehicle_description || '',
      total_seats: carpool.total_seats?.toString() || '',
      departure_location: carpool.departure_location || '',
      departure_lat: carpool.departure_lat || null,
      departure_lng: carpool.departure_lng || null,
      final_destination: carpool.final_destination || carpool.final_location || '',
      final_lat: carpool.final_lat || null,
      final_lng: carpool.final_lng || null,
      pickup_stops: carpool.pickup_stops || [],
      dropoff_stops: carpool.dropoff_stops || [],
      departure_time: carpool.departure_time || '',
      return_time: carpool.return_time || '',
      estimated_cost_per_person: carpool.estimated_cost_per_person?.toString() || '',
      notes: carpool.notes || '',
      carpool_direction: carpool.carpool_direction || 'both',
      whatsapp_link: carpool.whatsapp_link || ''
    })
  }

  const handleUpdateCarpool = async () => {
    // Prevent double-clicks
    if (isSavingCarpool) {
      console.log('🚗 handleUpdateCarpool: Already saving, skipping')
      return
    }

    console.log('🚗 handleUpdateCarpool triggered', { editingCarpoolId, carpoolForm })

    if (!carpoolForm.total_seats || !carpoolForm.departure_location) {
      toast.error('Please fill in required fields')
      return
    }

    setIsSavingCarpool(true)

    const currentCarpool = eventCarpools.find(c => c.id === editingCarpoolId)
    const currentPassengerCount = currentCarpool?.passengers?.length || 0
    const newTotalSeats = parseInt(carpoolForm.total_seats)

    const carpoolUpdates = {
      vehicle_description: carpoolForm.vehicle_description || null,
      total_seats: newTotalSeats,
      available_seats: newTotalSeats - currentPassengerCount,
      departure_location: carpoolForm.departure_location,
      departure_lat: carpoolForm.departure_lat || null,
      departure_lng: carpoolForm.departure_lng || null,
      final_destination: carpoolForm.final_destination || null,
      final_location: carpoolForm.final_destination || null,
      final_lat: carpoolForm.final_lat || null,
      final_lng: carpoolForm.final_lng || null,
      pickup_stops: carpoolForm.pickup_stops || [],
      dropoff_stops: carpoolForm.dropoff_stops || [],
      departure_time: carpoolForm.departure_time || null,
      return_time: carpoolForm.return_time || null,
      estimated_cost_per_person: carpoolForm.estimated_cost_per_person ? parseFloat(carpoolForm.estimated_cost_per_person) : null,
      notes: carpoolForm.notes || null,
      carpool_direction: carpoolForm.carpool_direction || 'both',
      whatsapp_link: carpoolForm.whatsapp_link || null
    }

    try {
      console.log('🚗 Calling updateCarpool with:', { editingCarpoolId, eventId, carpoolUpdates })
      const result = await updateCarpool(editingCarpoolId, eventId, carpoolUpdates)
      console.log('🚗 updateCarpool result:', result)

      if (result.success) {
        // Sync to driver's registration (keep both in sync)
        if (currentCarpool?.driver_id) {
          const driverReg = allEventRegistrations.find(r => r.user_id === currentCarpool.driver_id)
          if (driverReg) {
            const regUpdates = {}
            if (carpoolForm.departure_lat) {
              regUpdates.carpool_departure_lat = carpoolForm.departure_lat
              regUpdates.carpool_departure_lng = carpoolForm.departure_lng
              regUpdates.carpool_departure_location = carpoolForm.departure_location
            }
            if (carpoolForm.final_lat) {
              regUpdates.carpool_return_lat = carpoolForm.final_lat
              regUpdates.carpool_return_lng = carpoolForm.final_lng
              regUpdates.carpool_return_location = carpoolForm.final_destination
            }

            if (Object.keys(regUpdates).length > 0) {
              await supabase
                .from('event_registrations')
                .update(regUpdates)
                .eq('id', driverReg.id)

              // Refresh registrations
              const { data: allRegs } = await supabase
                .from('event_registrations')
                .select(`*, profile:profiles(id, full_name, phone)`)
                .eq('event_id', eventId)
              setAllEventRegistrations(allRegs || [])
            }
          }
        }

        setEditingCarpoolId(null)
        setCarpoolForm({
          vehicle_description: '',
          total_seats: '',
          departure_location: '',
          departure_lat: null,
          departure_lng: null,
          final_destination: '',
          final_lat: null,
          final_lng: null,
          pickup_stops: [],
          dropoff_stops: [],
          departure_time: '',
          return_time: '',
          estimated_cost_per_person: '',
          notes: '',
          carpool_direction: 'both',
          whatsapp_link: ''
        })
      }
    } finally {
      setIsSavingCarpool(false)
    }
  }

  const handleCancelEditCarpool = () => {
    setEditingCarpoolId(null)
    setCarpoolForm({
      vehicle_description: '',
      total_seats: '',
      departure_location: '',
      departure_lat: null,
      departure_lng: null,
      final_destination: '',
      final_lat: null,
      final_lng: null,
      pickup_stops: [],
      dropoff_stops: [],
      departure_time: '',
      return_time: '',
      estimated_cost_per_person: '',
      notes: '',
      carpool_direction: 'both',
      whatsapp_link: ''
    })
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
      race_number: raceForm.race_number ? parseInt(raceForm.race_number) : null,
      team_id: raceForm.team_id || null
    })

    if (result.success) {
      setShowRaceForm(false)
      setRaceForm({
        race_name: '',
        race_number: '',
        distance: '',
        race_type: '',
        scheduled_time: '',
        team_id: '',
        notes: ''
      })
    }
  }

  // Download CSV template for race import
  const handleDownloadRaceTemplate = () => {
    const headers = ['team_name', 'race_name', 'race_number', 'distance', 'race_type', 'scheduled_time', 'notes']
    const exampleRows = [
      ['Boat 1', 'Boat 1 - Race 1', '1', '200m', 'heat', '10:00', 'First heat'],
      ['Boat 1', 'Boat 1 - Race 2', '2', '500m', 'final', '11:30', ''],
      ['Boat 2', 'Boat 2 - Race 1', '3', '200m', 'heat', '10:15', ''],
    ]

    const csvContent = [
      headers.join(','),
      ...exampleRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'race_schedule_template.csv'
    link.click()
    URL.revokeObjectURL(link.href)
  }

  // Import races from CSV
  const handleImportRaces = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsImportingRaces(true)

    try {
      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim())

      if (lines.length < 2) {
        toast.error('CSV file must have a header row and at least one data row')
        return
      }

      // Parse header
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase())
      const requiredHeaders = ['race_name']
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h))

      if (missingHeaders.length > 0) {
        toast.error(`Missing required columns: ${missingHeaders.join(', ')}`)
        return
      }

      // Parse data rows
      const races = []
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].match(/("([^"]*)"|[^,]*)/g)?.map(v =>
          v.trim().replace(/^"|"$/g, '')
        ) || []

        const row = {}
        headers.forEach((header, idx) => {
          row[header] = values[idx] || ''
        })

        if (!row.race_name) continue // Skip empty rows

        // Find team_id by team_name if provided
        let team_id = null
        if (row.team_name && eventTeams.length > 0) {
          const team = eventTeams.find(t =>
            t.team_name.toLowerCase() === row.team_name.toLowerCase()
          )
          team_id = team?.id || null
        }

        races.push({
          event_id: eventId,
          race_name: row.race_name,
          race_number: row.race_number ? parseInt(row.race_number) : null,
          distance: row.distance || null,
          race_type: row.race_type || null,
          scheduled_time: row.scheduled_time || null,
          team_id,
          notes: row.notes || null
        })
      }

      if (races.length === 0) {
        toast.error('No valid races found in CSV')
        return
      }

      // Create races
      let successCount = 0
      for (const race of races) {
        const result = await createRace(race)
        if (result.success) successCount++
      }

      toast.success(`Imported ${successCount} of ${races.length} races`)
    } catch (error) {
      console.error('Error importing races:', error)
      toast.error('Failed to parse CSV file')
    } finally {
      setIsImportingRaces(false)
      // Reset file input
      if (raceImportInputRef.current) {
        raceImportInputRef.current.value = ''
      }
    }
  }

  const handleEditRace = (race) => {
    setEditingRaceId(race.id)
    setRaceForm({
      race_name: race.race_name || '',
      race_number: race.race_number || '',
      distance: race.distance || '',
      race_type: race.race_type || '',
      scheduled_time: race.scheduled_time || '',
      team_id: race.team_id || '',
      notes: race.notes || ''
    })
  }

  const handleUpdateRace = async () => {
    if (!raceForm.race_name) {
      toast.error('Race name is required')
      return
    }

    const result = await updateRace(editingRaceId, eventId, {
      ...raceForm,
      race_number: raceForm.race_number ? parseInt(raceForm.race_number) : null,
      team_id: raceForm.team_id || null
    })

    if (result.success) {
      setEditingRaceId(null)
      setRaceForm({
        race_name: '',
        race_number: '',
        distance: '',
        race_type: '',
        scheduled_time: '',
        team_id: '',
        notes: ''
      })
    }
  }

  const handleCancelEditRace = () => {
    setEditingRaceId(null)
    setRaceForm({
      race_name: '',
      race_number: '',
      distance: '',
      race_type: '',
      scheduled_time: '',
      team_id: '',
      notes: ''
    })
  }

  // Team management handlers
  const handleCreateTeam = async () => {
    if (!teamForm.team_name) {
      toast.error('Team name is required')
      return { success: false }
    }

    const result = await createEventTeam({
      event_id: eventId,
      team_name: teamForm.team_name,
      team_color: teamForm.team_color || '#3B82F6',
      notes: teamForm.notes || null,
      sort_order: eventTeams.length
    })

    if (result.success) {
      setShowTeamForm(false)
      setTeamForm({ team_name: '', team_color: '#3B82F6', notes: '', import_lineup_id: '' })
    }

    return result
  }

  const handleEditTeam = (team) => {
    setEditingTeamId(team.id)
    setTeamForm({
      team_name: team.team_name || '',
      team_color: team.team_color || '#3B82F6',
      notes: team.notes || ''
    })
  }

  const handleUpdateTeam = async () => {
    if (!teamForm.team_name) {
      toast.error('Team name is required')
      return
    }

    const result = await updateEventTeam(editingTeamId, eventId, {
      team_name: teamForm.team_name,
      team_color: teamForm.team_color || '#3B82F6',
      notes: teamForm.notes || null
    })

    if (result.success) {
      setEditingTeamId(null)
      setTeamForm({ team_name: '', team_color: '#3B82F6', notes: '' })
    }
  }

  const handleCancelEditTeam = () => {
    setEditingTeamId(null)
    setTeamForm({ team_name: '', team_color: '#3B82F6', notes: '' })
  }

  // Team Requirements handlers
  const handleEditTeamRequirements = (team) => {
    setEditingTeamRequirementsId(team.id)
    setTeamRequirementsForm({
      division_name: team.division_name || '',
      min_paddlers: team.min_paddlers ?? '',
      max_paddlers: team.max_paddlers ?? '',
      gender_ratio: team.gender_ratio || '',
      min_female: team.min_female ?? '',
      max_female: team.max_female ?? '',
      min_male: team.min_male ?? '',
      max_male: team.max_male ?? '',
      min_age: team.min_age ?? '',
      max_age: team.max_age ?? '',
      corporate_only: team.corporate_only || false
    })
  }

  const handleSaveTeamRequirements = async () => {
    const requirements = {
      division_name: teamRequirementsForm.division_name || null,
      min_paddlers: teamRequirementsForm.min_paddlers ? parseInt(teamRequirementsForm.min_paddlers) : null,
      max_paddlers: teamRequirementsForm.max_paddlers ? parseInt(teamRequirementsForm.max_paddlers) : null,
      gender_ratio: teamRequirementsForm.gender_ratio || null,
      min_female: teamRequirementsForm.min_female ? parseInt(teamRequirementsForm.min_female) : null,
      max_female: teamRequirementsForm.max_female ? parseInt(teamRequirementsForm.max_female) : null,
      min_male: teamRequirementsForm.min_male ? parseInt(teamRequirementsForm.min_male) : null,
      max_male: teamRequirementsForm.max_male ? parseInt(teamRequirementsForm.max_male) : null,
      min_age: teamRequirementsForm.min_age ? parseInt(teamRequirementsForm.min_age) : null,
      max_age: teamRequirementsForm.max_age ? parseInt(teamRequirementsForm.max_age) : null,
      corporate_only: teamRequirementsForm.corporate_only || false
    }

    const result = await updateTeamRequirements(editingTeamRequirementsId, eventId, requirements)
    if (result.success) {
      setEditingTeamRequirementsId(null)
    }
  }

  const handleCancelTeamRequirements = () => {
    setEditingTeamRequirementsId(null)
    setTeamRequirementsForm({
      division_name: '',
      min_paddlers: '',
      max_paddlers: '',
      gender_ratio: '',
      min_female: '',
      max_female: '',
      min_male: '',
      max_male: '',
      min_age: '',
      max_age: '',
      corporate_only: false
    })
  }

  const handleAddMemberToTeam = async (teamId, userId) => {
    await addTeamMember(teamId, userId, eventId, 'paddler')
  }

  const handleRemoveMemberFromTeam = async (teamId, userId) => {
    await removeTeamMember(teamId, userId, eventId)
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

  const handleLinkLineup = async () => {
    if (!selectedLineupId) {
      toast.error('Please select a lineup')
      return
    }

    setLinkingLoading(true)
    const result = await linkLineupToEvent(
      selectedLineupId,
      eventId,
      boatName || `Boat ${eventLineups.length + 1}`
    )
    setLinkingLoading(false)

    if (result.success) {
      const lineupResult = await fetchEventLineups(eventId)
      if (lineupResult.success) {
        setEventLineups(lineupResult.data)
      }
      setShowLinkModal(false)
      setSelectedLineupId('')
      setBoatName('')
    }
  }

  const togglePackingItem = (itemId) => {
    setPackingList(prev => ({ ...prev, [itemId]: !prev[itemId] }))
  }

  const generateICalEvent = () => {
    const start = event.start_time
      ? `${event.event_date.replace(/-/g, '')}T${event.start_time.replace(/:/g, '')}00`
      : `${event.event_date.replace(/-/g, '')}T090000`
    const end = event.end_time
      ? `${event.event_date.replace(/-/g, '')}T${event.end_time.replace(/:/g, '')}00`
      : `${event.event_date.replace(/-/g, '')}T180000`

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:${start}
DTEND:${end}
SUMMARY:${event.title}
LOCATION:${event.location || ''}
DESCRIPTION:${event.description || ''}
END:VEVENT
END:VCALENDAR`

    const blob = new Blob([icsContent], { type: 'text/calendar' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${event.title.replace(/\s+/g, '_')}.ics`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Calendar event downloaded!')
  }

  const shareEvent = async () => {
    const shareData = {
      title: event.title,
      text: `${event.title} - ${formatDate(event.event_date)}${event.location ? ` at ${event.location}` : ''}`,
      url: window.location.href
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch (err) {
        if (err.name !== 'AbortError') {
          navigator.clipboard.writeText(window.location.href)
          toast.success('Link copied to clipboard!')
        }
      }
    } else {
      navigator.clipboard.writeText(window.location.href)
      toast.success('Link copied to clipboard!')
    }
  }

  const availableLineups = allLineups.filter(
    lineup => !lineup.event_id || lineup.event_id === eventId
  )

  const getPositionSummary = (positions) => {
    if (!positions) return 'No positions set'
    const filledCount = [
      positions.drummer,
      positions.steersperson,
      ...(positions.paddlers?.left || []),
      ...(positions.paddlers?.right || [])
    ].filter(Boolean).length
    return `${filledCount}/22 positions`
  }

  // Tab configuration - new structure
  const isRaceType = event?.event_type === 'race' || event?.event_type === 'regatta'
  const showCarpools = event?.show_carpools !== false // default true

  // Attendance visibility: Admin/coach always see it; members only see within 1 week of event
  const eventDate = event?.event_date ? new Date(event.event_date) : null
  const daysUntilEvent = eventDate ? Math.ceil((eventDate - new Date()) / (1000 * 60 * 60 * 24)) : Infinity
  const showAttendanceToMembers = daysUntilEvent <= 7 || daysUntilEvent < 0 // Show if within 1 week or past
  const showAttendanceTab = effectiveIsAdmin || showAttendanceToMembers

  const tabs = [
    { id: 'event', label: 'Event', icon: 'dashboard' },
    // Attendance tab: always for admin, within 1 week for members (or hidden in paddler view if > 1 week)
    ...(showAttendanceTab ? [{ id: 'attendance', label: 'Attendance', icon: 'roster', count: rsvpCounts.yes }] : []),
    // Only show Carpools tab if enabled by admin
    ...(showCarpools ? [{ id: 'carpools', label: 'Carpools', icon: 'car', count: eventCarpools.length }] : []),
    // Only show Race Day tab for race/regatta type events
    ...(isRaceType ? [{ id: 'raceday', label: 'Race Day', icon: 'trophy' }] : []),
    // Show Stay tab if enabled in event settings
    ...(event?.show_accommodation ? [{ id: 'accommodation', label: 'Stay', icon: 'home', count: eventAccommodations.length || undefined }] : []),
    { id: 'photos', label: 'Photos', icon: 'camera', count: event?.photos?.length || 0 },
    // Hide Manage tab when viewing as paddler
    ...(effectiveIsAdmin ? [{ id: 'manage', label: 'Manage', icon: 'settings' }] : [])
  ]

  // ========== RENDER ==========
  return (
    <div className="space-y-4 pb-24 md:pb-6">
      {/* Compact Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
        <button
          onClick={() => navigate(-1)}
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all shrink-0"
        >
          <Icon name="arrowLeft" size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg md:text-2xl font-bold text-slate-900 truncate">{event.title}</h1>
            {!countdown.isPast && (
              <span className="text-[10px] font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                {countdown.text}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs md:text-sm text-slate-500 mt-0.5">
            <span>{formatDate(event.event_date)}</span>
            {event.location && (
              <>
                <span className="w-1 h-1 rounded-full bg-slate-300" />
                <span className="truncate max-w-[150px] md:max-w-none">{event.location}</span>
              </>
            )}
          </div>
        </div>
        {/* RSVP Badge - Compact on mobile */}
        {userRSVP && (
          <div className={`shrink-0 px-2 md:px-3 py-1 md:py-1.5 rounded-lg text-xs md:text-sm font-bold ${
            userRSVP.status === 'yes' ? 'bg-success-100 text-success-700' :
            userRSVP.status === 'interested' ? 'bg-primary-100 text-primary-700' :
            userRSVP.status === 'maybe' ? 'bg-amber-100 text-amber-700' :
            'bg-red-100 text-red-700'
          }`}>
            <span className="hidden sm:inline">
              {userRSVP.status === 'yes' ? "I'm Going" : userRSVP.status === 'interested' ? 'Interested' : userRSVP.status === 'maybe' ? 'Maybe' : 'Not Going'}
            </span>
            <span className="sm:hidden">
              {userRSVP.status === 'yes' ? '✓ Going' : userRSVP.status === 'interested' ? '?' : userRSVP.status === 'maybe' ? '~' : '✗'}
            </span>
          </div>
        )}
      </div>

      {/* Quick Actions Bar - Horizontal scroll on mobile */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-2">
        <button onClick={shareEvent} className="btn btn-secondary btn-sm text-xs whitespace-nowrap">
          <Icon name="share" size={14} className="mr-1.5" />
          Share
        </button>
        <button onClick={generateICalEvent} className="btn btn-secondary btn-sm text-xs whitespace-nowrap">
          <Icon name="calendar" size={14} className="mr-1.5" />
          <span className="hidden sm:inline">Add to</span> Calendar
        </button>
        {isAdminOrCoach && activeTab === 'event' && (
          <>
            <button onClick={() => setIsEditing(true)} className="btn btn-secondary btn-sm text-xs whitespace-nowrap">
              <Icon name="edit" size={14} className="mr-1.5" />
              Edit
            </button>
            <button onClick={handleDeleteEvent} className="btn btn-sm text-xs bg-red-50 text-red-600 hover:bg-red-100 border-red-200 whitespace-nowrap">
              <Icon name="trash" size={14} className="mr-1.5" />
              Delete
            </button>
          </>
        )}
        {/* View as Paddler toggle - Admin/Coach only */}
        {isAdminOrCoach && (
          <button
            onClick={() => setViewAsPaddler(!viewAsPaddler)}
            className={`btn btn-sm text-xs whitespace-nowrap transition-all ${
              viewAsPaddler
                ? 'bg-indigo-600 text-white hover:bg-indigo-700 border-indigo-600'
                : 'btn-secondary'
            }`}
          >
            <Icon name="roster" size={14} className="mr-1.5" />
            {viewAsPaddler ? 'Exit Paddler View' : 'View as Paddler'}
          </button>
        )}
      </div>

      {/* Paddler View Mode Indicator */}
      {viewAsPaddler && (
        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-center py-2 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
          <Icon name="roster" size={16} />
          <span>Viewing as Team Member</span>
          <button
            onClick={() => setViewAsPaddler(false)}
            className="ml-2 px-2 py-0.5 bg-white/20 hover:bg-white/30 rounded text-xs"
          >
            Exit
          </button>
        </div>
      )}

      {/* Tab Navigation - Enhanced mobile-friendly design */}
      <div className="relative">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4 py-2 snap-x snap-mandatory">
          {tabs.map((tab, idx) => {
            const isActive = activeTab === tab.id
            // Different accent colors for each tab
            const accentColors = {
              event: 'from-blue-600 to-indigo-600',
              attendance: 'from-emerald-600 to-teal-600',
              carpools: 'from-amber-500 to-orange-500',
              raceday: 'from-red-600 to-rose-600',
              photos: 'from-purple-600 to-pink-600',
              manage: 'from-slate-700 to-slate-900'
            }

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`group relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 snap-start min-w-max ${
                  isActive
                    ? `bg-gradient-to-r ${accentColors[tab.id]} text-white shadow-lg shadow-slate-900/15 scale-[1.02]`
                    : 'bg-white text-slate-600 hover:bg-slate-50 hover:shadow-md border border-slate-200/80 active:scale-95'
                }`}
                style={{ minHeight: '44px' }} // Touch-friendly size
              >
                {/* Icon with subtle background when inactive */}
                <span className={`flex-shrink-0 ${!isActive ? 'p-1.5 bg-slate-100 rounded-lg group-hover:bg-slate-200 transition-colors' : ''}`}>
                  <Icon name={tab.icon} size={isActive ? 16 : 14} />
                </span>

                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden text-[11px]">
                  {tab.id === 'event' ? 'Info' : tab.id === 'raceday' ? 'Race' : tab.label}
                </span>

                {/* Count badge with glow effect when active */}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                    isActive
                      ? 'bg-white/25 text-white'
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    {tab.count}
                  </span>
                )}

                {/* Active indicator line */}
                {isActive && (
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-white/80 shadow-lg" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ==================== EVENT TAB ==================== */}
      {activeTab === 'event' && (
        <div className="space-y-4 md:space-y-6">
          {isEditing ? (
            <div className="space-y-4">
              {/* Header */}
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/10 rounded-full blur-2xl" />
                <div className="relative px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                      <Icon name="edit" size={20} className="text-white" />
                    </div>
                    <div>
                      <h2 className="font-bold text-white">Edit Event</h2>
                      <p className="text-xs text-slate-400">Update event details</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
                  >
                    <Icon name="close" size={18} />
                  </button>
                </div>
              </div>

              {/* Basic Info Section */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-500">
                  <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                    <Icon name="information" size={16} />
                    Basic Information
                  </h3>
                </div>
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Event Title</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all"
                        value={editForm.title}
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Event Type</label>
                      <select
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all"
                        value={editForm.event_type}
                        onChange={(e) => setEditForm({ ...editForm, event_type: e.target.value })}
                      >
                        <option value="race">Race</option>
                        <option value="festival">Festival</option>
                        <option value="social">Social Event</option>
                        <option value="training_camp">Training Camp</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Description</label>
                    <textarea
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all resize-none"
                      rows="2"
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Event URL</label>
                    <input
                      type="url"
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all"
                      value={editForm.event_url}
                      onChange={(e) => setEditForm({ ...editForm, event_url: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                </div>
              </div>

              {/* Location Section */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-500">
                  <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                    <Icon name="location" size={16} />
                    Location
                  </h3>
                </div>
                <div className="p-4 space-y-4">
                  <AddressSearchInput
                    value={editForm.location}
                    onChange={(value, coords) => {
                      setEditForm(prev => ({
                        ...prev,
                        location: value,
                        venue_lat: coords?.lat || prev.venue_lat,
                        venue_lng: coords?.lng || prev.venue_lng
                      }))
                    }}
                    label="Event Location"
                    placeholder="Search for venue address..."
                    showCoords
                    showMapPicker
                  />
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Location Link (optional)</label>
                    <input
                      type="url"
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all"
                      value={editForm.location_link}
                      onChange={(e) => setEditForm({ ...editForm, location_link: e.target.value })}
                      placeholder="Google Maps or other link"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Used for weather forecasts and map display</p>
                  </div>
                </div>
              </div>

              {/* Date & Time Section */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500">
                  <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                    <Icon name="calendar" size={16} />
                    Date & Time
                  </h3>
                </div>
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="col-span-2 md:col-span-1">
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Event Date</label>
                      <input
                        type="date"
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all"
                        value={editForm.event_date}
                        onChange={(e) => setEditForm({ ...editForm, event_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Start Time</label>
                      <input
                        type="time"
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all"
                        value={editForm.start_time}
                        onChange={(e) => setEditForm({ ...editForm, start_time: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">End Time</label>
                      <input
                        type="time"
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all"
                        value={editForm.end_time}
                        onChange={(e) => setEditForm({ ...editForm, end_time: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Team Arrival</label>
                      <input
                        type="time"
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all"
                        value={editForm.arrival_time}
                        onChange={(e) => setEditForm({ ...editForm, arrival_time: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Captain's Meeting</label>
                      <input
                        type="time"
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all"
                        value={editForm.captains_meeting_time}
                        onChange={(e) => setEditForm({ ...editForm, captains_meeting_time: e.target.value })}
                      />
                    </div>
                  </div>
                  {/* Registration Deadline - for prospective races */}
                  {event?.status === 'prospective' && (
                    <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                      <label className="block text-xs font-semibold text-amber-700 mb-1.5">Signup Deadline</label>
                      <input
                        type="date"
                        className="w-full px-3 py-2.5 bg-white border border-amber-200 rounded-lg text-sm focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
                        value={editForm.registration_deadline}
                        onChange={(e) => setEditForm({ ...editForm, registration_deadline: e.target.value })}
                      />
                      <p className="text-[10px] text-amber-600 mt-1">Members need to sign up by this date</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes & Instructions Section */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500">
                  <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                    <Icon name="document" size={16} />
                    Notes & Instructions
                  </h3>
                </div>
                <div className="p-4 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">General Notes</label>
                    <textarea
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all resize-none"
                      rows="2"
                      value={editForm.notes}
                      onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Race Day Instructions</label>
                    <textarea
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all resize-none"
                      rows="3"
                      value={editForm.instructions || ''}
                      onChange={(e) => setEditForm({ ...editForm, instructions: e.target.value })}
                      placeholder="What to bring, where to meet, parking info, check-in procedures..."
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Detailed logistics for race day</p>
                  </div>
                </div>
              </div>

              {/* Food Spots Section */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-between">
                  <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                    <span>🍜</span>
                    Post-Event Food Spots
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      const spots = editForm.food_spots || []
                      setEditForm({
                        ...editForm,
                        food_spots: [...spots, { name: '', link: '', reservation_time: '', notes: '' }]
                      })
                    }}
                    className="text-xs text-white/90 hover:text-white font-semibold flex items-center gap-1 bg-white/20 hover:bg-white/30 px-2 py-1 rounded-lg transition-colors"
                  >
                    <Icon name="plus" size={14} /> Add
                  </button>
                </div>
                <div className="p-4">
                  {/* Legacy single food location - show if exists */}
                  {(editForm.food_location_name || editForm.food_location_link) && (!editForm.food_spots || editForm.food_spots.length === 0) && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-orange-700">Main Food Spot</span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditForm({
                              ...editForm,
                              food_spots: [{
                                name: editForm.food_location_name || '',
                                link: editForm.food_location_link || '',
                                reservation_time: '',
                                notes: ''
                              }],
                              food_location_name: '',
                              food_location_link: ''
                            })
                          }}
                          className="text-[10px] text-orange-600 hover:text-orange-800"
                        >
                          Convert to new format
                        </button>
                      </div>
                      <div className="text-sm text-orange-800">{editForm.food_location_name}</div>
                      {editForm.food_location_link && (
                        <div className="text-xs text-orange-600 truncate">{editForm.food_location_link}</div>
                      )}
                    </div>
                  )}

                  {/* Food spots list */}
                  {editForm.food_spots && editForm.food_spots.length > 0 ? (
                    <div className="space-y-3">
                      {editForm.food_spots.map((spot, idx) => (
                        <div key={idx} className="bg-orange-50/50 border border-orange-100 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded">Spot {idx + 1}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const spots = [...editForm.food_spots]
                                spots.splice(idx, 1)
                                setEditForm({ ...editForm, food_spots: spots })
                              }}
                              className="w-6 h-6 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Icon name="close" size={14} />
                            </button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Place Name *</label>
                              <input
                                type="text"
                                className="w-full px-3 py-2 bg-white border border-orange-200 rounded-lg text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all"
                                placeholder="e.g., Pho Express"
                                value={spot.name}
                                onChange={(e) => {
                                  const spots = [...editForm.food_spots]
                                  spots[idx] = { ...spots[idx], name: e.target.value }
                                  setEditForm({ ...editForm, food_spots: spots })
                                }}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Reservation Time</label>
                              <input
                                type="time"
                                className="w-full px-3 py-2 bg-white border border-orange-200 rounded-lg text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all"
                                value={spot.reservation_time || ''}
                                onChange={(e) => {
                                  const spots = [...editForm.food_spots]
                                  spots[idx] = { ...spots[idx], reservation_time: e.target.value }
                                  setEditForm({ ...editForm, food_spots: spots })
                                }}
                              />
                            </div>
                          </div>
                          <div className="mt-3">
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Google Maps Link</label>
                            <input
                              type="url"
                              className="w-full px-3 py-2 bg-white border border-orange-200 rounded-lg text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all"
                              placeholder="Paste Google Maps link..."
                              value={spot.link || ''}
                              onChange={(e) => {
                                const spots = [...editForm.food_spots]
                                const link = e.target.value
                                spots[idx] = { ...spots[idx], link }
                                if (link && !spot.name) {
                                  const parsed = parseGoogleMapsLink(link)
                                  if (parsed.name) {
                                    spots[idx].name = parsed.name
                                  }
                                }
                                setEditForm({ ...editForm, food_spots: spots })
                              }}
                            />
                          </div>
                          <div className="mt-3">
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Notes</label>
                            <input
                              type="text"
                              className="w-full px-3 py-2 bg-white border border-orange-200 rounded-lg text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all"
                              placeholder="e.g., Reservation for 20, outdoor seating..."
                              value={spot.notes || ''}
                              onChange={(e) => {
                                const spots = [...editForm.food_spots]
                                spots[idx] = { ...spots[idx], notes: e.target.value }
                                setEditForm({ ...editForm, food_spots: spots })
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-400 text-sm border-2 border-dashed border-orange-200 rounded-xl bg-orange-50/30">
                      <span className="text-2xl mb-2 block">🍜</span>
                      No food spots added yet
                    </div>
                  )}
                </div>
              </div>

              {/* Feature Settings Section */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 bg-gradient-to-r from-slate-600 to-slate-700">
                  <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                    <Icon name="settings" size={16} />
                    Feature Settings
                  </h3>
                </div>
                <div className="p-4 space-y-3">
                  {/* Carpool Toggle */}
                  <label className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors border border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                        editForm.show_carpools ? 'bg-emerald-100' : 'bg-slate-200'
                      }`}>
                        <Icon name="car" size={18} className={editForm.show_carpools ? 'text-emerald-600' : 'text-slate-400'} />
                      </div>
                      <div>
                        <span className="text-slate-900 font-medium block text-sm">Carpools</span>
                        <span className="text-slate-500 text-xs">Enable carpool coordination tab</span>
                      </div>
                    </div>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={editForm.show_carpools}
                        onChange={(e) => setEditForm({ ...editForm, show_carpools: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 rounded-full peer peer-checked:bg-emerald-500 transition-colors" />
                      <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md peer-checked:translate-x-5 transition-transform" />
                    </div>
                  </label>

                  {/* Accommodation Toggle */}
                  <label className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors border border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                        editForm.show_accommodation ? 'bg-purple-100' : 'bg-slate-200'
                      }`}>
                        <Icon name="home" size={18} className={editForm.show_accommodation ? 'text-purple-600' : 'text-slate-400'} />
                      </div>
                      <div>
                        <span className="text-slate-900 font-medium block text-sm">Stay Tab</span>
                        <span className="text-slate-500 text-xs">Show accommodation/lodging tab</span>
                      </div>
                    </div>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={editForm.show_accommodation}
                        onChange={(e) => setEditForm({ ...editForm, show_accommodation: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 rounded-full peer peer-checked:bg-purple-500 transition-colors" />
                      <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md peer-checked:translate-x-5 transition-transform" />
                    </div>
                  </label>

                  {/* Attendance Visibility Toggle */}
                  <label className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors border border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                        editForm.show_attendance_to_members ? 'bg-blue-100' : 'bg-slate-200'
                      }`}>
                        <Icon name="roster" size={18} className={editForm.show_attendance_to_members ? 'text-blue-600' : 'text-slate-400'} />
                      </div>
                      <div>
                        <span className="text-slate-900 font-medium block text-sm">Show Attendance</span>
                        <span className="text-slate-500 text-xs">Let members see who is going</span>
                      </div>
                    </div>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={editForm.show_attendance_to_members}
                        onChange={(e) => setEditForm({ ...editForm, show_attendance_to_members: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 rounded-full peer peer-checked:bg-blue-500 transition-colors" />
                      <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md peer-checked:translate-x-5 transition-transform" />
                    </div>
                  </label>

                  {/* Team Composition Visibility Toggle */}
                  <label className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors border border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                        editForm.show_team_composition ? 'bg-orange-100' : 'bg-slate-200'
                      }`}>
                        <Icon name="lineup" size={18} className={editForm.show_team_composition ? 'text-orange-600' : 'text-slate-400'} />
                      </div>
                      <div>
                        <span className="text-slate-900 font-medium block text-sm">Show Team Composition</span>
                        <span className="text-slate-500 text-xs">Let members see who is on each team</span>
                      </div>
                    </div>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={editForm.show_team_composition}
                        onChange={(e) => setEditForm({ ...editForm, show_team_composition: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 rounded-full peer peer-checked:bg-orange-500 transition-colors" />
                      <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md peer-checked:translate-x-5 transition-transform" />
                    </div>
                  </label>

                  {/* External Album URL */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Icon name="link" size={18} className="text-blue-600" />
                      </div>
                      <div>
                        <span className="text-slate-900 font-medium block text-sm">External Album</span>
                        <span className="text-slate-500 text-xs">Link to Google/Apple Photos</span>
                      </div>
                    </div>
                    <input
                      type="url"
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                      placeholder="https://photos.google.com/share/..."
                      value={editForm.external_album_url || ''}
                      onChange={(e) => setEditForm({ ...editForm, external_album_url: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsEditing(false)
                  }}
                  className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleUpdateEvent()
                  }}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-primary-600 to-blue-600 hover:from-primary-700 hover:to-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-primary-500/25 transition-all"
                >
                  Save Changes
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Day-Before/Day-Of Reminder Banner */}
              {!countdown.isPast && (countdown.days === 0 || countdown.days === 1) && (
                <div className={`relative overflow-hidden rounded-xl p-4 ${
                  countdown.days === 0
                    ? 'bg-gradient-to-r from-red-500 via-rose-500 to-red-500'
                    : 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500'
                }`}>
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
                  <div className="relative flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-2xl">{countdown.days === 0 ? '🏁' : '⏰'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-white text-lg">
                        {countdown.days === 0 ? 'Race Day!' : 'Tomorrow is Race Day!'}
                      </h4>
                      <div className="text-white/90 text-sm mt-1 space-y-1">
                        {event.arrival_time && (
                          <p>🚗 Team arrival: <span className="font-semibold">{format(parseISO(`2000-01-01T${event.arrival_time}`), 'h:mm a')}</span></p>
                        )}
                        {event.location && (
                          <p className="truncate">📍 {event.location}</p>
                        )}
                        {/* Weather for day-of/day-before */}
                        {weather && (
                          <p className="flex items-center gap-2">
                            <span className="text-lg">{weatherIcons[weather.code] || '🌡️'}</span>
                            <span className="font-semibold">{weather.tempHigh}°/{weather.tempLow}°F</span>
                            <span className="text-white/70">• {weather.precipChance}% rain</span>
                          </p>
                        )}
                        {/* Packing list reminder */}
                        {(() => {
                          const allItems = eventPackingItems.length > 0
                            ? eventPackingItems
                            : defaultPackingItems
                          const totalItems = allItems.length + personalPackingItems.length
                          const packedCount = Object.values(packingList).filter(Boolean).length
                          const unpacked = totalItems - packedCount

                          return unpacked > 0 ? (
                            <p className="text-white/90 text-xs mt-2 flex items-center gap-1">
                              📦 <span className="font-medium">{unpacked} items</span> still to pack!
                              <button
                                onClick={() => {
                                  const packingSection = document.querySelector('[data-section="packing-list"]')
                                  if (packingSection) packingSection.scrollIntoView({ behavior: 'smooth' })
                                }}
                                className="underline hover:text-white ml-1"
                              >
                                View list
                              </button>
                            </p>
                          ) : (
                            <p className="text-white/70 text-xs mt-2">✅ All packed and ready to go!</p>
                          )
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Compact Countdown Badge - Inline at top */}
              {!countdown.isPast && countdown.days > 1 && (
                <div className="flex items-center justify-between bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-xl px-4 py-2.5 text-white">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary-400 animate-pulse" />
                    <span className="text-xl font-bold">{countdown.text}</span>
                    <span className="text-slate-400 text-sm">until event</span>
                  </div>
                  {weather && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-2xl">{weatherIcons[weather.code] || '🌡️'}</span>
                      <span className="font-medium">{weather.tempHigh}°/{weather.tempLow}°F</span>
                      <span className="text-slate-400">• {weather.precipChance}% 💧</span>
                    </div>
                  )}
                </div>
              )}
              {countdown.isPast && (
                <div className="flex items-center gap-3 bg-slate-100 rounded-xl px-4 py-2.5">
                  <Icon name="check" size={18} className="text-emerald-600" />
                  <span className="font-medium text-slate-600">Event Complete</span>
                </div>
              )}

              {/* My Checklist Card */}
              <div className="relative overflow-hidden rounded-xl bg-white p-4 border border-slate-200 shadow-sm">
                  {/* Progress bar background */}
                  <div
                    className="absolute inset-0 bg-gradient-to-r from-emerald-50 to-transparent transition-all duration-500"
                    style={{ width: `${checklistCompletion}%` }}
                  />
                  <div className="relative flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      checklistCompletion === 100 ? 'bg-emerald-100' : 'bg-slate-100'
                    }`}>
                      <span className="text-lg font-bold ${checklistCompletion === 100 ? 'text-emerald-600' : 'text-slate-600'}">
                        {checklistCompletion}%
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900">My Checklist</div>
                      <div className="flex items-center gap-2 mt-1 overflow-x-auto">
                        {myChecklist.map(item => (
                          <span
                            key={item.id}
                            className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg whitespace-nowrap ${
                              item.completed
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {item.completed ? '✓' : '○'} {item.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

              {/* RSVP Card - Distinctive gradient with status indicator */}
              {user && (
                <div className={`relative overflow-hidden rounded-xl p-5 border transition-all ${
                  userRSVP?.status === 'yes'
                    ? 'bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 border-emerald-200'
                    : userRSVP?.status === 'interested'
                      ? 'bg-gradient-to-br from-primary-50 via-blue-50 to-indigo-50 border-primary-200'
                      : userRSVP?.status === 'no'
                        ? 'bg-gradient-to-br from-red-50 via-rose-50 to-pink-50 border-red-200'
                        : 'bg-gradient-to-br from-slate-50 via-white to-slate-50 border-slate-200'
                }`}>
                  {/* Decorative corner accent */}
                  <div className={`absolute -top-10 -right-10 w-28 h-28 rounded-full blur-2xl opacity-30 ${
                    userRSVP?.status === 'yes' ? 'bg-emerald-400' :
                    userRSVP?.status === 'interested' ? 'bg-primary-400' :
                    userRSVP?.status === 'no' ? 'bg-red-400' : 'bg-slate-300'
                  }`} />

                  <div className="relative space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          userRSVP?.status === 'yes' ? 'bg-emerald-100' :
                          userRSVP?.status === 'interested' ? 'bg-primary-100' :
                          userRSVP?.status === 'no' ? 'bg-red-100' : 'bg-slate-100'
                        }`}>
                          <Icon
                            name={userRSVP?.status === 'yes' ? 'check' : userRSVP?.status === 'no' ? 'x' : 'calendar'}
                            size={20}
                            className={
                              userRSVP?.status === 'yes' ? 'text-emerald-600' :
                              userRSVP?.status === 'interested' ? 'text-primary-600' :
                              userRSVP?.status === 'no' ? 'text-red-600' : 'text-slate-500'
                            }
                          />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900">Your RSVP</h3>
                          <p className={`text-sm font-medium ${
                            userRSVP?.status === 'yes' ? 'text-emerald-600' :
                            userRSVP?.status === 'interested' ? 'text-primary-600' :
                            userRSVP?.status === 'no' ? 'text-red-600' : 'text-slate-500'
                          }`}>
                            {userRSVP
                              ? userRSVP.status === 'yes' ? "You're going! 🎉" : userRSVP.status === 'interested' ? 'Interested' : "Can't make it"
                              : 'Let the team know'
                            }
                          </p>
                        </div>
                      </div>
                      {/* Self Check-in Button - Only for event day(s) */}
                      {isEventCheckInEligible() && (
                        <CheckInButton
                          eventId={eventId}
                          userRSVP={userRSVP}
                          venue={event.venue_lat && event.venue_lng ? {
                            lat: event.venue_lat,
                            lng: event.venue_lng,
                            radius: event.check_in_radius || 500
                          } : null}
                          size="sm"
                        />
                      )}
                    </div>
                    {/* Mobile-friendly segmented RSVP buttons with glass effect */}
                    <div className="flex rounded-xl overflow-hidden border border-white/50 bg-white/60 backdrop-blur-sm shadow-sm">
                      {['interested', 'yes', 'no'].map((status, idx) => (
                        <button
                          key={status}
                          onClick={() => handleRSVP(status)}
                          className={`flex-1 py-3 text-sm font-bold transition-all ${
                            idx > 0 ? 'border-l border-white/50' : ''
                          } ${
                            userRSVP?.status === status
                              ? status === 'yes'
                                ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg shadow-emerald-500/25'
                                : status === 'interested'
                                  ? 'bg-gradient-to-r from-primary-500 to-blue-500 text-white shadow-lg shadow-primary-500/25'
                                  : 'bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-lg shadow-red-500/25'
                              : 'text-slate-600 hover:bg-white/80'
                          }`}
                        >
                          {status === 'yes' ? "✓ Going" : status === 'interested' ? '★ Interested' : "✗ Can't Go"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Event Registration Card - Shows for races with distinctive styling */}
              {user && event.event_type === 'race' && (
                <div className={`relative overflow-hidden rounded-xl border ${
                  existingRegistration?.status === 'submitted'
                    ? 'bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 border-violet-200'
                    : 'bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 border-amber-200'
                }`}>
                  {/* Decorative pattern */}
                  <div className={`absolute -top-8 -right-8 w-32 h-32 rounded-full blur-2xl opacity-30 ${
                    existingRegistration?.status === 'submitted' ? 'bg-violet-400' : 'bg-amber-400'
                  }`} />
                  <div className={`absolute bottom-0 left-0 w-20 h-20 rounded-full blur-2xl opacity-20 ${
                    existingRegistration?.status === 'submitted' ? 'bg-purple-400' : 'bg-orange-400'
                  }`} />

                  <div className="relative p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          existingRegistration?.status === 'submitted'
                            ? 'bg-violet-100 ring-2 ring-violet-200'
                            : 'bg-amber-100 ring-2 ring-amber-200'
                        }`}>
                          <Icon
                            name={existingRegistration?.status === 'submitted' ? 'check' : 'document'}
                            size={22}
                            className={existingRegistration?.status === 'submitted' ? 'text-violet-600' : 'text-amber-600'}
                          />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900">Event Registration</h3>
                          <p className={`text-sm font-medium ${
                            existingRegistration?.status === 'submitted' ? 'text-violet-600' : 'text-amber-600'
                          }`}>
                            {existingRegistration?.status === 'submitted'
                              ? 'Registration complete ✓'
                              : registrationConfig
                                ? 'Complete your registration'
                                : 'No registration required'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {existingRegistration?.status === 'submitted' && (
                          <span className="px-3 py-1.5 rounded-lg text-sm font-bold bg-violet-100 text-violet-700 ring-1 ring-violet-200">
                            ✓ Submitted
                          </span>
                        )}
                        {registrationConfig?.is_registration_open !== false && (
                          <button
                            onClick={() => setShowRegistrationForm(true)}
                            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg ${
                              existingRegistration
                                ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-violet-500/25'
                                : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-amber-500/25'
                            }`}
                            disabled={registrationLoading}
                          >
                            {existingRegistration ? 'Update' : 'Register Now →'}
                          </button>
                        )}
                        {registrationConfig?.is_registration_open === false && (
                          <span className="px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-100 text-slate-500 ring-1 ring-slate-200">
                            Registration Closed
                          </span>
                        )}
                      </div>
                    </div>
                    {existingRegistration && (
                      <div className="mt-4 pt-4 border-t border-white/50">
                        <div className="flex flex-wrap gap-3">
                          {existingRegistration.carpool_needs && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/60 text-sm text-slate-700">
                              <Icon name="car" size={14} className="text-slate-500" />
                              {existingRegistration.carpool_needs === 'need_ride' ? 'Need a ride' :
                                existingRegistration.carpool_needs === 'can_drive' ? `Driving (${existingRegistration.carpool_seats_available || '?'} seats)` :
                                existingRegistration.carpool_needs === 'not_needed' ? 'Own transport' : 'Undecided'}
                            </span>
                          )}
                          {existingRegistration.accommodation_needs && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/60 text-sm text-slate-700">
                              <Icon name="home" size={14} className="text-slate-500" />
                              {existingRegistration.accommodation_needs === 'need_accommodation' ? 'Need accommodation' :
                                existingRegistration.accommodation_needs === 'have_accommodation' ? 'Arranged' :
                                existingRegistration.accommodation_needs === 'not_needed' ? 'Not staying' : 'Undecided'}
                            </span>
                          )}
                          {existingRegistration.waiver_acknowledged && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-100/80 text-sm text-emerald-700 font-medium">
                              <Icon name="check" size={14} /> Waiver signed
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Event Registration Form Modal */}
              {showRegistrationForm && (
                <EventRegistrationForm
                  eventId={eventId}
                  config={registrationConfig}
                  existingRegistration={existingRegistration}
                  onComplete={handleRegistrationComplete}
                  onClose={() => setShowRegistrationForm(false)}
                />
              )}

              {/* Event Details Card - Distinctive with icon header */}
              <div className="relative overflow-hidden rounded-xl bg-white border border-slate-200 shadow-sm" style={{ isolation: 'isolate' }}>
                {/* Large Map at top - full width */}
                {event.venue_lat && event.venue_lng && (
                  <div className="relative" style={{ zIndex: 0 }}>
                    <VenueMap
                      lat={event.venue_lat}
                      lng={event.venue_lng}
                      name={event.title}
                      address={event.location}
                      locationLink={event.location_link}
                      height="280px"
                      className="rounded-t-xl"
                    />
                    {/* Location overlay on map */}
                    {event.location && (
                      <div className="absolute bottom-3 left-3 right-3" style={{ zIndex: 1000 }}>
                        <div className="bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border border-slate-200 flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                            <Icon name="location" size={16} className="text-red-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            {event.location_link ? (
                              <a
                                href={event.location_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-primary-600 hover:underline font-medium text-sm truncate block"
                              >
                                {event.location}
                              </a>
                            ) : (
                              <span className="text-slate-900 font-medium text-sm truncate block">{event.location}</span>
                            )}
                          </div>
                          <a
                            href={event.location_link || `https://www.google.com/maps/search/?api=1&query=${event.venue_lat},${event.venue_lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs bg-primary-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-primary-700 flex-shrink-0"
                          >
                            Directions
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Compact info bar below map */}
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex flex-wrap items-center gap-4">
                    {event.start_time && (
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
                          <Icon name="clock" size={14} className="text-blue-600" />
                        </div>
                        <span className="text-sm font-medium text-slate-700">
                          {formatTime(event.start_time)}
                          {event.end_time && ` - ${formatTime(event.end_time)}`}
                        </span>
                      </div>
                    )}
                    {event.arrival_time && (
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                          <Icon name="clock" size={14} className="text-amber-600" />
                        </div>
                        <span className="text-sm text-slate-600">
                          Arrive by <span className="font-medium text-slate-700">{formatTime(event.arrival_time)}</span>
                        </span>
                      </div>
                    )}
                    {event.event_url && (
                      <a
                        href={event.event_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
                      >
                        <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center">
                          <Icon name="link" size={14} className="text-indigo-600" />
                        </div>
                        Event Page →
                      </a>
                    )}
                    {/* Captain's Meeting - Admin only (hidden in paddler view) */}
                    {effectiveIsAdmin && event.captains_meeting_time && (
                      <div className="flex items-center gap-2 bg-primary-50 px-2 py-1 rounded-lg">
                        <Icon name="roster" size={14} className="text-primary-600" />
                        <span className="text-sm text-primary-700">
                          Captain's: <span className="font-medium">{formatTime(event.captains_meeting_time)}</span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Additional details in grid */}
                <div className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">

                    {/* Multiple food spots display */}
                    {event.food_spots && event.food_spots.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="text-orange-600 text-lg">🍜</span>
                          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Post-Event Food</div>
                        </div>
                        {event.food_spots.map((spot, idx) => (
                          <div key={idx} className="flex items-start gap-3 ml-2 pl-3 border-l-2 border-orange-200">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                {spot.link ? (
                                  <a
                                    href={spot.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-primary-600 hover:text-primary-700 underline font-medium"
                                  >
                                    {spot.name || 'Food Spot'}
                                  </a>
                                ) : (
                                  <span className="text-slate-900 font-medium">{spot.name || 'Food Spot'}</span>
                                )}
                                {spot.reservation_time && (
                                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                                    {spot.reservation_time}
                                  </span>
                                )}
                              </div>
                              {spot.notes && (
                                <div className="text-xs text-slate-500 mt-0.5">{spot.notes}</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Legacy single food location - only show if no food_spots */}
                    {event.food_location_name && (!event.food_spots || event.food_spots.length === 0) && (
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-orange-100 rounded-lg">
                          <span className="text-orange-600 text-lg">🍜</span>
                        </div>
                        <div>
                          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Post-Event Food</div>
                          {event.food_location_link ? (
                            <a
                              href={event.food_location_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-primary-600 hover:text-primary-700 underline font-medium"
                            >
                              {event.food_location_name}
                            </a>
                          ) : (
                            <div className="text-slate-900 font-medium">{event.food_location_name}</div>
                          )}
                        </div>
                      </div>
                    )}
                    </div>

                    {/* Second column - capacity and other info */}
                    <div className="space-y-3">
                      {event.max_participants && (
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50/50 border border-emerald-100">
                          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                            <Icon name="roster" size={18} className="text-emerald-600" />
                          </div>
                          <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Capacity</div>
                            <div className="text-slate-900 font-medium">
                              <span className="font-bold text-emerald-600">{rsvpCounts.yes}</span>
                              <span className="text-slate-500"> / {event.max_participants}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Description - Collapsible on mobile */}
                  {event.description && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <button
                        onClick={() => toggleSection('description')}
                        className="w-full flex items-center justify-between group"
                      >
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</div>
                        <Icon
                          name={expandedSections.description ? 'chevron-up' : 'chevron-down'}
                          size={14}
                          className="text-slate-400 group-hover:text-slate-600 transition-colors sm:hidden"
                        />
                      </button>
                      <div className={`overflow-hidden transition-all duration-200 ${
                        expandedSections.description ? 'max-h-[500px] opacity-100 mt-2' : 'max-h-0 opacity-0 sm:max-h-[500px] sm:opacity-100 sm:mt-2'
                      }`}>
                        <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                          <Linkify text={event.description} />
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Important Notes - Collapsible on mobile */}
                  {event.notes && (
                    <div className="mt-4 rounded-xl bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 overflow-hidden">
                      <button
                        onClick={() => toggleSection('notes')}
                        className="w-full p-4 flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center">
                            <span className="text-xs">⚠️</span>
                          </div>
                          <div className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">Important Notes</div>
                        </div>
                        <Icon
                          name={expandedSections.notes ? 'chevron-up' : 'chevron-down'}
                          size={14}
                          className="text-amber-500 group-hover:text-amber-700 transition-colors sm:hidden"
                        />
                      </button>
                      <div className={`overflow-hidden transition-all duration-200 ${
                        expandedSections.notes ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0 sm:max-h-[500px] sm:opacity-100'
                      }`}>
                        <div className="px-4 pb-4">
                          <p className="text-amber-900 text-sm whitespace-pre-wrap">
                            <Linkify text={event.notes} />
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Race Day Instructions - Collapsible on mobile */}
                  {event.instructions && (
                    <div className="mt-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 overflow-hidden">
                      <button
                        onClick={() => toggleSection('instructions')}
                        className="w-full p-4 flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Icon name="information" size={14} className="text-blue-600" />
                          </div>
                          <div className="text-[10px] font-bold text-blue-700 uppercase tracking-widest">Race Day Instructions</div>
                        </div>
                        <Icon
                          name={expandedSections.instructions ? 'chevron-up' : 'chevron-down'}
                          size={14}
                          className="text-blue-500 group-hover:text-blue-700 transition-colors sm:hidden"
                        />
                      </button>
                      <div className={`overflow-hidden transition-all duration-200 ${
                        expandedSections.instructions ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0 sm:max-h-[500px] sm:opacity-100'
                      }`}>
                        <div className="px-4 pb-4">
                          <p className="text-blue-900 text-sm whitespace-pre-wrap">
                            <Linkify text={event.instructions} />
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Photos Preview - Link to Photos tab */}
              {event.photos?.length > 0 && (
                <button
                  onClick={() => setActiveTab('photos')}
                  className="card p-4 flex items-center justify-between hover:bg-slate-50 transition-colors w-full text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-2">
                      {event.photos.slice(0, 3).map((photo, idx) => (
                        <div key={photo.id} className="w-10 h-10 rounded-lg overflow-hidden border-2 border-white shadow-sm">
                          <img src={photo.url} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                    <div>
                      <span className="font-medium text-slate-900">{event.photos.length} Photos</span>
                      <span className="text-slate-400 text-sm ml-2">→ View all</span>
                    </div>
                  </div>
                  <Icon name="arrowRight" size={18} className="text-slate-400" />
                </button>
              )}

              {/* Upcoming Deadlines Summary - Read-only for members */}
              {eventDeadlines.filter(d => {
                const isPast = new Date(d.deadline_date) < new Date()
                return !isPast && d.is_visible_to_members
              }).length > 0 && (
                <div className="space-y-2">
                  {eventDeadlines
                    .filter(d => {
                      const isPast = new Date(d.deadline_date) < new Date()
                      return !isPast && d.is_visible_to_members
                    })
                    .slice(0, 3)
                    .map(deadline => {
                      const isToday = new Date(deadline.deadline_date).toDateString() === new Date().toDateString()
                      const daysUntil = Math.ceil((new Date(deadline.deadline_date) - new Date()) / (1000 * 60 * 60 * 24))

                      return (
                        <div
                          key={deadline.id}
                          className={`flex items-center gap-3 p-3 rounded-xl border ${
                            isToday ? 'bg-red-50 border-red-200' :
                            daysUntil <= 3 ? 'bg-amber-50 border-amber-200' :
                            'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            isToday ? 'bg-red-100' : daysUntil <= 3 ? 'bg-amber-100' : 'bg-slate-100'
                          }`}>
                            <Icon name="clock" size={18} className={
                              isToday ? 'text-red-600' : daysUntil <= 3 ? 'text-amber-600' : 'text-slate-500'
                            } />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-slate-900 truncate">{deadline.title}</div>
                            <div className="text-xs text-slate-500">
                              {format(new Date(deadline.deadline_date), 'MMM d')}
                              {deadline.deadline_time && ` at ${deadline.deadline_time}`}
                              {isToday && <span className="ml-2 text-red-600 font-bold">TODAY</span>}
                              {!isToday && daysUntil <= 7 && (
                                <span className={`ml-2 font-medium ${daysUntil <= 3 ? 'text-amber-600' : 'text-slate-500'}`}>
                                  {daysUntil} day{daysUntil !== 1 ? 's' : ''} left
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  {effectiveIsAdmin && (
                    <button
                      onClick={() => setActiveTab('manage')}
                      className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1 mt-1"
                    >
                      Manage deadlines <Icon name="arrowRight" size={12} />
                    </button>
                  )}
                </div>
              )}

              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="card text-center py-4">
                  <div className="text-3xl font-bold text-success-600">{rsvpCounts.yes}</div>
                  <div className="text-sm text-slate-600">Going</div>
                </div>
                <div className="card text-center py-4">
                  <div className="text-3xl font-bold text-primary-600">{rsvpCounts.interested}</div>
                  <div className="text-sm text-slate-600">Interested</div>
                </div>
                <div className="card text-center py-4">
                  <div className="text-3xl font-bold text-red-600">{rsvpCounts.no}</div>
                  <div className="text-sm text-slate-600">Can't Go</div>
                </div>
                <div className="card text-center py-4">
                  <div className="text-3xl font-bold text-purple-600">{eventCarpools.length}</div>
                  <div className="text-sm text-slate-600">Carpools</div>
                </div>
              </div>

              {/* Packing List Section */}
              <div className="card" data-section="packing-list">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <Icon name="check" size={20} className="text-emerald-600" />
                    Packing List
                  </h3>
                  {effectiveIsAdmin && (
                    <button
                      onClick={() => setShowPackingForm(!showPackingForm)}
                      className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                    >
                      {showPackingForm ? 'Cancel' : '+ Add Item'}
                    </button>
                  )}
                </div>

                {/* Admin Add Item Form */}
                {showPackingForm && effectiveIsAdmin && (
                  <div className="mb-4 p-3 bg-primary-50 rounded-lg border border-primary-200">
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        className="input text-sm flex-1"
                        placeholder="Item name..."
                        value={packingFormItem}
                        onChange={(e) => setPackingFormItem(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && packingFormItem.trim()) {
                            addPackingItem(eventId, {
                              item_name: packingFormItem.trim(),
                              category: packingFormCategory,
                              is_required: packingFormRequired
                            })
                            setPackingFormItem('')
                          }
                        }}
                      />
                      <select
                        className="input text-sm w-32"
                        value={packingFormCategory}
                        onChange={(e) => setPackingFormCategory(e.target.value)}
                      >
                        <option value="equipment">Equipment</option>
                        <option value="clothing">Clothing</option>
                        <option value="documents">Documents</option>
                        <option value="personal">Personal</option>
                        <option value="general">General</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-sm text-slate-600">
                        <input
                          type="checkbox"
                          checked={packingFormRequired}
                          onChange={(e) => setPackingFormRequired(e.target.checked)}
                          className="rounded border-slate-300"
                        />
                        Required item
                      </label>
                      <button
                        onClick={() => {
                          if (packingFormItem.trim()) {
                            addPackingItem(eventId, {
                              item_name: packingFormItem.trim(),
                              category: packingFormCategory,
                              is_required: packingFormRequired
                            })
                            setPackingFormItem('')
                          }
                        }}
                        disabled={!packingFormItem.trim()}
                        className="btn btn-primary text-sm py-1"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                )}

                {/* Packing List Items */}
                {(() => {
                  // Use admin-defined items if available, otherwise use defaults
                  const itemsToShow = eventPackingItems.length > 0
                    ? eventPackingItems
                    : defaultPackingItems.map(item => ({ ...item, id: item.id, item_name: item.name }))

                  // Group by category
                  const categories = {
                    equipment: { label: 'Equipment', icon: '🏓', items: [] },
                    clothing: { label: 'Clothing', icon: '👕', items: [] },
                    documents: { label: 'Documents', icon: '📄', items: [] },
                    personal: { label: 'Personal', icon: '🎒', items: [] },
                    general: { label: 'General', icon: '📦', items: [] },
                    optional: { label: 'Optional', icon: '💡', items: [] }
                  }

                  itemsToShow.forEach(item => {
                    const cat = item.category || 'general'
                    if (categories[cat]) {
                      categories[cat].items.push(item)
                    } else {
                      categories.general.items.push(item)
                    }
                  })

                  // Add personal items to personal category
                  personalPackingItems.forEach(item => {
                    categories.personal.items.push({ ...item, isPersonal: true })
                  })

                  const packedCount = Object.values(packingList).filter(Boolean).length
                  const totalItems = itemsToShow.length + personalPackingItems.length

                  return (
                    <>
                      {/* Progress bar */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-slate-600">Packed</span>
                          <span className="font-medium text-slate-900">{packedCount} / {totalItems}</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 transition-all duration-300"
                            style={{ width: totalItems > 0 ? `${(packedCount / totalItems) * 100}%` : '0%' }}
                          />
                        </div>
                      </div>

                      {/* Items by category */}
                      <div className="space-y-4">
                        {Object.entries(categories).map(([catKey, cat]) => {
                          if (cat.items.length === 0) return null
                          return (
                            <div key={catKey}>
                              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                                <span>{cat.icon}</span>
                                {cat.label}
                              </div>
                              <div className="space-y-1">
                                {cat.items.map((item) => {
                                  const itemKey = item.isPersonal ? `personal-${item.id}` : item.id
                                  const isChecked = packingList[itemKey] || false
                                  return (
                                    <div
                                      key={itemKey}
                                      className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
                                        isChecked ? 'bg-emerald-50' : 'bg-slate-50 hover:bg-slate-100'
                                      }`}
                                    >
                                      <label className="flex items-center gap-2 flex-1 cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={() => setPackingList(prev => ({ ...prev, [itemKey]: !prev[itemKey] }))}
                                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                        />
                                        <span className={`text-sm ${isChecked ? 'text-slate-500 line-through' : 'text-slate-700'}`}>
                                          {item.item_name || item.name}
                                        </span>
                                        {item.is_required === false && (
                                          <span className="text-xs text-slate-400">(optional)</span>
                                        )}
                                        {item.isPersonal && (
                                          <span className="text-xs text-blue-500">(personal)</span>
                                        )}
                                      </label>
                                      {/* Delete button for admin items or personal items */}
                                      {(effectiveIsAdmin && eventPackingItems.length > 0 && !item.isPersonal) && (
                                        <button
                                          onClick={() => deletePackingItem(item.id, eventId)}
                                          className="text-slate-400 hover:text-red-500 p-1"
                                          title="Remove item"
                                        >
                                          <Icon name="close" size={14} />
                                        </button>
                                      )}
                                      {item.isPersonal && (
                                        <button
                                          onClick={() => setPersonalPackingItems(prev => prev.filter(p => p.id !== item.id))}
                                          className="text-slate-400 hover:text-red-500 p-1"
                                          title="Remove personal item"
                                        >
                                          <Icon name="close" size={14} />
                                        </button>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {/* Add personal item (for all users) */}
                      <div className="mt-4 pt-4 border-t border-slate-200">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            className="input text-sm flex-1"
                            placeholder="Add personal item..."
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && e.target.value.trim()) {
                                setPersonalPackingItems(prev => [
                                  ...prev,
                                  { id: Date.now().toString(), name: e.target.value.trim(), item_name: e.target.value.trim() }
                                ])
                                e.target.value = ''
                              }
                            }}
                          />
                          <button
                            onClick={(e) => {
                              const input = e.target.previousElementSibling
                              if (input.value.trim()) {
                                setPersonalPackingItems(prev => [
                                  ...prev,
                                  { id: Date.now().toString(), name: input.value.trim(), item_name: input.value.trim() }
                                ])
                                input.value = ''
                              }
                            }}
                            className="btn btn-secondary text-sm"
                          >
                            Add
                          </button>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">Personal items are saved to your device only</p>
                      </div>
                    </>
                  )
                })()}
              </div>
            </>
          )}
        </div>
      )}

      {/* ==================== ATTENDANCE TAB ==================== */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          {/* Attendance Header */}
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-600 via-teal-500 to-emerald-600 p-5">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAzMHYySDE0di0yaDIyek0zNiAyNnYySDE0di0yaDIyek0zNiAyMnYySDE0di0yaDIyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
            <div className="relative flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Icon name="roster" size={24} className="text-emerald-200" />
                  Attendance
                </h2>
                <p className="text-emerald-100 text-sm mt-1">
                  {rsvpCounts.yes} going • {rsvpCounts.interested} interested
                </p>
              </div>
            </div>
          </div>

          {/* Attendance visibility check - hide from non-admin when disabled */}
          {!effectiveIsAdmin && event.show_attendance_to_members === false ? (
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <Icon name="roster" size={24} className="text-slate-400" />
              </div>
              <h3 className="font-semibold text-slate-700 mb-2">Attendance Hidden</h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto">
                The team list for this event is not yet visible. Check back later or contact a coach for details.
              </p>
            </div>
          ) : (
          <>
          {/* Team Stats - Distinctive gradient cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 border border-emerald-200 p-4 text-center">
              <div className="absolute -top-6 -right-6 w-16 h-16 bg-emerald-300/20 rounded-full blur-xl" />
              <div className="relative">
                <div className="text-3xl font-black bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">{rsvpCounts.yes}</div>
                <div className="text-[10px] font-bold text-emerald-600/70 uppercase tracking-widest mt-1">Going</div>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary-50 via-blue-50 to-indigo-50 border border-primary-200 p-4 text-center">
              <div className="absolute -top-6 -right-6 w-16 h-16 bg-primary-300/20 rounded-full blur-xl" />
              <div className="relative">
                <div className="text-3xl font-black bg-gradient-to-r from-primary-600 to-blue-600 bg-clip-text text-transparent">{rsvpCounts.interested}</div>
                <div className="text-[10px] font-bold text-primary-600/70 uppercase tracking-widest mt-1">Interested</div>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-red-50 via-rose-50 to-pink-50 border border-red-200 p-4 text-center">
              <div className="absolute -top-6 -right-6 w-16 h-16 bg-red-300/20 rounded-full blur-xl" />
              <div className="relative">
                <div className="text-3xl font-black bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent">{rsvpCounts.no}</div>
                <div className="text-[10px] font-bold text-red-600/70 uppercase tracking-widest mt-1">Can't Go</div>
              </div>
            </div>
          </div>

          {/* Participants by Status - Enhanced sections */}
          {/* Non-admin users only see "Going" list, admin sees all statuses */}
          {(effectiveIsAdmin ? ['yes', 'interested', 'no'] : ['yes']).map(status => {
            const statusRSVPs = eventRSVPs.filter(r => r.status === status)
            if (statusRSVPs.length === 0) return null

            const config = {
              yes: {
                label: 'Going',
                icon: '✓',
                bg: 'bg-emerald-50/50',
                border: 'border-emerald-200',
                text: 'text-emerald-700',
                gradient: 'from-emerald-500 to-green-500',
                iconBg: 'bg-emerald-100'
              },
              interested: {
                label: 'Interested',
                icon: '★',
                bg: 'bg-primary-50/50',
                border: 'border-primary-200',
                text: 'text-primary-700',
                gradient: 'from-primary-500 to-blue-500',
                iconBg: 'bg-primary-100'
              },
              no: {
                label: 'Not Going',
                icon: '✗',
                bg: 'bg-red-50/50',
                border: 'border-red-200',
                text: 'text-red-700',
                gradient: 'from-red-500 to-rose-500',
                iconBg: 'bg-red-100'
              }
            }[status]

            const checkedInCount = status === 'yes' ? statusRSVPs.filter(r => r.checked_in_at).length : 0

            return (
              <div key={status} className="relative overflow-hidden rounded-xl bg-white border border-slate-200 shadow-sm">
                {/* Header with gradient accent */}
                <div className={`bg-gradient-to-r ${config.gradient} p-0.5`}>
                  <div className="bg-white px-4 py-3 flex items-center justify-between">
                    <h3 className={`font-bold flex items-center gap-2 ${config.text}`}>
                      <span className={`w-6 h-6 rounded-lg ${config.iconBg} flex items-center justify-center text-xs`}>
                        {config.icon}
                      </span>
                      {config.label}
                    </h3>
                    <div className="flex items-center gap-2">
                      {/* Check-in count for Going section */}
                      {status === 'yes' && checkedInCount > 0 && (
                        <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-100 text-emerald-700">
                          {checkedInCount} checked in
                        </span>
                      )}
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${config.bg} ${config.text}`}>
                        {statusRSVPs.length}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {statusRSVPs.map(rsvp => {
                      const isCheckedIn = !!rsvp.checked_in_at
                      const checkInTime = rsvp.checked_in_at ? new Date(rsvp.checked_in_at) : null

                      // Calculate distance from venue if we have both coordinates (for admin view)
                      const hasCheckInLocation = rsvp.check_in_lat && rsvp.check_in_lng
                      const hasVenueLocation = event?.venue_lat && event?.venue_lng
                      const checkInDistance = hasCheckInLocation && hasVenueLocation
                        ? calculateDistance(rsvp.check_in_lat, rsvp.check_in_lng, event.venue_lat, event.venue_lng)
                        : null
                      const checkInRadius = event?.check_in_radius || 500 // Default 500m
                      const isTooFar = checkInDistance && checkInDistance > checkInRadius

                      return (
                        <div
                          key={rsvp.id}
                          className={`p-3 rounded-xl border hover:shadow-sm transition-shadow ${
                            status === 'yes' && isCheckedIn
                              ? isTooFar
                                ? 'bg-amber-50 border-amber-300' // Warning color if too far
                                : 'bg-emerald-50 border-emerald-300'
                              : `${config.bg} ${config.border}`
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-slate-900 text-sm truncate">
                                {rsvp.user?.full_name || rsvp.user_profile?.full_name}
                              </div>
                              {rsvp.role && (
                                <div className="text-xs text-slate-500 capitalize mt-0.5">{rsvp.role}</div>
                              )}
                              {/* Check-in time for Going members */}
                              {status === 'yes' && isCheckedIn && checkInTime && (
                                <div className={`text-[10px] mt-1 flex items-center gap-1 ${isTooFar ? 'text-amber-600' : 'text-emerald-600'}`}>
                                  <span>{isTooFar ? '⚠️' : '✓'}</span>
                                  {checkInTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              )}
                              {/* Distance info for admin/coach - show if self check-in with location */}
                              {status === 'yes' && isCheckedIn && effectiveIsAdmin && hasCheckInLocation && (
                                <div className={`text-[10px] mt-0.5 flex items-center gap-1 ${
                                  isTooFar ? 'text-amber-600 font-medium' : 'text-slate-500'
                                }`}>
                                  <Icon name="location" size={10} />
                                  {checkInDistance !== null ? (
                                    <>
                                      {formatDistance(checkInDistance)}
                                      {isTooFar && <span className="text-amber-600">(far)</span>}
                                    </>
                                  ) : (
                                    'Location recorded'
                                  )}
                                </div>
                              )}
                              {/* Show if admin checked them in (no location) */}
                              {status === 'yes' && isCheckedIn && effectiveIsAdmin && !hasCheckInLocation && rsvp.checked_in_by && (
                                <div className="text-[10px] mt-0.5 text-slate-400 italic">
                                  Manual check-in
                                </div>
                              )}
                            </div>
                            {/* Check-in toggle for Going members - Admin only (hidden in paddler view) */}
                            {status === 'yes' && effectiveIsAdmin && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  adminToggleEventCheckIn(eventId, rsvp.user_id, !isCheckedIn, user?.id)
                                }}
                                className={`flex-shrink-0 w-8 h-5 rounded-full transition-all duration-200 relative ${
                                  isCheckedIn
                                    ? 'bg-emerald-500'
                                    : 'bg-slate-300'
                                }`}
                              >
                                <div
                                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200 ${
                                    isCheckedIn ? 'left-3.5' : 'left-0.5'
                                  }`}
                                />
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })}

          {/* Admin RSVP & Check-In Management - Enhanced with dark header (hidden in paddler view) */}
          {effectiveIsAdmin && (
            <div className="relative overflow-hidden rounded-xl bg-white border border-slate-200 shadow-sm">
              {/* Dark gradient header */}
              <div className="relative bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 px-5 py-4">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary-500/10 rounded-full blur-2xl" />
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                      <Icon name="settings" size={20} className="text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white">Manage RSVPs & Check-Ins</h3>
                      <p className="text-xs text-slate-400">{members.filter(m => m.is_active).length} team members</p>
                    </div>
                  </div>
                  {/* Check-in stats */}
                  <div className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-sm font-medium">
                    {eventRSVPs.filter(r => r.checked_in_at).length} checked in
                  </div>
                </div>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {members
                    .filter(m => m.is_active)
                    .sort((a, b) => {
                      const aRsvp = eventRSVPs.find(r => r.user_id === a.id)
                      const bRsvp = eventRSVPs.find(r => r.user_id === b.id)
                      // Sort: checked in first, then by RSVP status, then by name
                      const aCheckedIn = aRsvp?.checked_in_at ? 0 : 1
                      const bCheckedIn = bRsvp?.checked_in_at ? 0 : 1
                      if (aCheckedIn !== bCheckedIn) return aCheckedIn - bCheckedIn
                      const statusOrder = { yes: 1, interested: 2, maybe: 3, no: 4 }
                      const aOrder = aRsvp ? statusOrder[aRsvp.status] || 5 : 5
                      const bOrder = bRsvp ? statusOrder[bRsvp.status] || 5 : 5
                      if (aOrder !== bOrder) return aOrder - bOrder
                      return a.full_name.localeCompare(b.full_name)
                    })
                    .map(member => {
                      const rsvp = eventRSVPs.find(r => r.user_id === member.id)
                      const currentStatus = rsvp?.status || 'no_response'
                      const isCheckedIn = !!rsvp?.checked_in_at
                      const checkInTime = rsvp?.checked_in_at ? new Date(rsvp.checked_in_at) : null

                      return (
                        <div
                          key={member.id}
                          className={`p-3 rounded-xl border transition-shadow ${
                            isCheckedIn
                              ? 'bg-emerald-50 border-emerald-200'
                              : 'bg-slate-50 border-slate-200'
                          } hover:shadow-sm`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-slate-900 text-sm truncate">
                                {member.full_name}
                              </div>
                              {isCheckedIn && checkInTime && (
                                <div className="text-[10px] text-emerald-600">
                                  ✓ {checkInTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              )}
                            </div>
                            {/* Check-in toggle */}
                            <button
                              onClick={() => adminToggleEventCheckIn(eventId, member.id, !isCheckedIn, user?.id)}
                              className={`flex-shrink-0 w-10 h-6 rounded-full transition-all duration-200 relative ${
                                isCheckedIn
                                  ? 'bg-emerald-500'
                                  : 'bg-slate-300'
                              }`}
                              title={isCheckedIn ? 'Undo check-in' : 'Check in'}
                            >
                              <div
                                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-200 flex items-center justify-center text-[10px] ${
                                  isCheckedIn ? 'left-4' : 'left-0.5'
                                }`}
                              >
                                {isCheckedIn ? '✓' : ''}
                              </div>
                            </button>
                          </div>
                          <div className="flex gap-1">
                            {['yes', 'interested', 'no'].map(status => (
                              <button
                                key={status}
                                onClick={() => setRSVP(eventId, member.id, status)}
                                className={`flex-1 px-2 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                  currentStatus === status
                                    ? status === 'yes'
                                      ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-sm'
                                      : status === 'interested'
                                        ? 'bg-gradient-to-r from-primary-500 to-blue-500 text-white shadow-sm'
                                        : 'bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-sm'
                                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                {status === 'yes' ? '✓' : status === 'interested' ? '★' : '✗'}
                              </button>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>
            </div>
          )}

          {eventRSVPs.length === 0 && (
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-50 to-white border border-slate-200 text-center py-12">
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-32 h-32 bg-slate-200/50 rounded-full blur-3xl" />
              <div className="relative">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <Icon name="roster" size={32} className="text-slate-400" />
                </div>
                <p className="text-slate-600 font-medium">No RSVPs yet</p>
                <p className="text-slate-400 text-sm mt-1">Be the first to respond!</p>
              </div>
            </div>
          )}
          </>
          )}
        </div>
      )}

      {/* ==================== CARPOOLS TAB ==================== */}
      {activeTab === 'carpools' && (
        <div className="space-y-6">
          {/* Carpool Map - Admin/Coach Only */}
          {isAdminOrCoach && eventCarpools.length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <Icon name="location" size={20} className="text-primary-600" />
                  Carpool Map
                </h3>
              </div>
              <CarpoolMap
                event={event}
                carpools={eventCarpools}
                registrations={allEventRegistrations}
                teamMembers={members}
                savedLocations={savedLocations}
                isAdmin={isAdminOrCoach}
                onUpdateCarpoolCoords={async (carpoolId, coords) => {
                  // Update the carpool
                  await updateCarpool(carpoolId, eventId, coords)

                  // Also sync to driver's registration (keep both in sync)
                  const carpool = eventCarpools.find(c => c.id === carpoolId)
                  if (carpool?.driver_id) {
                    const driverReg = allEventRegistrations.find(r => r.user_id === carpool.driver_id)
                    if (driverReg) {
                      // Map carpool fields to registration fields
                      const regUpdates = {}
                      if (coords.departure_lat !== undefined) {
                        regUpdates.carpool_departure_lat = coords.departure_lat
                        regUpdates.carpool_departure_lng = coords.departure_lng
                        regUpdates.carpool_departure_location = coords.departure_location || driverReg.carpool_departure_location
                      }
                      if (coords.final_lat !== undefined) {
                        regUpdates.carpool_return_lat = coords.final_lat
                        regUpdates.carpool_return_lng = coords.final_lng
                        regUpdates.carpool_return_location = coords.final_location || driverReg.carpool_return_location
                      }

                      if (Object.keys(regUpdates).length > 0) {
                        await supabase
                          .from('event_registrations')
                          .update(regUpdates)
                          .eq('id', driverReg.id)

                        // Refresh registrations
                        const { data: allRegs } = await supabase
                          .from('event_registrations')
                          .select(`*, profile:profiles(id, full_name, phone)`)
                          .eq('event_id', eventId)
                        setAllEventRegistrations(allRegs || [])
                      }
                    }
                  }
                }}
                onUpdateRiderLocation={async (registrationId, updates) => {
                  try {
                    // Update event_registrations table (where allEventRegistrations data comes from)
                    const { error } = await supabase
                      .from('event_registrations')
                      .update(updates)
                      .eq('id', registrationId)
                    if (error) throw error
                    toast.success('Rider info updated')
                    // Refresh event registrations
                    const { data: allRegs } = await supabase
                      .from('event_registrations')
                      .select(`
                        *,
                        profile:profiles(id, full_name, phone)
                      `)
                      .eq('event_id', eventId)
                    setAllEventRegistrations(allRegs || [])
                  } catch (err) {
                    console.error('Error updating rider location:', err)
                    toast.error(err.message || 'Failed to update location')
                  }
                }}
                onCreateRegistration={async (memberData) => {
                  try {
                    // Create or update a registration for this member in event_registrations
                    const member = members.find(m => m.id === memberData.user_id)
                    const carpoolData = {
                      carpool_needs: memberData.carpool_needs || 'need_ride',
                      carpool_direction: memberData.carpool_direction || 'both',
                      carpool_departure_location: memberData.carpool_departure_location || null,
                      carpool_departure_lat: memberData.carpool_departure_lat || null,
                      carpool_departure_lng: memberData.carpool_departure_lng || null,
                      carpool_return_location: memberData.carpool_return_location || null,
                      carpool_return_lat: memberData.carpool_return_lat || null,
                      carpool_return_lng: memberData.carpool_return_lng || null,
                      carpool_return_same_as_departure: memberData.carpool_return_same_as_departure || false
                    }

                    // Check if event_registration already exists
                    const { data: existingReg } = await supabase
                      .from('event_registrations')
                      .select('id')
                      .eq('event_id', eventId)
                      .eq('user_id', memberData.user_id)
                      .maybeSingle()

                    if (existingReg) {
                      // Update existing registration with carpool info
                      const { error } = await supabase
                        .from('event_registrations')
                        .update(carpoolData)
                        .eq('id', existingReg.id)
                      if (error) throw error
                      toast.success('Carpool info updated for ' + (member?.full_name || 'member'))
                    } else {
                      // Create new event_registration
                      // Use 'incomplete' status since member hasn't confirmed (valid: incomplete, submitted, confirmed, cancelled)
                      const { error } = await supabase
                        .from('event_registrations')
                        .insert({
                          event_id: eventId,
                          user_id: memberData.user_id,
                          status: 'incomplete',
                          ...carpoolData,
                          availability_notes: '[Pre-filled by admin/coach]'
                        })
                      if (error) throw error
                      toast.success('Location pre-filled for ' + (member?.full_name || 'member'))
                    }

                    // Refresh event registrations for carpool display
                    const { data: allRegs } = await supabase
                      .from('event_registrations')
                      .select(`
                        *,
                        profile:profiles(id, full_name, phone)
                      `)
                      .eq('event_id', eventId)
                    setAllEventRegistrations(allRegs || [])

                    // Also refresh RSVPs for the RSVP list
                    await fetchRSVPs(eventId)
                  } catch (err) {
                    console.error('Error creating registration:', err)
                    toast.error(err.message || 'Failed to pre-fill registration')
                    throw err // Re-throw so CarpoolMap knows it failed
                  }
                }}
              />
            </div>
          )}

          {/* Carpools Section Header */}
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-600 via-orange-500 to-amber-600 p-5">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAzMHYySDE0di0yaDIyek0zNiAyNnYySDE0di0yaDIyek0zNiAyMnYySDE0di0yaDIyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
            <div className="relative flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Icon name="car" size={24} className="text-amber-200" />
                  Carpools
                </h2>
                <p className="text-amber-100 text-sm mt-1">
                  {eventCarpools.length} ride{eventCarpools.length !== 1 ? 's' : ''} available
                </p>
              </div>
              {user && (
                <button
                  onClick={() => setShowCarpoolForm(!showCarpoolForm)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white/15 hover:bg-white/25 backdrop-blur-sm border border-white/20 rounded-lg text-white text-sm font-medium transition-all"
                >
                  <Icon name={showCarpoolForm ? 'close' : 'plus'} size={16} />
                  {showCarpoolForm ? 'Cancel' : 'Offer a Ride'}
                </button>
              )}
            </div>
          </div>

          {showCarpoolForm && (
            <div className="card bg-primary-50 border-primary-200">
              <h3 className="font-bold text-slate-900 mb-4">Offer a Carpool</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label text-xs">Vehicle</label>
                    <input
                      type="text"
                      className="input text-sm"
                      placeholder="e.g., Red Honda Civic"
                      value={carpoolForm.vehicle_description}
                      onChange={(e) => setCarpoolForm({ ...carpoolForm, vehicle_description: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label text-xs">Seats Available *</label>
                    <input
                      type="number"
                      className="input text-sm"
                      min="1"
                      value={carpoolForm.total_seats}
                      onChange={(e) => setCarpoolForm({ ...carpoolForm, total_seats: e.target.value })}
                    />
                  </div>
                </div>

                {/* Trip Direction - One-way option */}
                <div className="bg-blue-50/50 rounded-lg p-3 border border-blue-100">
                  <label className="label text-xs text-blue-700 mb-2">Trip Direction</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: 'both', label: '↔ Both Ways', desc: 'To & from event' },
                      { value: 'to', label: '→ To Event Only', desc: 'One-way to venue' },
                      { value: 'from', label: '← From Event Only', desc: 'One-way home' }
                    ].map(opt => (
                      <label
                        key={opt.value}
                        className={`flex-1 min-w-[100px] px-3 py-2 rounded-lg border cursor-pointer transition-all text-center ${
                          carpoolForm.carpool_direction === opt.value
                            ? 'border-blue-500 bg-blue-100 text-blue-800'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="carpool_direction"
                          value={opt.value}
                          checked={carpoolForm.carpool_direction === opt.value}
                          onChange={(e) => setCarpoolForm({ ...carpoolForm, carpool_direction: e.target.value })}
                          className="sr-only"
                        />
                        <div className="text-sm font-bold">{opt.label}</div>
                        <div className="text-[10px] opacity-70">{opt.desc}</div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Route Section */}
                <div className="bg-white/50 rounded-lg p-3 space-y-3">
                  <div className="text-xs font-bold text-slate-600 uppercase tracking-wide">Route</div>

                  <div className="grid grid-cols-1 gap-3">
                    <AddressSearchInput
                      value={carpoolForm.departure_location}
                      onChange={(value, coords) => setCarpoolForm({
                        ...carpoolForm,
                        departure_location: value,
                        departure_lat: coords?.lat || null,
                        departure_lng: coords?.lng || null
                      })}
                      label="Leaving From *"
                      placeholder="Start location"
                      savedLocations={savedLocations}
                      showMapPicker={true}
                    />
                    <AddressSearchInput
                      value={carpoolForm.final_destination}
                      onChange={(value, coords) => setCarpoolForm({
                        ...carpoolForm,
                        final_destination: value,
                        final_lat: coords?.lat || null,
                        final_lng: coords?.lng || null
                      })}
                      label="Return Location"
                      placeholder="Where to return after event (optional)"
                      savedLocations={savedLocations}
                      showMapPicker={true}
                    />
                  </div>

                  {/* Pickup Stops */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="label mb-0">Pickup Stops</label>
                      <button
                        type="button"
                        onClick={() => setCarpoolForm({
                          ...carpoolForm,
                          pickup_stops: [...carpoolForm.pickup_stops, { location: '', time: '' }]
                        })}
                        className="text-xs text-primary-600 hover:text-primary-800 font-medium"
                      >
                        + Add Stop
                      </button>
                    </div>
                    {carpoolForm.pickup_stops.length === 0 ? (
                      <p className="text-xs text-slate-500 italic">No additional pickup stops</p>
                    ) : (
                      <div className="space-y-2">
                        {carpoolForm.pickup_stops.map((stop, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 w-4">{idx + 1}.</span>
                            <input
                              type="text"
                              className="input flex-1"
                              placeholder="Pickup location"
                              value={stop.location}
                              onChange={(e) => {
                                const newStops = [...carpoolForm.pickup_stops]
                                newStops[idx] = { ...newStops[idx], location: e.target.value }
                                setCarpoolForm({ ...carpoolForm, pickup_stops: newStops })
                              }}
                            />
                            <input
                              type="time"
                              className="input w-28"
                              value={stop.time || ''}
                              onChange={(e) => {
                                const newStops = [...carpoolForm.pickup_stops]
                                newStops[idx] = { ...newStops[idx], time: e.target.value }
                                setCarpoolForm({ ...carpoolForm, pickup_stops: newStops })
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const newStops = carpoolForm.pickup_stops.filter((_, i) => i !== idx)
                                setCarpoolForm({ ...carpoolForm, pickup_stops: newStops })
                              }}
                              className="w-6 h-6 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Dropoff Stops */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="label mb-0">Dropoff Stops (Return Trip)</label>
                      <button
                        type="button"
                        onClick={() => setCarpoolForm({
                          ...carpoolForm,
                          dropoff_stops: [...carpoolForm.dropoff_stops, { location: '' }]
                        })}
                        className="text-xs text-primary-600 hover:text-primary-800 font-medium"
                      >
                        + Add Stop
                      </button>
                    </div>
                    {carpoolForm.dropoff_stops.length === 0 ? (
                      <p className="text-xs text-slate-500 italic">No dropoff stops (will return to start)</p>
                    ) : (
                      <div className="space-y-2">
                        {carpoolForm.dropoff_stops.map((stop, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 w-4">{idx + 1}.</span>
                            <input
                              type="text"
                              className="input flex-1"
                              placeholder="Dropoff location"
                              value={stop.location}
                              onChange={(e) => {
                                const newStops = [...carpoolForm.dropoff_stops]
                                newStops[idx] = { ...newStops[idx], location: e.target.value }
                                setCarpoolForm({ ...carpoolForm, dropoff_stops: newStops })
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const newStops = carpoolForm.dropoff_stops.filter((_, i) => i !== idx)
                                setCarpoolForm({ ...carpoolForm, dropoff_stops: newStops })
                              }}
                              className="w-6 h-6 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="label text-xs">Depart</label>
                    <input
                      type="time"
                      className="input text-sm"
                      value={carpoolForm.departure_time}
                      onChange={(e) => setCarpoolForm({ ...carpoolForm, departure_time: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label text-xs">Return</label>
                    <input
                      type="time"
                      className="input text-sm"
                      value={carpoolForm.return_time}
                      onChange={(e) => setCarpoolForm({ ...carpoolForm, return_time: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label text-xs">$/Person</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input text-sm"
                      placeholder="Gas"
                      value={carpoolForm.estimated_cost_per_person}
                      onChange={(e) => setCarpoolForm({ ...carpoolForm, estimated_cost_per_person: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="label text-xs">Notes</label>
                  <textarea
                    className="input text-sm"
                    rows="2"
                    placeholder="Any additional info..."
                    value={carpoolForm.notes}
                    onChange={(e) => setCarpoolForm({ ...carpoolForm, notes: e.target.value })}
                  />
                </div>

                {isAdminOrCoach && (
                  <div>
                    <label className="label text-xs flex items-center gap-1">
                      <Icon name="messageCircle" size={12} className="text-green-600" />
                      WhatsApp Group Link
                    </label>
                    <input
                      type="url"
                      className="input text-sm"
                      placeholder="https://chat.whatsapp.com/..."
                      value={carpoolForm.whatsapp_link}
                      onChange={(e) => setCarpoolForm({ ...carpoolForm, whatsapp_link: e.target.value })}
                    />
                  </div>
                )}

                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCreateCarpool()
                  }}
                  className="btn btn-primary w-full text-sm"
                >
                  Create Carpool
                </button>
              </div>
            </div>
          )}

          {/* Carpool List */}
          <div className="space-y-4">
            {eventCarpools.map(carpool => {
              const passengers = carpool.passengers || []
              const isDriver = carpool.driver_id === user?.id
              const isPassenger = passengers.some(p => p.passenger_id === user?.id)
              const availableSeats = carpool.available_seats
              const isEditing = editingCarpoolId === carpool.id

              // Edit mode for this carpool
              if (isEditing) {
                return (
                  <div key={carpool.id} className="card bg-amber-50 border-amber-200">
                    <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <Icon name="edit" size={20} className="text-amber-600" />
                      Edit {formatShortName(carpool.driver?.full_name)}'s Carpool
                    </h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="label text-xs">Vehicle</label>
                          <input
                            type="text"
                            className="input text-sm"
                            placeholder="e.g., Red Honda Civic"
                            value={carpoolForm.vehicle_description}
                            onChange={(e) => setCarpoolForm({ ...carpoolForm, vehicle_description: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="label text-xs">Seats Available *</label>
                          <input
                            type="number"
                            className="input text-sm"
                            min="1"
                            value={carpoolForm.total_seats}
                            onChange={(e) => setCarpoolForm({ ...carpoolForm, total_seats: e.target.value })}
                          />
                        </div>
                      </div>

                      {/* Trip Direction - One-way option */}
                      <div className="bg-blue-50/50 rounded-lg p-3 border border-blue-100">
                        <label className="label text-xs text-blue-700 mb-2">Trip Direction</label>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { value: 'both', label: '↔ Both Ways', desc: 'To & from event' },
                            { value: 'to', label: '→ To Event Only', desc: 'One-way to venue' },
                            { value: 'from', label: '← From Event Only', desc: 'One-way home' }
                          ].map(opt => (
                            <label
                              key={opt.value}
                              className={`flex-1 min-w-[100px] px-3 py-2 rounded-lg border cursor-pointer transition-all text-center ${
                                carpoolForm.carpool_direction === opt.value
                                  ? 'border-blue-500 bg-blue-100 text-blue-800'
                                  : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300'
                              }`}
                            >
                              <input
                                type="radio"
                                name="edit_carpool_direction"
                                value={opt.value}
                                checked={carpoolForm.carpool_direction === opt.value}
                                onChange={(e) => setCarpoolForm({ ...carpoolForm, carpool_direction: e.target.value })}
                                className="sr-only"
                              />
                              <div className="text-sm font-bold">{opt.label}</div>
                              <div className="text-[10px] opacity-70">{opt.desc}</div>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Route Section */}
                      <div className="bg-white/50 rounded-lg p-3 space-y-3">
                        <div className="text-xs font-bold text-slate-600 uppercase tracking-wide">Route</div>

                        <div className="grid grid-cols-1 gap-3">
                          <AddressSearchInput
                            value={carpoolForm.departure_location}
                            onChange={(value, coords) => setCarpoolForm({
                              ...carpoolForm,
                              departure_location: value,
                              departure_lat: coords?.lat || null,
                              departure_lng: coords?.lng || null
                            })}
                            label="Leaving From *"
                            placeholder="Start location"
                            savedLocations={savedLocations}
                            showMapPicker={true}
                          />
                          <AddressSearchInput
                            value={carpoolForm.final_destination}
                            onChange={(value, coords) => setCarpoolForm({
                              ...carpoolForm,
                              final_destination: value,
                              final_lat: coords?.lat || null,
                              final_lng: coords?.lng || null
                            })}
                            label="Return Location"
                            placeholder="Where to return after event (optional)"
                            savedLocations={savedLocations}
                            showMapPicker={true}
                          />
                        </div>

                        {/* Pickup Stops */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="label mb-0">Pickup Stops</label>
                            <button
                              type="button"
                              onClick={() => setCarpoolForm({
                                ...carpoolForm,
                                pickup_stops: [...(carpoolForm.pickup_stops || []), { location: '', time: '' }]
                              })}
                              className="text-xs text-primary-600 hover:text-primary-800 font-medium"
                            >
                              + Add Stop
                            </button>
                          </div>
                          {(!carpoolForm.pickup_stops || carpoolForm.pickup_stops.length === 0) ? (
                            <p className="text-xs text-slate-500 italic">No additional pickup stops</p>
                          ) : (
                            <div className="space-y-2">
                              {carpoolForm.pickup_stops.map((stop, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <span className="text-xs text-slate-400 w-4">{idx + 1}.</span>
                                  <input
                                    type="text"
                                    className="input flex-1"
                                    placeholder="Pickup location"
                                    value={stop.location}
                                    onChange={(e) => {
                                      const newStops = [...carpoolForm.pickup_stops]
                                      newStops[idx] = { ...newStops[idx], location: e.target.value }
                                      setCarpoolForm({ ...carpoolForm, pickup_stops: newStops })
                                    }}
                                  />
                                  <input
                                    type="time"
                                    className="input w-28"
                                    value={stop.time || ''}
                                    onChange={(e) => {
                                      const newStops = [...carpoolForm.pickup_stops]
                                      newStops[idx] = { ...newStops[idx], time: e.target.value }
                                      setCarpoolForm({ ...carpoolForm, pickup_stops: newStops })
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newStops = carpoolForm.pickup_stops.filter((_, i) => i !== idx)
                                      setCarpoolForm({ ...carpoolForm, pickup_stops: newStops })
                                    }}
                                    className="w-6 h-6 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Dropoff Stops */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="label mb-0">Dropoff Stops (Return Trip)</label>
                            <button
                              type="button"
                              onClick={() => setCarpoolForm({
                                ...carpoolForm,
                                dropoff_stops: [...(carpoolForm.dropoff_stops || []), { location: '' }]
                              })}
                              className="text-xs text-primary-600 hover:text-primary-800 font-medium"
                            >
                              + Add Stop
                            </button>
                          </div>
                          {(!carpoolForm.dropoff_stops || carpoolForm.dropoff_stops.length === 0) ? (
                            <p className="text-xs text-slate-500 italic">No dropoff stops (will return to start)</p>
                          ) : (
                            <div className="space-y-2">
                              {carpoolForm.dropoff_stops.map((stop, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <span className="text-xs text-slate-400 w-4">{idx + 1}.</span>
                                  <input
                                    type="text"
                                    className="input flex-1"
                                    placeholder="Dropoff location"
                                    value={stop.location}
                                    onChange={(e) => {
                                      const newStops = [...carpoolForm.dropoff_stops]
                                      newStops[idx] = { ...newStops[idx], location: e.target.value }
                                      setCarpoolForm({ ...carpoolForm, dropoff_stops: newStops })
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newStops = carpoolForm.dropoff_stops.filter((_, i) => i !== idx)
                                      setCarpoolForm({ ...carpoolForm, dropoff_stops: newStops })
                                    }}
                                    className="w-6 h-6 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="label text-xs">Depart</label>
                          <input
                            type="time"
                            className="input text-sm"
                            value={carpoolForm.departure_time}
                            onChange={(e) => setCarpoolForm({ ...carpoolForm, departure_time: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="label text-xs">Return</label>
                          <input
                            type="time"
                            className="input text-sm"
                            value={carpoolForm.return_time}
                            onChange={(e) => setCarpoolForm({ ...carpoolForm, return_time: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="label text-xs">$/Person</label>
                          <input
                            type="number"
                            step="0.01"
                            className="input text-sm"
                            placeholder="Gas"
                            value={carpoolForm.estimated_cost_per_person}
                            onChange={(e) => setCarpoolForm({ ...carpoolForm, estimated_cost_per_person: e.target.value })}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="label text-xs">Notes</label>
                        <textarea
                          className="input text-sm"
                          rows="2"
                          placeholder="Any additional info..."
                          value={carpoolForm.notes}
                          onChange={(e) => setCarpoolForm({ ...carpoolForm, notes: e.target.value })}
                        />
                      </div>

                      {isAdminOrCoach && (
                        <div>
                          <label className="label text-xs flex items-center gap-1">
                            <Icon name="messageCircle" size={12} className="text-green-600" />
                            WhatsApp Group Link
                          </label>
                          <input
                            type="url"
                            className="input text-sm"
                            placeholder="https://chat.whatsapp.com/..."
                            value={carpoolForm.whatsapp_link}
                            onChange={(e) => setCarpoolForm({ ...carpoolForm, whatsapp_link: e.target.value })}
                          />
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleUpdateCarpool()
                          }}
                          disabled={isSavingCarpool}
                          className="btn btn-primary flex-1 text-sm"
                        >
                          {isSavingCarpool ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button
                          type="button"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCancelEditCarpool()
                          }}
                          disabled={isSavingCarpool}
                          className="btn flex-1 text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )
              }

              // Normal display mode
              return (
                <div key={carpool.id} className="card">
                  {/* Mobile-optimized carpool header */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center shrink-0">
                      <Icon name="car" size={18} className="text-primary-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-bold text-slate-900 text-sm truncate">
                          {formatShortName(carpool.driver?.full_name)}'s Carpool
                        </h3>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Direction badge */}
                          {carpool.carpool_direction && carpool.carpool_direction !== 'both' && (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              carpool.carpool_direction === 'to'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-purple-100 text-purple-700'
                            }`}>
                              {carpool.carpool_direction === 'to' ? '→ To' : '← From'}
                            </span>
                          )}
                          <div className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            availableSeats > 0 ? 'bg-success-100 text-success-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {availableSeats}/{carpool.total_seats}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {carpool.vehicle_description && (
                          <span className="text-xs text-slate-500 truncate">{carpool.vehicle_description}</span>
                        )}
                        {isAdminOrCoach && (
                          <button
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleCarpoolVisibility(carpool.id, eventId, !carpool.is_visible)
                            }}
                            className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                              carpool.is_visible !== false
                                ? 'bg-success-50 text-success-600'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {carpool.is_visible !== false ? 'Visible' : 'Hidden'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* WhatsApp Group Link - Prominent at top */}
                  {carpool.whatsapp_link && (
                    <a
                      href={carpool.whatsapp_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-3 mb-3 px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-all"
                    >
                      <Icon name="messageCircle" size={20} className="text-white" />
                      <span>Join WhatsApp Group Chat</span>
                      <Icon name="arrowUpRight" size={16} className="ml-auto opacity-80" />
                    </a>
                  )}

                  {/* Route Display - Compact on mobile */}
                  <div className="bg-slate-50 rounded-lg p-2.5 mb-3">
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full bg-primary-500" />
                        {(carpool.pickup_stops?.length > 0 || carpool.final_destination) && (
                          <div className="w-0.5 h-full bg-slate-300 my-1" style={{ minHeight: '20px' }} />
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        {/* Start Location */}
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-700">{carpool.departure_location}</span>
                          {carpool.departure_time && (
                            <span className="text-xs text-slate-500">({formatTime(carpool.departure_time)})</span>
                          )}
                        </div>

                        {/* Pickup Stops */}
                        {carpool.pickup_stops?.length > 0 && carpool.pickup_stops.map((stop, idx) => (
                          <div key={idx} className="flex items-center gap-2 pl-2 border-l-2 border-dashed border-primary-300">
                            <Icon name="location" size={14} className="text-primary-400" />
                            <span className="text-sm text-slate-600">{stop.location}</span>
                            {stop.time && (
                              <span className="text-xs text-slate-400">({formatTime(stop.time)})</span>
                            )}
                          </div>
                        ))}

                        {/* Return Location */}
                        {carpool.final_destination && (
                          <div className="flex items-center gap-2">
                            <Icon name="arrowLeft" size={14} className="text-purple-500" />
                            <span className="text-sm text-slate-600">Return: <span className="font-medium text-slate-700">{carpool.final_destination}</span></span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Return Trip Dropoffs */}
                    {carpool.dropoff_stops?.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-200">
                        <div className="text-xs font-medium text-slate-500 mb-2">Return dropoffs:</div>
                        <div className="flex flex-wrap gap-2">
                          {carpool.dropoff_stops.map((stop, idx) => (
                            <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 bg-white rounded text-xs text-slate-600">
                              <Icon name="location" size={12} className="text-slate-400" />
                              {stop.location}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Time and Cost Info - Compact */}
                  <div className="flex flex-wrap gap-3 text-xs mb-3">
                    {carpool.departure_time && (
                      <div className="flex items-center gap-1.5">
                        <Icon name="clock" size={12} className="text-slate-400" />
                        <span className="text-slate-600">Departs {formatTime(carpool.departure_time)}</span>
                      </div>
                    )}
                    {carpool.return_time && (
                      <div className="flex items-center gap-1.5">
                        <Icon name="clock" size={12} className="text-slate-400" />
                        <span className="text-slate-600">Returns {formatTime(carpool.return_time)}</span>
                      </div>
                    )}
                    {carpool.estimated_cost_per_person && (
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400">$</span>
                        <span className="text-slate-600">{carpool.estimated_cost_per_person}/person</span>
                      </div>
                    )}
                  </div>

                  {carpool.notes && (
                    <div className="text-xs text-slate-600 mb-3 bg-slate-50 rounded-lg p-2.5">
                      {carpool.notes}
                    </div>
                  )}

                  {passengers.length > 0 && (
                    <div className="mb-3">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Passengers</div>
                      <div className="flex flex-wrap gap-1.5">
                        {passengers.map(p => (
                          <span key={p.id} className="px-2 py-1 bg-slate-100 rounded-full text-xs text-slate-700 flex items-center gap-1">
                            {formatShortName(p.passenger?.full_name)}
                            {(isDriver || isAdminOrCoach) && (
                              <button
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (window.confirm(`Remove ${formatShortName(p.passenger?.full_name)} from this carpool?`)) {
                                    leaveCarpool(carpool.id, p.passenger_id, eventId)
                                  }
                                }}
                                className="w-3.5 h-3.5 rounded-full bg-slate-300 hover:bg-red-400 hover:text-white flex items-center justify-center text-[10px] transition-colors"
                                title="Remove passenger"
                              >
                                ×
                              </button>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {user && !isDriver && (
                    <div className="pt-3 border-t border-slate-100">
                      {isPassenger ? (
                        <button
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation()
                            leaveCarpool(carpool.id, user.id, eventId)
                          }}
                          className="btn bg-red-50 text-red-600 hover:bg-red-100 border-red-200 w-full text-sm"
                        >
                          Leave Carpool
                        </button>
                      ) : availableSeats > 0 ? (
                        <button
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation()
                            joinCarpool(carpool.id, user.id, eventId)
                          }}
                          className="btn btn-primary w-full text-sm"
                        >
                          Join Carpool
                        </button>
                      ) : (
                        <button disabled className="btn btn-secondary w-full text-sm opacity-50 cursor-not-allowed">
                          Carpool Full
                        </button>
                      )}
                    </div>
                  )}

                  {(isDriver || isAdminOrCoach) && (
                    <div className="pt-4 border-t border-slate-100 space-y-2">
                      {isAdminOrCoach && availableSeats > 0 && (
                        <div className="flex gap-2">
                          <select
                            className="input flex-1 text-sm"
                            onChange={(e) => {
                              if (e.target.value) {
                                addPassengerToCarpool(carpool.id, e.target.value, eventId)
                                e.target.value = ''
                              }
                            }}
                          >
                            <option value="">Assign paddler to carpool...</option>
                            {(() => {
                              // Get all people in carpools
                              const inCarpool = new Set()
                              eventCarpools.forEach(c => {
                                inCarpool.add(c.driver_id)
                                c.passengers?.forEach(p => inCarpool.add(p.passenger_id))
                              })

                              // Get RSVP'd yes members not in carpool
                              const rsvpYes = eventRSVPs.filter(r => r.status === 'yes' && !inCarpool.has(r.user_id))

                              // Categorize members
                              const needsRide = []
                              const rsvpYesOther = []
                              const others = []

                              members
                                .filter(m => m.id !== carpool.driver_id && !passengers.some(p => p.passenger_id === m.id))
                                .forEach(member => {
                                  const reg = allEventRegistrations.find(r => r.user_id === member.id)
                                  const hasRsvp = eventRSVPs.find(r => r.user_id === member.id && r.status === 'yes')

                                  if (reg?.carpool_needs === 'need_ride' && !inCarpool.has(member.id)) {
                                    needsRide.push({ member, reg, hasRsvp })
                                  } else if (hasRsvp && !inCarpool.has(member.id)) {
                                    rsvpYesOther.push({ member, reg, hasRsvp })
                                  } else {
                                    others.push({ member, reg, hasRsvp })
                                  }
                                })

                              return (
                                <>
                                  {needsRide.length > 0 && (
                                    <optgroup label="🚗 Need Ride">
                                      {needsRide.map(({ member, reg }) => (
                                        <option key={member.id} value={member.id}>
                                          {formatShortName(member.full_name)}
                                          {reg?.carpool_departure_location && ` (from: ${reg.carpool_departure_location})`}
                                        </option>
                                      ))}
                                    </optgroup>
                                  )}
                                  {rsvpYesOther.length > 0 && (
                                    <optgroup label="✓ RSVP'd Yes">
                                      {rsvpYesOther.map(({ member }) => (
                                        <option key={member.id} value={member.id}>
                                          {formatShortName(member.full_name)}
                                        </option>
                                      ))}
                                    </optgroup>
                                  )}
                                  {others.length > 0 && (
                                    <optgroup label="Other Members">
                                      {others.map(({ member }) => (
                                        <option key={member.id} value={member.id}>
                                          {formatShortName(member.full_name)}
                                        </option>
                                      ))}
                                    </optgroup>
                                  )}
                                </>
                              )
                            })()}
                          </select>
                        </div>
                      )}
                      {/* Change Driver - Admin only */}
                      {isAdminOrCoach && (
                        <div className="flex gap-2">
                          <select
                            className="input flex-1 text-sm"
                            value=""
                            onChange={async (e) => {
                              if (e.target.value) {
                                const newDriverId = e.target.value
                                const newDriver = members.find(m => m.id === newDriverId)
                                if (window.confirm(`Change driver to ${formatShortName(newDriver?.full_name)}?`)) {
                                  await updateCarpool(carpool.id, eventId, { driver_id: newDriverId })
                                }
                                e.target.value = ''
                              }
                            }}
                          >
                            <option value="">Change driver...</option>
                            {members
                              .filter(m => m.id !== carpool.driver_id && !passengers.some(p => p.passenger_id === m.id))
                              .map(member => (
                                <option key={member.id} value={member.id}>
                                  {formatShortName(member.full_name)}
                                </option>
                              ))}
                          </select>
                        </div>
                      )}
                      {(isDriver || isAdminOrCoach) && (
                        <div className="flex gap-2">
                          <button
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEditCarpool(carpool)
                            }}
                            className="btn text-sm flex-1"
                          >
                            <Icon name="edit" size={16} className="mr-1" />
                            Edit
                          </button>
                          <button
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={async (e) => {
                              e.stopPropagation()
                              if (window.confirm('Delete this carpool?')) {
                                await deleteCarpool(carpool.id, eventId)
                              }
                            }}
                            className="btn text-sm bg-red-50 text-red-600 hover:bg-red-100 border-red-200 flex-1"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}

            {eventCarpools.length === 0 && !showCarpoolForm && (
              <div className="card text-center py-12">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon name="car" size={32} className="text-slate-300" />
                </div>
                <p className="text-slate-600 mb-4">No carpools offered yet</p>
                {user && (
                  <button onClick={() => setShowCarpoolForm(true)} className="btn btn-primary">
                    Offer a Ride
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Ride Coordination Section */}
          {(() => {
            // Check if current user is a driver for this event
            const isDriver = eventCarpools.some(c => c.driver_id === user?.id)
            // Only drivers and admins can see the "Needs Ride" list (respecting paddler view)
            const canSeeNeedsRide = effectiveIsAdmin || isDriver

            // Calculate who's already in a carpool
            const assignedUserIds = new Set()
            eventCarpools.forEach(c => {
              assignedUserIds.add(c.driver_id)
              c.passengers?.forEach(p => assignedUserIds.add(p.passenger_id))
            })

            // People who registered as drivers but haven't created a carpool yet
            const potentialDrivers = allEventRegistrations.filter(r =>
              r.carpool_needs === 'can_drive' &&
              !eventCarpools.some(c => c.driver_id === r.user_id)
            )

            // People who need rides and aren't assigned yet
            const unassignedRiders = allEventRegistrations.filter(r =>
              r.carpool_needs === 'need_ride' &&
              !assignedUserIds.has(r.user_id)
            )

            // RSVP'd yes members who aren't in any carpool
            const rsvpYesNotInCarpool = eventRSVPs
              .filter(r => r.status === 'yes' && !assignedUserIds.has(r.user_id))
              .map(r => {
                const reg = allEventRegistrations.find(reg => reg.user_id === r.user_id)
                return { rsvp: r, registration: reg }
              })

            // For non-drivers/non-admins, only show if there are potential drivers (they can't see needs ride list)
            const hasVisibleContent = potentialDrivers.length > 0 || (canSeeNeedsRide && unassignedRiders.length > 0)

            if (!hasVisibleContent) return null

            return (
              <div className="card border-2 border-dashed border-slate-300 bg-slate-50">
                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Icon name="users" size={20} className="text-slate-600" />
                  Ride Coordination
                </h3>
                <p className="text-sm text-slate-600 mb-4">
                  Members who indicated their carpool preferences during registration
                </p>

                {/* Potential Drivers - not yet created carpools */}
                {potentialDrivers.length > 0 && (
                  <div className="mb-6">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">
                      Can Offer Rides ({potentialDrivers.length})
                    </div>
                    <div className="space-y-2">
                      {potentialDrivers.map(reg => (
                        <div key={reg.id} className="bg-white rounded-lg p-4 border border-green-200 flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-slate-900">{formatShortName(reg.profile?.full_name)}</div>
                            <div className="text-sm text-slate-600">
                              {reg.carpool_seats_available ? `${reg.carpool_seats_available} seats` : 'Seats TBD'}
                              {reg.carpool_departure_location && ` • From: ${reg.carpool_departure_location}`}
                            </div>
                          </div>
                          {effectiveIsAdmin && (
                            <button
                              onClick={async () => {
                                const result = await createCarpool({
                                  event_id: eventId,
                                  driver_id: reg.user_id,
                                  vehicle_description: '',
                                  total_seats: reg.carpool_seats_available || 4,
                                  available_seats: reg.carpool_seats_available || 4,
                                  departure_location: reg.carpool_departure_location || '',
                                  departure_lat: reg.carpool_departure_lat || null,
                                  departure_lng: reg.carpool_departure_lng || null,
                                  final_destination: reg.carpool_return_location || '',
                                  final_location: reg.carpool_return_location || '',
                                  final_lat: reg.carpool_return_lat || null,
                                  final_lng: reg.carpool_return_lng || null,
                                  notes: ''
                                })
                                if (result.success) {
                                  toast.success(`Created carpool for ${formatShortName(reg.profile?.full_name)}`)
                                }
                              }}
                              className="btn btn-primary text-sm"
                            >
                              Create Carpool
                            </button>
                          )}
                          {!effectiveIsAdmin && (
                            <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
                              Can Drive
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Unassigned Riders - Only visible to drivers and admins */}
                {canSeeNeedsRide && unassignedRiders.length > 0 && (
                  <div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">
                      Need Rides ({unassignedRiders.length})
                    </div>
                    <div className="space-y-2">
                      {unassignedRiders.map(reg => (
                        <div key={reg.id} className="bg-white rounded-lg p-3 border border-amber-200 flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-slate-900">{formatShortName(reg.profile?.full_name)}</div>
                            {reg.carpool_departure_location && (
                              <div className="text-sm text-slate-600">
                                Pickup: {reg.carpool_departure_location}
                              </div>
                            )}
                          </div>
                          <span className="px-3 py-1 bg-amber-100 text-amber-700 text-sm font-medium rounded-full">
                            Needs Ride
                          </span>
                        </div>
                      ))}
                    </div>
                    {effectiveIsAdmin && eventCarpools.length > 0 && (
                      <p className="text-xs text-slate-500 mt-3">
                        Use the "Assign paddler" dropdown in each carpool above to assign these members
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })()}

          {/* Accommodation Section */}
          {(event.accommodation_info || event.accommodation_address) && (
            <div className="card bg-slate-50 border-slate-200">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Icon name="location" size={20} />
                Accommodation
              </h3>
              {event.accommodation_info && (
                <p className="text-slate-700 mb-3">
                  <Linkify text={event.accommodation_info} />
                </p>
              )}
              {event.accommodation_address && (
                <div className="text-sm text-slate-600 mb-2">
                  <strong>Address:</strong> {event.accommodation_address}
                </div>
              )}
              {(event.accommodation_checkin || event.accommodation_checkout) && (
                <div className="text-sm text-slate-600">
                  {event.accommodation_checkin && <span>Check-in: {event.accommodation_checkin}</span>}
                  {event.accommodation_checkin && event.accommodation_checkout && <span className="mx-2">•</span>}
                  {event.accommodation_checkout && <span>Check-out: {event.accommodation_checkout}</span>}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ==================== RACE DAY TAB ==================== */}
      {activeTab === 'raceday' && (
        <div className="space-y-6">
          {/* Race Day Header */}
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-red-600 via-rose-500 to-red-600 p-5">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAzMHYySDE0di0yaDIyek0zNiAyNnYySDE0di0yaDIyek0zNiAyMnYySDE0di0yaDIyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
            <div className="relative flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Icon name="trophy" size={24} className="text-red-200" />
                  Race Day
                </h2>
                <p className="text-red-100 text-sm mt-1">
                  {eventTeams.length} team{eventTeams.length !== 1 ? 's' : ''} • {eventRaces.length} race{eventRaces.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>

          {/* Teams Management Section */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                  <Icon name="roster" size={16} className="text-white" />
                </div>
                <h3 className="font-bold text-slate-900">Teams</h3>
                {/* Visibility toggle for admin - eye icon button */}
                {isAdminOrCoach && (
                  <button
                    onClick={async () => {
                      const newValue = !event.show_team_composition
                      await updateEvent(eventId, { show_team_composition: newValue })
                      toast.success(newValue ? 'Teams visible to members' : 'Teams hidden from members')
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all border ${
                      event.show_team_composition
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                    }`}
                    title={event.show_team_composition ? 'Click to hide from members' : 'Click to show to members'}
                  >
                    <Icon name={event.show_team_composition ? 'eye' : 'eye-off'} size={14} />
                    {event.show_team_composition ? 'Visible' : 'Hidden'}
                  </button>
                )}
              </div>
              {isAdminOrCoach && (
                <button
                  onClick={() => setShowTeamForm(!showTeamForm)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <Icon name={showTeamForm ? 'close' : 'plus'} size={14} />
                  {showTeamForm ? 'Cancel' : 'Add Team'}
                </button>
              )}
            </div>
            <div className="p-5">

            {/* Add Team Form */}
            {showTeamForm && (
              <div className="mb-4 p-4 bg-primary-50 rounded-lg border border-primary-200">
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="label text-xs">Team Name *</label>
                      <input
                        type="text"
                        className="input text-sm"
                        placeholder="e.g., Boat 1, A Team"
                        value={teamForm.team_name}
                        onChange={(e) => setTeamForm({ ...teamForm, team_name: e.target.value })}
                      />
                    </div>
                    <div className="w-24">
                      <label className="label text-xs">Color</label>
                      <input
                        type="color"
                        className="input h-10 p-1"
                        value={teamForm.team_color}
                        onChange={(e) => setTeamForm({ ...teamForm, team_color: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Import from Lineup Option */}
                  {(eventLineups.length > 0 || allLineups.length > 0) && (
                    <div>
                      <label className="label text-xs">Import Members from Lineup (optional)</label>
                      <select
                        className="input text-sm"
                        value={teamForm.import_lineup_id || ''}
                        onChange={(e) => setTeamForm({ ...teamForm, import_lineup_id: e.target.value })}
                      >
                        <option value="">-- Don't import, add manually --</option>
                        {eventLineups.length > 0 && (
                          <optgroup label="Event Lineups">
                            {eventLineups.map(lineup => (
                              <option key={lineup.id} value={lineup.id}>
                                {lineup.name} ({lineup.positions?.paddlers?.left?.filter(Boolean).length + lineup.positions?.paddlers?.right?.filter(Boolean).length || 0} paddlers)
                              </option>
                            ))}
                          </optgroup>
                        )}
                        {allLineups.filter(l => !eventLineups.some(el => el.id === l.id)).length > 0 && (
                          <optgroup label="Other Lineups">
                            {allLineups.filter(l => !eventLineups.some(el => el.id === l.id)).map(lineup => (
                              <option key={lineup.id} value={lineup.id}>
                                {lineup.name} ({lineup.positions?.paddlers?.left?.filter(Boolean).length + lineup.positions?.paddlers?.right?.filter(Boolean).length || 0} paddlers)
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                      <p className="text-xs text-slate-500 mt-1">
                        This will create the team and add all paddlers from the selected lineup
                      </p>
                    </div>
                  )}

                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={async (e) => {
                      e.stopPropagation()
                      // Create team first
                      const result = await handleCreateTeam()

                      // If a lineup was selected and team was created, import members
                      if (result?.success && teamForm.import_lineup_id) {
                        const selectedLineup = [...eventLineups, ...allLineups].find(l => l.id === teamForm.import_lineup_id)
                        if (selectedLineup?.positions) {
                          const positions = selectedLineup.positions
                          const memberIds = new Set()

                          // Collect all member IDs from lineup
                          if (positions.drummer) memberIds.add(positions.drummer)
                          if (positions.steersperson) memberIds.add(positions.steersperson)
                          positions.paddlers?.left?.forEach(id => id && memberIds.add(id))
                          positions.paddlers?.right?.forEach(id => id && memberIds.add(id))

                          // Add each member to the team
                          for (const memberId of memberIds) {
                            await addTeamMember(result.data.id, memberId, eventId)
                          }

                          toast.success(`Imported ${memberIds.size} members from lineup!`)
                        }
                        // Clear the import selection
                        setTeamForm(prev => ({ ...prev, import_lineup_id: '' }))
                      }
                    }}
                    className="btn btn-primary w-full text-sm"
                  >
                    {teamForm.import_lineup_id ? 'Create Team & Import Members' : 'Create Team'}
                  </button>
                </div>
              </div>
            )}

            {/* Teams List */}
            {eventTeams.length === 0 ? (
              <p className="text-slate-500 text-sm">No teams created yet. Create teams to organize participants for different boats.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {eventTeams.map((team) => (
                  <div
                    key={team.id}
                    className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden"
                  >
                    {/* Team Header */}
                    <div
                      className="p-3 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors"
                      onClick={() => setExpandedTeamIds(prev => {
                        const next = new Set(prev)
                        if (next.has(team.id)) {
                          next.delete(team.id)
                        } else {
                          next.add(team.id)
                        }
                        return next
                      })}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full shrink-0"
                          style={{ backgroundColor: team.team_color || '#3B82F6' }}
                        />
                        {editingTeamId === team.id ? (
                          <input
                            type="text"
                            className="input text-sm py-1"
                            value={teamForm.team_name}
                            onChange={(e) => setTeamForm({ ...teamForm, team_name: e.target.value })}
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <span className="font-medium text-slate-900">{team.team_name}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Division badge */}
                        {team.division_name && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 font-medium">
                            {team.division_name}
                          </span>
                        )}
                        {/* Validation status badge */}
                        {effectiveIsAdmin && teamValidations[team.id] && (
                          <div
                            className={`px-1.5 py-0.5 rounded text-xs font-medium flex items-center gap-1 ${
                              teamValidations[team.id].valid
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                            title={teamValidations[team.id].valid
                              ? 'Meets all requirements'
                              : teamValidations[team.id].issues.join('\n')
                            }
                          >
                            <Icon name={teamValidations[team.id].valid ? 'check' : 'close'} size={12} />
                            {teamValidations[team.id].valid ? 'Valid' : teamValidations[team.id].issues.length}
                          </div>
                        )}
                        {/* Show member count only to admin or when composition is visible */}
                        <span className="text-xs text-slate-500">
                          {effectiveIsAdmin || event.show_team_composition
                            ? `${team.members?.length || 0} members`
                            : 'Members hidden'}
                        </span>
                        <Icon
                          name={expandedTeamIds.has(team.id) ? 'chevron-up' : 'chevron-down'}
                          size={16}
                          className="text-slate-400"
                        />
                      </div>
                    </div>

                    {/* Expanded Team Content */}
                    {expandedTeamIds.has(team.id) && (
                      <div className="p-3 border-t border-slate-200 bg-white">
                        {/* Hidden message for non-admin when composition not visible */}
                        {!effectiveIsAdmin && !event.show_team_composition ? (
                          <div className="text-center py-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-2">
                              <Icon name="lineup" size={20} className="text-slate-400" />
                            </div>
                            <p className="text-sm text-slate-500">Team composition not yet published</p>
                            <p className="text-xs text-slate-400 mt-1">Check back later for team assignments</p>
                          </div>
                        ) : (
                        <>
                        {/* Team Actions for Admin */}
                        {isAdminOrCoach && (
                          <div className="flex gap-2 mb-3">
                            {editingTeamId === team.id ? (
                              <>
                                <input
                                  type="color"
                                  className="w-8 h-8 rounded cursor-pointer"
                                  value={teamForm.team_color}
                                  onChange={(e) => setTeamForm({ ...teamForm, team_color: e.target.value })}
                                />
                                <button
                                  type="button"
                                  onPointerDown={(e) => e.stopPropagation()}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleUpdateTeam()
                                  }}
                                  className="btn btn-primary text-xs flex-1"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onPointerDown={(e) => e.stopPropagation()}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleCancelEditTeam()
                                  }}
                                  className="btn btn-secondary text-xs"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleEditTeam(team)}
                                  className="btn btn-secondary text-xs flex-1"
                                >
                                  <Icon name="edit" size={14} className="mr-1" />
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleEditTeamRequirements(team)}
                                  className={`btn btn-secondary text-xs ${teamHasRequirements(team) ? 'text-violet-600' : ''}`}
                                  title="Set division requirements"
                                >
                                  <Icon name="filter" size={14} />
                                  Rules
                                </button>
                                <button
                                  onClick={async () => {
                                    if (window.confirm(`Delete team "${team.team_name}"? This will also remove all member assignments.`)) {
                                      await deleteEventTeam(team.id, eventId)
                                    }
                                  }}
                                  className="btn btn-secondary text-xs text-red-600 hover:bg-red-50"
                                >
                                  <Icon name="trash" size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        )}

                        {/* Team Requirements Editor */}
                        {editingTeamRequirementsId === team.id && (
                          <div className="mb-3 p-3 bg-violet-50 border border-violet-200 rounded-lg">
                            <h4 className="font-medium text-violet-800 text-sm mb-3 flex items-center gap-2">
                              <Icon name="filter" size={16} />
                              Division Requirements
                            </h4>

                            <div className="space-y-3">
                              {/* Division Name */}
                              <div>
                                <label className="text-xs text-slate-600 block mb-1">Division Name</label>
                                <input
                                  type="text"
                                  className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded bg-white"
                                  placeholder="e.g., Mixed, Open, Senior 40+"
                                  value={teamRequirementsForm.division_name}
                                  onChange={(e) => setTeamRequirementsForm({ ...teamRequirementsForm, division_name: e.target.value })}
                                />
                              </div>

                              {/* Paddler Count */}
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-xs text-slate-600 block mb-1">Min Paddlers</label>
                                  <input
                                    type="number"
                                    min="0"
                                    className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded bg-white"
                                    placeholder="e.g., 18"
                                    value={teamRequirementsForm.min_paddlers}
                                    onChange={(e) => setTeamRequirementsForm({ ...teamRequirementsForm, min_paddlers: e.target.value })}
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-slate-600 block mb-1">Max Paddlers</label>
                                  <input
                                    type="number"
                                    min="0"
                                    className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded bg-white"
                                    placeholder="e.g., 20"
                                    value={teamRequirementsForm.max_paddlers}
                                    onChange={(e) => setTeamRequirementsForm({ ...teamRequirementsForm, max_paddlers: e.target.value })}
                                  />
                                </div>
                              </div>

                              {/* Gender Ratio */}
                              <div>
                                <label className="text-xs text-slate-600 block mb-1">Gender Requirement</label>
                                <select
                                  className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded bg-white"
                                  value={teamRequirementsForm.gender_ratio}
                                  onChange={(e) => setTeamRequirementsForm({ ...teamRequirementsForm, gender_ratio: e.target.value })}
                                >
                                  <option value="">No restriction</option>
                                  <option value="50:50">50:50 Mixed</option>
                                  <option value="open">Open (any)</option>
                                  <option value="women-only">Women Only</option>
                                  <option value="men-only">Men Only</option>
                                  <option value="custom">Custom min/max</option>
                                </select>
                              </div>

                              {teamRequirementsForm.gender_ratio === 'custom' && (
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-xs text-slate-600 block mb-1">Min Female</label>
                                    <input
                                      type="number"
                                      min="0"
                                      className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded bg-white"
                                      value={teamRequirementsForm.min_female}
                                      onChange={(e) => setTeamRequirementsForm({ ...teamRequirementsForm, min_female: e.target.value })}
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-slate-600 block mb-1">Min Male</label>
                                    <input
                                      type="number"
                                      min="0"
                                      className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded bg-white"
                                      value={teamRequirementsForm.min_male}
                                      onChange={(e) => setTeamRequirementsForm({ ...teamRequirementsForm, min_male: e.target.value })}
                                    />
                                  </div>
                                </div>
                              )}

                              {/* Age */}
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-xs text-slate-600 block mb-1">Min Age</label>
                                  <input
                                    type="number"
                                    min="0"
                                    className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded bg-white"
                                    placeholder="e.g., 40"
                                    value={teamRequirementsForm.min_age}
                                    onChange={(e) => setTeamRequirementsForm({ ...teamRequirementsForm, min_age: e.target.value })}
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-slate-600 block mb-1">Max Age</label>
                                  <input
                                    type="number"
                                    min="0"
                                    className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded bg-white"
                                    value={teamRequirementsForm.max_age}
                                    onChange={(e) => setTeamRequirementsForm({ ...teamRequirementsForm, max_age: e.target.value })}
                                  />
                                </div>
                              </div>

                              {/* Corporate Only */}
                              <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={teamRequirementsForm.corporate_only}
                                  onChange={(e) => setTeamRequirementsForm({ ...teamRequirementsForm, corporate_only: e.target.checked })}
                                  className="w-4 h-4 text-violet-600 rounded"
                                />
                                <span className="text-slate-700">Corporate members only</span>
                              </label>

                              {/* Save/Cancel */}
                              <div className="flex gap-2 pt-2">
                                <button
                                  onClick={handleSaveTeamRequirements}
                                  className="btn btn-primary text-xs flex-1"
                                >
                                  Save Rules
                                </button>
                                <button
                                  onClick={handleCancelTeamRequirements}
                                  className="btn btn-secondary text-xs"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Validation Details for Admin */}
                        {effectiveIsAdmin && teamValidations[team.id] && (
                          <div className={`mb-3 p-2 rounded-lg text-xs ${
                            teamValidations[team.id].valid
                              ? 'bg-emerald-50 border border-emerald-200'
                              : 'bg-red-50 border border-red-200'
                          }`}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <Icon
                                  name={teamValidations[team.id].valid ? 'check' : 'alert'}
                                  size={14}
                                  className={teamValidations[team.id].valid ? 'text-emerald-600' : 'text-red-600'}
                                />
                                <span className={`font-medium ${teamValidations[team.id].valid ? 'text-emerald-700' : 'text-red-700'}`}>
                                  {teamValidations[team.id].valid ? 'Meets requirements' : 'Requirements not met'}
                                </span>
                              </div>
                              {team.division_name && (
                                <span className="text-slate-500">{team.division_name}</span>
                              )}
                            </div>
                            {!teamValidations[team.id].valid && (
                              <ul className="list-disc list-inside text-red-600 space-y-0.5 ml-4">
                                {teamValidations[team.id].issues.map((issue, idx) => (
                                  <li key={idx}>{issue}</li>
                                ))}
                              </ul>
                            )}
                            {teamValidations[team.id].stats && (
                              <div className="mt-2 pt-2 border-t border-slate-200 text-slate-600 flex gap-3 flex-wrap">
                                <span>Paddlers: {teamValidations[team.id].stats.paddlers}</span>
                                <span>Male: {teamValidations[team.id].stats.male}</span>
                                <span>Female: {teamValidations[team.id].stats.female}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Team Members */}
                        <div className="space-y-1">
                          {team.members?.length > 0 ? (
                            team.members.map((member) => {
                              const otherTeams = memberTeamCounts[member.user_id]?.filter(t => t !== team.team_name) || []
                              const isOnMultipleTeams = otherTeams.length > 0
                              const positionRole = member.position_role || 'paddler'

                              // Role badge styling
                              const getRoleBadge = (role) => {
                                switch(role) {
                                  case 'drummer':
                                    return { label: '🥁', color: 'bg-violet-100 text-violet-700', title: 'Drummer' }
                                  case 'steerer':
                                    return { label: '🚣', color: 'bg-blue-100 text-blue-700', title: 'Steerer' }
                                  case 'alternate':
                                    return { label: 'ALT', color: 'bg-slate-200 text-slate-600', title: 'Alternate' }
                                  default:
                                    return null
                                }
                              }

                              const roleBadge = getRoleBadge(positionRole)

                              return (
                                <div key={member.id} className={`flex items-center justify-between py-1.5 px-2 rounded text-sm ${
                                  isOnMultipleTeams ? 'bg-amber-50 border border-amber-200' :
                                  member.exclude_from_count ? 'bg-slate-100 border border-dashed border-slate-300' : 'bg-slate-50'
                                }`}>
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    {/* Role badge */}
                                    {roleBadge && (
                                      <span
                                        className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${roleBadge.color}`}
                                        title={roleBadge.title}
                                      >
                                        {roleBadge.label}
                                      </span>
                                    )}
                                    <span className="text-slate-700 truncate">{member.profile?.full_name || 'Unknown'}</span>
                                    {member.exclude_from_count && (
                                      <span className="text-xs text-slate-400" title="Not counted toward requirements">
                                        (excluded)
                                      </span>
                                    )}
                                    {isOnMultipleTeams && (
                                      <span
                                        className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium flex-shrink-0"
                                        title={`Also on: ${otherTeams.join(', ')}`}
                                      >
                                        +{otherTeams.length}
                                      </span>
                                    )}
                                  </div>
                                  {isAdminOrCoach && (
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                      {/* Role selector */}
                                      <select
                                        className="text-xs py-0.5 px-1 border border-slate-200 rounded bg-white cursor-pointer"
                                        value={positionRole}
                                        onChange={(e) => updateTeamMemberRole(team.id, member.user_id, eventId, e.target.value)}
                                        title="Change role"
                                      >
                                        <option value="paddler">Paddler</option>
                                        <option value="drummer">Drummer</option>
                                        <option value="steerer">Steerer</option>
                                        <option value="alternate">Alternate</option>
                                      </select>
                                      <button
                                        onClick={() => handleRemoveMemberFromTeam(team.id, member.user_id)}
                                        className="text-red-500 hover:text-red-700 p-0.5"
                                        title="Remove from team"
                                      >
                                        <Icon name="close" size={14} />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )
                            })
                          ) : (
                            <p className="text-xs text-slate-400 italic">No members assigned</p>
                          )}
                        </div>

                        {/* Add Member Dropdown */}
                        {isAdminOrCoach && (
                          <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                            <select
                              className="input text-xs w-full"
                              value=""
                              onChange={(e) => {
                                if (e.target.value) {
                                  handleAddMemberToTeam(team.id, e.target.value)
                                }
                              }}
                            >
                              <option value="">+ Add member...</option>
                              {/* Show people who RSVP'd yes and aren't already in this team */}
                              {eventRSVPs
                                .filter(rsvp => {
                                  // Only show people who RSVP'd yes
                                  if (rsvp.status !== 'yes') return false
                                  // Check if user is already in this team
                                  const alreadyInTeam = team.members?.some(m => m.user_id === rsvp.user_id)
                                  return !alreadyInTeam
                                })
                                .map(rsvp => (
                                  <option key={rsvp.user_id} value={rsvp.user_id}>
                                    {rsvp.user?.full_name || rsvp.user_profile?.full_name || 'Unknown'}
                                  </option>
                                ))
                              }
                            </select>

                            {/* Import from Lineup */}
                            {(eventLineups.length > 0 || allLineups.length > 0) && (
                              <select
                                className="input text-xs w-full"
                                value=""
                                onChange={async (e) => {
                                  const lineupId = e.target.value
                                  if (!lineupId) return

                                  const isReplace = lineupId.startsWith('replace:')
                                  const actualLineupId = isReplace ? lineupId.replace('replace:', '') : lineupId

                                  const selectedLineup = [...eventLineups, ...allLineups].find(l => l.id === actualLineupId)
                                  if (!selectedLineup?.positions) {
                                    e.target.value = ''
                                    return
                                  }

                                  const positions = selectedLineup.positions
                                  const memberIds = new Set()

                                  // Collect all member IDs from lineup
                                  if (positions.drummer) memberIds.add(positions.drummer)
                                  if (positions.steersperson) memberIds.add(positions.steersperson)
                                  positions.paddlers?.left?.forEach(id => id && memberIds.add(id))
                                  positions.paddlers?.right?.forEach(id => id && memberIds.add(id))

                                  if (isReplace) {
                                    if (!window.confirm(`Replace all ${team.members?.length || 0} members with ${memberIds.size} from "${selectedLineup.name}"?`)) {
                                      e.target.value = ''
                                      return
                                    }

                                    // Remove existing members
                                    for (const member of (team.members || [])) {
                                      await removeTeamMember(team.id, member.user_id, eventId)
                                    }

                                    // Add all from lineup
                                    for (const memberId of memberIds) {
                                      await addTeamMember(team.id, memberId, eventId)
                                    }
                                    toast.success(`Replaced with ${memberIds.size} members!`)
                                  } else {
                                    // Add mode - skip existing
                                    const existingMemberIds = new Set(team.members?.map(m => m.user_id) || [])
                                    const newMembers = [...memberIds].filter(id => !existingMemberIds.has(id))

                                    if (newMembers.length === 0) {
                                      toast.info('All lineup members already on team')
                                      e.target.value = ''
                                      return
                                    }

                                    for (const memberId of newMembers) {
                                      await addTeamMember(team.id, memberId, eventId)
                                    }
                                    toast.success(`Added ${newMembers.length} members!`)
                                  }
                                  e.target.value = ''
                                }}
                              >
                                <option value="">Import from lineup...</option>
                                <optgroup label="Add members from">
                                  {[...eventLineups, ...allLineups.filter(l => !eventLineups.some(el => el.id === l.id))].map(lineup => (
                                    <option key={`add:${lineup.id}`} value={lineup.id}>
                                      + {lineup.name}
                                    </option>
                                  ))}
                                </optgroup>
                                <optgroup label="Replace all with">
                                  {[...eventLineups, ...allLineups.filter(l => !eventLineups.some(el => el.id === l.id))].map(lineup => (
                                    <option key={`replace:${lineup.id}`} value={`replace:${lineup.id}`}>
                                      ↻ {lineup.name}
                                    </option>
                                  ))}
                                </optgroup>
                              </select>
                            )}
                          </div>
                        )}
                        </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            </div>
          </div>

          {/* Race Day Timeline */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                  <Icon name="clock" size={16} className="text-white" />
                </div>
                <h3 className="font-bold text-slate-900">Race Day Schedule</h3>
              </div>
              {eventTeams.length > 0 && (
                <select
                  className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 focus:bg-white focus:border-primary-400"
                  value={teamFilter}
                  onChange={(e) => setTeamFilter(e.target.value)}
                >
                  <option value="all">All Teams</option>
                  {eventTeams.map(team => (
                    <option key={team.id} value={team.id}>{team.team_name}</option>
                  ))}
                </select>
              )}
            </div>
            <div className="p-5">
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-200" />

              <div className="space-y-6">
                {/* Arrival */}
                {event.arrival_time && (
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center relative z-10 border-4 border-white">
                      <Icon name="clock" size={20} className="text-amber-600" />
                    </div>
                    <div className="flex-1 pt-2">
                      <div className="text-lg font-bold text-slate-900">{formatTime(event.arrival_time)}</div>
                      <div className="text-slate-600">Team Arrival</div>
                    </div>
                  </div>
                )}

                {/* Captain's Meeting - Admin/Coach only (hidden in paddler view) */}
                {effectiveIsAdmin && event.captains_meeting_time && (
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center relative z-10 border-4 border-white">
                      <Icon name="roster" size={20} className="text-primary-600" />
                    </div>
                    <div className="flex-1 pt-2">
                      <div className="text-lg font-bold text-slate-900">{formatTime(event.captains_meeting_time)}</div>
                      <div className="text-slate-600">Captain's Meeting</div>
                      {event.captains_meeting_location && (
                        <div className="text-sm text-slate-500">{event.captains_meeting_location}</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Races */}
                {eventRaces
                  .filter(race => teamFilter === 'all' || race.team_id === teamFilter)
                  .sort((a, b) => {
                    if (!a.scheduled_time) return 1
                    if (!b.scheduled_time) return -1
                    return a.scheduled_time.localeCompare(b.scheduled_time)
                  })
                  .map((race, index) => (
                  <div key={race.id} className="flex gap-4">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center relative z-10 border-4 border-white shrink-0"
                      style={{
                        backgroundColor: race.team?.team_color ? `${race.team.team_color}20` : '#dcfce7',
                        borderColor: 'white'
                      }}
                    >
                      <span
                        className="font-bold"
                        style={{ color: race.team?.team_color || '#15803d' }}
                      >
                        {race.race_number || index + 1}
                      </span>
                    </div>
                    <div className="flex-1 pt-2">
                      {editingRaceId === race.id ? (
                        // Edit form
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="label text-xs">Race Name *</label>
                                <input
                                  type="text"
                                  className="input text-sm"
                                  value={raceForm.race_name}
                                  onChange={(e) => setRaceForm({ ...raceForm, race_name: e.target.value })}
                                />
                              </div>
                              <div>
                                <label className="label text-xs">Race Number</label>
                                <input
                                  type="number"
                                  className="input text-sm"
                                  value={raceForm.race_number}
                                  onChange={(e) => setRaceForm({ ...raceForm, race_number: e.target.value })}
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              <div>
                                <label className="label text-xs">Distance</label>
                                <input
                                  type="text"
                                  className="input text-sm"
                                  placeholder="200m, 500m"
                                  value={raceForm.distance}
                                  onChange={(e) => setRaceForm({ ...raceForm, distance: e.target.value })}
                                />
                              </div>
                              <div>
                                <label className="label text-xs">Race Type</label>
                                <select
                                  className="input text-sm"
                                  value={raceForm.race_type}
                                  onChange={(e) => setRaceForm({ ...raceForm, race_type: e.target.value })}
                                >
                                  <option value="">Select</option>
                                  <option value="heat">Heat</option>
                                  <option value="semi-final">Semi-Final</option>
                                  <option value="final">Final</option>
                                  <option value="mixed">Mixed</option>
                                  <option value="open">Open</option>
                                  <option value="womens">Women's</option>
                                </select>
                              </div>
                              <div>
                                <label className="label text-xs">Scheduled Time</label>
                                <input
                                  type="time"
                                  className="input text-sm"
                                  value={raceForm.scheduled_time}
                                  onChange={(e) => setRaceForm({ ...raceForm, scheduled_time: e.target.value })}
                                />
                              </div>
                              {eventTeams.length > 0 && (
                                <div>
                                  <label className="label text-xs">Team</label>
                                  <select
                                    className="input text-sm"
                                    value={raceForm.team_id}
                                    onChange={(e) => setRaceForm({ ...raceForm, team_id: e.target.value })}
                                  >
                                    <option value="">No Team</option>
                                    {eventTeams.map(team => (
                                      <option key={team.id} value={team.id}>{team.team_name}</option>
                                    ))}
                                  </select>
                                </div>
                              )}
                            </div>

                            <div className="flex gap-2">
                              <button
                                type="button"
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleCancelEditRace()
                                }}
                                className="btn btn-secondary text-sm flex-1"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleUpdateRace()
                                }}
                                className="btn btn-primary text-sm flex-1"
                              >
                                Save Changes
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        // Display race
                        <>
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <div className="text-lg font-bold text-slate-900">
                                  {race.scheduled_time ? formatTime(race.scheduled_time) : 'TBD'}
                                </div>
                                {race.team && (
                                  <span
                                    className="text-xs px-2 py-0.5 rounded-full font-medium text-white"
                                    style={{ backgroundColor: race.team.team_color || '#3B82F6' }}
                                  >
                                    {race.team.team_name}
                                  </span>
                                )}
                              </div>
                              <div className="text-slate-900 font-medium">{race.race_name}</div>
                              <div className="text-sm text-slate-500">
                                {race.distance && <span>{race.distance}</span>}
                                {race.race_type && <span> • {race.race_type}</span>}
                              </div>
                              {race.finish_position && (
                                <div className="mt-1 inline-flex items-center gap-1 px-2 py-1 bg-success-100 rounded-lg text-success-700 text-sm font-medium">
                                  {race.finish_position === 1 && '🥇'}
                                  {race.finish_position === 2 && '🥈'}
                                  {race.finish_position === 3 && '🥉'}
                                  #{race.finish_position}
                                  {race.finish_time && ` - ${race.finish_time}`}
                                </div>
                              )}
                            </div>
                            {isAdminOrCoach && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleEditRace(race)}
                                  className="p-1.5 text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                                  title="Edit race"
                                >
                                  <Icon name="edit" size={16} />
                                </button>
                                <button
                                  onClick={async () => {
                                    if (window.confirm(`Delete ${race.race_name}?`)) {
                                      await deleteRace(race.id, eventId)
                                    }
                                  }}
                                  className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                  title="Delete race"
                                >
                                  <Icon name="trash" size={16} />
                                </button>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}

                {/* Event End */}
                {event.end_time && (
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center relative z-10 border-4 border-white">
                      <Icon name="check" size={20} className="text-slate-600" />
                    </div>
                    <div className="flex-1 pt-2">
                      <div className="text-lg font-bold text-slate-900">{formatTime(event.end_time)}</div>
                      <div className="text-slate-600">Event Ends</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {isAdminOrCoach && (
              <div className="mt-6 pt-6 border-t border-slate-100">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setShowRaceForm(!showRaceForm)}
                    className="btn btn-primary text-sm"
                  >
                    {showRaceForm ? 'Cancel' : '+ Add Race Heat'}
                  </button>

                  <button
                    onClick={handleDownloadRaceTemplate}
                    className="btn btn-ghost text-sm flex items-center gap-1.5"
                  >
                    <Icon name="download" size={14} />
                    CSV Template
                  </button>

                  <label className={`btn btn-secondary text-sm flex items-center gap-1.5 cursor-pointer ${isImportingRaces ? 'opacity-50' : ''}`}>
                    {isImportingRaces ? (
                      <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Icon name="upload" size={14} />
                    )}
                    Import CSV
                    <input
                      ref={raceImportInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleImportRaces}
                      disabled={isImportingRaces}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            )}
            </div>
          </div>

          {/* Add Race Form */}
          {showRaceForm && (
            <div className="card bg-primary-50 border-primary-200">
              <h3 className="font-bold text-slate-900 mb-4">Add Race Heat</h3>
              <div className="space-y-3">
                {/* Team selector first (when teams exist) */}
                {eventTeams.length > 0 && (
                  <div>
                    <label className="label text-xs">Team *</label>
                    <select
                      className="input text-sm"
                      value={raceForm.team_id}
                      onChange={(e) => {
                        const teamId = e.target.value
                        const selectedTeam = eventTeams.find(t => t.id === teamId)
                        if (selectedTeam) {
                          // Count existing races for this team
                          const teamRaceCount = eventRaces.filter(r => r.team_id === teamId).length
                          const suggestedName = `${selectedTeam.team_name} - Race ${teamRaceCount + 1}`
                          const nextRaceNumber = eventRaces.length + 1
                          setRaceForm({
                            ...raceForm,
                            team_id: teamId,
                            race_name: suggestedName,
                            race_number: nextRaceNumber
                          })
                        } else {
                          setRaceForm({ ...raceForm, team_id: '' })
                        }
                      }}
                    >
                      <option value="">Select Team</option>
                      {eventTeams.map(team => (
                        <option key={team.id} value={team.id}>{team.team_name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="label text-xs">Race Name *</label>
                    <input
                      type="text"
                      className="input text-sm"
                      placeholder={eventTeams.length > 0 ? "Select team to auto-fill" : "e.g., Heat 1 - Mixed"}
                      value={raceForm.race_name}
                      onChange={(e) => setRaceForm({ ...raceForm, race_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label text-xs"># Number</label>
                    <input
                      type="number"
                      className="input text-sm"
                      value={raceForm.race_number}
                      onChange={(e) => setRaceForm({ ...raceForm, race_number: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="label text-xs">Distance</label>
                    <input
                      type="text"
                      className="input text-sm"
                      placeholder="200m"
                      value={raceForm.distance}
                      onChange={(e) => setRaceForm({ ...raceForm, distance: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label text-xs">Type</label>
                    <select
                      className="input text-sm"
                      value={raceForm.race_type}
                      onChange={(e) => setRaceForm({ ...raceForm, race_type: e.target.value })}
                    >
                      <option value="">Select</option>
                      <option value="heat">Heat</option>
                      <option value="semi-final">Semi</option>
                      <option value="final">Final</option>
                      <option value="mixed">Mixed</option>
                      <option value="open">Open</option>
                      <option value="womens">Women's</option>
                    </select>
                  </div>
                  <div>
                    <label className="label text-xs">Time</label>
                    <input
                      type="time"
                      className="input text-sm"
                      value={raceForm.scheduled_time}
                      onChange={(e) => setRaceForm({ ...raceForm, scheduled_time: e.target.value })}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCreateRace()
                  }}
                  className="btn btn-primary w-full text-sm"
                >
                  Add Race
                </button>
              </div>
            </div>
          )}

          {/* Lineups Section */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900">Race Lineups</h3>
              {isAdminOrCoach && (
                <div className="flex gap-2">
                  <button onClick={() => setShowLinkModal(true)} className="btn btn-secondary text-sm">
                    Link Lineup
                  </button>
                  <button onClick={() => navigate('/lineups')} className="btn btn-primary text-sm">
                    Create New
                  </button>
                </div>
              )}
            </div>

            {(() => {
              // Filter lineups for non-admin: only show visible ones
              const visibleLineups = effectiveIsAdmin
                ? eventLineups
                : eventLineups.filter(l => l.is_visible_to_members)

              if (visibleLineups.length > 0) {
                return (
                  <div className="space-y-4">
                    {visibleLineups.map(lineup => (
                      <div key={lineup.id} className={`border rounded-xl overflow-hidden ${
                        !lineup.is_visible_to_members ? 'border-amber-300 bg-amber-50/30' : 'border-slate-200'
                      }`}>
                        <div className="p-4 bg-slate-50 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div>
                              <h4 className="font-bold text-slate-900 flex items-center gap-2">
                                {lineup.boat_name || 'Boat'}
                                {/* Hidden badge for admin */}
                                {effectiveIsAdmin && !lineup.is_visible_to_members && (
                                  <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full flex items-center gap-1">
                                    <Icon name="visibility_off" size={10} />
                                    Hidden
                                  </span>
                                )}
                              </h4>
                              <p className="text-sm text-slate-500">{getPositionSummary(lineup.positions)}</p>
                            </div>
                          </div>
                          {effectiveIsAdmin && (
                            <div className="flex items-center gap-2">
                              {/* Visibility toggle */}
                              <button
                                onClick={async () => {
                                  const result = await toggleLineupVisibility(lineup.id, !lineup.is_visible_to_members)
                                  if (result.success) {
                                    setEventLineups(eventLineups.map(l =>
                                      l.id === lineup.id ? { ...l, is_visible_to_members: !lineup.is_visible_to_members } : l
                                    ))
                                  }
                                }}
                                className={`p-2 rounded-lg transition-colors ${
                                  lineup.is_visible_to_members
                                    ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
                                    : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                                }`}
                                title={lineup.is_visible_to_members ? 'Click to hide from team' : 'Click to publish to team'}
                              >
                                <Icon name={lineup.is_visible_to_members ? 'visibility' : 'visibility_off'} size={16} />
                              </button>
                              <button
                                onClick={() => navigate(`/lineups?edit=${lineup.id}`)}
                                className="btn btn-sm btn-secondary"
                              >
                                Edit
                              </button>
                              <button
                                onClick={async () => {
                                  if (window.confirm('Remove this lineup from the event?')) {
                                    await unlinkLineupFromEvent(lineup.id)
                                    setEventLineups(eventLineups.filter(l => l.id !== lineup.id))
                                  }
                                }}
                                className="btn btn-sm bg-red-50 text-red-600 hover:bg-red-100"
                              >
                                Remove
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="p-4">
                          <LineupViewer lineup={lineup} isOpen={true} />
                        </div>
                      </div>
                    ))}
                  </div>
                )
              } else {
                return (
                  <div className="text-center py-8 text-slate-500">
                    <Icon name="lineups" size={32} className="mx-auto mb-2 text-slate-300" />
                    <p>{effectiveIsAdmin ? 'No lineups assigned to this event yet' : 'Lineups will be published here when ready'}</p>
                  </div>
                )
              }
            })()}
          </div>
        </div>
      )}

      {/* ==================== ACCOMMODATION TAB ==================== */}
      {activeTab === 'accommodation' && (
        <div className="space-y-6">
          {/* Accommodation Header */}
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-violet-600 via-purple-500 to-violet-600 p-5">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAzMHYySDE0di0yaDIyek0zNiAyNnYySDE0di0yaDIyek0zNiAyMnYySDE0di0yaDIyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
            <div className="relative flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Icon name="home" size={24} className="text-violet-200" />
                  Accommodation
                </h2>
                <p className="text-violet-100 text-sm mt-1">
                  {eventAccommodations.length > 0
                    ? `${eventAccommodations.length} lodging option${eventAccommodations.length !== 1 ? 's' : ''}`
                    : (() => {
                        const needAccom = allEventRegistrations.filter(r => r.accommodation_needs === 'need_accommodation').length
                        const haveAccom = allEventRegistrations.filter(r => r.accommodation_needs === 'have_accommodation').length
                        if (needAccom > 0 || haveAccom > 0) {
                          return `${needAccom} need lodging • ${haveAccom} arranged`
                        }
                        return 'Lodging and room info'
                      })()
                  }
                </p>
              </div>
              {effectiveIsAdmin && (
                <button
                  onClick={() => {
                    setAccommodationForm({
                      name: '', address: '', booking_link: '', check_in: '', check_out: '',
                      price_info: '', total_capacity: '', notes: '', contact_info: '', is_primary: false
                    })
                    setEditingAccommodationId(null)
                    setShowAccommodationForm(true)
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white/15 hover:bg-white/25 backdrop-blur-sm border border-white/20 rounded-lg text-white text-sm font-medium transition-all"
                >
                  <Icon name="plus" size={16} />
                  Add Lodging
                </button>
              )}
            </div>
          </div>

          {/* Add/Edit Accommodation Form */}
          {showAccommodationForm && effectiveIsAdmin && (
            <div className="bg-white rounded-xl border border-violet-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 bg-violet-50 border-b border-violet-200">
                <h3 className="font-bold text-violet-900">
                  {editingAccommodationId ? 'Edit Lodging' : 'Add Lodging Option'}
                </h3>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="text-xs text-slate-600 font-semibold block mb-1.5">Name *</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    placeholder="Holiday Inn Downtown"
                    value={accommodationForm.name}
                    onChange={(e) => setAccommodationForm({ ...accommodationForm, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-600 font-semibold block mb-1.5">Address</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    placeholder="123 Main St, City, State"
                    value={accommodationForm.address}
                    onChange={(e) => setAccommodationForm({ ...accommodationForm, address: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-600 font-semibold block mb-1.5">Check-in</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                      placeholder="Fri 3:00 PM"
                      value={accommodationForm.check_in}
                      onChange={(e) => setAccommodationForm({ ...accommodationForm, check_in: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-600 font-semibold block mb-1.5">Check-out</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                      placeholder="Sun 11:00 AM"
                      value={accommodationForm.check_out}
                      onChange={(e) => setAccommodationForm({ ...accommodationForm, check_out: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-600 font-semibold block mb-1.5">Price Info</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                      placeholder="$99/night group rate"
                      value={accommodationForm.price_info}
                      onChange={(e) => setAccommodationForm({ ...accommodationForm, price_info: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-600 font-semibold block mb-1.5">Capacity</label>
                    <input
                      type="number"
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                      placeholder="20"
                      value={accommodationForm.total_capacity}
                      onChange={(e) => setAccommodationForm({ ...accommodationForm, total_capacity: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-600 font-semibold block mb-1.5">Booking Link</label>
                  <input
                    type="url"
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    placeholder="https://booking.com/..."
                    value={accommodationForm.booking_link}
                    onChange={(e) => setAccommodationForm({ ...accommodationForm, booking_link: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-600 font-semibold block mb-1.5">Notes</label>
                  <textarea
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    rows="2"
                    placeholder="Pool, free breakfast, etc."
                    value={accommodationForm.notes}
                    onChange={(e) => setAccommodationForm({ ...accommodationForm, notes: e.target.value })}
                  />
                </div>
                <label className="flex items-center gap-3 p-3 bg-violet-50 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={accommodationForm.is_primary}
                    onChange={(e) => setAccommodationForm({ ...accommodationForm, is_primary: e.target.checked })}
                    className="rounded text-violet-600"
                  />
                  <span className="text-sm text-slate-700">Mark as primary/recommended option</span>
                </label>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      setShowAccommodationForm(false)
                      setEditingAccommodationId(null)
                    }}
                    className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (!accommodationForm.name.trim()) {
                        toast.error('Please enter a name')
                        return
                      }
                      const data = {
                        ...accommodationForm,
                        event_id: eventId,
                        total_capacity: accommodationForm.total_capacity ? parseInt(accommodationForm.total_capacity) : null
                      }
                      if (editingAccommodationId) {
                        await updateAccommodation(editingAccommodationId, eventId, data)
                      } else {
                        await createAccommodation(data)
                      }
                      setShowAccommodationForm(false)
                      setEditingAccommodationId(null)
                    }}
                    className="flex-1 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-lg transition-colors"
                  >
                    {editingAccommodationId ? 'Save Changes' : 'Add Lodging'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Lodging Options List */}
          {eventAccommodations.length > 0 ? (
            <div className="space-y-4">
              {eventAccommodations.map((accom) => (
                <div key={accom.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div
                    className="px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => setExpandedAccommodationId(expandedAccommodationId === accom.id ? null : accom.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${accom.is_primary ? 'bg-gradient-to-br from-violet-500 to-purple-500' : 'bg-slate-100'}`}>
                        <Icon name="home" size={20} className={accom.is_primary ? 'text-white' : 'text-slate-500'} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-900">{accom.name}</h3>
                          {accom.is_primary && (
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-violet-100 text-violet-700 rounded-full uppercase">Primary</span>
                          )}
                        </div>
                        {accom.price_info && (
                          <p className="text-sm text-slate-500">{accom.price_info}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {accom.assignments?.length > 0 && (
                        <span className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-full font-medium">
                          {accom.assignments.length} assigned
                        </span>
                      )}
                      <Icon name={expandedAccommodationId === accom.id ? 'chevron-up' : 'chevron-down'} size={20} className="text-slate-400" />
                    </div>
                  </div>

                  {expandedAccommodationId === accom.id && (
                    <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50 space-y-4">
                      {/* Details */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {accom.address && (
                          <div className="p-3 bg-white rounded-lg border border-slate-200">
                            <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-1">Address</div>
                            <div className="text-sm text-slate-800">{accom.address}</div>
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(accom.address)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-violet-600 hover:text-violet-800 mt-1 inline-flex items-center gap-1"
                            >
                              <Icon name="link" size={12} />
                              Maps
                            </a>
                          </div>
                        )}
                        {(accom.check_in || accom.check_out) && (
                          <div className="p-3 bg-white rounded-lg border border-slate-200">
                            <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-1">Check-in/out</div>
                            <div className="text-sm text-slate-800">
                              {accom.check_in && <span className="text-emerald-600">{accom.check_in}</span>}
                              {accom.check_in && accom.check_out && ' → '}
                              {accom.check_out && <span className="text-rose-600">{accom.check_out}</span>}
                            </div>
                          </div>
                        )}
                      </div>

                      {accom.notes && (
                        <div className="p-3 bg-white rounded-lg border border-slate-200">
                          <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-1">Notes</div>
                          <div className="text-sm text-slate-700">{accom.notes}</div>
                        </div>
                      )}

                      {accom.booking_link && (
                        <a
                          href={accom.booking_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-violet-100 text-violet-700 rounded-lg text-sm font-medium hover:bg-violet-200 transition-colors"
                        >
                          <Icon name="link" size={16} />
                          Book Now
                        </a>
                      )}

                      {/* Rooms Section */}
                      <div className="pt-3 border-t border-slate-200">
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-xs font-semibold text-slate-600">
                            Rooms ({accom.rooms?.length || 0})
                          </div>
                          {effectiveIsAdmin && (
                            <button
                              onClick={() => {
                                setShowRoomFormFor(showRoomFormFor === accom.id ? null : accom.id)
                                setRoomForm({ room_label: '', capacity: 2, notes: '' })
                              }}
                              className="text-xs px-2 py-1 bg-violet-100 text-violet-700 rounded-lg hover:bg-violet-200 transition-colors"
                            >
                              {showRoomFormFor === accom.id ? 'Cancel' : '+ Add Room'}
                            </button>
                          )}
                        </div>

                        {/* Add Room Form */}
                        {showRoomFormFor === accom.id && effectiveIsAdmin && (
                          <div className="mb-3 p-3 bg-violet-50 rounded-lg border border-violet-200 space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="text"
                                placeholder="Room 101"
                                className="px-2 py-1.5 text-sm border border-slate-200 rounded-lg"
                                value={roomForm.room_label}
                                onChange={(e) => setRoomForm({ ...roomForm, room_label: e.target.value })}
                              />
                              <input
                                type="number"
                                placeholder="Capacity"
                                className="px-2 py-1.5 text-sm border border-slate-200 rounded-lg"
                                value={roomForm.capacity}
                                onChange={(e) => setRoomForm({ ...roomForm, capacity: parseInt(e.target.value) || 2 })}
                              />
                            </div>
                            <input
                              type="text"
                              placeholder="Notes (optional)"
                              className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg"
                              value={roomForm.notes}
                              onChange={(e) => setRoomForm({ ...roomForm, notes: e.target.value })}
                            />
                            <button
                              onClick={async () => {
                                if (!roomForm.room_label.trim()) {
                                  toast.error('Enter room label')
                                  return
                                }
                                await createRoom({
                                  accommodation_id: accom.id,
                                  room_label: roomForm.room_label,
                                  capacity: roomForm.capacity,
                                  notes: roomForm.notes || null
                                }, eventId)
                                setShowRoomFormFor(null)
                                setRoomForm({ room_label: '', capacity: 2, notes: '' })
                              }}
                              className="w-full px-3 py-1.5 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                            >
                              Add Room
                            </button>
                          </div>
                        )}

                        {/* Rooms List */}
                        {accom.rooms?.length > 0 ? (
                          <div className="space-y-2">
                            {accom.rooms.map(room => {
                              const roomAssignments = accom.assignments?.filter(a => a.room_id === room.id) || []
                              const unassignedCount = room.capacity - roomAssignments.length
                              return (
                                <div
                                  key={room.id}
                                  className={`p-3 bg-white rounded-lg border-2 transition-colors ${
                                    dragOverRoomId === room.id
                                      ? 'border-violet-400 bg-violet-50'
                                      : 'border-slate-200'
                                  }`}
                                  onDragOver={(e) => {
                                    if (effectiveIsAdmin && draggingMember) {
                                      e.preventDefault()
                                      setDragOverRoomId(room.id)
                                    }
                                  }}
                                  onDragLeave={() => setDragOverRoomId(null)}
                                  onDrop={async (e) => {
                                    e.preventDefault()
                                    setDragOverRoomId(null)
                                    if (effectiveIsAdmin && draggingMember) {
                                      await assignMemberToAccommodation({
                                        accommodation_id: accom.id,
                                        room_id: room.id,
                                        user_id: draggingMember.userId,
                                        event_id: eventId
                                      })
                                      setDraggingMember(null)
                                    }
                                  }}
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-sm text-slate-800">{room.room_label}</span>
                                      <span className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                                        {roomAssignments.length}/{room.capacity}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      {effectiveIsAdmin && (
                                        <>
                                          <button
                                            onClick={() => setAssigningToRoomId(assigningToRoomId === room.id ? null : room.id)}
                                            className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                                          >
                                            {assigningToRoomId === room.id ? 'Done' : 'Assign'}
                                          </button>
                                          <button
                                            onClick={async () => {
                                              if (window.confirm(`Delete room "${room.room_label}"?`)) {
                                                await deleteRoom(room.id, eventId)
                                              }
                                            }}
                                            className="text-xs px-2 py-1 text-red-500 hover:bg-red-50 rounded"
                                          >
                                            <Icon name="trash" size={12} />
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  {room.notes && (
                                    <p className="text-xs text-slate-500 mb-2">{room.notes}</p>
                                  )}
                                  {/* Room Occupants */}
                                  <div className="flex flex-wrap gap-1">
                                    {roomAssignments.map(a => (
                                      <div
                                        key={a.id}
                                        draggable={effectiveIsAdmin}
                                        onDragStart={(e) => {
                                          if (effectiveIsAdmin) {
                                            setDraggingMember({
                                              userId: a.user_id,
                                              name: a.profile?.full_name || 'Unknown',
                                              fromAccommodationId: accom.id,
                                              fromRoomId: room.id
                                            })
                                            e.dataTransfer.effectAllowed = 'move'
                                          }
                                        }}
                                        onDragEnd={() => setDraggingMember(null)}
                                        className={`flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs ${
                                          effectiveIsAdmin ? 'cursor-grab active:cursor-grabbing hover:bg-blue-100' : ''
                                        }`}
                                      >
                                        <span>{a.profile?.full_name || 'Unknown'}</span>
                                        {effectiveIsAdmin && (
                                          <button
                                            onClick={() => removeAccommodationAssignment(a.id, eventId)}
                                            className="hover:text-red-500"
                                          >
                                            <Icon name="close" size={10} />
                                          </button>
                                        )}
                                      </div>
                                    ))}
                                    {unassignedCount > 0 && (
                                      <span className="px-2 py-1 text-xs text-slate-400 italic">
                                        {unassignedCount} spot{unassignedCount !== 1 ? 's' : ''} available
                                      </span>
                                    )}
                                  </div>
                                  {/* Assign to Room Dropdown */}
                                  {assigningToRoomId === room.id && effectiveIsAdmin && (
                                    <div className="mt-2">
                                      <select
                                        className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg"
                                        value=""
                                        onChange={async (e) => {
                                          const userId = e.target.value
                                          if (!userId) return
                                          await assignMemberToAccommodation({
                                            accommodation_id: accom.id,
                                            room_id: room.id,
                                            user_id: userId,
                                            event_id: eventId
                                          })
                                        }}
                                      >
                                        <option value="">Assign member to this room...</option>
                                        {members
                                          .filter(m => m.is_active)
                                          .filter(m => !accom.assignments?.some(a => a.user_id === m.id))
                                          .map(m => (
                                            <option key={m.id} value={m.id}>{m.full_name}</option>
                                          ))
                                        }
                                      </select>
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic">No rooms added yet</p>
                        )}

                        {/* Unassigned to Room (assigned to accommodation but not room) - also a drop target */}
                        {(() => {
                          const unassignedToRoom = accom.assignments?.filter(a => !a.room_id) || []
                          const hasRooms = accom.rooms?.length > 0
                          // Show if there are unassigned people OR if there are rooms (so people can be dragged back)
                          if (unassignedToRoom.length === 0 && !hasRooms) return null
                          return (
                            <div
                              className={`mt-3 pt-3 border-t border-slate-200 rounded-lg transition-colors ${
                                dragOverUnassignedId === accom.id
                                  ? 'bg-amber-50 border-amber-300'
                                  : ''
                              }`}
                              onDragOver={(e) => {
                                if (effectiveIsAdmin && draggingMember && draggingMember.fromRoomId) {
                                  e.preventDefault()
                                  setDragOverUnassignedId(accom.id)
                                }
                              }}
                              onDragLeave={() => setDragOverUnassignedId(null)}
                              onDrop={async (e) => {
                                e.preventDefault()
                                setDragOverUnassignedId(null)
                                if (effectiveIsAdmin && draggingMember && draggingMember.fromRoomId) {
                                  // Assign to accommodation without room (remove from room)
                                  await assignMemberToAccommodation({
                                    accommodation_id: accom.id,
                                    room_id: null,
                                    user_id: draggingMember.userId,
                                    event_id: eventId
                                  })
                                  setDraggingMember(null)
                                }
                              }}
                            >
                              <div className="text-xs font-semibold text-amber-600 mb-2">
                                Not assigned to room ({unassignedToRoom.length})
                                {effectiveIsAdmin && hasRooms && <span className="font-normal text-slate-400 ml-1">• drag to assign or drop here</span>}
                              </div>
                              <div className="flex flex-wrap gap-1 min-h-[28px]">
                                {unassignedToRoom.map(a => (
                                  <div
                                    key={a.id}
                                    draggable={effectiveIsAdmin}
                                    onDragStart={(e) => {
                                      if (effectiveIsAdmin) {
                                        setDraggingMember({
                                          userId: a.user_id,
                                          name: a.profile?.full_name || 'Unknown',
                                          fromAccommodationId: accom.id,
                                          fromRoomId: null
                                        })
                                        e.dataTransfer.effectAllowed = 'move'
                                      }
                                    }}
                                    onDragEnd={() => setDraggingMember(null)}
                                    className={`flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 rounded-full text-xs ${
                                      effectiveIsAdmin ? 'cursor-grab active:cursor-grabbing hover:bg-amber-100' : ''
                                    }`}
                                  >
                                    <span>{a.profile?.full_name || 'Unknown'}</span>
                                    {effectiveIsAdmin && (
                                      <button
                                        onClick={() => removeAccommodationAssignment(a.id, eventId)}
                                        className="hover:text-red-500"
                                      >
                                        <Icon name="close" size={10} />
                                      </button>
                                    )}
                                  </div>
                                ))}
                                {unassignedToRoom.length === 0 && hasRooms && effectiveIsAdmin && (
                                  <span className="text-xs text-slate-400 italic">Drop here to unassign from room</span>
                                )}
                              </div>
                            </div>
                          )
                        })()}
                      </div>

                      {/* Admin Actions */}
                      {effectiveIsAdmin && (
                        <div className="pt-3 border-t border-slate-200 space-y-2">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => setAssigningToAccommodationId(assigningToAccommodationId === accom.id ? null : accom.id)}
                              className="px-3 py-1.5 text-sm bg-violet-100 hover:bg-violet-200 text-violet-700 rounded-lg transition-colors"
                            >
                              {assigningToAccommodationId === accom.id ? 'Done' : '+ Assign Member'}
                            </button>
                            <button
                              onClick={() => {
                                setAccommodationForm({
                                  name: accom.name || '',
                                  address: accom.address || '',
                                  booking_link: accom.booking_link || '',
                                  check_in: accom.check_in || '',
                                  check_out: accom.check_out || '',
                                  price_info: accom.price_info || '',
                                  total_capacity: accom.total_capacity || '',
                                  notes: accom.notes || '',
                                  contact_info: accom.contact_info || '',
                                  is_primary: accom.is_primary || false
                                })
                                setEditingAccommodationId(accom.id)
                                setShowAccommodationForm(true)
                              }}
                              className="px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                            >
                              Edit Lodging
                            </button>
                            <button
                              onClick={async () => {
                                if (window.confirm(`Delete "${accom.name}"? This will remove all rooms and assignments.`)) {
                                  await deleteAccommodation(accom.id, eventId)
                                }
                              }}
                              className="px-3 py-1.5 text-sm bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                          {/* Assign to Lodging dropdown */}
                          {assigningToAccommodationId === accom.id && (
                            <select
                              className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg"
                              value=""
                              onChange={async (e) => {
                                const userId = e.target.value
                                if (!userId) return
                                await assignMemberToAccommodation({
                                  accommodation_id: accom.id,
                                  room_id: null,
                                  user_id: userId,
                                  event_id: eventId
                                })
                              }}
                            >
                              <option value="">Assign member to this lodging...</option>
                              {members
                                .filter(m => m.is_active)
                                .filter(m => !accom.assignments?.some(a => a.user_id === m.id))
                                .map(m => (
                                  <option key={m.id} value={m.id}>{m.full_name}</option>
                                ))
                              }
                            </select>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Unassigned Members - draggable into rooms */}
              {effectiveIsAdmin && (() => {
                // Get all member IDs already assigned to any accommodation
                const assignedMemberIds = new Set(
                  eventAccommodations.flatMap(a => a.assignments?.map(as => as.user_id) || [])
                )
                // Filter active members not yet assigned
                const unassignedMembers = members.filter(m => m.is_active && !assignedMemberIds.has(m.id))

                if (unassignedMembers.length === 0) return null

                return (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon name="users" size={16} className="text-slate-500" />
                          <span className="font-semibold text-slate-700 text-sm">
                            Unassigned Members ({unassignedMembers.length})
                          </span>
                        </div>
                        <span className="text-xs text-slate-400">drag to assign to room</span>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="flex flex-wrap gap-1.5">
                        {unassignedMembers.map(m => (
                          <div
                            key={m.id}
                            draggable
                            onDragStart={(e) => {
                              setDraggingMember({
                                userId: m.id,
                                name: m.full_name,
                                fromAccommodationId: null
                              })
                              e.dataTransfer.effectAllowed = 'move'
                            }}
                            onDragEnd={() => setDraggingMember(null)}
                            className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-xs cursor-grab active:cursor-grabbing hover:bg-slate-200 transition-colors"
                          >
                            <span>{m.full_name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>
          ) : !showAccommodationForm && (
            /* Legacy single accommodation info or empty state */
            (event.accommodation_info || event.accommodation_address) ? (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                    <Icon name="location" size={16} className="text-white" />
                  </div>
                  <h3 className="font-bold text-slate-900">Lodging Details</h3>
                </div>
                <div className="p-5 space-y-4">
                  {event.accommodation_info && (
                    <div className="prose prose-sm max-w-none text-slate-600">
                      <Linkify>{event.accommodation_info}</Linkify>
                    </div>
                  )}
                  {event.accommodation_address && (
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-violet-50 border border-violet-200">
                      <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                        <Icon name="location" size={20} className="text-violet-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-violet-600 font-semibold uppercase tracking-wider mb-1">Address</div>
                        <div className="text-slate-800 font-medium">{event.accommodation_address}</div>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.accommodation_address)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-violet-600 hover:text-violet-800 mt-2"
                        >
                          <Icon name="link" size={14} />
                          Open in Maps
                        </a>
                      </div>
                    </div>
                  )}
                  {(event.accommodation_checkin || event.accommodation_checkout) && (
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      {event.accommodation_checkin && (
                        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                          <div className="text-[10px] text-emerald-600 font-semibold uppercase">Check-in</div>
                          <div className="font-bold text-emerald-800">{event.accommodation_checkin}</div>
                        </div>
                      )}
                      {event.accommodation_checkout && (
                        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-center">
                          <div className="text-[10px] text-rose-600 font-semibold uppercase">Check-out</div>
                          <div className="font-bold text-rose-800">{event.accommodation_checkout}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-violet-50 flex items-center justify-center">
                  <Icon name="home" size={28} className="text-violet-400" />
                </div>
                <h3 className="font-semibold text-slate-700 mb-2">No Accommodation Info</h3>
                <p className="text-sm text-slate-500 max-w-sm mx-auto">
                  {effectiveIsAdmin
                    ? "Add lodging options to help team members coordinate their stay."
                    : "Accommodation details will appear here when added by the organizers."
                  }
                </p>
              </div>
            )
          )}

          {/* Accommodation Requests Summary - Admin Only */}
          {effectiveIsAdmin && allEventRegistrations.some(r => r.accommodation_needs) && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                  <Icon name="roster" size={16} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Member Requests</h3>
                  <p className="text-xs text-slate-500">From event registrations</p>
                </div>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-center">
                    <div className="text-2xl font-bold text-amber-700">
                      {allEventRegistrations.filter(r => r.accommodation_needs === 'need_accommodation').length}
                    </div>
                    <div className="text-[10px] font-semibold text-amber-600 uppercase">Need</div>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                    <div className="text-2xl font-bold text-emerald-700">
                      {allEventRegistrations.filter(r => r.accommodation_needs === 'have_accommodation').length}
                    </div>
                    <div className="text-[10px] font-semibold text-emerald-600 uppercase">Arranged</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <div className="text-2xl font-bold text-slate-600">
                      {allEventRegistrations.filter(r => !r.accommodation_needs || r.accommodation_needs === 'not_needed').length}
                    </div>
                    <div className="text-[10px] font-semibold text-slate-500 uppercase">N/A</div>
                  </div>
                </div>

                {allEventRegistrations.filter(r => r.accommodation_needs === 'need_accommodation').length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-slate-600 mb-2">Needing Accommodation:</div>
                    {allEventRegistrations
                      .filter(r => r.accommodation_needs === 'need_accommodation')
                      .map(reg => (
                        <div key={reg.id} className="flex items-center justify-between p-2 bg-amber-50 rounded-lg border border-amber-200">
                          <span className="text-sm font-medium text-slate-800">{reg.profile?.full_name || 'Unknown'}</span>
                          {reg.accommodation_notes && (
                            <span className="text-xs text-slate-500 truncate max-w-[150px]" title={reg.accommodation_notes}>
                              {reg.accommodation_notes}
                            </span>
                          )}
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== PHOTOS TAB ==================== */}
      {activeTab === 'photos' && (
        <div className="space-y-6">
          {/* Photos Header - Sleek glassmorphism style */}
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAzMHYySDE0di0yaDIyek0zNiAyNnYySDE0di0yaDIyek0zNiAyMnYySDE0di0yaDIyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
            <div className="relative flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Icon name="camera" size={24} className="text-primary-400" />
                  Event Photos
                </h2>
                <p className="text-slate-400 text-sm mt-1">
                  {event.photos?.length || 0} photos captured
                </p>
              </div>
              {isAdminOrCoach && (
                <label className="relative group cursor-pointer">
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 rounded-lg text-white text-sm font-medium transition-all">
                    <Icon name="plus" size={16} />
                    {isUploadingPhoto ? 'Uploading...' : 'Upload Photo'}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    disabled={isUploadingPhoto}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Photo Grid - Masonry-style with hover effects */}
          {event.photos?.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {event.photos.map((photo, idx) => (
                <div
                  key={photo.id}
                  className={`group relative cursor-pointer overflow-hidden rounded-xl bg-slate-100 ${
                    idx === 0 ? 'md:col-span-2 md:row-span-2' : ''
                  }`}
                  style={{ aspectRatio: idx === 0 ? '1' : '1' }}
                  onClick={() => setSelectedPhoto(photo)}
                >
                  <img
                    src={photo.url}
                    alt={photo.caption || 'Event photo'}
                    className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105"
                  />
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div className="absolute bottom-3 left-3 right-3">
                      {photo.caption && (
                        <p className="text-white text-sm font-medium truncate">{photo.caption}</p>
                      )}
                      <p className="text-white/70 text-xs mt-0.5">
                        {photo.uploaded_at && format(new Date(photo.uploaded_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  {/* Delete button for admin */}
                  {isAdminOrCoach && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handlePhotoDelete(photo)
                      }}
                      className="absolute top-2 right-2 p-2 bg-red-500/90 hover:bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg backdrop-blur-sm"
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50">
              <div className="py-16 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
                  <Icon name="camera" size={28} className="text-slate-400" />
                </div>
                <p className="text-slate-600 font-medium">No photos yet</p>
                <p className="text-slate-400 text-sm mt-1">
                  {isAdminOrCoach ? 'Upload photos to capture event memories!' : 'Photos will appear here once uploaded'}
                </p>
              </div>
            </div>
          )}

          {/* External Album Link (placeholder for future) */}
          {event.external_album_url && (
            <a
              href={event.external_album_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 bg-gradient-to-r from-primary-50 to-blue-50 rounded-xl border border-primary-100 hover:border-primary-200 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                  <Icon name="link" size={20} className="text-primary-600" />
                </div>
                <div>
                  <span className="font-medium text-slate-900">View Full Album</span>
                  <span className="text-slate-500 text-sm block">External photo gallery</span>
                </div>
              </div>
              <Icon name="arrowUpRight" size={20} className="text-slate-400 group-hover:text-primary-600 transition-colors" />
            </a>
          )}

          {/* Photo Lightbox */}
          {selectedPhoto && (
            <div
              className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center"
              onClick={() => setSelectedPhoto(null)}
            >
              {/* Close button */}
              <button
                className="absolute top-4 right-4 p-3 text-white/80 hover:text-white hover:bg-white/10 rounded-xl backdrop-blur-sm transition-all"
                onClick={() => setSelectedPhoto(null)}
              >
                <Icon name="close" size={24} />
              </button>

              {/* Navigation arrows */}
              {event.photos?.length > 1 && (
                <>
                  <button
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-3 text-white/60 hover:text-white hover:bg-white/10 rounded-xl backdrop-blur-sm transition-all"
                    onClick={(e) => {
                      e.stopPropagation()
                      const currentIdx = event.photos.findIndex(p => p.id === selectedPhoto.id)
                      const prevIdx = currentIdx === 0 ? event.photos.length - 1 : currentIdx - 1
                      setSelectedPhoto(event.photos[prevIdx])
                    }}
                  >
                    <Icon name="arrowLeft" size={24} />
                  </button>
                  <button
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-3 text-white/60 hover:text-white hover:bg-white/10 rounded-xl backdrop-blur-sm transition-all"
                    onClick={(e) => {
                      e.stopPropagation()
                      const currentIdx = event.photos.findIndex(p => p.id === selectedPhoto.id)
                      const nextIdx = currentIdx === event.photos.length - 1 ? 0 : currentIdx + 1
                      setSelectedPhoto(event.photos[nextIdx])
                    }}
                  >
                    <Icon name="arrowRight" size={24} />
                  </button>
                </>
              )}

              {/* Image */}
              <img
                src={selectedPhoto.url}
                alt={selectedPhoto.caption || 'Event photo'}
                className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />

              {/* Caption bar */}
              {selectedPhoto.caption && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 max-w-lg">
                  <div className="px-5 py-3 bg-black/70 backdrop-blur-md rounded-xl text-white text-center">
                    {selectedPhoto.caption}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ==================== MANAGE TAB ==================== */}
      {activeTab === 'manage' && isAdminOrCoach && (
        <div className="space-y-6">
          {/* Manage Header */}
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 p-5">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAzMHYySDE0di0yaDIyek0zNiAyNnYySDE0di0yaDIyek0zNiAyMnYySDE0di0yaDIyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
            <div className="relative">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Icon name="settings" size={24} className="text-slate-300" />
                Event Management
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                Tasks, deadlines, and admin settings
              </p>
            </div>
          </div>

          {/* Tasks Section */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                  <Icon name="check" size={16} className="text-white" />
                </div>
                <h3 className="font-bold text-slate-900">Task Checklist</h3>
              </div>
              <button
                onClick={() => setShowTaskForm(!showTaskForm)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Icon name={showTaskForm ? 'close' : 'plus'} size={14} />
                {showTaskForm ? 'Cancel' : 'Add Task'}
              </button>
            </div>
            <div className="p-5">

            {showTaskForm && (
              <div className="mb-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="space-y-3">
                  <input
                    type="text"
                    className="input text-sm"
                    placeholder="Task title..."
                    value={taskForm.title}
                    onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  />
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <select
                      className="input text-sm"
                      value={taskForm.priority}
                      onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                    <select
                      className="input text-sm"
                      value={taskForm.assigned_to}
                      onChange={(e) => setTaskForm({ ...taskForm, assigned_to: e.target.value })}
                    >
                      <option value="">Unassigned</option>
                      {members.filter(m => m.is_active).map(m => (
                        <option key={m.id} value={m.id}>{m.full_name}</option>
                      ))}
                    </select>
                    <input
                      type="date"
                      className="input text-sm col-span-2 sm:col-span-1"
                      value={taskForm.due_date}
                      onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                    />
                  </div>
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCreateTask()
                    }}
                    className="btn btn-primary w-full text-sm"
                  >
                    Add Task
                  </button>
                </div>
              </div>
            )}

            {eventTasks.length > 0 ? (
              <div className="space-y-2">
                {eventTasks.map(task => {
                  const priorityColors = {
                    urgent: 'bg-red-100 text-red-700',
                    high: 'bg-orange-100 text-orange-700',
                    medium: 'bg-amber-100 text-amber-700',
                    low: 'bg-slate-100 text-slate-600'
                  }

                  return (
                    <div
                      key={task.id}
                      className={`p-3 rounded-lg border ${task.completed ? 'bg-success-50 border-success-200' : 'bg-white border-slate-200'}`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={task.completed}
                          onChange={(e) => toggleTask(task.id, eventId, e.target.checked, user.id)}
                          className="mt-1 rounded text-primary-600"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`font-medium ${task.completed ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                              {task.title}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs ${priorityColors[task.priority]}`}>
                              {task.priority}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            {task.assigned_to_profile && <span>Assigned to {task.assigned_to_profile.full_name}</span>}
                            {task.due_date && <span> • Due {format(new Date(task.due_date), 'MMM d')}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-center py-8 text-slate-500">No tasks created yet</p>
            )}
            </div>
          </div>

          {/* Deadlines Section - Full Management */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                  <Icon name="clock" size={16} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Deadlines</h3>
                  <p className="text-xs text-slate-500">{eventDeadlines.length} deadline{eventDeadlines.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  resetDeadlineForm()
                  setShowDeadlineForm(true)
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Icon name="plus" size={14} />
                Add Deadline
              </button>
            </div>
            <div className="p-5">
            {eventDeadlines.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-slate-100 flex items-center justify-center">
                  <Icon name="calendar" size={24} className="text-slate-400" />
                </div>
                <p className="text-slate-500 text-sm">No deadlines set</p>
                <p className="text-slate-400 text-xs mt-1">Add registration, payment, or other deadlines</p>
              </div>
            ) : (
              <div className="space-y-2">
                {eventDeadlines.map(deadline => {
                  const isPast = new Date(deadline.deadline_date) < new Date()
                  const isToday = new Date(deadline.deadline_date).toDateString() === new Date().toDateString()
                  const daysUntil = Math.ceil((new Date(deadline.deadline_date) - new Date()) / (1000 * 60 * 60 * 24))

                  return (
                    <div
                      key={deadline.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isPast ? 'bg-slate-50 border-slate-200 opacity-60' :
                        isToday ? 'bg-gradient-to-r from-red-50 to-orange-50 border-red-200' :
                        daysUntil <= 7 ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200' :
                        'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                              deadline.deadline_type === 'registration' ? 'bg-blue-100 text-blue-700' :
                              deadline.deadline_type === 'early_bird' ? 'bg-green-100 text-green-700' :
                              deadline.deadline_type === 'payment' ? 'bg-purple-100 text-purple-700' :
                              deadline.deadline_type === 'lineup' ? 'bg-cyan-100 text-cyan-700' :
                              deadline.deadline_type === 'waiver' ? 'bg-pink-100 text-pink-700' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              {deadline.deadline_type?.replace(/_/g, ' ') || 'Custom'}
                            </span>
                            {!deadline.is_visible_to_members && (
                              <span className="px-1.5 py-0.5 bg-slate-200/80 text-slate-500 text-[10px] rounded-md flex items-center gap-0.5">
                                <Icon name="visibility_off" size={10} /> Hidden
                              </span>
                            )}
                            {isPast && (
                              <span className="text-[10px] text-slate-400 font-medium">PASSED</span>
                            )}
                            {isToday && (
                              <span className="text-[10px] text-red-600 font-bold animate-pulse">DUE TODAY</span>
                            )}
                            {!isPast && !isToday && daysUntil <= 7 && (
                              <span className={`text-[10px] font-medium ${daysUntil <= 3 ? 'text-orange-600' : 'text-amber-600'}`}>
                                {daysUntil} day{daysUntil !== 1 ? 's' : ''} left
                              </span>
                            )}
                          </div>
                          <h4 className="font-semibold text-slate-900">{deadline.title}</h4>
                          <div className="text-sm text-slate-600 mt-0.5 flex items-center gap-1">
                            <Icon name="calendar" size={12} />
                            {format(new Date(deadline.deadline_date), 'EEEE, MMMM d, yyyy')}
                            {deadline.deadline_time && ` at ${deadline.deadline_time}`}
                          </div>
                          {deadline.description && (
                            <p className="text-xs text-slate-500 mt-2 bg-slate-50 p-2 rounded-lg">{deadline.description}</p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => toggleDeadlineVisibility(deadline.id)}
                            className={`p-2 rounded-lg transition-colors ${
                              deadline.is_visible_to_members
                                ? 'text-green-600 bg-green-50 hover:bg-green-100'
                                : 'text-slate-400 bg-slate-50 hover:bg-slate-100'
                            }`}
                            title={deadline.is_visible_to_members ? 'Visible to members' : 'Hidden from members'}
                          >
                            <Icon name={deadline.is_visible_to_members ? 'visibility' : 'visibility_off'} size={16} />
                          </button>
                          <button
                            onClick={() => startEditDeadline(deadline)}
                            className="p-2 text-slate-500 bg-slate-50 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Icon name="edit" size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteDeadline(deadline.id)}
                            className="p-2 text-slate-500 bg-slate-50 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Icon name="trash" size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            </div>
          </div>

          {/* Deadline Form Modal */}
          {showDeadlineForm && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-red-500 to-orange-500">
                  <h2 className="text-lg font-bold text-white">
                    {editingDeadlineId ? 'Edit Deadline' : 'Add Deadline'}
                  </h2>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="label text-xs">Deadline Type</label>
                    <select
                      className="input text-sm"
                      value={deadlineForm.deadline_type}
                      onChange={(e) => {
                        const newType = e.target.value
                        const typeLabels = {
                          custom: '',
                          registration: 'Registration Deadline',
                          early_bird: 'Early Bird Deadline',
                          payment: 'Payment Deadline',
                          lineup: 'Lineup Submission Deadline',
                          waiver: 'Waiver Deadline'
                        }
                        const currentTitle = deadlineForm.title
                        const eventTitle = event?.title || ''
                        const shouldAutoFill = !editingDeadlineId && (
                          !currentTitle ||
                          Object.values(typeLabels).some(label => label && currentTitle === `${label} - ${eventTitle}`)
                        )
                        const newTitle = shouldAutoFill && typeLabels[newType]
                          ? `${typeLabels[newType]} - ${eventTitle}`
                          : currentTitle
                        setDeadlineForm({ ...deadlineForm, deadline_type: newType, title: newTitle })
                      }}
                    >
                      <option value="custom">Custom</option>
                      <option value="registration">Registration</option>
                      <option value="early_bird">Early Bird</option>
                      <option value="payment">Payment</option>
                      <option value="lineup">Lineup Submission</option>
                      <option value="waiver">Waiver Deadline</option>
                    </select>
                  </div>

                  <div>
                    <label className="label text-xs">Deadline Title *</label>
                    <input
                      type="text"
                      className="input text-sm"
                      placeholder="e.g., Registration Closes"
                      value={deadlineForm.title}
                      onChange={(e) => setDeadlineForm({ ...deadlineForm, title: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label text-xs">Date *</label>
                      <input
                        type="date"
                        className="input text-sm"
                        value={deadlineForm.deadline_date}
                        onChange={(e) => setDeadlineForm({ ...deadlineForm, deadline_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="label text-xs">Time (optional)</label>
                      <input
                        type="time"
                        className="input text-sm"
                        value={deadlineForm.deadline_time}
                        onChange={(e) => setDeadlineForm({ ...deadlineForm, deadline_time: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label text-xs">Description (optional)</label>
                    <textarea
                      className="input text-sm"
                      rows="2"
                      placeholder="Additional details..."
                      value={deadlineForm.description}
                      onChange={(e) => setDeadlineForm({ ...deadlineForm, description: e.target.value })}
                    />
                  </div>

                  <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={deadlineForm.is_visible_to_members}
                      onChange={(e) => setDeadlineForm({ ...deadlineForm, is_visible_to_members: e.target.checked })}
                      className="rounded text-primary-600 focus:ring-primary-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-slate-700">Visible to team members</span>
                      <p className="text-xs text-slate-500">Members will see this deadline on the Event tab</p>
                    </div>
                  </label>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => {
                        setShowDeadlineForm(false)
                        setEditingDeadlineId(null)
                        resetDeadlineForm()
                      }}
                      className="btn btn-secondary flex-1"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={editingDeadlineId ? handleEditDeadline : handleCreateDeadline}
                      className="btn btn-primary flex-1"
                    >
                      {editingDeadlineId ? 'Save Changes' : 'Add Deadline'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Finances Section */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900">Expenses</h3>
              <button
                onClick={() => setShowExpenseForm(!showExpenseForm)}
                className="btn btn-primary text-sm"
              >
                {showExpenseForm ? 'Cancel' : '+ Add Expense'}
              </button>
            </div>

            {showExpenseForm && (
              <div className="mb-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      className="input text-sm"
                      value={expenseForm.expense_type}
                      onChange={(e) => setExpenseForm({ ...expenseForm, expense_type: e.target.value })}
                    >
                      <option value="registration_fee">Registration</option>
                      <option value="equipment_rental">Equipment</option>
                      <option value="accommodation">Accommodation</option>
                      <option value="meals">Meals</option>
                      <option value="transportation">Transport</option>
                      <option value="other">Other</option>
                    </select>
                    <input
                      type="number"
                      step="0.01"
                      className="input text-sm"
                      placeholder="Amount ($)"
                      value={expenseForm.amount}
                      onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    />
                  </div>
                  <input
                    type="text"
                    className="input text-sm"
                    placeholder="Description..."
                    value={expenseForm.description}
                    onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  />
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCreateExpense()
                    }}
                    className="btn btn-primary w-full text-sm"
                  >
                    Add Expense
                  </button>
                </div>
              </div>
            )}

            {eventExpenses.length > 0 ? (
              <div className="space-y-2">
                {eventExpenses.map(expense => (
                  <div key={expense.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <div className="font-medium text-slate-900">{expense.description}</div>
                      <div className="text-xs text-slate-500 capitalize">{expense.expense_type.replace('_', ' ')}</div>
                    </div>
                    <div className="text-lg font-bold text-slate-900">${expense.amount}</div>
                  </div>
                ))}
                <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
                  <span className="font-bold text-slate-900">Total</span>
                  <span className="text-xl font-bold text-primary-600">
                    ${eventExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0).toFixed(2)}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-center py-8 text-slate-500">No expenses recorded</p>
            )}
          </div>

          {/* Waivers Section */}
          <div className="card">
            <h3 className="font-bold text-slate-900 mb-4">Waivers & Documents</h3>
            {eventWaivers.length > 0 ? (
              <div className="space-y-3">
                {eventWaivers.map(waiver => {
                  const signatures = waiver_signatures[waiver.id] || []
                  return (
                    <div key={waiver.id} className="p-4 border border-slate-200 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-slate-900">{waiver.title}</h4>
                          {waiver.required && (
                            <span className="text-xs text-red-600">Required</span>
                          )}
                        </div>
                        <span className="text-sm text-slate-500">
                          {signatures.length} signed
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-center py-8 text-slate-500">No waivers required</p>
            )}
          </div>
        </div>
      )}

      {/* ==================== MODALS ==================== */}

      {/* Link Lineup Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-xl font-bold text-slate-900 mb-4">Link Lineup to Event</h3>

              <div className="space-y-4">
                <div>
                  <label className="label">Select Lineup</label>
                  <select
                    value={selectedLineupId}
                    onChange={(e) => setSelectedLineupId(e.target.value)}
                    className="input"
                  >
                    <option value="">Choose a lineup...</option>
                    {availableLineups
                      .filter(l => l.event_id !== eventId)
                      .map((lineup) => (
                        <option key={lineup.id} value={lineup.id}>
                          {lineup.name || lineup.boat_name || 'Unnamed Lineup'} ({getPositionSummary(lineup.positions)})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="label">Boat Name</label>
                  <input
                    type="text"
                    value={boatName}
                    onChange={(e) => setBoatName(e.target.value)}
                    placeholder={`Boat ${eventLineups.length + 1}`}
                    className="input"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowLinkModal(false)
                    setSelectedLineupId('')
                    setBoatName('')
                  }}
                  className="btn btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLinkLineup}
                  className="btn btn-primary flex-1"
                  disabled={linkingLoading || !selectedLineupId}
                >
                  {linkingLoading ? 'Linking...' : 'Link Lineup'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
