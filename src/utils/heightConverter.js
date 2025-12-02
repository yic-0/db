/**
 * Height conversion utilities
 * Height is stored in cm in the database, but can be displayed in ft/in or cm based on user preference
 */

const CM_TO_INCHES = 0.393701

/**
 * Convert centimeters to inches
 * @param {number} cm - Height in centimeters
 * @returns {number} Height in inches
 */
export const cmToInches = (cm) => {
  if (cm === null || cm === undefined || cm === '') return null
  return cm * CM_TO_INCHES
}

/**
 * Convert inches to centimeters
 * @param {number} inches - Height in inches
 * @returns {number} Height in centimeters
 */
export const inchesToCm = (inches) => {
  if (inches === null || inches === undefined || inches === '') return null
  return inches / CM_TO_INCHES
}

/**
 * Convert centimeters to feet and inches
 * @param {number} cm - Height in centimeters
 * @returns {{feet: number, inches: number}|null} Object with feet and inches
 */
export const cmToFeetInches = (cm) => {
  if (cm === null || cm === undefined || cm === '') return null

  const totalInches = cmToInches(cm)
  const feet = Math.floor(totalInches / 12)
  const inches = Math.round(totalInches % 12)

  return { feet, inches }
}

/**
 * Convert feet and inches to centimeters
 * @param {number} feet - Feet
 * @param {number} inches - Inches
 * @returns {number|null} Height in centimeters (rounded to integer)
 */
export const feetInchesToCm = (feet, inches) => {
  if ((feet === null || feet === undefined || feet === '') &&
      (inches === null || inches === undefined || inches === '')) {
    return null
  }

  const totalInches = (parseInt(feet) || 0) * 12 + (parseInt(inches) || 0)
  return Math.round(inchesToCm(totalInches))
}

/**
 * Convert height from cm to display format (cm or ft/in)
 * @param {number} heightCm - Height stored in cm
 * @param {string} displayUnit - Unit to display ('cm' or 'ftin')
 * @returns {number|{feet: number, inches: number}|null} Converted height
 */
export const convertHeightForDisplay = (heightCm, displayUnit = 'ftin') => {
  if (heightCm === null || heightCm === undefined || heightCm === '') return null

  if (displayUnit === 'ftin') {
    return cmToFeetInches(heightCm)
  }

  return heightCm
}

/**
 * Convert height from display format to cm for storage
 * @param {number|{feet: number, inches: number}} height - Height in display format
 * @param {string} displayUnit - Current display unit ('cm' or 'ftin')
 * @returns {number|null} Height in cm
 */
export const convertHeightForStorage = (height, displayUnit = 'ftin') => {
  if (height === null || height === undefined || height === '') return null

  if (displayUnit === 'ftin') {
    if (typeof height === 'object') {
      return feetInchesToCm(height.feet, height.inches)
    }
    // If it's a number, assume it's total inches
    return inchesToCm(height)
  }

  return height
}

/**
 * Format height for display with unit
 * @param {number} heightCm - Height stored in cm
 * @param {string} displayUnit - Unit to display ('cm' or 'ftin')
 * @returns {string} Formatted height (e.g., "5'10\"" or "178 cm")
 */
export const formatHeight = (heightCm, displayUnit = 'ftin') => {
  const converted = convertHeightForDisplay(heightCm, displayUnit)
  if (converted === null) return ''

  if (displayUnit === 'ftin') {
    return `${converted.feet}'${converted.inches}"`
  }

  return `${converted} cm`
}
