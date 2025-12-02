import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'
import Icon from './Icon'

/**
 * OnboardingForm - Three-tier onboarding system
 *
 * Props:
 * - mode: 'bare_bone' | 'full' - determines which fields to show
 * - onComplete: callback when form is submitted successfully
 * - showHeader: whether to show the form header (default: true)
 */
export default function OnboardingForm({ mode = 'bare_bone', onComplete, showHeader = true }) {
  const { profile, updateProfile } = useAuthStore()
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    // Bare-bone fields (required for trial members)
    full_name: '',
    phone: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    swimming_ability: '',
    physical_limitations: '',

    // Full onboarding fields (for committed members)
    dietary_restrictions: '',
    previous_sports_experience: '',
    medical_conditions: '',
    competitive_level: '',
    emergency_contact_relationship: '',
    secondary_emergency_name: '',
    secondary_emergency_phone: '',
    secondary_emergency_relationship: '',
  })

  // Pre-populate from existing profile
  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        emergency_contact_name: profile.emergency_contact_name || '',
        emergency_contact_phone: profile.emergency_contact_phone || '',
        swimming_ability: profile.swimming_ability || '',
        physical_limitations: profile.physical_limitations || '',
        dietary_restrictions: profile.dietary_restrictions || '',
        previous_sports_experience: profile.previous_sports_experience || '',
        medical_conditions: profile.medical_conditions || '',
        competitive_level: profile.competitive_level || '',
        emergency_contact_relationship: profile.emergency_contact_relationship || '',
        secondary_emergency_name: profile.secondary_emergency_name || '',
        secondary_emergency_phone: profile.secondary_emergency_phone || '',
        secondary_emergency_relationship: profile.secondary_emergency_relationship || '',
      })
    }
  }, [profile])

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validate required fields based on mode
      if (mode === 'bare_bone') {
        if (!formData.full_name.trim()) {
          toast.error('Name is required')
          return
        }
        if (!formData.emergency_contact_name.trim() || !formData.emergency_contact_phone.trim()) {
          toast.error('Emergency contact is required for safety')
          return
        }
        if (!formData.swimming_ability) {
          toast.error('Swimming ability is required for safety')
          return
        }
      }

      if (mode === 'full') {
        // Full mode requires everything from bare-bone plus more
        if (!formData.full_name.trim()) {
          toast.error('Name is required')
          return
        }
        if (!formData.emergency_contact_name.trim() || !formData.emergency_contact_phone.trim()) {
          toast.error('Emergency contact is required')
          return
        }
        if (!formData.swimming_ability) {
          toast.error('Swimming ability is required')
          return
        }
      }

      // Prepare update data
      const updateData = {
        full_name: formData.full_name.trim(),
        phone: formData.phone.trim() || null,
        emergency_contact_name: formData.emergency_contact_name.trim() || null,
        emergency_contact_phone: formData.emergency_contact_phone.trim() || null,
        swimming_ability: formData.swimming_ability || null,
        physical_limitations: formData.physical_limitations.trim() || null,
        onboarding_status: mode,
        onboarding_completed_at: new Date().toISOString(),
      }

      // Add full onboarding fields if in full mode
      if (mode === 'full') {
        updateData.dietary_restrictions = formData.dietary_restrictions.trim() || null
        updateData.previous_sports_experience = formData.previous_sports_experience.trim() || null
        updateData.medical_conditions = formData.medical_conditions.trim() || null
        updateData.competitive_level = formData.competitive_level || null
        updateData.emergency_contact_relationship = formData.emergency_contact_relationship.trim() || null
        updateData.secondary_emergency_name = formData.secondary_emergency_name.trim() || null
        updateData.secondary_emergency_phone = formData.secondary_emergency_phone.trim() || null
        updateData.secondary_emergency_relationship = formData.secondary_emergency_relationship.trim() || null
      }

      const result = await updateProfile(updateData)
      if (result.success) {
        toast.success(mode === 'bare_bone' ? 'Basic profile completed!' : 'Full profile completed!')
        onComplete?.()
      }
    } catch (error) {
      toast.error('Failed to save profile')
      console.error('Onboarding error:', error)
    } finally {
      setLoading(false)
    }
  }

  const isBarebone = mode === 'bare_bone'
  const title = isBarebone ? 'Quick Start Profile' : 'Complete Your Profile'
  const subtitle = isBarebone
    ? 'Just the essentials to get you started with the team'
    : 'Fill out your complete profile to join the team fully'

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {showHeader && (
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon name="profile" size={32} className="text-primary-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
          <p className="text-slate-600 mt-1">{subtitle}</p>
        </div>
      )}

      {/* Basic Information - Always shown */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Icon name="profile" size={20} className="text-primary-600" />
          Basic Information
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              className="input"
              placeholder="Your full name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="input"
              placeholder="Your phone number"
            />
          </div>
        </div>
      </div>

      {/* Emergency Contact - Required for all */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Icon name="phone" size={20} className="text-red-600" />
          Emergency Contact <span className="text-red-500 text-sm font-normal">(Required)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Contact Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="emergency_contact_name"
              value={formData.emergency_contact_name}
              onChange={handleChange}
              className="input"
              placeholder="Emergency contact name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Contact Phone <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              name="emergency_contact_phone"
              value={formData.emergency_contact_phone}
              onChange={handleChange}
              className="input"
              placeholder="Emergency contact phone"
              required
            />
          </div>

          {!isBarebone && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Relationship
              </label>
              <input
                type="text"
                name="emergency_contact_relationship"
                value={formData.emergency_contact_relationship}
                onChange={handleChange}
                className="input"
                placeholder="e.g., Spouse, Parent, Friend"
              />
            </div>
          )}
        </div>
      </div>

      {/* Safety Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Icon name="safety" size={20} className="text-amber-600" />
          Safety Information
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Swimming Ability <span className="text-red-500">*</span>
            </label>
            <select
              name="swimming_ability"
              value={formData.swimming_ability}
              onChange={handleChange}
              className="input"
              required
            >
              <option value="">Select your swimming ability</option>
              <option value="none">Cannot swim</option>
              <option value="basic">Basic (can float/tread water)</option>
              <option value="competent">Competent (can swim short distances)</option>
              <option value="strong">Strong swimmer</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Physical Limitations or Injuries
            </label>
            <textarea
              name="physical_limitations"
              value={formData.physical_limitations}
              onChange={handleChange}
              className="input"
              rows={2}
              placeholder="Any injuries, conditions, or limitations we should know about..."
            />
          </div>
        </div>
      </div>

      {/* Full Onboarding Fields */}
      {!isBarebone && (
        <>
          {/* Secondary Emergency Contact */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Icon name="team" size={20} className="text-blue-600" />
              Secondary Emergency Contact
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  name="secondary_emergency_name"
                  value={formData.secondary_emergency_name}
                  onChange={handleChange}
                  className="input"
                  placeholder="Secondary contact name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  name="secondary_emergency_phone"
                  value={formData.secondary_emergency_phone}
                  onChange={handleChange}
                  className="input"
                  placeholder="Secondary contact phone"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Relationship
                </label>
                <input
                  type="text"
                  name="secondary_emergency_relationship"
                  value={formData.secondary_emergency_relationship}
                  onChange={handleChange}
                  className="input"
                  placeholder="e.g., Sibling, Friend"
                />
              </div>
            </div>
          </div>

          {/* Health & Dietary */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Icon name="wellness" size={20} className="text-green-600" />
              Health & Dietary
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Medical Conditions
                </label>
                <textarea
                  name="medical_conditions"
                  value={formData.medical_conditions}
                  onChange={handleChange}
                  className="input"
                  rows={2}
                  placeholder="Any medical conditions coaches should be aware of (e.g., asthma, diabetes, heart conditions)..."
                />
                <p className="text-xs text-slate-500 mt-1">This information is kept confidential and only shared with coaches for safety purposes.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Dietary Restrictions / Allergies
                </label>
                <textarea
                  name="dietary_restrictions"
                  value={formData.dietary_restrictions}
                  onChange={handleChange}
                  className="input"
                  rows={2}
                  placeholder="Any food allergies or dietary restrictions..."
                />
              </div>
            </div>
          </div>

          {/* Experience & Goals */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Icon name="paddle" size={20} className="text-primary-600" />
              Experience & Goals
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Previous Sports Experience
                </label>
                <textarea
                  name="previous_sports_experience"
                  value={formData.previous_sports_experience}
                  onChange={handleChange}
                  className="input"
                  rows={2}
                  placeholder="Any relevant sports background (dragon boat, rowing, kayaking, team sports, etc.)..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Competitive Level / Expectations
                </label>
                <select
                  name="competitive_level"
                  value={formData.competitive_level}
                  onChange={handleChange}
                  className="input"
                >
                  <option value="">Select your goals</option>
                  <option value="recreational">Recreational - Fun and fitness focused</option>
                  <option value="competitive">Competitive - Want to race and improve</option>
                  <option value="elite">Elite - Serious competitor, aiming for top results</option>
                </select>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Submit Button */}
      <div className="pt-4 border-t border-slate-200">
        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary w-full"
        >
          {loading ? 'Saving...' : (isBarebone ? 'Complete Quick Start' : 'Complete Full Profile')}
        </button>

        {isBarebone && (
          <p className="text-center text-sm text-slate-500 mt-3">
            You can complete your full profile later from the Profile page
          </p>
        )}
      </div>
    </form>
  )
}
