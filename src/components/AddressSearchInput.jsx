import { useState, useRef, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import Icon from './Icon'

// Fix Leaflet default marker icon issue
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// Component to handle map clicks
function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng)
    }
  })
  return null
}

// Component to recenter map when marker changes
function MapRecenter({ position }) {
  const map = useMap()
  useEffect(() => {
    if (position) {
      map.setView(position, map.getZoom())
    }
  }, [position, map])
  return null
}

// Component to fix map size when modal opens
function MapResizer() {
  const map = useMap()
  useEffect(() => {
    // Small delay to ensure modal is fully rendered
    const timer = setTimeout(() => {
      map.invalidateSize()
    }, 100)
    return () => clearTimeout(timer)
  }, [map])
  return null
}

// Component to update map center when searching
function MapCenterUpdater({ center, zoom }) {
  const map = useMap()
  useEffect(() => {
    if (center) {
      map.setView(center, zoom || 13)
    }
  }, [center, zoom, map])
  return null
}

// Reverse geocode coordinates to address using Nominatim
const reverseGeocode = async (lat, lng) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?` +
      `format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'TeamOrganizationApp/1.0'
        }
      }
    )

    if (!response.ok) return null

    const data = await response.json()
    if (!data || data.error) return null

    // Create a shorter display name
    const shortName = [
      data.address?.road || data.address?.neighbourhood,
      data.address?.city || data.address?.town || data.address?.village,
      data.address?.state
    ].filter(Boolean).join(', ')

    return {
      display_name: data.display_name,
      short_name: shortName || data.display_name.split(',').slice(0, 3).join(','),
      lat: parseFloat(data.lat),
      lng: parseFloat(data.lon)
    }
  } catch (error) {
    console.error('Reverse geocoding error:', error)
    return null
  }
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
      address: item.address,
      // Create a shorter display name
      short_name: [
        item.address?.road,
        item.address?.city || item.address?.town || item.address?.village,
        item.address?.state
      ].filter(Boolean).join(', ')
    }))
  } catch (error) {
    console.error('Geocoding error:', error)
    return []
  }
}

/**
 * AddressSearchInput - A text input with address autocomplete
 *
 * Props:
 * - value: Current input value
 * - onChange: Called with (value, coords) when value changes
 *   - coords is { lat, lng } if a result was selected, null otherwise
 * - placeholder: Input placeholder
 * - label: Optional label text
 * - required: Show required indicator
 * - className: Additional classes for the wrapper
 * - showCoords: Show coordinates below input when selected
 * - shortNames: Use shorter display names in dropdown (default true)
 * - savedLocations: Array of saved locations to show in dropdown
 * - showMapPicker: Show "Choose on Map" button (default false)
 * - onSelectSavedLocation: Called with location object when saved location selected
 */
