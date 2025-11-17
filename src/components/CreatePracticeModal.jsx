import { useState } from 'react'
import { usePracticeStore } from '../store/practiceStore'
import { useAuthStore } from '../store/authStore'
import { addMonths, format } from 'date-fns'

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
    max_capacity: 22,
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

        result = await createRecurringPractice(
          {
            ...formData,
            created_by: user?.id,
          },
          recurrenceOptions
        )
      } else {
        result = await createPractice({
          ...formData,
          created_by: user?.id,
        })
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
          max_capacity: 22,
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Create Practice</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
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
                placeholder="Saturday Morning Practice"
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
              <select
                id="practice_type"
                name="practice_type"
                required
                className="input"
                value={formData.practice_type}
                onChange={handleChange}
              >
                <option value="water">Water Practice</option>
                <option value="land">Land Training</option>
                <option value="gym">Gym Session</option>
                <option value="meeting">Team Meeting</option>
              </select>
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-3 gap-4">
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
            <div className="border-t pt-4">
              <label className="flex items-center gap-2 cursor-pointer mb-4">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                />
                <span className="font-medium text-gray-900">Make this a recurring practice</span>
              </label>

              {isRecurring && (
                <div className="bg-blue-50 p-4 rounded-lg space-y-4">
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
                            className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                              recurrenceDays.includes(index)
                                ? 'bg-primary-600 text-white border-primary-600'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                      {recurrenceDays.length === 0 && (
                        <p className="text-xs text-red-600 mt-1">Please select at least one day</p>
                      )}
                    </div>
                  )}

                  {/* End Type Selection */}
                  <div>
                    <label className="label">End Recurrence</label>
                    <div className="space-y-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="recurrenceEndType"
                          value="date"
                          checked={recurrenceEndType === 'date'}
                          onChange={(e) => setRecurrenceEndType(e.target.value)}
                          className="text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700">On date:</span>
                        <input
                          type="date"
                          value={recurrenceEndDate}
                          onChange={(e) => setRecurrenceEndDate(e.target.value)}
                          disabled={recurrenceEndType !== 'date'}
                          className="input text-sm py-1"
                          min={formData.date}
                        />
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="recurrenceEndType"
                          value="count"
                          checked={recurrenceEndType === 'count'}
                          onChange={(e) => setRecurrenceEndType(e.target.value)}
                          className="text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700">After</span>
                        <input
                          type="number"
                          value={recurrenceCount}
                          onChange={(e) => setRecurrenceCount(parseInt(e.target.value) || 1)}
                          disabled={recurrenceEndType !== 'count'}
                          min="1"
                          max="52"
                          className="input w-20 text-sm py-1"
                        />
                        <span className="text-sm text-gray-700">occurrences</span>
                      </label>
                    </div>
                  </div>

                  {/* Preview */}
                  <div className="bg-white p-3 rounded border border-blue-200">
                    <p className="text-xs font-medium text-blue-800">
                      {recurrencePattern === 'daily' && 'Creates daily practices'}
                      {recurrencePattern === 'weekly' && recurrenceDays.length > 0 &&
                        `Creates practices every ${recurrenceDays.map(d => dayNames[d]).join(', ')}`}
                      {recurrencePattern === 'biweekly' && recurrenceDays.length > 0 &&
                        `Creates practices every other week on ${recurrenceDays.map(d => dayNames[d]).join(', ')}`}
                      {recurrencePattern === 'monthly' && 'Creates monthly practices on the same date'}
                      {recurrenceEndType === 'date' && recurrenceEndDate && ` until ${recurrenceEndDate}`}
                      {recurrenceEndType === 'count' && ` for ${recurrenceCount} occurrences`}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Location */}
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
                placeholder="Lake Marina"
              />
            </div>

            <div>
              <label htmlFor="location_address" className="label">
                Location Address
              </label>
              <input
                id="location_address"
                name="location_address"
                type="text"
                className="input"
                value={formData.location_address}
                onChange={handleChange}
                placeholder="123 Lake Street"
              />
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
              <p className="text-sm text-gray-500 mt-1">
                Default: 22 (20 paddlers + steersperson + drummer)
              </p>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-4">
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
                className="btn btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? 'Creating...'
                  : isRecurring
                    ? 'Create Recurring Series'
                    : 'Create Practice'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
