import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'
import { supabase } from '../lib/supabase'
import { convertWeightForDisplay, convertWeightForStorage } from '../utils/weightConverter'
import { convertHeightForDisplay, feetInchesToCm } from '../utils/heightConverter'
import OnboardingForm from '../components/OnboardingForm'
import NotificationSettings from '../components/NotificationSettings'
import AddressSearchInput from '../components/AddressSearchInput'
import Icon from '../components/Icon'

export default function Profile() {
  const { profile, updateProfile, hasRole } = useAuthStore()
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [onboardingMode, setOnboardingMode] = useState('bare_bone')

  // Saved locations state
  const [savedLocations, setSavedLocations] = useState([])
  const [loadingLocations, setLoadingLocations] = useState(true)
  const [editingLocation, setEditingLocation] = useState(null) // null, 'new', or location id
  const [locationForm, setLocationForm] = useState({
    label: '',
    address: '',
    lat: null,
    lng: null,
    is_default: false
  })

  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
    birthday: profile?.birthday || '',
    member_type: profile?.member_type || 'community',
    emergency_contact_name: profile?.emergency_contact_name || '',
    emergency_contact_phone: profile?.emergency_contact_phone || '',
    preferred_side: profile?.preferred_side || 'either',
    skill_level: profile?.skill_level || 'novice',
    weight_lbs: profile?.weight_kg ? convertWeightForDisplay(profile.weight_kg, 'lbs', 1) : '',
    height_feet: profile?.height_cm ? convertHeightForDisplay(profile.height_cm, 'ftin')?.feet : '',
    height_inches: profile?.height_cm ? convertHeightForDisplay(profile.height_cm, 'ftin')?.inches : '',
    gender: profile?.gender || '',
    can_steer: profile?.can_steer || false,
    can_drum: profile?.can_drum || false,
    is_active: profile?.is_active !== false, // default to true if not explicitly false
  })
  const [initialFormData, setInitialFormData] = useState(null)

  // Update form data when profile changes
  useEffect(() => {
    if (profile) {
      const heightFtIn = convertHeightForDisplay(profile.height_cm, 'ftin')
      const nextForm = {
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        birthday: profile.birthday || '',
        member_type: profile.member_type || 'community',
        emergency_contact_name: profile.emergency_contact_name || '',
        emergency_contact_phone: profile.emergency_contact_phone || '',
        preferred_side: profile.preferred_side || 'either',
        skill_level: profile.skill_level || 'novice',
        weight_lbs: profile.weight_kg ? convertWeightForDisplay(profile.weight_kg, 'lbs', 1) : '',
        height_feet: heightFtIn?.feet || '',
        height_inches: heightFtIn?.inches || '',
        gender: profile.gender || '',
        can_steer: profile.can_steer || false,
        can_drum: profile.can_drum || false,
        is_active: profile.is_active !== false, // default to true if not explicitly false
      }
      setFormData(nextForm)
      setInitialFormData(nextForm)
    }
  }, [profile])

  // Load saved locations
  useEffect(() => {
    const loadSavedLocations = async () => {
      if (!profile?.id) return

      try {
        const { data, error } = await supabase
          .from('user_saved_locations')
          .select('*')
          .eq('user_id', profile.id)
          .order('is_default', { ascending: false })
          .order('label')

        if (error) throw error
        setSavedLocations(data || [])
      } catch (err) {
        console.error('Error loading saved locations:', err)
      } finally {
        setLoadingLocations(false)
      }
    }

    loadSavedLocations()
  }, [profile?.id])

  // Save a new location or update existing
  const handleSaveLocation = async () => {
    if (!locationForm.label.trim()) {
      toast.error('Please enter a label for this location')
      return
    }
    if (!locationForm.address.trim() || !locationForm.lat || !locationForm.lng) {
      toast.error('Please search and select an address')
      return
    }

    try {
      const locationData = {
        user_id: profile.id,
        label: locationForm.label.trim(),
        address: locationForm.address.trim(),
        lat: locationForm.lat,
        lng: locationForm.lng,
        is_default: locationForm.is_default,
        updated_at: new Date().toISOString()
      }

      // If setting as default, unset other defaults first
      if (locationForm.is_default) {
        await supabase
          .from('user_saved_locations')
          .update({ is_default: false })
          .eq('user_id', profile.id)
      }

      if (editingLocation === 'new') {
        // Insert new location
        const { data, error } = await supabase
          .from('user_saved_locations')
          .insert([locationData])
          .select()
          .single()

        if (error) throw error
        setSavedLocations(prev => [...prev, data].sort((a, b) => {
          if (a.is_default !== b.is_default) return b.is_default ? 1 : -1
          return a.label.localeCompare(b.label)
        }))
        toast.success('Location saved!')
      } else {
        // Update existing location
        const { data, error } = await supabase
          .from('user_saved_locations')
          .update(locationData)
          .eq('id', editingLocation)
          .select()
          .single()

        if (error) throw error
        setSavedLocations(prev =>
          prev.map(loc => loc.id === editingLocation ? data : loc)
            .sort((a, b) => {
              if (a.is_default !== b.is_default) return b.is_default ? 1 : -1
              return a.label.localeCompare(b.label)
            })
        )
        toast.success('Location updated!')
      }

      setEditingLocation(null)
      setLocationForm({ label: '', address: '', lat: null, lng: null, is_default: false })
    } catch (err) {
      console.error('Error saving location:', err)
      toast.error(err.message || 'Failed to save location')
    }
  }

  // Delete a saved location
  const handleDeleteLocation = async (locationId) => {
    if (!confirm('Are you sure you want to delete this saved location?')) return

    try {
      const { error } = await supabase
        .from('user_saved_locations')
        .delete()
        .eq('id', locationId)

      if (error) throw error
      setSavedLocations(prev => prev.filter(loc => loc.id !== locationId))
      toast.success('Location deleted')
    } catch (err) {
      console.error('Error deleting location:', err)
      toast.error('Failed to delete location')
    }
  }

  // Start editing a location
  const handleEditLocation = (location) => {
    setEditingLocation(location.id)
    setLocationForm({
      label: location.label,
      address: location.address,
      lat: location.lat,
      lng: location.lng,
      is_default: location.is_default
    })
  }

  // Set a location as default
  const handleSetDefault = async (locationId) => {
    try {
      // Unset all defaults first
      await supabase
        .from('user_saved_locations')
        .update({ is_default: false })
        .eq('user_id', profile.id)

      // Set the selected one as default
      const { error } = await supabase
        .from('user_saved_locations')
        .update({ is_default: true })
        .eq('id', locationId)

      if (error) throw error

      setSavedLocations(prev =>
        prev.map(loc => ({ ...loc, is_default: loc.id === locationId }))
          .sort((a, b) => {
            if (a.is_default !== b.is_default) return b.is_default ? 1 : -1
            return a.label.localeCompare(b.label)
          })
      )
      toast.success('Default location updated')
    } catch (err) {
      console.error('Error setting default:', err)
      toast.error('Failed to set default location')
    }
  }

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
      full_name: data.full_name,
      phone: data.phone || null,
      birthday: data.birthday || null,
      member_type: data.member_type || 'community',
      emergency_contact_name: data.emergency_contact_name || null,
      emergency_contact_phone: data.emergency_contact_phone || null,
      preferred_side: data.preferred_side,
      skill_level: data.skill_level,
      weight_kg: data.weight_lbs === '' ? null : convertWeightForStorage(parseFloat(data.weight_lbs), 'lbs'),
      height_cm: (data.height_feet === '' && data.height_inches === '') ? null : feetInchesToCm(data.height_feet, data.height_inches),
      gender: data.gender || null,
      can_steer: data.can_steer,
      can_drum: data.can_drum,
      is_active: data.is_active,
    })

    // Clean up the data - convert lbs to kg and ft/in to cm
    const cleanData = normalizeProfileData(formData)
    const baseline = normalizeProfileData(initialFormData || formData)

    if (JSON.stringify(cleanData) === JSON.stringify(baseline)) {
      toast('No changes to save', { icon: 'ℹ️' })
      return
    }

    await updateProfile(cleanData)
  }

  const onboardingStatus = profile?.onboarding_status || 'none'

  const getOnboardingStatusBadge = () => {
    switch (onboardingStatus) {
      case 'full':
        return <span className="px-3 py-1 rounded-full text-sm font-medium bg-success-100 text-success-700">Complete</span>
      case 'bare_bone':
        return <span className="px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-700">Basic</span>
      default:
        return <span className="px-3 py-1 rounded-full text-sm font-medium bg-slate-200 text-slate-600">Not Started</span>
    }
  }

  const handleStartOnboarding = (mode) => {
    setOnboardingMode(mode)
    setShowOnboarding(true)
  }

  const handleOnboardingComplete = () => {
    setShowOnboarding(false)
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">My Profile</h1>

      {/* Onboarding Status Section */}
      <div className="card max-w-2xl mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
              <Icon name="profile" size={20} className="text-primary-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Onboarding Status</h2>
              <p className="text-sm text-gray-600">Safety and team registration information</p>
            </div>
          </div>
          {getOnboardingStatusBadge()}
        </div>

        {onboardingStatus === 'none' && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <p className="text-amber-800 text-sm">
              <strong>Action Required:</strong> Please complete your onboarding to participate in team activities.
            </p>
          </div>
        )}

        {onboardingStatus === 'bare_bone' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-blue-800 text-sm">
              You've completed basic onboarding. Consider completing your full profile for full team membership.
            </p>
          </div>
        )}

        {onboardingStatus === 'full' && (
          <div className="bg-success-50 border border-success-200 rounded-lg p-4 mb-4">
            <p className="text-success-800 text-sm flex items-center gap-2">
              <Icon name="check" size={16} />
              Your onboarding is complete! You can update your information anytime.
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {onboardingStatus === 'none' && (
            <>
              <button
                onClick={() => handleStartOnboarding('bare_bone')}
                className="btn btn-primary"
              >
                Quick Start (Trial)
              </button>
              <button
                onClick={() => handleStartOnboarding('full')}
                className="btn"
              >
                Full Onboarding
              </button>
            </>
          )}
          {onboardingStatus === 'bare_bone' && (
            <button
              onClick={() => handleStartOnboarding('full')}
              className="btn btn-primary"
            >
              Complete Full Profile
            </button>
          )}
          {onboardingStatus === 'full' && (
            <button
              onClick={() => handleStartOnboarding('full')}
              className="btn"
            >
              Update Onboarding Info
            </button>
          )}
        </div>
      </div>

      {/* Onboarding Modal */}
      {showOnboarding && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">
                {onboardingMode === 'bare_bone' ? 'Quick Start Profile' : 'Complete Profile'}
              </h2>
              <button
                onClick={() => setShowOnboarding(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <Icon name="close" size={24} className="text-slate-500" />
              </button>
            </div>
            <div className="p-6">
              <OnboardingForm
                mode={onboardingMode}
                onComplete={handleOnboardingComplete}
                showHeader={false}
              />
            </div>
          </div>
        </div>
      )}

      {/* Notification Settings Section */}
      <div className="max-w-2xl mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Notifications</h2>
        <NotificationSettings />
      </div>

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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="birthday" className="label">
                    Birthday
                  </label>
                  <input
                    id="birthday"
                    name="birthday"
                    type="date"
                    className="input"
                    value={formData.birthday}
                    onChange={handleChange}
                  />
                  {formData.birthday && (
                    <p className="text-xs text-gray-500 mt-1">
                      Age: {Math.floor((new Date() - new Date(formData.birthday)) / (365.25 * 24 * 60 * 60 * 1000))} years
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="member_type" className="label">
                    Membership Type
                  </label>
                  <select
                    id="member_type"
                    name="member_type"
                    className="input"
                    value={formData.member_type}
                    onChange={handleChange}
                  >
                    <option value="corporate">Corporate Member</option>
                    <option value="friends-family">Friends & Family</option>
                    <option value="ex-corporate">Ex-Corporate / Alumni</option>
                    <option value="community">Community Member</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.member_type === 'corporate' && 'Current employee'}
                    {formData.member_type === 'friends-family' && 'Related to corporate member'}
                    {formData.member_type === 'ex-corporate' && 'Former employee'}
                    {formData.member_type === 'community' && 'General community member'}
                  </p>
                </div>
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
                <label htmlFor="weight_lbs" className="label">
                  Weight (lbs)
                </label>
                <input
                  id="weight_lbs"
                  name="weight_lbs"
                  type="number"
                  step="0.1"
                  className="input"
                  value={formData.weight_lbs}
                  onChange={handleChange}
                  placeholder="154"
                />
              </div>

              <div>
                <label className="label">Height</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <input
                      id="height_feet"
                      name="height_feet"
                      type="number"
                      min="0"
                      max="8"
                      className="input"
                      value={formData.height_feet}
                      onChange={handleChange}
                      placeholder="5"
                    />
                    <p className="text-xs text-gray-500 mt-1">Feet</p>
                  </div>
                  <div>
                    <input
                      id="height_inches"
                      name="height_inches"
                      type="number"
                      min="0"
                      max="11"
                      className="input"
                      value={formData.height_inches}
                      onChange={handleChange}
                      placeholder="10"
                    />
                    <p className="text-xs text-gray-500 mt-1">Inches</p>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="gender" className="label">
                  Gender
                </label>
                <select
                  id="gender"
                  name="gender"
                  className="input"
                  value={formData.gender}
                  onChange={handleChange}
                >
                  <option value="">Prefer not to say</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
            </div>
          </div>

          {/* Saved Locations Section */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Saved Locations
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Save your frequently used locations for easy carpool registration
            </p>

            {loadingLocations ? (
              <div className="text-center py-4 text-slate-500">Loading saved locations...</div>
            ) : (
              <div className="space-y-3">
                {/* Existing saved locations */}
                {savedLocations.map(location => (
                  <div
                    key={location.id}
                    className={`p-4 rounded-lg border ${
                      location.is_default
                        ? 'border-primary-300 bg-primary-50'
                        : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    {editingLocation === location.id ? (
                      // Editing mode
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="label">Label</label>
                            <input
                              type="text"
                              value={locationForm.label}
                              onChange={(e) => setLocationForm(prev => ({ ...prev, label: e.target.value }))}
                              className="input"
                              placeholder="e.g., Home, Work"
                            />
                          </div>
                          <div className="flex items-end">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={locationForm.is_default}
                                onChange={(e) => setLocationForm(prev => ({ ...prev, is_default: e.target.checked }))}
                                className="rounded border-slate-300 text-primary-600"
                              />
                              <span className="text-sm text-slate-600">Default location</span>
                            </label>
                          </div>
                        </div>
                        <AddressSearchInput
                          value={locationForm.address}
                          onChange={(value, coords) => {
                            setLocationForm(prev => ({
                              ...prev,
                              address: value,
                              lat: coords?.lat || null,
                              lng: coords?.lng || null
                            }))
                          }}
                          label="Address"
                          placeholder="Search for address..."
                          showCoords
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleSaveLocation}
                            className="btn btn-primary btn-sm"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingLocation(null)
                              setLocationForm({ label: '', address: '', lat: null, lng: null, is_default: false })
                            }}
                            className="btn btn-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      // Display mode
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-900">{location.label}</span>
                            {location.is_default && (
                              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary-100 text-primary-700">
                                Default
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-600 truncate">{location.address}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          {!location.is_default && (
                            <button
                              type="button"
                              onClick={() => handleSetDefault(location.id)}
                              className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded"
                              title="Set as default"
                            >
                              <Icon name="star" size={16} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleEditLocation(location)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title="Edit"
                          >
                            <Icon name="edit" size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteLocation(location.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Delete"
                          >
                            <Icon name="trash" size={16} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Add new location form */}
                {editingLocation === 'new' ? (
                  <div className="p-4 rounded-lg border border-dashed border-primary-300 bg-primary-50/50 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label">Label</label>
                        <input
                          type="text"
                          value={locationForm.label}
                          onChange={(e) => setLocationForm(prev => ({ ...prev, label: e.target.value }))}
                          className="input"
                          placeholder="e.g., Home, Work, Gym"
                        />
                      </div>
                      <div className="flex items-end">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={locationForm.is_default}
                            onChange={(e) => setLocationForm(prev => ({ ...prev, is_default: e.target.checked }))}
                            className="rounded border-slate-300 text-primary-600"
                          />
                          <span className="text-sm text-slate-600">Set as default</span>
                        </label>
                      </div>
                    </div>
                    <AddressSearchInput
                      value={locationForm.address}
                      onChange={(value, coords) => {
                        setLocationForm(prev => ({
                          ...prev,
                          address: value,
                          lat: coords?.lat || null,
                          lng: coords?.lng || null
                        }))
                      }}
                      label="Address"
                      placeholder="Search for address..."
                      showCoords
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleSaveLocation}
                        className="btn btn-primary btn-sm"
                      >
                        Save Location
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingLocation(null)
                          setLocationForm({ label: '', address: '', lat: null, lng: null, is_default: false })
                        }}
                        className="btn btn-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditingLocation('new')}
                    className="w-full p-4 rounded-lg border border-dashed border-slate-300 text-slate-500 hover:border-primary-300 hover:text-primary-600 hover:bg-primary-50/30 transition-colors flex items-center justify-center gap-2"
                  >
                    <Icon name="plus" size={20} />
                    <span>Add a new location</span>
                  </button>
                )}

                {savedLocations.length === 0 && editingLocation !== 'new' && (
                  <p className="text-sm text-slate-500 text-center py-2">
                    No saved locations yet. Add locations like Home, Work to quickly fill carpool info.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Active Status */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Availability Status
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Set yourself as active or inactive for practices and events
            </p>

            <label className="flex items-center gap-3 cursor-pointer p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-primary-300 transition-colors">
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
                className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
              />
              <div className="flex-1">
                <span className="font-medium text-gray-900">Active Member</span>
                <p className="text-sm text-gray-600">
                  {formData.is_active
                    ? "You're currently active and will appear in lineups and rosters"
                    : "You're currently inactive and won't appear in lineups"}
                </p>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                formData.is_active
                  ? 'bg-success-100 text-success-700'
                  : 'bg-slate-200 text-slate-600'
              }`}>
                {formData.is_active ? 'Active' : 'Inactive'}
              </div>
            </label>
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
