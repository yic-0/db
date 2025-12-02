/**
 * Weight conversion utilities
 * Weight is stored in kg in the database, but can be displayed in lbs or kg based on user preference
 */

const KG_TO_LBS = 2.20462262185

/**
 * Convert kilograms to pounds
 * @param {number} kg - Weight in kilograms
 * @returns {number} Weight in pounds
 */
export const kgToLbs = (kg) => {
  if (kg === null || kg === undefined || kg === '') return null
  return kg * KG_TO_LBS
}

/**
 * Convert pounds to kilograms
 * @param {number} lbs - Weight in pounds
 * @returns {number} Weight in kilograms
 */
export const lbsToKg = (lbs) => {
  if (lbs === null || lbs === undefined || lbs === '') return null
  return lbs / KG_TO_LBS
}

/**
 * Convert weight from kg to display unit (kg or lbs)
 * @param {number} weightKg - Weight stored in kg
 * @param {string} displayUnit - Unit to display ('kg' or 'lbs')
 * @param {number} decimals - Number of decimal places (default 1)
 * @returns {number|null} Converted weight
 */
export const convertWeightForDisplay = (weightKg, displayUnit = 'lbs', decimals = 1) => {
  if (weightKg === null || weightKg === undefined || weightKg === '') return null

  const weight = displayUnit === 'lbs' ? kgToLbs(weightKg) : weightKg
  return decimals !== null ? parseFloat(weight.toFixed(decimals)) : weight
}

/**
 * Convert weight from display unit to kg for storage
 * @param {number} weight - Weight in display unit
 * @param {string} displayUnit - Current display unit ('kg' or 'lbs')
 * @returns {number|null} Weight in kg
 */
export const convertWeightForStorage = (weight, displayUnit = 'lbs') => {
  if (weight === null || weight === undefined || weight === '') return null

  return displayUnit === 'lbs' ? lbsToKg(weight) : weight
}

/**
 * Format weight for display with unit
 * @param {number} weightKg - Weight stored in kg
 * @param {string} displayUnit - Unit to display ('kg' or 'lbs')
 * @param {number} decimals - Number of decimal places (default 1)
 * @returns {string} Formatted weight with unit (e.g., "154.3 lbs" or "70.0 kg")
 */
export const formatWeight = (weightKg, displayUnit = 'lbs', decimals = 1) => {
  const converted = convertWeightForDisplay(weightKg, displayUnit, decimals)
  if (converted === null) return ''
  return `${converted} ${displayUnit}`
}
