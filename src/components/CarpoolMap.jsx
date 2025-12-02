import { useState, useEffect, useMemo, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import Icon from './Icon'
import AddressSearchInput from './AddressSearchInput'
import { parseGoogleMapsLink } from '../utils/parseGoogleMapsLink'

// Fix Leaflet default marker icon issue
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// Custom marker icons for drivers
const createCustomIcon = (color, label, isReturn = false) => {
  // Return location markers are slightly smaller and have a different shape (square bottom)
  const size = isReturn ? 26 : 32
  const borderRadius = isReturn ? '50% 50% 0 50%' : '50% 50% 50% 0'
  const fontSize = isReturn ? '10px' : '12px'

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${color};
        width: ${size}px;
        height: ${size}px;
        border-radius: ${borderRadius};
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        ${isReturn ? 'opacity: 0.85;' : ''}
      ">
        <span style="
          transform: rotate(45deg);
          color: white;
          font-weight: bold;
          font-size: ${fontSize};
        ">${label || ''}</span>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  })
}

// Small circle markers for riders (pickup/dropoff)
const createRiderIcon = (type, initials) => {
  // type: 'pickup' (blue), 'dropoff' (purple), 'both' (green)
  const colors = {
    pickup: '#3b82f6',   // Blue - to event
    dropoff: '#8b5cf6',  // Purple - from event
    both: '#10b981'      // Green - same location
  }
  const color = colors[type] || colors.both

  return L.divIcon({
    className: 'rider-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: bold;
        color: white;
      ">${initials || '?'}</div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  })
}

const venueIcon = createCustomIcon('#ef4444', '') // Red for venue
const carpoolIcons = [
  createCustomIcon('#3b82f6', '1'), // Blue
  createCustomIcon('#10b981', '2'), // Green
  createCustomIcon('#8b5cf6', '3'), // Purple
  createCustomIcon('#f59e0b', '4'), // Amber
  createCustomIcon('#ec4899', '5'), // Pink
  createCustomIcon('#06b6d4', '6'), // Cyan
  createCustomIcon('#84cc16', '7'), // Lime
  createCustomIcon('#f97316', '8'), // Orange
]

// Component to fit map bounds to all markers
function FitBounds({ positions }) {
  const map = useMap()

  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions)
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 })
    }
  }, [map, positions])

  return null
}

// Geocode address using Nominatim (OpenStreetMap) - free, no API key
const searchAddress = async (query) => {
  if (!query || query.length < 3) return []

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?` +
      `format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'TeamOrganizationApp/1.0'
        }
      }
    )

    if (!response.ok) return []

    const data = await response.json()
    return data.map(item => ({
      display_name: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      type: item.type,
      address: item.address
    }))
  } catch (error) {
    console.error('Geocoding error:', error)
    return []
  }
}

