import { useState } from 'react'
import { usePracticeStore } from '../store/practiceStore'
import { useAuthStore } from '../store/authStore'
import { addMonths, format } from 'date-fns'
import Icon from './Icon'
import { parseGoogleMapsLink } from '../utils/parseGoogleMapsLink'

export default function CreatePracticeModal({ isOpen, onClose }) {
  const { createPractice, createRecurringPractice } = usePracticeStore()
  const { user } = useAuthStore()

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    practice_type: 'water',
    date: '',
    start_time: '',
    end_time: '',
    location_name: '',
    location_address: '',
    location_link: '',
    max_capacity: 22,
    is_visible_to_members: false, // Default to hidden
    rsvp_visibility_hours: 0, // Default: visible on day of practice
    food_location_name: '',
    food_location_link: '',
  })

  // Recurrence state
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurrencePattern, setRecurrencePattern] = useState('weekly')
  const [recurrenceDays, setRecurrenceDays] = useState([]) // 0=Sun, 1=Mon, etc.
  const [recurrenceEndType, setRecurrenceEndType] = useState('date') // 'date' or 'count'
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('')
  const [recurrenceCount, setRecurrenceCount] = useState(10)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleDayToggle = (dayIndex) => {
    setRecurrenceDays(prev =>
      prev.includes(dayIndex)
        ? prev.filter(d => d !== dayIndex)
        : [...prev, dayIndex].sort((a, b) => a - b)
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      let result

      // Parse food location link for coordinates
      const foodLocationParsed = formData.food_location_link
        ? parseGoogleMapsLink(formData.food_location_link)
        : { lat: null, lng: null, name: null }

      // Clean the data - convert empty strings to null for optional fields
      const cleanedData = {
        ...formData,
        end_time: formData.end_time || null,
        location_address: formData.location_address || null,
        description: formData.description || null,
        created_by: user?.id,
        food_location_name: formData.food_location_name || foodLocationParsed.name || null,
        food_location_link: formData.food_location_link || null,
        food_location_lat: foodLocationParsed.lat,
        food_location_lng: foodLocationParsed.lng,
      }

      if (isRecurring) {
        // Validate recurrence settings
        if ((recurrencePattern === 'weekly' || recurrencePattern === 'biweekly') && recurrenceDays.length === 0) {
          alert('Please select at least one day for weekly/biweekly recurrence')
          setIsSubmitting(false)
          return
        }

        const recurrenceOptions = {
          pattern: recurrencePattern,
          days: recurrenceDays.length > 0 ? recurrenceDays : null,
          endDate: recurrenceEndType === 'date' ? recurrenceEndDate : null,
          count: recurrenceEndType === 'count' ? recurrenceCount : null
        }

        result = await createRecurringPractice(cleanedData, recurrenceOptions)
      } else {
        result = await createPractice(cleanedData)
      }

      if (result.success) {
        // Reset form
        setFormData({
          title: '',
          description: '',
          practice_type: 'water',
          date: '',
          start_time: '',
          end_time: '',
          location_name: '',
          location_address: '',
          location_link: '',
          max_capacity: 22,
          is_visible_to_members: false, // Reset to hidden
          rsvp_visibility_hours: 0, // Reset to day of practice
          food_location_name: '',
          food_location_link: '',
        })
        setIsRecurring(false)
        setRecurrencePattern('weekly')
        setRecurrenceDays([])
        setRecurrenceEndType('date')
        setRecurrenceEndDate('')
        setRecurrenceCount(10)
        onClose()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Auto-set default end date when date is selected
  const handleDateChange = (e) => {
    const newDate = e.target.value
    setFormData({ ...formData, date: newDate })

    // Set default recurrence end date to 3 months from start
    if (newDate && !recurrenceEndDate) {
      const defaultEnd = addMonths(new Date(newDate), 3)
      setRecurrenceEndDate(format(defaultEnd, 'yyyy-MM-dd'))
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="text-xl font-bold text-slate-900">Create Practice</h2>
          <button
            onClick={onClose}
            className="p-2 bg-white hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors shadow-sm border border-slate-200"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          <form id="create-practice-form" onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label htmlFor="title" className="label">
                Practice Title *
              </label>
              <input
                id="title"
                name="title"
                type="text"
                required
                className="input"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g., Saturday Morning Practice"
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="label">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                className="input"
                value={formData.description}
                onChange={handleChange}
                placeholder="Focus on timing and technique..."
              />
            </div>

            {/* Type */}
            <div>
              <label htmlFor="practice_type" className="label">
                Practice Type *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'water', label: 'Water', icon: 'boat' },
                  { id: 'land', label: 'Land', icon: 'workouts' },
                  { id: 'gym', label: 'Gym', icon: 'fire' },
                  { id: 'meeting', label: 'Meeting', icon: 'announcements' },
                ].map(type => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, practice_type: type.id })}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                      formData.practice_type === type.id
                        ? 'bg-primary-50 border-primary-500 text-primary-700 ring-1 ring-primary-500'
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <Icon name={type.icon} size={20} className="mb-1" />
                    <span className="text-xs font-bold">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="date" className="label">
                  {isRecurring ? 'Start Date *' : 'Date *'}
                </label>
                <input
                  id="date"
                  name="date"
                  type="date"
                  required
                  className="input"
                  value={formData.date}
                  onChange={handleDateChange}
                />
              </div>

              <div>
                <label htmlFor="start_time" className="label">
                  Start Time *
                </label>
                <input
                  id="start_time"
                  name="start_time"
                  type="time"
                  required
                  className="input"
                  value={formData.start_time}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label htmlFor="end_time" className="label">
                  End Time
                </label>
                <input
                  id="end_time"
                  name="end_time"
                  type="time"
                  className="input"
                  value={formData.end_time}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Recurrence Options */}
            <div className="border-t border-slate-100 pt-6">
              <label className="flex items-center gap-3 cursor-pointer mb-4 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                <div className={`w-5 h-5 rounded border flex items-center justify-center ${isRecurring ? 'bg-primary-600 border-primary-600' : 'bg-white border-slate-300'}`}>
                  {isRecurring && <Icon name="check" size={14} className="text-white" />}
                </div>
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="hidden"
                />
                <div>
                  <span className="block font-bold text-slate-900">Recurring Practice</span>
                  <span className="block text-xs text-slate-500">Repeat this event daily, weekly, or monthly</span>
                </div>
              </label>

              {isRecurring && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4 animate-fadeIn">
                  {/* Pattern Selection */}
                  <div>
                    <label className="label">Repeat Pattern</label>
                    <select
                      value={recurrencePattern}
                      onChange={(e) => setRecurrencePattern(e.target.value)}
                      className="input"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Every 2 Weeks</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>

                  {/* Day Selection for Weekly/Biweekly */}
                  {(recurrencePattern === 'weekly' || recurrencePattern === 'biweekly') && (
                    <div>
                      <label className="label">Repeat On</label>
                      <div className="flex gap-2 flex-wrap">
                        {dayNames.map((day, index) => (
                          <button
                            key={day}
                            type="button"
                            onClick={() => handleDayToggle(index)}
                            className={`w-10 h-10 rounded-lg text-xs font-bold transition-all ${
                              recurrenceDays.includes(index)
                                ? 'bg-primary-600 text-white shadow-md transform scale-105'
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {day.slice(0, 1)}
                          </button>
                        ))}
                      </div>
                      {recurrenceDays.length === 0 && (
                        <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                          <Icon name="close" size={12} /> Please select at least one day
                        </p>
                      )}
                    </div>
                  )}

                  {/* End Type Selection */}
                  <div>
                    <label className="label">End Recurrence</label>
                    <div className="space-y-3 bg-white p-3 rounded-lg border border-slate-200">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="radio"
                          name="recurrenceEndType"
                          value="date"
                          checked={recurrenceEndType === 'date'}
                          onChange={(e) => setRecurrenceEndType(e.target.value)}
                          className="text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-slate-700 w-20">On date:</span>
                        <input
                          type="date"
                          value={recurrenceEndDate}
                          onChange={(e) => setRecurrenceEndDate(e.target.value)}
                          disabled={recurrenceEndType !== 'date'}
                          className="input text-sm py-1 h-8"
                          min={formData.date}
                        />
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="radio"
                          name="recurrenceEndType"
                          value="count"
                          checked={recurrenceEndType === 'count'}
                          onChange={(e) => setRecurrenceEndType(e.target.value)}
                          className="text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-slate-700 w-20">After:</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={recurrenceCount}
                            onChange={(e) => setRecurrenceCount(parseInt(e.target.value) || 1)}
                            disabled={recurrenceEndType !== 'count'}
                            min="1"
                            max="52"
                            className="input w-20 text-sm py-1 h-8"
                          />
                          <span className="text-sm text-slate-500">occurrences</span>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Location & Capacity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="location_name" className="label">
                  Location Name *
                </label>
                <input
                  id="location_name"
                  name="location_name"
                  type="text"
                  required
                  className="input"
                  value={formData.location_name}
                  onChange={handleChange}
                  placeholder="e.g., Lake Marina"
                />
              </div>
              <div>
                <label htmlFor="location_link" className="label">
                  Location Link (optional)
                </label>
                <input
                  id="location_link"
                  name="location_link"
                  type="url"
                  className="input"
                  value={formData.location_link}
                  onChange={handleChange}
                  placeholder="Google Maps or other link"
                />
              </div>
            </div>

            {/* Capacity */}
            <div>
              <label htmlFor="max_capacity" className="label">
                Max Capacity
              </label>
              <input
                id="max_capacity"
                name="max_capacity"
                type="number"
                min="1"
                className="input"
                value={formData.max_capacity}
                onChange={handleChange}
              />
            </div>

            {/* Food Location (Optional) */}
            <div className="border-t border-slate-100 pt-6">
              <div className="flex items-center gap-2 mb-3">
                <Icon name="location" size={18} className="text-amber-500" />
                <span className="font-bold text-slate-900">Post-Practice Food</span>
                <span className="text-xs text-slate-400">(optional)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="food_location_name" className="label">
                    Restaurant/Place Name
                  </label>
                  <input
                    id="food_location_name"
                    name="food_location_name"
                    type="text"
                    className="input"
                    value={formData.food_location_name}
                    onChange={handleChange}
                    placeholder="e.g., Chipotle, Local Diner"
                  />
                </div>
                <div>
                  <label htmlFor="food_location_link" className="label">
                    Google Maps Link
                  </label>
                  <input
                    id="food_location_link"
                    name="food_location_link"
                    type="url"
                    className="input"
                    value={formData.food_location_link}
                    onChange={(e) => {
                      handleChange(e)
                      // Auto-fill name from link if empty
                      if (!formData.food_location_name && e.target.value) {
                        const parsed = parseGoogleMapsLink(e.target.value)
                        if (parsed.name) {
                          setFormData(prev => ({ ...prev, food_location_name: parsed.name }))
                        }
                      }
                    }}
                    placeholder="Paste Google Maps link"
                  />
                  {formData.food_location_link && parseGoogleMapsLink(formData.food_location_link).isValid && (
                    <p className="text-xs text-success-600 mt-1 flex items-center gap-1">
                      <Icon name="check" size={12} />
                      Valid Google Maps link
                      {parseGoogleMapsLink(formData.food_location_link).hasCoordinates && ' (coordinates extracted)'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* RSVP Visibility Control */}
            <div className="border-t border-slate-100 pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Icon name="clock" size={18} className="text-primary-500" />
                <h3 className="font-bold text-slate-900">RSVP Visibility</h3>
              </div>
              <p className="text-sm text-slate-600 mb-4">
                Control when regular paddlers can see who's attending. Admins and coaches can always see all RSVPs.
              </p>
              <div>
                <label htmlFor="rsvp_visibility_hours" className="label">
                  Show RSVPs to paddlers
                </label>
                <select
                  id="rsvp_visibility_hours"
                  name="rsvp_visibility_hours"
                  className="input"
                  value={formData.rsvp_visibility_hours}
                  onChange={handleChange}
                >
                  <option value="0">On day of practice (default)</option>
                  <option value="6">6 hours before</option>
                  <option value="12">12 hours before</option>
                  <option value="24">1 day before</option>
                  <option value="48">2 days before</option>
                  <option value="72">3 days before</option>
                  <option value="168">1 week before</option>
                </select>
                <p className="text-xs text-slate-500 mt-2">
                  Regular paddlers will only see "yes" responses (not "no" or "maybe") after this time.
                </p>
              </div>
            </div>

            {/* Visibility checkbox */}
            <div className="bg-primary-50 border border-primary-100 rounded-xl p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_visible_to_members}
                  onChange={(e) => setFormData({ ...formData, is_visible_to_members: e.target.checked })}
                  className="mt-1 w-4 h-4 text-primary-600 rounded focus:ring-primary-500 border-primary-300"
                />
                <div className="flex-1">
                  <div className="font-bold text-primary-900">Visible to Paddlers</div>
                  <p className="text-xs text-primary-700 mt-0.5">
                    {formData.is_visible_to_members
                      ? 'Paddlers will see this practice immediately.'
                      : 'Hidden draft. Only admins see this.'}
                  </p>
                </div>
              </label>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="create-practice-form"
            className="btn btn-primary shadow-lg shadow-primary-600/20"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? 'Creating...'
              : isRecurring
                ? 'Create Series'
                : 'Create Practice'}
          </button>
        </div>
      </div>
    </div>
  )
}