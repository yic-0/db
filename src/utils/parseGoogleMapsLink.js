/**
 * Parse a Google Maps URL to extract location information
 * Supports various Google Maps URL formats:
 * - https://www.google.com/maps/place/Place+Name/@40.7128,-74.0060,17z/...
 * - https://maps.google.com/?q=40.7128,-74.0060
 * - https://www.google.com/maps?q=40.7128,-74.0060
 * - https://www.google.com/maps/@40.7128,-74.0060,15z
 * - https://maps.app.goo.gl/... (shortened - coordinates not extractable)
 * - https://goo.gl/maps/... (shortened - coordinates not extractable)
 */
export function parseGoogleMapsLink(url) {
  if (!url || typeof url !== 'string') {
    return { name: null, lat: null, lng: null, isValid: false }
  }

  const trimmedUrl = url.trim()

  // Check if it's a Google Maps URL
  const isGoogleMaps = /google\.(com|[a-z]{2})\/maps|maps\.google\.|maps\.app\.goo\.gl|goo\.gl\/maps/i.test(trimmedUrl)

  if (!isGoogleMaps) {
    return { name: null, lat: null, lng: null, isValid: false }
  }

  let name = null
  let lat = null
  let lng = null

  try {
    // Try to extract place name from URL
    // Format: /place/Place+Name/ or /place/Place%20Name/
    const placeMatch = trimmedUrl.match(/\/place\/([^/@]+)/i)
    if (placeMatch) {
      name = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '))
    }

    // Try to extract coordinates from various URL patterns

    // Pattern 1: /@lat,lng,zoom
    const atPattern = /@(-?\d+\.?\d*),(-?\d+\.?\d*)/
    const atMatch = trimmedUrl.match(atPattern)
    if (atMatch) {
      lat = parseFloat(atMatch[1])
      lng = parseFloat(atMatch[2])
    }

    // Pattern 2: ?q=lat,lng or &q=lat,lng
    if (!lat || !lng) {
      const qPattern = /[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/
      const qMatch = trimmedUrl.match(qPattern)
      if (qMatch) {
        lat = parseFloat(qMatch[1])
        lng = parseFloat(qMatch[2])
      }
    }

    // Pattern 3: !3d{lat}!4d{lng} (data parameter format)
    if (!lat || !lng) {
      const dataPattern = /!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/
      const dataMatch = trimmedUrl.match(dataPattern)
      if (dataMatch) {
        lat = parseFloat(dataMatch[1])
        lng = parseFloat(dataMatch[2])
      }
    }

    // Validate coordinates are reasonable
    if (lat !== null && lng !== null) {
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        lat = null
        lng = null
      }
    }

  } catch (error) {
    console.warn('Error parsing Google Maps URL:', error)
  }

  return {
    name,
    lat,
    lng,
    isValid: true, // It's a valid Google Maps URL even if we couldn't extract coords
    hasCoordinates: lat !== null && lng !== null
  }
}

/**
 * Format a location for display
 */
export function formatLocationDisplay(name, link) {
  if (name && link) {
    return { displayName: name, hasLink: true }
  }
  if (name) {
    return { displayName: name, hasLink: false }
  }
  if (link) {
    // Try to extract name from link
    const parsed = parseGoogleMapsLink(link)
    return {
      displayName: parsed.name || 'View on Maps',
      hasLink: true
    }
  }
  return { displayName: null, hasLink: false }
}
