import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'

export default function Profile() {
  const { profile, updateProfile, hasRole } = useAuthStore()

  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
    emergency_contact_name: profile?.emergency_contact_name || '',
    emergency_contact_phone: profile?.emergency_contact_phone || '',
    preferred_side: profile?.preferred_side || 'either',
    skill_level: profile?.skill_level || 'novice',
    weight_kg: profile?.weight_kg || '',
    height_cm: profile?.height_cm || '',
    can_steer: profile?.can_steer || false,
    can_drum: profile?.can_drum || false,
  })
  const [initialFormData, setInitialFormData] = useState(null)

  // Update form data when profile changes
  useEffect(() => {
    if (profile) {
      const nextForm = {
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        emergency_contact_name: profile.emergency_contact_name || '',
        emergency_contact_phone: profile.emergency_contact_phone || '',
        preferred_side: profile.preferred_side || 'either',
        skill_level: profile.skill_level || 'novice',
        weight_kg: profile.weight_kg || '',
        height_cm: profile.height_cm || '',
        can_steer: profile.can_steer || false,
        can_drum: profile.can_drum || false,
      }
      setFormData(nextForm)
      setInitialFormData(nextForm)
    }
  }, [profile])

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setFormData({
      ...formData,
      [e.target.name]: value,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const normalizeProfileData = (data) => ({
      ...data,
      weight_kg: data.weight_kg === '' ? null : parseFloat(data.weight_kg),
      height_cm: data.height_cm === '' ? null : parseInt(data.height_cm),
      phone: data.phone || null,
      emergency_contact_name: data.emergency_contact_name || null,
      emergency_contact_phone: data.emergency_contact_phone || null,
    })

    // Clean up the data - convert empty strings to null for numeric fields
    const cleanData = normalizeProfileData(formData)
    const baseline = normalizeProfileData(initialFormData || formData)

    if (JSON.stringify(cleanData) === JSON.stringify(baseline)) {
      toast('No changes to save', { icon: 'ℹ️' })
      return
    }

    await updateProfile(cleanData)
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">My Profile</h1>

      <div className="card max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Basic Information
            </h2>

            <div className="space-y-4">
              <div>
                <label htmlFor="full_name" className="label">
                  Full Name
                </label>
                <input
                  id="full_name"
                  name="full_name"
                  type="text"
                  className="input"
                  value={formData.full_name}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label htmlFor="phone" className="label">
                  Phone Number
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  className="input"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="(555) 867-5309"
                />
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Emergency Contact
            </h2>

            <div className="space-y-4">
              <div>
                <label htmlFor="emergency_contact_name" className="label">
                  Name
                </label>
                <input
                  id="emergency_contact_name"
                  name="emergency_contact_name"
                  type="text"
                  className="input"
                  value={formData.emergency_contact_name}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label htmlFor="emergency_contact_phone" className="label">
                  Phone Number
                </label>
                <input
                  id="emergency_contact_phone"
                  name="emergency_contact_phone"
                  type="tel"
                  className="input"
                  value={formData.emergency_contact_phone}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* Dragon Boat Info */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Dragon Boat Preferences
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="preferred_side" className="label">
                  Preferred Side
                </label>
                <select
                  id="preferred_side"
                  name="preferred_side"
                  className="input"
                  value={formData.preferred_side}
                  onChange={handleChange}
                >
                  <option value="either">Either</option>
                  <option value="left">Left</option>
                  <option value="right">Right</option>
                </select>
              </div>

              {(hasRole('admin') || hasRole('coach')) && (
                <div>
                  <label htmlFor="skill_level" className="label">
                    Skill Level
                  </label>
                  <select
                    id="skill_level"
                    name="skill_level"
                    className="input"
                    value={formData.skill_level}
                    onChange={handleChange}
                  >
                    <option value="novice">Novice</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                    <option value="competitive">Competitive</option>
                  </select>
                </div>
              )}

              <div>
                <label htmlFor="weight_kg" className="label">
                  Weight (kg)
                </label>
                <input
                  id="weight_kg"
                  name="weight_kg"
                  type="number"
                  step="0.1"
                  className="input"
                  value={formData.weight_kg}
                  onChange={handleChange}
                  placeholder="70"
                />
              </div>

              <div>
                <label htmlFor="height_cm" className="label">
                  Height (cm)
                </label>
                <input
                  id="height_cm"
                  name="height_cm"
                  type="number"
                  className="input"
                  value={formData.height_cm}
                  onChange={handleChange}
                  placeholder="170"
                />
              </div>
            </div>
          </div>

          {/* Special Skills/Certifications (Admin/Coach Only) */}
          {(hasRole('admin') || hasRole('coach')) && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Special Skills & Certifications
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                These indicate qualification to perform specialized roles
              </p>

              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="can_steer"
                    checked={formData.can_steer}
                    onChange={handleChange}
                    className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                  />
                  <div>
                    <span className="font-medium text-gray-900">Can Steer</span>
                    <p className="text-sm text-gray-600">Qualified to steer the dragon boat</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="can_drum"
                    checked={formData.can_drum}
                    onChange={handleChange}
                    className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                  />
                  <div>
                    <span className="font-medium text-gray-900">Can Drum</span>
                    <p className="text-sm text-gray-600">Qualified to drum for the team</p>
                  </div>
                </label>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button type="submit" className="btn btn-primary">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
