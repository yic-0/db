import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { usePracticeStore } from '../store/practiceStore'
import { useAuthStore } from '../store/authStore'
import Icon from './Icon'
import { parseGoogleMapsLink } from '../utils/parseGoogleMapsLink'

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
    location_link: '',
    max_capacity: 22,
    status: 'scheduled',
    is_visible_to_members: false,
    rsvp_visibility_hours: 0,
    food_location_name: '',
    food_location_link: '',
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
        location_link: practice.location_link || '',
        max_capacity: practice.max_capacity || 22,
        status: practice.status || 'scheduled',
        is_visible_to_members: practice.is_visible_to_members || false,
        rsvp_visibility_hours: practice.rsvp_visibility_hours ?? 0,
        food_location_name: practice.food_location_name || '',
        food_location_link: practice.food_location_link || '',
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

    // Get fresh user from store to avoid stale closure
    const currentUser = useAuthStore.getState().user
    if (!currentUser) {
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

      // Clean the data - convert empty strings to null for optional fields
      // Parse food location link if provided
      const foodLocationParsed = formData.food_location_link
        ? parseGoogleMapsLink(formData.food_location_link)
        : { lat: null, lng: null, name: null }

      const cleanedData = {
        ...formData,
        end_time: formData.end_time || null,
        location_address: formData.location_address || null,
        description: formData.description || null,
        food_location_name: formData.food_location_name || foodLocationParsed.name || null,
        food_location_link: formData.food_location_link || null,
        food_location_lat: foodLocationParsed.lat,
        food_location_lng: foodLocationParsed.lng,
      }

      if (updateType === 'single') {
        // Update only this instance
        if (practice.parent_practice_id) {
          // This is a child instance - mark as exception
          result = await updateSingleInstance(practice.id, cleanedData)
        } else {
          // Regular practice or parent practice (update just itself)
          result = await updatePractice(practice.id, cleanedData)
        }
      } else if (updateType === 'series') {
        // Update entire series
        const parentId = practice.parent_practice_id || practice.id
        // For series update, don't change the date (each instance keeps its own date)
        const seriesUpdates = { ...cleanedData }
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
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-600">
              <Icon name="calendar" size={20} />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Update Recurring Series</h2>
          </div>
          
          <p className="text-slate-600 mb-6 text-sm">
            This practice is part of a recurring series. How would you like to apply your changes?
          </p>

          {practice.is_exception && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 flex gap-3">
              <Icon name="clock" size={20} className="text-amber-600 shrink-0" />
              <p className="text-xs text-amber-800">
                <strong>Note:</strong> This specific practice has previous edits that differ from the rest of the series.
              </p>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={() => performUpdate('single')}
              disabled={isSubmitting}
              className="w-full p-4 rounded-xl border border-slate-200 hover:border-primary-500 hover:bg-primary-50 transition-all text-left group"
            >
              <span className="block font-bold text-slate-900 group-hover:text-primary-700">This practice only</span>
              <span className="block text-xs text-slate-500 mt-1">
                Updates only this specific date. The rest of the series remains unchanged.
              </span>
            </button>

            <button
              onClick={() => performUpdate('series')}
              disabled={isSubmitting}
              className="w-full p-4 rounded-xl border border-slate-200 hover:border-primary-500 hover:bg-primary-50 transition-all text-left group"
            >
              <span className="block font-bold text-slate-900 group-hover:text-primary-700">All future practices</span>
              <span className="block text-xs text-slate-500 mt-1">
                Updates this and all following practices in the series (except dates).
              </span>
            </button>
          </div>

          <button
            onClick={() => setShowSeriesChoice(false)}
            disabled={isSubmitting}
            className="w-full mt-4 text-slate-400 hover:text-slate-600 text-xs font-medium uppercase tracking-wider"
          >
            Back to Editing
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Edit Practice</h2>
            {isPartOfSeries && (
              <div className="flex items-center gap-1 mt-1 text-xs text-primary-600 font-medium">
                <Icon name="calendar" size={12} />
                Part of a recurring series
                {practice.is_exception && ' (modified)'}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-white hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors shadow-sm border border-slate-200"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          <form id="edit-practice-form" onSubmit={handleSubmit} className="space-y-6">
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

            {/* Status & Visibility */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div>
                  <label htmlFor="status" className="label">Status</label>
                  <select
                    id="status"
                    name="status"
                    className="input"
                    value={formData.status}
                    onChange={handleChange}
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
               </div>

               <div className="bg-primary-50 border border-primary-100 rounded-lg p-3 flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="is_visible"
                    checked={formData.is_visible_to_members}
                    onChange={(e) => setFormData({ ...formData, is_visible_to_members: e.target.checked })}
                    className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500 border-primary-300"
                  />
                  <label htmlFor="is_visible" className="text-sm font-bold text-primary-900 cursor-pointer select-none">
                     Visible to Paddlers
                  </label>
               </div>
            </div>

            {/* Food Location (optional) */}
            <div className="border-t border-slate-100 pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Icon name="location" size={18} className="text-orange-500" />
                <h3 className="font-bold text-slate-900">Post-Practice Food</h3>
                <span className="text-xs text-slate-400">(optional)</span>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="food_location_link" className="label">
                    Google Maps Link
                  </label>
                  <input
                    id="food_location_link"
                    name="food_location_link"
                    type="url"
                    placeholder="Paste a Google Maps link..."
                    className="input"
                    value={formData.food_location_link}
                    onChange={(e) => {
                      const link = e.target.value
                      setFormData(prev => ({ ...prev, food_location_link: link }))

                      // Auto-fill name if empty and link is valid
                      if (link && !formData.food_location_name) {
                        const parsed = parseGoogleMapsLink(link)
                        if (parsed.name) {
                          setFormData(prev => ({ ...prev, food_location_name: parsed.name }))
                        }
                      }
                    }}
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    Paste a Google Maps link and the name will auto-fill
                  </p>
                </div>

                <div>
                  <label htmlFor="food_location_name" className="label">
                    Place Name
                  </label>
                  <input
                    id="food_location_name"
                    name="food_location_name"
                    type="text"
                    placeholder="e.g., Pho Express, Tim Hortons..."
                    className="input"
                    value={formData.food_location_name}
                    onChange={handleChange}
                  />
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
            form="edit-practice-form"
            className="btn btn-primary shadow-lg shadow-primary-600/20"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}