export default function CarpoolMap({
  event,
  carpools = [],
  registrations = [],
  teamMembers = [], // All team members for admin pre-fill
  savedLocations = [], // User's saved locations for quick selection
  onUpdateCarpoolCoords,
  onUpdateRiderLocation,
  onCreateRegistration, // For admin to create pre-filled registration
  isAdmin = false
}) {
  const [editingCarpool, setEditingCarpool] = useState(null)
  const [editingRider, setEditingRider] = useState(null)
  const [locationInput, setLocationInput] = useState('')
  const [showNeedRide, setShowNeedRide] = useState(true)
  const [showRidersOnMap, setShowRidersOnMap] = useState(true)
  const [showAllRiders, setShowAllRiders] = useState(false) // Toggle to show all riders, not just those needing rides
  const [showUnregistered, setShowUnregistered] = useState(false)
  const [directionView, setDirectionView] = useState('all') // 'all', 'to', 'from'
  const [addingMemberLocation, setAddingMemberLocation] = useState(null)
  const [memberLocationForm, setMemberLocationForm] = useState({
    carpool_needs: 'need_ride',
    carpool_direction: 'both',
    pickup: '',
    pickup_lat: null,
    pickup_lng: null,
    dropoff: '',
    dropoff_lat: null,
    dropoff_lng: null,
    same_as_pickup: true
  })
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedCoords, setSelectedCoords] = useState(null)
  const [returnLocationInput, setReturnLocationInput] = useState('')
  const [selectedReturnCoords, setSelectedReturnCoords] = useState(null)
  const searchTimeoutRef = useRef(null)

  // Parse venue coordinates
  const venueCoords = useMemo(() => {
    if (event?.venue_lat && event?.venue_lng) {
      return { lat: event.venue_lat, lng: event.venue_lng }
    }
    return null
  }, [event])

  // Parse carpool coordinates (stored in departure_coords or extracted from link)
  const carpoolsWithCoords = useMemo(() => {
    return carpools.map((carpool, index) => {
      const iconIndex = index % carpoolIcons.length
      const iconColors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#84cc16', '#f97316']
      const iconColor = iconColors[iconIndex]

      let departureCoords = null
      let returnCoords = null

      // Parse departure coordinates (where driver leaves FROM to go to event)
      if (carpool.departure_lat && carpool.departure_lng) {
        departureCoords = { lat: parseFloat(carpool.departure_lat), lng: parseFloat(carpool.departure_lng) }
      } else if (carpool.departure_location_link) {
        const parsed = parseGoogleMapsLink(carpool.departure_location_link)
        if (parsed.hasCoordinates) {
          departureCoords = { lat: parsed.lat, lng: parsed.lng }
        }
      }

      // Parse return location coordinates (where driver drops people off AFTER event)
      if (carpool.final_lat && carpool.final_lng) {
        returnCoords = { lat: parseFloat(carpool.final_lat), lng: parseFloat(carpool.final_lng) }
      } else if (carpool.final_location_link) {
        const parsed = parseGoogleMapsLink(carpool.final_location_link)
        if (parsed.hasCoordinates) {
          returnCoords = { lat: parsed.lat, lng: parsed.lng }
        }
      }

      return {
        ...carpool,
        coords: departureCoords,
        returnCoords: returnCoords,
        icon: carpoolIcons[iconIndex],
        returnIcon: createCustomIcon(iconColor, `${index + 1}R`, true),
        iconColor
      }
    })
  }, [carpools])

  // Get people needing rides from registrations
  const needRideRegistrations = useMemo(() => {
    return registrations.filter(r =>
      r.carpool_needs === 'need_ride' &&
      !carpools.some(c =>
        c.passengers?.some(p => p.passenger_id === r.user_id)
      )
    )
  }, [registrations, carpools])

  // Get all registrations with location data (for "show all riders" mode)
  const allRegistrationsWithLocations = useMemo(() => {
    return registrations.filter(r =>
      (r.carpool_departure_lat && r.carpool_departure_lng) ||
      (r.carpool_return_lat && r.carpool_return_lng)
    )
  }, [registrations])

  // Process rider locations for map display
  const ridersWithCoords = useMemo(() => {
    // Use all registrations with locations when showAllRiders is true, otherwise only those needing rides
    const sourceRegistrations = showAllRiders ? allRegistrationsWithLocations : needRideRegistrations
    return sourceRegistrations.map(reg => {
      // Support both 'profile' (from event_registrations) and 'user_profile' (legacy)
      const name = reg.profile?.full_name || reg.user_profile?.full_name || 'Unknown'
      const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
      const direction = reg.carpool_direction || 'both'
      const needsTo = direction === 'to' || direction === 'both'
      const needsFrom = direction === 'from' || direction === 'both'

      // Check if pickup and dropoff are the same location
      const sameLocation = reg.carpool_return_same_as_departure ||
        (reg.carpool_departure_lat === reg.carpool_return_lat &&
         reg.carpool_departure_lng === reg.carpool_return_lng)

      const hasPickup = needsTo && reg.carpool_departure_lat && reg.carpool_departure_lng
      const hasDropoff = needsFrom && reg.carpool_return_lat && reg.carpool_return_lng

      // Determine carpool status for display
      const carpoolNeeds = reg.carpool_needs
      const isPassenger = carpools.some(c => c.passengers?.some(p => p.passenger_id === reg.user_id))

      return {
        ...reg,
        name,
        initials,
        direction,
        needsTo,
        needsFrom,
        carpoolNeeds,
        isPassenger,
        sameLocation: sameLocation && hasPickup && hasDropoff,
        pickup: hasPickup ? {
          lat: parseFloat(reg.carpool_departure_lat),
          lng: parseFloat(reg.carpool_departure_lng),
          location: reg.carpool_departure_location
        } : null,
        dropoff: hasDropoff && !sameLocation ? {
          lat: parseFloat(reg.carpool_return_lat),
          lng: parseFloat(reg.carpool_return_lng),
          location: reg.carpool_return_location
        } : null
      }
    })
  }, [registrations, needRideRegistrations, allRegistrationsWithLocations, showAllRiders, carpools])

  // Get unregistered members (for admin pre-fill)
  const unregisteredMembers = useMemo(() => {
    if (!teamMembers.length) return []
    const registeredIds = new Set(registrations.map(r => r.user_id))
    return teamMembers.filter(m => !registeredIds.has(m.id) && m.is_active !== false)
  }, [teamMembers, registrations])

  // Collect all positions for bounds fitting (including riders)
  const allPositions = useMemo(() => {
    const positions = []
    if (venueCoords) {
      positions.push([venueCoords.lat, venueCoords.lng])
    }
    carpoolsWithCoords.forEach(c => {
      if (c.coords) {
        positions.push([c.coords.lat, c.coords.lng])
      }
      // Include return location coordinates
      if (c.returnCoords) {
        positions.push([c.returnCoords.lat, c.returnCoords.lng])
      }
    })
    // Add rider pickup/dropoff positions
    if (showRidersOnMap) {
      ridersWithCoords.forEach(r => {
        if (r.pickup) {
          positions.push([r.pickup.lat, r.pickup.lng])
        }
        if (r.dropoff) {
          positions.push([r.dropoff.lat, r.dropoff.lng])
        }
      })
    }
    return positions
  }, [venueCoords, carpoolsWithCoords, ridersWithCoords, showRidersOnMap, registrations])

  // Default center (Toronto area)
  const defaultCenter = [43.65, -79.38]
  const center = venueCoords
    ? [venueCoords.lat, venueCoords.lng]
    : allPositions.length > 0
      ? allPositions[0]
      : defaultCenter

  const handleAddCoords = (carpool) => {
    setEditingCarpool(carpool)
    setLocationInput(carpool.departure_location || '')
    setReturnLocationInput(carpool.final_location || '')
    setSearchResults([])
    setSelectedCoords(carpool.departure_lat && carpool.departure_lng
      ? { lat: carpool.departure_lat, lng: carpool.departure_lng }
      : null)
    setSelectedReturnCoords(carpool.final_lat && carpool.final_lng
      ? { lat: carpool.final_lat, lng: carpool.final_lng }
      : null)
  }

  // Debounced address search
  const handleInputChange = async (value) => {
    setLocationInput(value)
    setSelectedCoords(null)

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // First check if it's a Google Maps link
    const parsed = parseGoogleMapsLink(value)
    if (parsed.hasCoordinates) {
      setSelectedCoords({ lat: parsed.lat, lng: parsed.lng, fromLink: true })
      setSearchResults([])
      return
    }

    // Otherwise do address search with debounce
    if (value.length >= 3) {
      searchTimeoutRef.current = setTimeout(async () => {
        setIsSearching(true)
        const results = await searchAddress(value)
        setSearchResults(results)
        setIsSearching(false)
      }, 500)
    } else {
      setSearchResults([])
    }
  }

  const handleSelectResult = (result) => {
    setLocationInput(result.display_name)
    setSelectedCoords({ lat: result.lat, lng: result.lng, display_name: result.display_name })
    setSearchResults([])
  }

  const [isSaving, setIsSaving] = useState(false)

  const handleSaveCoords = async () => {
    if (!editingCarpool) {
      console.log('Save blocked: no editingCarpool')
      return
    }

    setIsSaving(true)
    try {
      if (onUpdateCarpoolCoords) {
        const updates = {}

        // Add departure coordinates if available
        if (selectedCoords) {
          updates.departure_location_link = selectedCoords.fromLink ? locationInput : null
          updates.departure_lat = selectedCoords.lat
          updates.departure_lng = selectedCoords.lng
        }

        // Add return location coordinates if available
        if (selectedReturnCoords) {
          updates.final_location_link = selectedReturnCoords.fromLink ? returnLocationInput : null
          updates.final_lat = selectedReturnCoords.lat
          updates.final_lng = selectedReturnCoords.lng
        }

        // Also update location text fields
        if (locationInput) {
          updates.departure_location = locationInput
        }
        if (returnLocationInput) {
          updates.final_location = returnLocationInput
        }

        console.log('Saving coords:', {
          carpoolId: editingCarpool.id,
          updates
        })
        await onUpdateCarpoolCoords(editingCarpool.id, updates)
      }
      setEditingCarpool(null)
      setLocationInput('')
      setReturnLocationInput('')
      setSelectedCoords(null)
      setSelectedReturnCoords(null)
      setSearchResults([])
    } catch (err) {
      console.error('Error saving coords:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setEditingCarpool(null)
    setEditingRider(null)
    setLocationInput('')
    setReturnLocationInput('')
    setSelectedCoords(null)
    setSelectedReturnCoords(null)
    setSearchResults([])
  }

  // Rider location editing
  const handleEditRider = (reg) => {
    setEditingRider({
      ...reg,
      editField: null, // Track which field is being edited: 'pickup' or 'dropoff'
      carpool_departure_location: reg.carpool_departure_location,
      carpool_departure_lat: reg.carpool_departure_lat,
      carpool_departure_lng: reg.carpool_departure_lng,
      carpool_return_location: reg.carpool_return_location,
      carpool_return_lat: reg.carpool_return_lat,
      carpool_return_lng: reg.carpool_return_lng,
      carpool_direction: reg.carpool_direction || 'both'
    })
    setEditingCarpool(null)
    setLocationInput('')
    setSearchResults([])
    setSelectedCoords(null)
  }

  const handleSaveRiderLocation = () => {
    if (!editingRider) return

    if (onUpdateRiderLocation) {
      // Build updates based on what was edited
      const updates = {}

      // Check if pickup was edited (compare to original)
      if (editingRider.carpool_departure_location !== editingRider.user_profile?.carpool_departure_location ||
          editingRider.carpool_departure_lat || editingRider.carpool_departure_lng) {
        updates.carpool_departure_location = editingRider.carpool_departure_location || null
        updates.carpool_departure_lat = editingRider.carpool_departure_lat || null
        updates.carpool_departure_lng = editingRider.carpool_departure_lng || null
      }

      // Check if dropoff was edited
      if (editingRider.carpool_return_location !== editingRider.user_profile?.carpool_return_location ||
          editingRider.carpool_return_lat || editingRider.carpool_return_lng) {
        updates.carpool_return_location = editingRider.carpool_return_location || null
        updates.carpool_return_lat = editingRider.carpool_return_lat || null
        updates.carpool_return_lng = editingRider.carpool_return_lng || null
      }

      // Always include the location fields that were in the edit form
      updates.carpool_departure_location = editingRider.carpool_departure_location || null
      updates.carpool_departure_lat = editingRider.carpool_departure_lat || null
      updates.carpool_departure_lng = editingRider.carpool_departure_lng || null
      updates.carpool_return_location = editingRider.carpool_return_location || null
      updates.carpool_return_lat = editingRider.carpool_return_lat || null
      updates.carpool_return_lng = editingRider.carpool_return_lng || null
      // Include direction if it was changed
      updates.carpool_direction = editingRider.carpool_direction || 'both'

      onUpdateRiderLocation(editingRider.id, updates)
    }
    setEditingRider(null)
    setLocationInput('')
    setSelectedCoords(null)
    setSearchResults([])
  }

  // Filter carpools by direction view
  const filteredCarpools = carpoolsWithCoords.filter(c => {
    if (directionView === 'all') return true
    const carpoolDir = c.carpool_direction || 'both'
    if (directionView === 'to') return carpoolDir === 'to' || carpoolDir === 'both'
    if (directionView === 'from') return carpoolDir === 'from' || carpoolDir === 'both'
    return true
  })

  const carpoolsOnMap = filteredCarpools.filter(c => c.coords)
  const carpoolsOffMap = filteredCarpools.filter(c => !c.coords)

  // Filter riders by direction view
  const filteredRiders = ridersWithCoords.filter(r => {
    if (directionView === 'all') return true
    if (directionView === 'to') return r.needsTo
    if (directionView === 'from') return r.needsFrom
    return true
  })

  // Show map even without coordinates so admins can add locations
  const hasNoLocationData = !venueCoords && allPositions.length === 0

  return (
    <div className="space-y-4">
      {/* No Location Data Banner */}
      {hasNoLocationData && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <Icon name="location" size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-amber-900">No locations on map yet</h4>
            <p className="text-sm text-amber-700 mt-1">
              Add carpool departure locations below to see them on the map.
              {carpoolsOffMap.length > 0 && ` ${carpoolsOffMap.length} carpool(s) need coordinates.`}
            </p>
          </div>
        </div>
      )}

      {/* Map Container */}
      <div className="relative rounded-lg overflow-hidden border border-slate-200 shadow-sm" style={{ height: hasNoLocationData ? '250px' : '400px' }}>
        <MapContainer
          center={center}
          zoom={12}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {allPositions.length > 1 && <FitBounds positions={allPositions} />}

          {/* Venue Marker */}
          {venueCoords && (
            <Marker position={[venueCoords.lat, venueCoords.lng]} icon={venueIcon}>
              <Popup>
                <div className="font-medium text-slate-900">{event?.venue || event?.title}</div>
                <div className="text-xs text-red-600 font-bold uppercase mt-1">Event Venue</div>
              </Popup>
            </Marker>
          )}

          {/* Carpool Markers */}
          {carpoolsOnMap.map((carpool, index) => {
            const carpoolDir = carpool.carpool_direction || 'both'
            const directionLabel = carpoolDir === 'to' ? '→ To event only' :
              carpoolDir === 'from' ? '← Return only' : '↔ Both ways'
            const directionColor = carpoolDir === 'to' ? 'bg-blue-100 text-blue-700' :
              carpoolDir === 'from' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'

            // Determine which markers to show based on direction filter
            const hasReturnCoords = carpool.returnCoords != null
            const hasDifferentReturnCoords = hasReturnCoords && (
              carpool.returnCoords.lat !== carpool.coords.lat ||
              carpool.returnCoords.lng !== carpool.coords.lng
            )

            // Determine marker positions based on view
            // 'to' view: show departure location
            // 'from' view: show return location (or departure if same/not set)
            // 'all' view: show both (departure + return if different)
            const showDeparture = directionView === 'all' || directionView === 'to'
            const showReturn = directionView === 'from' || (directionView === 'all' && hasDifferentReturnCoords)

            // For 'from' view: use return coords if available, otherwise departure
            const returnPosition = hasReturnCoords
              ? [carpool.returnCoords.lat, carpool.returnCoords.lng]
              : [carpool.coords.lat, carpool.coords.lng]

            return (
              <span key={`${carpool.id}-${carpool.coords?.lat}-${carpool.coords?.lng}-${carpool.returnCoords?.lat}-${carpool.returnCoords?.lng}`}>
                {/* Departure/Leaving From Location Marker */}
                {showDeparture && (
                  <Marker
                    position={[carpool.coords.lat, carpool.coords.lng]}
                    icon={carpool.icon}
                  >
                    <Popup>
                      <div className="min-w-[220px]">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-bold text-slate-900">
                            Carpool #{index + 1}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${directionColor}`}>
                            {directionLabel}
                          </span>
                        </div>
                        <div className="text-sm text-slate-600 mb-2">
                          <span className="font-medium">Driver:</span> {carpool.driver?.full_name}
                        </div>
                        <div className="text-sm text-slate-600 mb-2">
                          <span className="font-medium text-blue-600">🚗 Leaving From:</span>
                          <div className="text-xs mt-0.5 pl-4">{carpool.departure_location || 'Not set'}</div>
                        </div>
                        <div className="text-sm text-slate-600 mb-2">
                          <span className="font-medium text-purple-600">🏠 Returning To:</span>
                          <div className="text-xs mt-0.5 pl-4">{carpool.final_location || carpool.departure_location || 'Same as leaving'}</div>
                        </div>
                        <div className="text-sm text-slate-600 mb-2">
                          <span className="font-medium">Seats:</span> {carpool.passengers?.length || 0} / {carpool.total_seats}
                        </div>
                        {carpool.departure_time && (
                          <div className="text-sm text-slate-600 mb-2">
                            <span className="font-medium">Departs:</span> {carpool.departure_time}
                          </div>
                        )}
                        {carpool.passengers?.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-slate-200">
                            <div className="text-xs font-medium text-slate-500 mb-1">Passengers:</div>
                            <ul className="text-xs text-slate-600 space-y-0.5">
                              {carpool.passengers.map(p => (
                                <li key={p.id}>• {p.passenger?.full_name}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                )}

                {/* Return/Returning To Location Marker */}
                {showReturn && (
                  <Marker
                    position={returnPosition}
                    icon={carpool.returnIcon}
                  >
                    <Popup>
                      <div className="min-w-[220px]">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-bold text-slate-900">
                            Carpool #{index + 1}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-100 text-purple-700">
                            Return Trip
                          </span>
                        </div>
                        <div className="text-sm text-slate-600 mb-2">
                          <span className="font-medium">Driver:</span> {carpool.driver?.full_name}
                        </div>
                        <div className="text-sm text-slate-600 mb-2">
                          <span className="font-medium text-blue-600">🚗 Leaving From:</span>
                          <div className="text-xs mt-0.5 pl-4">{carpool.departure_location || 'Not set'}</div>
                        </div>
                        <div className="text-sm text-slate-600 mb-2">
                          <span className="font-medium text-purple-600">🏠 Returning To:</span>
                          <div className="text-xs mt-0.5 pl-4">{carpool.final_location || carpool.departure_location || 'Same as leaving'}</div>
                        </div>
                        <div className="text-sm text-slate-600 mb-2">
                          <span className="font-medium">Seats:</span> {carpool.passengers?.length || 0} / {carpool.total_seats}
                        </div>
                        {carpool.passengers?.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-slate-200">
                            <div className="text-xs font-medium text-slate-500 mb-1">Passengers:</div>
                            <ul className="text-xs text-slate-600 space-y-0.5">
                              {carpool.passengers.map(p => (
                                <li key={p.id}>• {p.passenger?.full_name}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                )}

                {/* Line connecting pickup to return if different locations - only show in 'all' view */}
                {directionView === 'all' && hasDifferentReturnCoords && (
                  <Polyline
                    positions={[
                      [carpool.coords.lat, carpool.coords.lng],
                      [carpool.returnCoords.lat, carpool.returnCoords.lng]
                    ]}
                    pathOptions={{
                      color: carpool.iconColor,
                      weight: 2,
                      dashArray: '8, 8',
                      opacity: 0.5
                    }}
                  />
                )}
              </span>
            )
          })}

          {/* Rider Markers - People Needing Rides */}
          {showRidersOnMap && filteredRiders.map(rider => {
            const directionLabel = rider.direction === 'to' ? 'To event only' :
              rider.direction === 'from' ? 'Return only' : 'Both ways'

            // Determine which markers to show based on direction filter
            const showPickup = directionView === 'all' || directionView === 'to'
            const showDropoff = directionView === 'from' || (directionView === 'all' && rider.dropoff && !rider.sameLocation)

            // For 'from' view: use dropoff coords if available, otherwise pickup
            const dropoffPosition = rider.dropoff
              ? [rider.dropoff.lat, rider.dropoff.lng]
              : rider.pickup
                ? [rider.pickup.lat, rider.pickup.lng]
                : null

            return (
              <span key={`${rider.id}-${rider.pickup?.lat}-${rider.pickup?.lng}-${rider.dropoff?.lat}-${rider.dropoff?.lng}`}>
                {/* Pickup marker (blue) - show when viewing 'all' or 'to' */}
                {showPickup && rider.pickup && (
                  <Marker
                    position={[rider.pickup.lat, rider.pickup.lng]}
                    icon={createRiderIcon(rider.sameLocation ? 'both' : 'pickup', rider.initials)}
                  >
                    <Popup>
                      <div className="min-w-[180px]">
                        <div className="font-bold text-slate-900">{rider.name}</div>
                        <div className={`text-xs font-medium mb-2 ${
                          rider.isPassenger ? 'text-green-600' :
                          rider.carpoolNeeds === 'need_ride' ? 'text-amber-600' :
                          rider.carpoolNeeds === 'can_drive' ? 'text-blue-600' :
                          'text-slate-500'
                        }`}>
                          {rider.isPassenger ? '✓ Has ride' :
                           rider.carpoolNeeds === 'need_ride' ? 'Needs a ride' :
                           rider.carpoolNeeds === 'can_drive' ? 'Can drive' :
                           'Has own transport'}
                        </div>
                        <div className="text-sm text-slate-600 mb-1">
                          <span className="text-blue-600 font-medium">
                            {rider.sameLocation ? '📍 Pickup & Drop-off' : '📍 Pickup'}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mb-2">{rider.pickup.location}</div>
                        <div className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-600">{directionLabel}</div>
                      </div>
                    </Popup>
                  </Marker>
                )}

                {/* Return marker (purple) */}
                {showDropoff && dropoffPosition && (
                  <Marker
                    position={dropoffPosition}
                    icon={createRiderIcon('dropoff', rider.initials)}
                  >
                    <Popup>
                      <div className="min-w-[180px]">
                        <div className="font-bold text-slate-900">{rider.name}</div>
                        <div className={`text-xs font-medium mb-2 ${
                          rider.isPassenger ? 'text-green-600' :
                          rider.carpoolNeeds === 'need_ride' ? 'text-amber-600' :
                          rider.carpoolNeeds === 'can_drive' ? 'text-blue-600' :
                          'text-slate-500'
                        }`}>
                          {rider.isPassenger ? '✓ Has ride' :
                           rider.carpoolNeeds === 'need_ride' ? 'Needs a ride' :
                           rider.carpoolNeeds === 'can_drive' ? 'Can drive' :
                           'Has own transport'}
                        </div>
                        <div className="text-sm text-slate-600 mb-1">
                          <span className="text-purple-600 font-medium">📍 Return Drop-off</span>
                        </div>
                        <div className="text-xs text-slate-500 mb-2">
                          {rider.dropoff?.location || rider.pickup?.location || 'Same as pickup'}
                        </div>
                        <div className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-600">{directionLabel}</div>
                      </div>
                    </Popup>
                  </Marker>
                )}

                {/* Line connecting pickup to dropoff if different - only show in 'all' view */}
                {directionView === 'all' && rider.pickup && rider.dropoff && !rider.sameLocation && (
                  <Polyline
                    positions={[
                      [rider.pickup.lat, rider.pickup.lng],
                      [rider.dropoff.lat, rider.dropoff.lng]
                    ]}
                    pathOptions={{
                      color: '#64748b',
                      weight: 2,
                      dashArray: '5, 5',
                      opacity: 0.6
                    }}
                  />
                )}
              </span>
            )
          })}
        </MapContainer>

        {/* Legend - only show when there are markers */}
        {!hasNoLocationData && (
          <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-3 z-[1000]">
            <div className="text-xs font-bold text-slate-700 mb-2">Legend</div>
            <div className="space-y-1.5">
              {venueCoords && (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white shadow-sm" />
                  <span className="text-xs text-slate-600">Event Venue</span>
                </div>
              )}
              {carpoolsOnMap.length > 0 && (
                <>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-sm flex items-center justify-center text-white text-[8px] font-bold">#</div>
                    <span className="text-xs text-slate-600">Leaving from ({carpoolsOnMap.length})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 rounded-full bg-blue-400 border-2 border-white shadow-sm flex items-center justify-center text-white text-[7px] font-bold opacity-85">R</div>
                    <span className="text-xs text-slate-600">Returning to</span>
                  </div>
                </>
              )}
              {showRidersOnMap && filteredRiders.some(r => r.pickup) && (
                <>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500 border border-white shadow-sm" />
                    <span className="text-xs text-slate-600">Rider to event</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-purple-500 border border-white shadow-sm" />
                    <span className="text-xs text-slate-600">Rider return</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500 border border-white shadow-sm" />
                    <span className="text-xs text-slate-600">Same location</span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Map Controls */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Direction View Toggle */}
        <div className="flex bg-slate-100 p-0.5 rounded-lg">
          {[
            { value: 'all', label: 'All' },
            { value: 'to', label: '🚗 Leaving' },
            { value: 'from', label: '🏠 Returning' }
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setDirectionView(opt.value)}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                directionView === opt.value
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showRidersOnMap}
            onChange={(e) => setShowRidersOnMap(e.target.checked)}
            className="rounded border-slate-300 text-primary-600"
          />
          <span className="text-sm text-slate-600">Show riders on map</span>
        </label>

        {showRidersOnMap && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showAllRiders}
              onChange={(e) => setShowAllRiders(e.target.checked)}
              className="rounded border-slate-300 text-primary-600"
            />
            <span className="text-sm text-slate-600">Include all riders</span>
          </label>
        )}

        {filteredRiders.filter(r => r.pickup || r.dropoff).length > 0 && showRidersOnMap && (
          <span className="text-xs text-green-600 flex items-center gap-1">
            <Icon name="check" size={14} />
            {filteredRiders.filter(r => r.pickup || r.dropoff).length} {showAllRiders ? 'total' : 'needing rides'}
          </span>
        )}
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-slate-900">{carpools.length}</div>
          <div className="text-xs text-slate-500">Carpools</div>
        </div>
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-600">
            {carpools.reduce((sum, c) => sum + (c.passengers?.length || 0), 0)}
          </div>
          <div className="text-xs text-slate-500">Passengers</div>
        </div>
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-primary-600">
            {carpools.reduce((sum, c) => sum + (c.total_seats - (c.passengers?.length || 0)), 0)}
          </div>
          <div className="text-xs text-slate-500">Seats Available</div>
        </div>
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-amber-600">{needRideRegistrations.length}</div>
          <div className="text-xs text-slate-500">Need Rides</div>
        </div>
      </div>

      {/* Carpools Without Coordinates */}
      {isAdmin && carpoolsOffMap.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h4 className="font-bold text-amber-900 flex items-center gap-2 mb-3">
            <Icon name="warning" size={18} />
            Carpools Missing Map Coordinates
          </h4>
          <div className="space-y-3">
            {carpoolsOffMap.map((carpool) => (
              <div key={carpool.id} className="bg-white rounded-lg p-3 border border-amber-100">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900">{carpool.driver?.full_name}'s carpool</div>
                    <div className="text-sm text-slate-600 flex items-center gap-1">
                      <span className="text-blue-600">Pickup:</span> {carpool.departure_location || <span className="text-slate-400 italic">Not set</span>}
                    </div>
                    <div className="text-sm text-slate-600 flex items-center gap-1">
                      <span className="text-purple-600">Return:</span> {carpool.final_location || <span className="text-slate-400 italic">Not set</span>}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      {carpool.passengers?.length || 0} / {carpool.total_seats} seats filled
                    </div>
                  </div>
                  {editingCarpool?.id === carpool.id ? (
                    <div className="flex flex-col gap-3 min-w-[320px]">
                      {/* Pickup/Departure Location */}
                      <AddressSearchInput
                        value={locationInput}
                        onChange={(value, coords) => {
                          setLocationInput(value)
                          if (coords) {
                            setSelectedCoords({ lat: coords.lat, lng: coords.lng })
                          } else {
                            // Check if it's a Google Maps link
                            const parsed = parseGoogleMapsLink(value)
                            if (parsed.hasCoordinates) {
                              setSelectedCoords({ lat: parsed.lat, lng: parsed.lng, fromLink: true })
                            } else {
                              setSelectedCoords(null)
                            }
                          }
                        }}
                        label="Pickup Location"
                        placeholder="Where driver picks up passengers"
                        showCoords={true}
                        savedLocations={savedLocations}
                        showMapPicker={true}
                      />

                      {/* Return Location */}
                      <AddressSearchInput
                        value={returnLocationInput}
                        onChange={(value, coords) => {
                          setReturnLocationInput(value)
                          if (coords) {
                            setSelectedReturnCoords({ lat: coords.lat, lng: coords.lng })
                          } else {
                            // Check if it's a Google Maps link
                            const parsed = parseGoogleMapsLink(value)
                            if (parsed.hasCoordinates) {
                              setSelectedReturnCoords({ lat: parsed.lat, lng: parsed.lng, fromLink: true })
                            } else {
                              setSelectedReturnCoords(null)
                            }
                          }
                        }}
                        label="Return Location"
                        placeholder="Where to drop off after event (optional)"
                        showCoords={true}
                        savedLocations={savedLocations}
                        showMapPicker={true}
                      />

                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveCoords}
                          className="btn btn-primary btn-sm text-xs"
                          disabled={isSaving}
                        >
                          {isSaving ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="btn btn-ghost btn-sm text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleAddCoords(carpool)}
                      className="btn btn-ghost btn-sm text-xs text-primary-600"
                    >
                      <Icon name="location" size={14} />
                      Add Location
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* People Needing Rides */}
      {needRideRegistrations.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <button
            onClick={() => setShowNeedRide(!showNeedRide)}
            className="w-full flex items-center justify-between text-left"
          >
            <h4 className="font-bold text-slate-900 flex items-center gap-2">
              <Icon name="car" size={18} className="text-amber-600" />
              People Needing Rides ({needRideRegistrations.length})
            </h4>
            <Icon
              name={showNeedRide ? 'expand_less' : 'expand_more'}
              size={20}
              className="text-slate-400"
            />
          </button>

          {showNeedRide && (
            <div className="mt-3 space-y-2">
              {needRideRegistrations.map((reg) => {
                const direction = reg.carpool_direction || 'both'
                const needsTo = direction === 'to' || direction === 'both'
                const needsFrom = direction === 'from' || direction === 'both'
                const directionLabel = direction === 'to' ? '→ To event' :
                  direction === 'from' ? '← Return' : '↔ Both ways'
                const directionColor = direction === 'to' ? 'bg-blue-100 text-blue-700' :
                  direction === 'from' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'

                return (
                  <div
                    key={reg.id}
                    className="bg-white rounded-lg p-3 border border-slate-100"
                  >
                    {editingRider?.id === reg.id ? (
                      /* Edit Mode */
                      (() => {
                        // Use editingRider's direction for showing location fields
                        const editDirection = editingRider.carpool_direction || 'both'
                        const editNeedsTo = editDirection === 'to' || editDirection === 'both'
                        const editNeedsFrom = editDirection === 'from' || editDirection === 'both'
                        const editDirectionLabel = editDirection === 'to' ? '→ To event' :
                          editDirection === 'from' ? '← Return' : '↔ Both ways'
                        const editDirectionColor = editDirection === 'to' ? 'bg-blue-100 text-blue-700' :
                          editDirection === 'from' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'

                        return (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <Icon name="person" size={16} className="text-amber-600" />
                              </div>
                              <div className="font-medium text-slate-900">
                                {reg.profile?.full_name || reg.user_profile?.full_name || 'Unknown'}
                              </div>
                            </div>

                            {/* Direction Selector */}
                            <div>
                              <label className="text-xs font-medium text-slate-600 mb-1 block">Ride Direction</label>
                              <div className="flex gap-1">
                                {[
                                  { value: 'to', label: '→ To', desc: 'To event' },
                                  { value: 'from', label: '← Return', desc: 'Return back' },
                                  { value: 'both', label: '↔ Both', desc: 'Both ways' }
                                ].map((opt) => (
                                  <label
                                    key={opt.value}
                                    className={`flex-1 text-center px-2 py-1.5 rounded-md cursor-pointer border text-xs font-medium transition-all ${
                                      editingRider.carpool_direction === opt.value
                                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                                    }`}
                                  >
                                    <input
                                      type="radio"
                                      name={`edit_direction_${reg.id}`}
                                      value={opt.value}
                                      checked={editingRider.carpool_direction === opt.value}
                                      onChange={(e) => setEditingRider(prev => ({
                                        ...prev,
                                        carpool_direction: e.target.value
                                      }))}
                                      className="sr-only"
                                    />
                                    {opt.label}
                                  </label>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-3">
                              {/* Pickup Location - for rides TO event */}
                              {editNeedsTo && (
                                <AddressSearchInput
                                  value={editingRider.carpool_departure_location || ''}
                                  onChange={(value, coords) => {
                                    setEditingRider(prev => ({
                                      ...prev,
                                      carpool_departure_location: value,
                                      carpool_departure_lat: coords?.lat || null,
                                      carpool_departure_lng: coords?.lng || null
                                    }))
                                  }}
                                  label="Pickup Location (to event)"
                                  placeholder="Search address or use my location"
                                  savedLocations={savedLocations}
                                  showMapPicker={true}
                                />
                              )}

                              {/* Return Location - for rides returning after event */}
                              {editNeedsFrom && (
                                <AddressSearchInput
                                  value={editingRider.carpool_return_location || ''}
                                  onChange={(value, coords) => {
                                    setEditingRider(prev => ({
                                      ...prev,
                                      carpool_return_location: value,
                                      carpool_return_lat: coords?.lat || null,
                                      carpool_return_lng: coords?.lng || null
                                    }))
                                  }}
                                  label="Return Drop-off Location"
                                  placeholder="Search address or use my location"
                                  savedLocations={savedLocations}
                                  showMapPicker={true}
                                />
                              )}
                            </div>

                            <div className="flex gap-2">
                              <button
                                onClick={handleSaveRiderLocation}
                                className="btn btn-primary btn-sm text-xs"
                              >
                                Save
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="btn btn-ghost btn-sm text-xs"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )
                      })()
                    ) : (
                      /* View Mode */
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <Icon name="person" size={16} className="text-amber-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-900 truncate">
                                {reg.profile?.full_name || reg.user_profile?.full_name || 'Unknown'}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${directionColor}`}>
                                {directionLabel}
                              </span>
                            </div>
                          </div>
                          {isAdmin && (
                            <button
                              onClick={() => handleEditRider(reg)}
                              className="btn btn-ghost btn-sm text-xs text-primary-600 flex-shrink-0"
                            >
                              <Icon name="edit" size={14} />
                              Edit
                            </button>
                          )}
                        </div>
                        {/* Location details */}
                        <div className="ml-11 space-y-1">
                          {needsTo && (
                            <div className="text-xs text-slate-500">
                              <span className="text-slate-400">Pickup:</span>{' '}
                              {reg.carpool_departure_location || <span className="italic text-slate-400">Not set</span>}
                            </div>
                          )}
                          {needsFrom && (
                            <div className="text-xs text-slate-500">
                              <span className="text-slate-400">Drop-off:</span>{' '}
                              {reg.carpool_return_location || (
                                reg.carpool_return_same_as_departure && reg.carpool_departure_location
                                  ? <span className="italic">Same as pickup</span>
                                  : <span className="italic text-slate-400">Not set</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Unregistered Members - Admin can pre-fill locations */}
      {isAdmin && unregisteredMembers.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <button
            onClick={() => setShowUnregistered(!showUnregistered)}
            className="w-full flex items-center justify-between text-left"
          >
            <h4 className="font-bold text-blue-900 flex items-center gap-2">
              <Icon name="users" size={18} className="text-blue-600" />
              Not Yet Registered ({unregisteredMembers.length})
            </h4>
            <Icon
              name={showUnregistered ? 'chevron-up' : 'chevron-down'}
              size={20}
              className="text-blue-400"
            />
          </button>
          <p className="text-xs text-blue-600 mt-1">
            Pre-fill carpool info for members who haven't registered yet
          </p>

          {showUnregistered && (
            <div className="mt-3 space-y-2">
              {unregisteredMembers.map((member) => (
                <div
                  key={member.id}
                  className="bg-white rounded-lg p-3 border border-blue-100"
                >
                  {addingMemberLocation?.id === member.id ? (
                    /* Add Location Mode */
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-blue-600">
                            {member.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?'}
                          </span>
                        </div>
                        <span className="font-medium text-slate-900">{member.full_name}</span>
                      </div>

                      {/* Carpool needs selection */}
                      <div>
                        <label className="text-xs font-medium text-slate-600 block mb-1">Transportation needs</label>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { value: 'need_ride', label: 'Needs a ride' },
                            { value: 'can_drive', label: 'Can drive' },
                            { value: 'not_needed', label: 'Has transport' },
                          ].map(opt => (
                            <label
                              key={opt.value}
                              className={`px-3 py-1.5 text-xs rounded-lg border cursor-pointer transition-colors ${
                                memberLocationForm.carpool_needs === opt.value
                                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                                  : 'border-slate-200 hover:border-slate-300 text-slate-600'
                              }`}
                            >
                              <input
                                type="radio"
                                name="carpool_needs"
                                value={opt.value}
                                checked={memberLocationForm.carpool_needs === opt.value}
                                onChange={(e) => setMemberLocationForm(prev => ({ ...prev, carpool_needs: e.target.value }))}
                                className="sr-only"
                              />
                              {opt.label}
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Direction selection */}
                      {(memberLocationForm.carpool_needs === 'need_ride' || memberLocationForm.carpool_needs === 'can_drive') && (
                        <div>
                          <label className="text-xs font-medium text-slate-600 block mb-1">Direction</label>
                          <div className="flex flex-wrap gap-2">
                            {[
                              { value: 'to', label: '→ To event' },
                              { value: 'from', label: '← Return back' },
                              { value: 'both', label: '↔ Both ways' },
                            ].map(opt => (
                              <label
                                key={opt.value}
                                className={`px-3 py-1.5 text-xs rounded-lg border cursor-pointer transition-colors ${
                                  memberLocationForm.carpool_direction === opt.value
                                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                                    : 'border-slate-200 hover:border-slate-300 text-slate-600'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name="carpool_direction"
                                  value={opt.value}
                                  checked={memberLocationForm.carpool_direction === opt.value}
                                  onChange={(e) => setMemberLocationForm(prev => ({ ...prev, carpool_direction: e.target.value }))}
                                  className="sr-only"
                                />
                                {opt.label}
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Pickup location */}
                      {(memberLocationForm.carpool_needs === 'need_ride' || memberLocationForm.carpool_needs === 'can_drive') &&
                       (memberLocationForm.carpool_direction === 'to' || memberLocationForm.carpool_direction === 'both') && (
                        <AddressSearchInput
                          value={memberLocationForm.pickup}
                          onChange={(value, coords) => {
                            const updates = {
                              pickup: value,
                              pickup_lat: coords?.lat || null,
                              pickup_lng: coords?.lng || null
                            }
                            if (memberLocationForm.same_as_pickup) {
                              updates.dropoff = value
                              updates.dropoff_lat = coords?.lat || null
                              updates.dropoff_lng = coords?.lng || null
                            }
                            setMemberLocationForm(prev => ({ ...prev, ...updates }))
                          }}
                          label="Pickup location"
                          placeholder="Search for address..."
                          savedLocations={savedLocations}
                          showMapPicker={true}
                        />
                      )}

                      {/* Same as pickup checkbox */}
                      {(memberLocationForm.carpool_needs === 'need_ride' || memberLocationForm.carpool_needs === 'can_drive') &&
                       memberLocationForm.carpool_direction === 'both' && (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={memberLocationForm.same_as_pickup}
                            onChange={(e) => {
                              const checked = e.target.checked
                              setMemberLocationForm(prev => ({
                                ...prev,
                                same_as_pickup: checked,
                                ...(checked ? {
                                  dropoff: prev.pickup,
                                  dropoff_lat: prev.pickup_lat,
                                  dropoff_lng: prev.pickup_lng
                                } : {})
                              }))
                            }}
                            className="rounded border-slate-300 text-blue-600"
                          />
                          <span className="text-xs text-slate-600">Drop-off same as pickup</span>
                        </label>
                      )}

                      {/* Dropoff location */}
                      {(memberLocationForm.carpool_needs === 'need_ride' || memberLocationForm.carpool_needs === 'can_drive') &&
                       (memberLocationForm.carpool_direction === 'from' || (memberLocationForm.carpool_direction === 'both' && !memberLocationForm.same_as_pickup)) && (
                        <AddressSearchInput
                          value={memberLocationForm.dropoff}
                          onChange={(value, coords) => {
                            setMemberLocationForm(prev => ({
                              ...prev,
                              dropoff: value,
                              dropoff_lat: coords?.lat || null,
                              dropoff_lng: coords?.lng || null
                            }))
                          }}
                          label="Drop-off location"
                          placeholder="Search for address..."
                          savedLocations={savedLocations}
                          showMapPicker={true}
                        />
                      )}

                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={async () => {
                            if (onCreateRegistration) {
                              const regData = {
                                user_id: member.id,
                                event_id: event.id,
                                carpool_needs: memberLocationForm.carpool_needs,
                                carpool_direction: memberLocationForm.carpool_direction,
                                carpool_departure_location: memberLocationForm.pickup || null,
                                carpool_departure_lat: memberLocationForm.pickup_lat,
                                carpool_departure_lng: memberLocationForm.pickup_lng,
                                carpool_return_location: memberLocationForm.same_as_pickup ? memberLocationForm.pickup : (memberLocationForm.dropoff || null),
                                carpool_return_lat: memberLocationForm.same_as_pickup ? memberLocationForm.pickup_lat : memberLocationForm.dropoff_lat,
                                carpool_return_lng: memberLocationForm.same_as_pickup ? memberLocationForm.pickup_lng : memberLocationForm.dropoff_lng,
                                carpool_return_same_as_departure: memberLocationForm.same_as_pickup,
                                status: 'draft' // Mark as draft until member confirms
                              }
                              try {
                                await onCreateRegistration(regData)
                                // Only reset form on success
                                setAddingMemberLocation(null)
                                setMemberLocationForm({
                                  carpool_needs: 'need_ride',
                                  carpool_direction: 'both',
                                  pickup: '',
                                  pickup_lat: null,
                                  pickup_lng: null,
                                  dropoff: '',
                                  dropoff_lat: null,
                                  dropoff_lng: null,
                                  same_as_pickup: true
                                })
                              } catch (err) {
                                // Error is already handled in the callback with toast
                                console.error('Failed to save registration:', err)
                              }
                            }
                          }}
                          className="btn btn-primary btn-sm text-xs"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setAddingMemberLocation(null)
                            setMemberLocationForm({
                              carpool_needs: 'need_ride',
                              carpool_direction: 'both',
                              pickup: '',
                              pickup_lat: null,
                              pickup_lng: null,
                              dropoff: '',
                              dropoff_lat: null,
                              dropoff_lng: null,
                              same_as_pickup: true
                            })
                          }}
                          className="btn btn-ghost btn-sm text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Member Row */
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-blue-600">
                          {member.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-slate-900 truncate block">
                          {member.full_name}
                        </span>
                        <span className="text-xs text-slate-400">Not registered</span>
                      </div>
                      <button
                        onClick={() => setAddingMemberLocation(member)}
                        className="btn btn-ghost btn-sm text-xs text-blue-600 flex-shrink-0"
                      >
                        <Icon name="plus" size={14} />
                        Add Info
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
