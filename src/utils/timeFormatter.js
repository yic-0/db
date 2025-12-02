/**
 * Time formatting utilities
 * Convert between 24-hour (military) and 12-hour (AM/PM) time formats
 */

/**
 * Convert 24-hour time string to 12-hour format with AM/PM
 * @param {string} time24 - Time in 24-hour format (e.g., "14:30", "09:00")
 * @returns {string} Time in 12-hour format (e.g., "2:30 PM", "9:00 AM")
 */
export const formatTime12Hour = (time24) => {
  if (!time24) return ''

  const [hours, minutes] = time24.split(':').map(Number)

  if (isNaN(hours) || isNaN(minutes)) return time24

  const period = hours >= 12 ? 'PM' : 'AM'
  const hours12 = hours % 12 || 12 // Convert 0 to 12 for midnight

  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`
}

/**
 * Convert 12-hour time string to 24-hour format
 * @param {string} time12 - Time in 12-hour format (e.g., "2:30 PM", "9:00 AM")
 * @returns {string} Time in 24-hour format (e.g., "14:30", "09:00")
 */
export const formatTime24Hour = (time12) => {
  if (!time12) return ''

  // Remove any extra whitespace and convert to uppercase
  const cleanTime = time12.trim().toUpperCase()

  // Match patterns like "2:30 PM", "2:30PM", "14:30"
  const match = cleanTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/)

  if (!match) return time12 // Return original if can't parse

  let hours = parseInt(match[1])
  const minutes = match[2]
  const period = match[3]

  // If no period specified, assume it's already 24-hour format
  if (!period) {
    return `${hours.toString().padStart(2, '0')}:${minutes}`
  }

  // Convert to 24-hour format
  if (period === 'PM' && hours !== 12) {
    hours += 12
  } else if (period === 'AM' && hours === 12) {
    hours = 0
  }

  return `${hours.toString().padStart(2, '0')}:${minutes}`
}

/**
 * Format time for display based on user preference
 * @param {string} time - Time string (can be in either format)
 * @param {boolean} use12Hour - Whether to use 12-hour format (default: true)
 * @returns {string} Formatted time string
 */
export const formatTime = (time, use12Hour = true) => {
  if (!time) return ''

  // Check if time is in 12-hour format (contains AM/PM)
  const is12Hour = /AM|PM/i.test(time)

  if (use12Hour) {
    return is12Hour ? time : formatTime12Hour(time)
  } else {
    return is12Hour ? formatTime24Hour(time) : time
  }
}

/**
 * Get current time in specified format
 * @param {boolean} use12Hour - Whether to use 12-hour format (default: true)
 * @returns {string} Current time
 */
export const getCurrentTime = (use12Hour = true) => {
  const now = new Date()
  const hours = now.getHours()
  const minutes = now.getMinutes()

  if (use12Hour) {
    const period = hours >= 12 ? 'PM' : 'AM'
    const hours12 = hours % 12 || 12
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`
  } else {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  }
}
