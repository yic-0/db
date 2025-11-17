import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { usePracticeStore } from '../store/practiceStore'
import { useAuthStore } from '../store/authStore'

export default function EditPracticeModal({ isOpen, onClose, practice }) {
  const { updatePractice, updateSingleInstance, updateEntireSeries, getParentPractice } = usePracticeStore()
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
    status: 'scheduled',
  })
  const [initialData, setInitialData] = useState(null)
  const [showSeriesChoice, setShowSeriesChoice] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Check if this practice is part of a recurring series
  const isPartOfSeries = practice?.parent_practice_id || practice?.is_recurring
  const isRecurringParent = practice?.is_recurring === true

  // Populate form when practice changes
  useEffect(() => {
    if (practice) {
      const nextData = {
        title: practice.title || '',
        description: practice.description || '',
        practice_type: practice.practice_type || 'water',
        date: practice.date || '',
        start_time: practice.start_time || '',
        end_time: practice.end_time || '',
        location_name: practice.location_name || '',
        location_address: practice.location_address || '',
        max_capacity: practice.max_capacity || 22,
        status: practice.status || 'scheduled',
      }
      setFormData(nextData)
      setInitialData(nextData)
      setShowSeriesChoice(false)
    }
  }, [practice])

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!user) {
      toast.error('You must be signed in to update a practice.')
      return
    }

    if (!practice?.id) {
      toast.error('No practice selected.')
      return
    }

    if (initialData && JSON.stringify(formData) === JSON.stringify(initialData)) {
      toast('No changes to save', { icon: 'ℹ️' })
      return
    }

    // If this is part of a series and we haven't shown the choice yet, show it
    if (isPartOfSeries && !showSeriesChoice) {
      setShowSeriesChoice(true)
      return
    }

    // Otherwise proceed with regular update
    await performUpdate('single')
  }

  const performUpdate = async (updateType) => {
    setIsSubmitting(true)

    try {
      let result

      if (updateType === 'single') {
        // Update only this instance
        if (practice.parent_practice_id) {
          // This is a child instance - mark as exception
          result = await updateSingleInstance(practice.id, formData)
        } else {
          // Regular practice or parent practice (update just itself)
          result = await updatePractice(practice.id, formData)
        }
      } else if (updateType === 'series') {
        // Update entire series
        const parentId = practice.parent_practice_id || practice.id
        // For series update, don't change the date (each instance keeps its own date)
        const seriesUpdates = { ...formData }
        delete seriesUpdates.date // Don't update individual dates for series
        result = await updateEntireSeries(parentId, seriesUpdates)
      }

      if (result?.success) {
        setShowSeriesChoice(false)
        onClose()
      } else {
        console.error('Failed to update practice:', result?.error)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen || !practice) return null

  // Show series choice dialog
  if (showSeriesChoice && isPartOfSeries) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Edit Recurring Practice</h2>
            <p className="text-gray-600 mb-6">
              This practice is part of a recurring series. How would you like to apply your changes?
            </p>

            {practice.is_exception && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> This instance was already modified from the series.
                </p>
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={() => performUpdate('single')}
                disabled={isSubmitting}
                className="w-full btn btn-secondary text-left flex flex-col items-start py-3"
              >
                <span className="font-semibold">This practice only</span>
                <span className="text-xs text-gray-500">
                  Only update this specific date. Other practices in the series won't change.
                </span>
              </button>

              <button
                onClick={() => performUpdate('series')}
                disabled={isSubmitting}
                className="w-full btn btn-primary text-left flex flex-col items-start py-3"
              >
                <span className="font-semibold">All future practices in series</span>
                <span className="text-xs text-white/80">
                  Update this and all future unmodified practices in the series (except dates).
                </span>
              </button>
            </div>

            <button
              onClick={() => setShowSeriesChoice(false)}
              disabled={isSubmitting}
              className="w-full mt-4 text-gray-500 hover:text-gray-700 text-sm"
            >
              Back to editing
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Edit Practice</h2>
              {isPartOfSeries && (
                <p className="text-sm text-blue-600 mt-1">
                  This practice is part of a recurring series
                  {practice.is_exception && ' (modified from series)'}
                </p>
              )}
            </div>
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
                  Date *
                </label>
                <input
                  id="date"
                  name="date"
                  type="date"
                  required
                  className="input"
                  value={formData.date}
                  onChange={handleChange}
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

            {/* Status */}
            <div>
              <label htmlFor="status" className="label">
                Status *
              </label>
              <select
                id="status"
                name="status"
                required
                className="input"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
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
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
