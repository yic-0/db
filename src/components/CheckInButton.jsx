import { useState } from 'react'
import { usePracticeStore } from '../store/practiceStore'
import { useAuthStore } from '../store/authStore'
import Icon from './Icon'

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

export default function CheckInButton({
  practiceId = null,
  eventId = null,
  userRSVP = null,
  venue = null, // { lat, lng, radius } for geofencing
  size = 'default', // 'small', 'default', 'large'
  showLocation = true
}) {
  const { user } = useAuthStore()
  const { selfCheckIn, selfCheckInEvent, undoCheckIn, undoEventCheckIn } = usePracticeStore()
  const [loading, setLoading] = useState(false)
  const [locationStatus, setLocationStatus] = useState(null) // 'getting', 'success', 'error', 'too_far'
  const [distance, setDistance] = useState(null)

  const isCheckedIn = userRSVP?.checked_in_at && !userRSVP?.checked_in_by // Self check-in has no checked_in_by
  const wasCheckedInByAdmin = userRSVP?.checked_in_at && userRSVP?.checked_in_by
  const checkInTime = userRSVP?.checked_in_at ? new Date(userRSVP.checked_in_at) : null

  const handleCheckIn = async () => {
    // Get fresh user from store to avoid stale closure
    const currentUser = useAuthStore.getState().user
    if (!currentUser) return
    setLoading(true)
    setLocationStatus(null)

    try {
      let location = null

      // Try to get geolocation if available
      if (showLocation && 'geolocation' in navigator) {
        setLocationStatus('getting')
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 60000 // Cache for 1 minute
            })
          })

          location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          }

          // Check if within venue radius (if venue coordinates are provided)
          if (venue?.lat && venue?.lng) {
            const dist = calculateDistance(
              location.latitude, location.longitude,
              venue.lat, venue.lng
            )
            setDistance(Math.round(dist))

            if (venue.radius && dist > venue.radius) {
              setLocationStatus('too_far')
              // Still allow check-in but flag it
            } else {
              setLocationStatus('success')
            }
          } else {
            setLocationStatus('success')
          }
        } catch (geoError) {
          console.warn('Geolocation error:', geoError)
          setLocationStatus('error')
          // Continue without location
        }
      }

      // Perform check-in
      if (practiceId) {
        await selfCheckIn(practiceId, currentUser.id, location)
      } else if (eventId) {
        await selfCheckInEvent(eventId, currentUser.id, location)
      }
    } catch (error) {
      console.error('Check-in error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUndoCheckIn = async () => {
    // Get fresh user from store to avoid stale closure
    const currentUser = useAuthStore.getState().user
    if (!currentUser) return
    setLoading(true)

    try {
      if (practiceId) {
        await undoCheckIn(practiceId, currentUser.id)
      } else if (eventId) {
        await undoEventCheckIn(eventId, currentUser.id)
      }
      setLocationStatus(null)
      setDistance(null)
    } catch (error) {
      console.error('Undo check-in error:', error)
    } finally {
      setLoading(false)
    }
  }

  // Size classes
  const sizeClasses = {
    small: 'px-2 py-1 text-xs gap-1',
    default: 'px-3 py-1.5 text-sm gap-1.5',
    large: 'px-4 py-2 text-base gap-2'
  }

  const iconSizes = {
    small: 14,
    default: 16,
    large: 20
  }

  // If already checked in by admin, show that status
  if (wasCheckedInByAdmin) {
    return (
      <div className={`inline-flex items-center ${sizeClasses[size]} bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200`}>
        <Icon name="check" size={iconSizes[size]} />
        <span>Checked in by coach</span>
        {checkInTime && (
          <span className="text-emerald-500 ml-1">
            ({checkInTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
          </span>
        )}
      </div>
    )
  }

  // If self checked in, show checked-in state with undo option
  if (isCheckedIn) {
    return (
      <div className="flex flex-col gap-1">
        <div className={`inline-flex items-center ${sizeClasses[size]} bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200`}>
          <Icon name="check" size={iconSizes[size]} />
          <span>Checked in</span>
          {checkInTime && (
            <span className="text-emerald-500 ml-1">
              ({checkInTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
            </span>
          )}
        </div>
        {userRSVP?.check_in_lat && (
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <Icon name="location" size={12} />
            Location verified
          </span>
        )}
        <button
          onClick={handleUndoCheckIn}
          disabled={loading}
          className="text-xs text-slate-500 hover:text-red-600 underline"
        >
          {loading ? 'Undoing...' : 'Undo check-in'}
        </button>
      </div>
    )
  }

  // Check-in button
  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={handleCheckIn}
        disabled={loading}
        className={`inline-flex items-center ${sizeClasses[size]} bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50`}
      >
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            <span>{locationStatus === 'getting' ? 'Getting location...' : 'Checking in...'}</span>
          </>
        ) : (
          <>
            <Icon name="check" size={iconSizes[size]} />
            <span>Check In</span>
            {showLocation && (
              <Icon name="location" size={iconSizes[size] - 2} className="opacity-70" />
            )}
          </>
        )}
      </button>

      {/* Location status feedback */}
      {locationStatus === 'error' && (
        <span className="text-xs text-amber-600 flex items-center gap-1">
          <Icon name="warning" size={12} />
          Location unavailable
        </span>
      )}
      {locationStatus === 'too_far' && distance && (
        <span className="text-xs text-amber-600 flex items-center gap-1">
          <Icon name="warning" size={12} />
          {distance}m from venue
        </span>
      )}
    </div>
  )
}
