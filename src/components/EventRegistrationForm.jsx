import { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import Icon from './Icon'
import AddressSearchInput from './AddressSearchInput'

/**
 * EventRegistrationForm - Event-specific registration form
 *
 * Props:
 * - eventId: UUID of the event
 * - config: Registration configuration for this event
 * - existingRegistration: Existing registration data if any
 * - onComplete: callback when form is submitted successfully
 * - onClose: callback to close the form
 */
export default function EventRegistrationForm({
  eventId,
  config,
  existingRegistration,
  onComplete,
  onClose
}) {
  const { user, profile } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const signatureRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)

  // Saved locations state
  const [savedLocations, setSavedLocations] = useState([])
  const [selectedPickupLocation, setSelectedPickupLocation] = useState('') // location id or 'custom'
  const [selectedDropoffLocation, setSelectedDropoffLocation] = useState('') // location id or 'custom'
  const [locationsPrepopulated, setLocationsPrepopulated] = useState(false)

  const [formData, setFormData] = useState({
    availability_notes: '',
    carpool_needs: '',
    carpool_direction: 'both', // 'to', 'from', 'both'
    carpool_seats_available: '',
    carpool_departure_location: '',
    carpool_departure_lat: null,
    carpool_departure_lng: null,
    carpool_return_location: '',
    carpool_return_lat: null,
    carpool_return_lng: null,
    carpool_return_same_as_departure: false,
    accommodation_needs: '',
    accommodation_notes: '',
    dietary_restrictions: '',
    food_rsvp: null,
    notes: '',
    waiver_acknowledged: false,
    signature_data: null,
  })

  // Pre-populate from existing registration or profile
  useEffect(() => {
    if (existingRegistration) {
      // Check if return location is same as departure
      const sameLocation = existingRegistration.carpool_return_same_as_departure ||
        (existingRegistration.carpool_departure_location &&
         existingRegistration.carpool_departure_location === existingRegistration.carpool_return_location)

      setFormData({
        availability_notes: existingRegistration.availability_notes || '',
        carpool_needs: existingRegistration.carpool_needs || '',
        carpool_direction: existingRegistration.carpool_direction || 'both',
        carpool_seats_available: existingRegistration.carpool_seats_available || '',
        carpool_departure_location: existingRegistration.carpool_departure_location || '',
        carpool_departure_lat: existingRegistration.carpool_departure_lat || null,
        carpool_departure_lng: existingRegistration.carpool_departure_lng || null,
        carpool_return_location: existingRegistration.carpool_return_location || '',
        carpool_return_lat: existingRegistration.carpool_return_lat || null,
        carpool_return_lng: existingRegistration.carpool_return_lng || null,
        carpool_return_same_as_departure: sameLocation,
        accommodation_needs: existingRegistration.accommodation_needs || '',
        accommodation_notes: existingRegistration.accommodation_notes || '',
        dietary_restrictions: existingRegistration.dietary_restrictions || '',
        food_rsvp: existingRegistration.food_rsvp ?? null,
        notes: existingRegistration.notes || '',
        waiver_acknowledged: existingRegistration.waiver_acknowledged || false,
        signature_data: existingRegistration.signature_data || null,
      })
    } else if (profile) {
      // Pre-populate dietary restrictions from profile
      setFormData(prev => ({
        ...prev,
        dietary_restrictions: profile.dietary_restrictions || '',
      }))
    }
  }, [existingRegistration, profile])

  // Load saved locations and prepopulate from default OR match existing registration
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

        if (error) throw error
        setSavedLocations(data || [])

        if (existingRegistration && data && data.length > 0) {
          // When editing, try to match existing locations to saved locations
          const existingPickup = existingRegistration.carpool_departure_location
          const existingDropoff = existingRegistration.carpool_return_location

          // Find matching saved location for pickup (by address or lat/lng)
          const matchedPickup = data.find(loc =>
            loc.address === existingPickup ||
            (existingRegistration.carpool_departure_lat &&
             Math.abs(parseFloat(loc.lat) - existingRegistration.carpool_departure_lat) < 0.0001 &&
             Math.abs(parseFloat(loc.lng) - existingRegistration.carpool_departure_lng) < 0.0001)
          )

          // Find matching saved location for dropoff (by address or lat/lng)
          const matchedDropoff = data.find(loc =>
            loc.address === existingDropoff ||
            (existingRegistration.carpool_return_lat &&
             Math.abs(parseFloat(loc.lat) - existingRegistration.carpool_return_lat) < 0.0001 &&
             Math.abs(parseFloat(loc.lng) - existingRegistration.carpool_return_lng) < 0.0001)
          )

          // Set selected locations - if matched use ID, otherwise 'custom' if there's a location
          if (existingPickup) {
            setSelectedPickupLocation(matchedPickup ? matchedPickup.id : 'custom')
          }
          if (existingDropoff && !existingRegistration.carpool_return_same_as_departure) {
            setSelectedDropoffLocation(matchedDropoff ? matchedDropoff.id : 'custom')
          } else if (existingRegistration.carpool_return_same_as_departure && matchedPickup) {
            setSelectedDropoffLocation(matchedPickup.id)
          }
        } else if (!existingRegistration && data && data.length > 0) {
          // If no existing registration and we have a default location, prepopulate
          const defaultLocation = data.find(loc => loc.is_default) || data[0]
          if (defaultLocation) {
            setFormData(prev => ({
              ...prev,
              carpool_departure_location: defaultLocation.address,
              carpool_departure_lat: parseFloat(defaultLocation.lat),
              carpool_departure_lng: parseFloat(defaultLocation.lng),
              carpool_return_location: defaultLocation.address,
              carpool_return_lat: parseFloat(defaultLocation.lat),
              carpool_return_lng: parseFloat(defaultLocation.lng),
              carpool_return_same_as_departure: true
            }))
            setSelectedPickupLocation(defaultLocation.id)
            setSelectedDropoffLocation(defaultLocation.id)
            setLocationsPrepopulated(true)
          }
        }
      } catch (err) {
        console.error('Error loading saved locations:', err)
      }
    }

    loadSavedLocations()
  }, [user?.id, existingRegistration])

  // Handle saved location selection for pickup
  const handlePickupLocationSelect = (locationId) => {
    setSelectedPickupLocation(locationId)
    if (locationId && locationId !== 'custom') {
      const location = savedLocations.find(loc => loc.id === locationId)
      if (location) {
        const updates = {
          carpool_departure_location: location.address,
          carpool_departure_lat: parseFloat(location.lat),
          carpool_departure_lng: parseFloat(location.lng)
        }
        // If "same as pickup" is checked, also update return
        if (formData.carpool_return_same_as_departure) {
          updates.carpool_return_location = location.address
          updates.carpool_return_lat = parseFloat(location.lat)
          updates.carpool_return_lng = parseFloat(location.lng)
          setSelectedDropoffLocation(locationId)
        }
        setFormData(prev => ({ ...prev, ...updates }))
      }
    }
  }

  // Handle saved location selection for dropoff
  const handleDropoffLocationSelect = (locationId) => {
    setSelectedDropoffLocation(locationId)
    if (locationId && locationId !== 'custom') {
      const location = savedLocations.find(loc => loc.id === locationId)
      if (location) {
        setFormData(prev => ({
          ...prev,
          carpool_return_location: location.address,
          carpool_return_lat: parseFloat(location.lat),
          carpool_return_lng: parseFloat(location.lng)
        }))
      }
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    })
  }

  // Signature canvas handlers
  const startDrawing = (e) => {
    const canvas = signatureRef.current
    if (!canvas) return

    setIsDrawing(true)
    const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top

    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = (e) => {
    if (!isDrawing) return

    const canvas = signatureRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top

    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    if (!isDrawing) return
    setIsDrawing(false)

    const canvas = signatureRef.current
    if (canvas) {
      const signatureData = canvas.toDataURL('image/png')
      setFormData(prev => ({ ...prev, signature_data: signatureData }))
    }
  }

  const clearSignature = () => {
    const canvas = signatureRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      setFormData(prev => ({ ...prev, signature_data: null }))
    }
  }

  // Initialize canvas
  useEffect(() => {
    const canvas = signatureRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      ctx.strokeStyle = '#1e293b'
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      // If we have existing signature, draw it
      if (formData.signature_data) {
        const img = new Image()
        img.onload = () => {
          ctx.drawImage(img, 0, 0)
        }
        img.src = formData.signature_data
      }
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validate required fields
      if (config?.require_carpool_needs && !formData.carpool_needs) {
        toast.error('Please indicate your carpool needs')
        return
      }
      if (config?.require_accommodation_needs && !formData.accommodation_needs) {
        toast.error('Please indicate your accommodation needs')
        return
      }
      if (config?.require_food_rsvp && formData.food_rsvp === null) {
        toast.error('Please indicate if you will attend post-event food')
        return
      }
      if (config?.require_waiver_acknowledgment && !formData.waiver_acknowledged) {
        toast.error('Please acknowledge the waiver')
        return
      }
      if (config?.require_signature && !formData.signature_data) {
        toast.error('Please provide your signature')
        return
      }

      // Determine if carpool info should be included
      const needsCarpool = formData.carpool_needs === 'need_ride' || formData.carpool_needs === 'can_drive'
      const needsToLocation = needsCarpool && (formData.carpool_direction === 'to' || formData.carpool_direction === 'both')
      const needsFromLocation = needsCarpool && (formData.carpool_direction === 'from' || formData.carpool_direction === 'both')

      // Handle "same as departure" for return location
      const returnLocation = formData.carpool_return_same_as_departure
        ? formData.carpool_departure_location
        : formData.carpool_return_location
      const returnLat = formData.carpool_return_same_as_departure
        ? formData.carpool_departure_lat
        : formData.carpool_return_lat
      const returnLng = formData.carpool_return_same_as_departure
        ? formData.carpool_departure_lng
        : formData.carpool_return_lng

      const registrationData = {
        event_id: eventId,
        user_id: user.id,
        availability_notes: formData.availability_notes.trim() || null,
        carpool_needs: formData.carpool_needs || null,
        carpool_direction: needsCarpool ? formData.carpool_direction : null,
        carpool_seats_available: formData.carpool_needs === 'can_drive'
          ? parseInt(formData.carpool_seats_available) || null
          : null,
        // Departure/pickup location (for rides TO the event)
        carpool_departure_location: needsToLocation
          ? formData.carpool_departure_location.trim() || null
          : null,
        carpool_departure_lat: needsToLocation ? formData.carpool_departure_lat : null,
        carpool_departure_lng: needsToLocation ? formData.carpool_departure_lng : null,
        // Return/dropoff location (for rides FROM the event)
        carpool_return_location: needsFromLocation ? returnLocation?.trim() || null : null,
        carpool_return_lat: needsFromLocation ? returnLat : null,
        carpool_return_lng: needsFromLocation ? returnLng : null,
        carpool_return_same_as_departure: needsCarpool ? formData.carpool_return_same_as_departure : false,
        accommodation_needs: formData.accommodation_needs || null,
        accommodation_notes: formData.accommodation_notes.trim() || null,
        dietary_restrictions: formData.dietary_restrictions.trim() || null,
        food_rsvp: formData.food_rsvp,
        notes: formData.notes.trim() || null,
        waiver_acknowledged: formData.waiver_acknowledged,
        waiver_acknowledged_at: formData.waiver_acknowledged ? new Date().toISOString() : null,
        signature_data: formData.signature_data,
        signed_at: formData.signature_data ? new Date().toISOString() : null,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      let error
      if (existingRegistration) {
        // Update existing registration
        const result = await supabase
          .from('event_registrations')
          .update(registrationData)
          .eq('id', existingRegistration.id)

        error = result.error
      } else {
        // Create new registration
        const result = await supabase
          .from('event_registrations')
          .insert([registrationData])

        error = result.error
      }

      if (error) throw error

      toast.success('Registration submitted!')
      onComplete?.()
    } catch (error) {
      console.error('Registration error:', error)
      toast.error(error.message || 'Failed to submit registration')
    } finally {
      setLoading(false)
    }
  }

  // Default config if none provided
  const cfg = config || {
    show_availability: true,
    show_carpool_needs: true,
    show_accommodation_needs: false,
    show_dietary_restrictions: false,
    show_food_rsvp: false,
    show_waiver_acknowledgment: true,
    show_signature: true,
    show_notes: true,
    require_waiver_acknowledgment: true,
    require_food_rsvp: false,
    waiver_text: 'I acknowledge that I have read and agree to the team waiver and release of liability.',
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Event Registration</h2>
            <p className="text-sm text-slate-600">Complete your registration for this event</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Icon name="close" size={24} className="text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Availability */}
          {cfg.show_availability && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Icon name="calendar" size={20} className="text-primary-600" />
                Availability
              </h3>
              <textarea
                name="availability_notes"
                value={formData.availability_notes}
                onChange={handleChange}
                className="input"
                rows={3}
                placeholder="Let us know about your availability for pre-event practices, travel times, etc."
              />
            </div>
          )}

          {/* Carpool Needs */}
          {cfg.show_carpool_needs && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Icon name="car" size={20} className="text-blue-600" />
                Transportation
                {cfg.require_carpool_needs && <span className="text-red-500 text-sm font-normal">*</span>}
              </h3>

              {/* Main carpool choice */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'need_ride', label: 'Need a ride', icon: '🚗' },
                  { value: 'can_drive', label: 'Can drive others', icon: '🚙' },
                  { value: 'not_needed', label: 'Have my own transport', icon: '✓' },
                  { value: 'undecided', label: 'Not sure yet', icon: '❓' },
                ].map(option => (
                  <label
                    key={option.value}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      formData.carpool_needs === option.value
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="carpool_needs"
                      value={option.value}
                      checked={formData.carpool_needs === option.value}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <span className="text-xl">{option.icon}</span>
                    <span className="font-medium text-slate-700">{option.label}</span>
                  </label>
                ))}
              </div>

              {/* Direction selection - shown for riders and drivers */}
              {(formData.carpool_needs === 'need_ride' || formData.carpool_needs === 'can_drive') && (
                <div className="bg-slate-50 rounded-lg p-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {formData.carpool_needs === 'can_drive' ? 'Which direction(s) can you drive?' : 'Which direction(s) do you need a ride?'}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: 'to', label: 'To event only', icon: '→' },
                        { value: 'from', label: 'From event only', icon: '←' },
                        { value: 'both', label: 'Both ways', icon: '↔' },
                      ].map(option => (
                        <label
                          key={option.value}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                            formData.carpool_direction === option.value
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-slate-200 hover:border-slate-300 text-slate-600'
                          }`}
                        >
                          <input
                            type="radio"
                            name="carpool_direction"
                            value={option.value}
                            checked={formData.carpool_direction === option.value}
                            onChange={handleChange}
                            className="sr-only"
                          />
                          <span className="font-bold">{option.icon}</span>
                          <span className="text-sm font-medium">{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Seats available for drivers */}
                  {formData.carpool_needs === 'can_drive' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        How many passengers can you take?
                      </label>
                      <input
                        type="number"
                        name="carpool_seats_available"
                        value={formData.carpool_seats_available}
                        onChange={handleChange}
                        className="input w-32"
                        min="1"
                        max="10"
                        placeholder="e.g., 3"
                      />
                    </div>
                  )}

                  {/* Pickup Location - shown for 'to' or 'both' */}
                  {(formData.carpool_direction === 'to' || formData.carpool_direction === 'both') && (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-700">
                        {formData.carpool_needs === 'can_drive'
                          ? '📍 Departure location (to event)'
                          : '📍 Pickup location'}
                      </label>

                      {/* Saved locations dropdown */}
                      {savedLocations.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {savedLocations.map(loc => (
                            <button
                              key={loc.id}
                              type="button"
                              onClick={() => handlePickupLocationSelect(loc.id)}
                              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                                selectedPickupLocation === loc.id
                                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                                  : 'border-slate-200 hover:border-slate-300 text-slate-600'
                              }`}
                            >
                              {loc.label}
                              {loc.is_default && <span className="ml-1 text-xs opacity-60">★</span>}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPickupLocation('custom')
                              setFormData(prev => ({
                                ...prev,
                                carpool_departure_location: '',
                                carpool_departure_lat: null,
                                carpool_departure_lng: null
                              }))
                            }}
                            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                              selectedPickupLocation === 'custom'
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-slate-200 hover:border-slate-300 text-slate-600'
                            }`}
                          >
                            + Custom
                          </button>
                        </div>
                      )}

                      {/* Show address input if custom selected or no saved locations */}
                      {(selectedPickupLocation === 'custom' || savedLocations.length === 0) && (
                        <div className="space-y-2">
                          <AddressSearchInput
                            value={formData.carpool_departure_location}
                            onChange={(value, coords) => {
                              const updates = {
                                carpool_departure_location: value,
                                carpool_departure_lat: coords?.lat || null,
                                carpool_departure_lng: coords?.lng || null
                              }
                              // If "same as pickup" is checked, also update return location
                              if (formData.carpool_return_same_as_departure) {
                                updates.carpool_return_location = value
                                updates.carpool_return_lat = coords?.lat || null
                                updates.carpool_return_lng = coords?.lng || null
                              }
                              setFormData(prev => ({ ...prev, ...updates }))
                            }}
                            placeholder="Search for an address or area..."
                            showCoords
                            showMapPicker={true}
                            savedLocations={savedLocations}
                          />
                          {/* Save to favorites button */}
                          {formData.carpool_departure_location && formData.carpool_departure_lat && (
                            <button
                              type="button"
                              onClick={async () => {
                                const label = prompt('Enter a name for this location (e.g., "Home", "Work"):')
                                if (!label) return
                                try {
                                  const { error } = await supabase
                                    .from('user_saved_locations')
                                    .insert([{
                                      user_id: profile.id,
                                      label,
                                      address: formData.carpool_departure_location,
                                      lat: formData.carpool_departure_lat,
                                      lng: formData.carpool_departure_lng,
                                      is_default: savedLocations.length === 0
                                    }])
                                  if (error) throw error
                                  toast.success(`"${label}" saved to your locations!`)
                                  // Refresh saved locations
                                  const { data } = await supabase
                                    .from('user_saved_locations')
                                    .select('*')
                                    .eq('user_id', profile.id)
                                    .order('is_default', { ascending: false })
                                  setSavedLocations(data || [])
                                } catch (err) {
                                  toast.error('Failed to save location')
                                }
                              }}
                              className="text-xs text-amber-600 hover:text-amber-700 flex items-center gap-1"
                            >
                              <Icon name="star" size={12} />
                              Save to favorites
                            </button>
                          )}
                        </div>
                      )}

                      {/* Show selected saved location address */}
                      {selectedPickupLocation && selectedPickupLocation !== 'custom' && (
                        <div className="text-sm text-slate-600 bg-slate-100 rounded-lg px-3 py-2">
                          {formData.carpool_departure_location}
                        </div>
                      )}

                      {locationsPrepopulated && !existingRegistration && (
                        <p className="text-xs text-blue-600">
                          ✓ Pre-filled from your saved locations
                        </p>
                      )}
                    </div>
                  )}

                  {/* Return/Dropoff Location - shown for 'from' or 'both' */}
                  {(formData.carpool_direction === 'from' || formData.carpool_direction === 'both') && (
                    <>
                      {/* Same as pickup checkbox - only show if both directions */}
                      {formData.carpool_direction === 'both' && (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.carpool_return_same_as_departure}
                            onChange={(e) => {
                              const checked = e.target.checked
                              setFormData(prev => ({
                                ...prev,
                                carpool_return_same_as_departure: checked,
                                // If checked, copy departure to return
                                ...(checked ? {
                                  carpool_return_location: prev.carpool_departure_location,
                                  carpool_return_lat: prev.carpool_departure_lat,
                                  carpool_return_lng: prev.carpool_departure_lng
                                } : {})
                              }))
                            }}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-slate-600">
                            {formData.carpool_needs === 'can_drive'
                              ? 'Return to same location'
                              : 'Drop off at same location as pickup'}
                          </span>
                        </label>
                      )}

                      {/* Return location input - hidden if same as departure */}
                      {!formData.carpool_return_same_as_departure && (
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-slate-700">
                            {formData.carpool_needs === 'can_drive'
                              ? '📍 Return location (from event)'
                              : '📍 Drop-off location'}
                          </label>

                          {/* Saved locations dropdown for dropoff */}
                          {savedLocations.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-2">
                              {savedLocations.map(loc => (
                                <button
                                  key={loc.id}
                                  type="button"
                                  onClick={() => handleDropoffLocationSelect(loc.id)}
                                  className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                                    selectedDropoffLocation === loc.id
                                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                                      : 'border-slate-200 hover:border-slate-300 text-slate-600'
                                  }`}
                                >
                                  {loc.label}
                                  {loc.is_default && <span className="ml-1 text-xs opacity-60">★</span>}
                                </button>
                              ))}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedDropoffLocation('custom')
                                  setFormData(prev => ({
                                    ...prev,
                                    carpool_return_location: '',
                                    carpool_return_lat: null,
                                    carpool_return_lng: null
                                  }))
                                }}
                                className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                                  selectedDropoffLocation === 'custom'
                                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                                    : 'border-slate-200 hover:border-slate-300 text-slate-600'
                                }`}
                              >
                                + Custom
                              </button>
                            </div>
                          )}

                          {/* Show address input if custom selected or no saved locations */}
                          {(selectedDropoffLocation === 'custom' || savedLocations.length === 0) && (
                            <div className="space-y-2">
                              <AddressSearchInput
                                value={formData.carpool_return_location}
                                onChange={(value, coords) => {
                                  setFormData(prev => ({
                                    ...prev,
                                    carpool_return_location: value,
                                    carpool_return_lat: coords?.lat || null,
                                    carpool_return_lng: coords?.lng || null
                                  }))
                                }}
                                placeholder="Search for an address or area..."
                                showCoords
                                showMapPicker={true}
                                savedLocations={savedLocations}
                              />
                              {/* Save to favorites button */}
                              {formData.carpool_return_location && formData.carpool_return_lat && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const label = prompt('Enter a name for this location (e.g., "Home", "Work"):')
                                    if (!label) return
                                    try {
                                      const { error } = await supabase
                                        .from('user_saved_locations')
                                        .insert([{
                                          user_id: profile.id,
                                          label,
                                          address: formData.carpool_return_location,
                                          lat: formData.carpool_return_lat,
                                          lng: formData.carpool_return_lng,
                                          is_default: false
                                        }])
                                      if (error) throw error
                                      toast.success(`"${label}" saved to your locations!`)
                                      // Refresh saved locations
                                      const { data } = await supabase
                                        .from('user_saved_locations')
                                        .select('*')
                                        .eq('user_id', profile.id)
                                        .order('is_default', { ascending: false })
                                      setSavedLocations(data || [])
                                    } catch (err) {
                                      toast.error('Failed to save location')
                                    }
                                  }}
                                  className="text-xs text-amber-600 hover:text-amber-700 flex items-center gap-1"
                                >
                                  <Icon name="star" size={12} />
                                  Save to favorites
                                </button>
                              )}
                            </div>
                          )}

                          {/* Show selected saved location address */}
                          {selectedDropoffLocation && selectedDropoffLocation !== 'custom' && (
                            <div className="text-sm text-slate-600 bg-slate-100 rounded-lg px-3 py-2">
                              {formData.carpool_return_location}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  <p className="text-xs text-slate-500">
                    {savedLocations.length > 0
                      ? 'Tip: Select from your saved locations or enter a custom address'
                      : 'Tip: Save locations in your Profile for quick access'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Accommodation Needs */}
          {cfg.show_accommodation_needs && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Icon name="bed" size={20} className="text-purple-600" />
                Accommodation
                {cfg.require_accommodation_needs && <span className="text-red-500 text-sm font-normal">*</span>}
              </h3>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'need_accommodation', label: 'Need accommodation', icon: '🛏️' },
                  { value: 'have_accommodation', label: 'Already arranged', icon: '✓' },
                  { value: 'not_needed', label: 'Not staying overnight', icon: '🏠' },
                  { value: 'undecided', label: 'Not sure yet', icon: '❓' },
                ].map(option => (
                  <label
                    key={option.value}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      formData.accommodation_needs === option.value
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="accommodation_needs"
                      value={option.value}
                      checked={formData.accommodation_needs === option.value}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <span className="text-xl">{option.icon}</span>
                    <span className="font-medium text-slate-700">{option.label}</span>
                  </label>
                ))}
              </div>

              {formData.accommodation_needs === 'need_accommodation' && (
                <textarea
                  name="accommodation_notes"
                  value={formData.accommodation_notes}
                  onChange={handleChange}
                  className="input mt-3"
                  rows={2}
                  placeholder="Any preferences? (roommate requests, accessibility needs, etc.)"
                />
              )}
            </div>
          )}

          {/* Dietary Restrictions */}
          {cfg.show_dietary_restrictions && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Icon name="food" size={20} className="text-green-600" />
                Dietary Restrictions
              </h3>
              <textarea
                name="dietary_restrictions"
                value={formData.dietary_restrictions}
                onChange={handleChange}
                className="input"
                rows={2}
                placeholder="Any food allergies or dietary restrictions for this event..."
              />
              {profile?.dietary_restrictions && (
                <p className="text-xs text-slate-500">
                  Pre-filled from your profile. Update if different for this event.
                </p>
              )}
            </div>
          )}

          {/* Food RSVP */}
          {cfg.show_food_rsvp && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Icon name="location" size={20} className="text-orange-600" />
                Post-Event Food
                {cfg.require_food_rsvp && <span className="text-red-500 text-sm font-normal">*</span>}
              </h3>
              <p className="text-sm text-slate-600">
                Will you be joining us for food after the event?
              </p>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: true, label: 'Yes, I\'ll join!', icon: '🍽️' },
                  { value: false, label: 'No, can\'t make it', icon: '❌' },
                ].map(option => (
                  <label
                    key={String(option.value)}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      formData.food_rsvp === option.value
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="food_rsvp"
                      value={String(option.value)}
                      checked={formData.food_rsvp === option.value}
                      onChange={(e) => setFormData({ ...formData, food_rsvp: e.target.value === 'true' })}
                      className="sr-only"
                    />
                    <span className="text-xl">{option.icon}</span>
                    <span className="font-medium text-slate-700">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Additional Notes */}
          {cfg.show_notes && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Icon name="note" size={20} className="text-slate-600" />
                Additional Notes
              </h3>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                className="input"
                rows={2}
                placeholder="Anything else we should know?"
              />
            </div>
          )}

          {/* Waiver Acknowledgment */}
          {cfg.show_waiver_acknowledgment && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Icon name="document" size={20} className="text-amber-600" />
                Waiver
                {cfg.require_waiver_acknowledgment && <span className="text-red-500 text-sm font-normal">*</span>}
              </h3>

              {cfg.waiver_url && (
                <a
                  href={cfg.waiver_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700"
                >
                  <Icon name="external" size={16} />
                  View Full Waiver
                </a>
              )}

              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <p className="text-sm text-slate-700">
                  {cfg.waiver_text || 'I acknowledge that I have read and agree to the team waiver and release of liability.'}
                </p>
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="waiver_acknowledged"
                  checked={formData.waiver_acknowledged}
                  onChange={handleChange}
                  className="mt-1"
                />
                <span className="text-sm text-slate-700">
                  I have read and agree to the waiver above
                </span>
              </label>
            </div>
          )}

          {/* Signature */}
          {cfg.show_signature && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Icon name="edit" size={20} className="text-slate-600" />
                Signature
                {cfg.require_signature && <span className="text-red-500 text-sm font-normal">*</span>}
              </h3>

              <div className="border-2 border-dashed border-slate-300 rounded-lg p-2 bg-white">
                <canvas
                  ref={signatureRef}
                  width={500}
                  height={150}
                  className="w-full touch-none cursor-crosshair"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
              </div>

              <div className="flex justify-between items-center">
                <p className="text-xs text-slate-500">Draw your signature above</p>
                <button
                  type="button"
                  onClick={clearSignature}
                  className="text-sm text-slate-600 hover:text-slate-800"
                >
                  Clear signature
                </button>
              </div>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="pt-4 border-t border-slate-200 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="btn flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary flex-1"
            >
              {loading ? 'Submitting...' : (existingRegistration ? 'Update Registration' : 'Submit Registration')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
