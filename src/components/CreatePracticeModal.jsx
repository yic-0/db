import { useState } from 'react'
import { usePracticeStore } from '../store/practiceStore'
import { useAuthStore } from '../store/authStore'

export default function CreatePracticeModal({ isOpen, onClose }) {
  const { createPractice } = usePracticeStore()
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

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const result = await createPractice({
      ...formData,
      created_by: user?.id,
    })

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
      onClose()
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

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Create Practice
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