export default function AddressSearchInput({
  value,
  onChange,
  placeholder = 'Search for an address...',
  label,
  required = false,
  className = '',
  showCoords = false,
  shortNames = true,
  savedLocations = [],
  showMapPicker = false,
  onSelectSavedLocation
}) {
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedCoords, setSelectedCoords] = useState(null)
  const [isFocused, setIsFocused] = useState(false)
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [locationError, setLocationError] = useState(null)
  const [showSavedDropdown, setShowSavedDropdown] = useState(false)
  const [showMapModal, setShowMapModal] = useState(false)
  const [mapMarker, setMapMarker] = useState(null)
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false)
  const [mapSearchQuery, setMapSearchQuery] = useState('')
  const [mapSearchResults, setMapSearchResults] = useState([])
  const [isMapSearching, setIsMapSearching] = useState(false)
  const [mapCenter, setMapCenter] = useState([40.75, -74.0]) // Default to NYC/tri-state area
  const searchTimeoutRef = useRef(null)
  const mapSearchTimeoutRef = useRef(null)
  const wrapperRef = useRef(null)

  // Default center for tri-state NY area
  const DEFAULT_CENTER = [40.75, -74.0]

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setSearchResults([])
        setShowSavedDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle map click - reverse geocode the clicked location
  const handleMapClick = async (lat, lng) => {
    setMapMarker({ lat, lng })
    setIsReverseGeocoding(true)

    const result = await reverseGeocode(lat, lng)
    setIsReverseGeocoding(false)

    if (result) {
      setMapMarker({ lat: result.lat, lng: result.lng, address: result.short_name || result.display_name })
    } else {
      setMapMarker({ lat, lng, address: `${lat.toFixed(5)}, ${lng.toFixed(5)}` })
    }
  }

  // Confirm map selection
  const handleConfirmMapSelection = () => {
    if (mapMarker) {
      onChange(mapMarker.address || `${mapMarker.lat.toFixed(5)}, ${mapMarker.lng.toFixed(5)}`, {
        lat: mapMarker.lat,
        lng: mapMarker.lng
      })
      setSelectedCoords({ lat: mapMarker.lat, lng: mapMarker.lng })
      setShowMapModal(false)
      setMapMarker(null)
      setMapSearchQuery('')
      setMapSearchResults([])
    }
  }

  // Handle map search
  const handleMapSearch = async (query) => {
    setMapSearchQuery(query)

    // Clear previous timeout
    if (mapSearchTimeoutRef.current) {
      clearTimeout(mapSearchTimeoutRef.current)
    }

    if (query.length < 3) {
      setMapSearchResults([])
      return
    }

    // Debounced search
    mapSearchTimeoutRef.current = setTimeout(async () => {
      setIsMapSearching(true)
      const results = await searchAddress(query)
      setMapSearchResults(results)
      setIsMapSearching(false)
    }, 400)
  }

  // Select a search result on the map
  const handleMapSearchSelect = (result) => {
    setMapCenter([result.lat, result.lng])
    setMapMarker({ lat: result.lat, lng: result.lng, address: result.short_name || result.display_name })
    setMapSearchResults([])
    setMapSearchQuery(result.short_name || result.display_name.split(',').slice(0, 2).join(','))
  }

  // Handle saved location selection
  const handleSelectSavedLocation = (location) => {
    onChange(location.address, {
      lat: parseFloat(location.lat),
      lng: parseFloat(location.lng)
    })
    setSelectedCoords({ lat: parseFloat(location.lat), lng: parseFloat(location.lng) })
    setShowSavedDropdown(false)
    if (onSelectSavedLocation) {
      onSelectSavedLocation(location)
    }
  }

  const handleInputChange = async (inputValue) => {
    onChange(inputValue, null)
    setSelectedCoords(null)

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // Debounced search
    if (inputValue.length >= 3) {
      searchTimeoutRef.current = setTimeout(async () => {
        setIsSearching(true)
        const results = await searchAddress(inputValue)
        setSearchResults(results)
        setIsSearching(false)
      }, 500)
    } else {
      setSearchResults([])
    }
  }

  const handleSelectResult = (result) => {
    const displayValue = shortNames && result.short_name
      ? result.short_name
      : result.display_name.split(',').slice(0, 3).join(',')

    onChange(displayValue, { lat: result.lat, lng: result.lng })
    setSelectedCoords({ lat: result.lat, lng: result.lng })
    setSearchResults([])
  }

  const handleUseMyLocation = async () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser')
      return
    }

    setIsGettingLocation(true)
    setLocationError(null)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords

        // Reverse geocode to get address
        const result = await reverseGeocode(latitude, longitude)

        if (result) {
          const displayValue = shortNames && result.short_name
            ? result.short_name
            : result.display_name.split(',').slice(0, 3).join(',')

          onChange(displayValue, { lat: result.lat, lng: result.lng })
          setSelectedCoords({ lat: result.lat, lng: result.lng })
        } else {
          // If reverse geocode fails, still use coordinates
          onChange(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`, { lat: latitude, lng: longitude })
          setSelectedCoords({ lat: latitude, lng: longitude })
        }

        setIsGettingLocation(false)
      },
      (error) => {
        let message = 'Unable to get your location'
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Location access denied. Please enable location permissions.'
            break
          case error.POSITION_UNAVAILABLE:
            message = 'Location information unavailable'
            break
          case error.TIMEOUT:
            message = 'Location request timed out'
            break
        }
        setLocationError(message)
        setIsGettingLocation(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
  }

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Saved Locations Dropdown */}
      {savedLocations.length > 0 && (
        <div className="relative mb-2">
          <button
            type="button"
            onClick={() => setShowSavedDropdown(!showSavedDropdown)}
            className="w-full flex items-center justify-between px-3 py-2 text-sm text-left bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <span className="flex items-center gap-2 text-slate-600">
              <Icon name="star" size={14} className="text-amber-500" />
              Choose from saved locations
            </span>
            <Icon name={showSavedDropdown ? 'chevron-up' : 'chevron-down'} size={16} className="text-slate-400" />
          </button>

          {showSavedDropdown && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-[200px] overflow-y-auto">
              {savedLocations.map((loc) => (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => handleSelectSavedLocation(loc)}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
                >
                  <div className="flex items-center gap-2">
                    {loc.is_default && (
                      <Icon name="star" size={12} className="text-amber-500 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900">{loc.label || 'Location'}</div>
                      <div className="text-xs text-slate-500 truncate">{loc.address}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={value}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            placeholder={placeholder}
            className="input w-full pr-10"
          />

          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {isSearching ? (
              <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Icon name="location" size={18} className="text-slate-400" />
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={handleUseMyLocation}
          disabled={isGettingLocation}
          className="btn btn-secondary px-3 flex items-center gap-1.5 whitespace-nowrap"
          title="Use my current location"
        >
          {isGettingLocation ? (
            <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Icon name="target" size={16} />
          )}
          <span className="hidden sm:inline">My Location</span>
        </button>

        {showMapPicker && (
          <button
            type="button"
            onClick={() => setShowMapModal(true)}
            className="btn btn-secondary px-3 flex items-center gap-1.5 whitespace-nowrap"
            title="Choose on map"
          >
            <Icon name="location" size={16} />
            <span className="hidden sm:inline">Map</span>
          </button>
        )}
      </div>

      {/* Location error message */}
      {locationError && (
        <div className="text-xs text-red-500 mt-1 flex items-center gap-1">
          <Icon name="warning" size={12} />
          {locationError}
        </div>
      )}

      {/* Search Results Dropdown */}
      {searchResults.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-[200px] overflow-y-auto">
          {searchResults.map((result, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectResult(result)}
              className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
            >
              <div className="text-sm text-slate-900 line-clamp-2">
                {shortNames && result.short_name ? result.short_name : result.display_name}
              </div>
              {!shortNames && (
                <div className="text-xs text-slate-400 mt-0.5">
                  {result.lat.toFixed(5)}, {result.lng.toFixed(5)}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Hint text */}
      {isFocused && value.length > 0 && value.length < 3 && !searchResults.length && (
        <div className="text-xs text-slate-400 mt-1">
          Type at least 3 characters to search
        </div>
      )}

      {/* Selected coordinates indicator */}
      {showCoords && selectedCoords && (
        <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
          <Icon name="check" size={12} />
          <span>
            Location found: {selectedCoords.lat.toFixed(5)}, {selectedCoords.lng.toFixed(5)}
          </span>
        </div>
      )}

      {/* Map Picker Modal */}
      {showMapModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">Choose Location on Map</h3>
              <button
                type="button"
                onClick={() => {
                  setShowMapModal(false)
                  setMapMarker(null)
                  setMapSearchQuery('')
                  setMapSearchResults([])
                }}
                className="p-1 hover:bg-slate-100 rounded"
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            {/* Search bar for map */}
            <div className="p-3 border-b border-slate-200 relative">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={mapSearchQuery}
                    onChange={(e) => handleMapSearch(e.target.value)}
                    placeholder="Search for a location..."
                    className="input w-full pr-10"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {isMapSearching ? (
                      <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Icon name="search" size={18} className="text-slate-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Map search results dropdown */}
              {mapSearchResults.length > 0 && (
                <div className="absolute left-3 right-3 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-[200px] overflow-y-auto z-[10000]">
                  {mapSearchResults.map((result, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleMapSearchSelect(result)}
                      className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
                    >
                      <div className="text-sm text-slate-900 line-clamp-2">
                        {result.short_name || result.display_name}
                      </div>
                      <div className="text-xs text-slate-400">
                        {result.lat.toFixed(4)}, {result.lng.toFixed(4)}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative" style={{ height: '400px' }}>
              <MapContainer
                center={mapMarker ? [mapMarker.lat, mapMarker.lng] : DEFAULT_CENTER}
                zoom={11}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapCenterUpdater center={mapCenter} zoom={13} />
                <MapResizer />
                <MapClickHandler onMapClick={handleMapClick} />
                {mapMarker && (
                  <>
                    <Marker position={[mapMarker.lat, mapMarker.lng]} />
                    <MapRecenter position={[mapMarker.lat, mapMarker.lng]} />
                  </>
                )}
              </MapContainer>

              {isReverseGeocoding && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-[1000]">
                  <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-slate-600">Getting address...</span>
                </div>
              )}
            </div>

            {/* Selected location info */}
            {mapMarker && (
              <div className="p-3 bg-slate-50 border-t border-slate-200">
                <div className="text-sm text-slate-600">
                  <span className="font-medium">Selected:</span> {mapMarker.address || 'Unknown location'}
                </div>
                <div className="text-xs text-slate-400">
                  {mapMarker.lat.toFixed(5)}, {mapMarker.lng.toFixed(5)}
                </div>
              </div>
            )}

            <div className="p-4 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowMapModal(false)
                  setMapMarker(null)
                }}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmMapSelection}
                disabled={!mapMarker}
                className="btn btn-primary"
              >
                Confirm Location
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
