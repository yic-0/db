import { useState, useEffect } from 'react'
import { useRosterStore } from '../store/rosterStore'
import { useAuthStore } from '../store/authStore'
import { convertWeightForDisplay, convertWeightForStorage, formatWeight } from '../utils/weightConverter'
import { convertHeightForDisplay, feetInchesToCm, formatHeight } from '../utils/heightConverter'
import toast from 'react-hot-toast'

export default function Roster() {
  const { members, loading, filters, fetchMembers, setFilters, getFilteredMembers, getStats, addGuestMember, updateMember } = useRosterStore()
  const { hasRole } = useAuthStore()
  const [selectedMember, setSelectedMember] = useState(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [guestForm, setGuestForm] = useState({
    full_name: '',
    weight_lbs: '',
    skill_level: 'novice',
    preferred_side: ''
  })
  const [editForm, setEditForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    role: '',
    skill_level: '',
    preferred_side: '',
    weight_lbs: '',
    height_feet: '',
    height_inches: '',
    gender: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    medical_notes: '',
    is_active: true,
    can_steer: false,
    can_drum: false
  })

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  // Update selectedMember when members list changes to prevent stale data
  useEffect(() => {
    if (selectedMember) {
      const updatedMember = members.find(m => m.id === selectedMember.id)
      if (updatedMember) {
        setSelectedMember(updatedMember)
      }
    }
  }, [members, selectedMember?.id])

  const filteredMembers = getFilteredMembers()
  const stats = getStats()

  const handleViewDetails = (member) => {
    setSelectedMember(member)
    setIsDetailsModalOpen(true)
  }

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin': return '👑'
      case 'coach': return '🎯'
      case 'captain': return '⭐'
      case 'steersperson': return '🎮'
      default: return '👤'
    }
  }

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin': return 'badge badge-neutral border-purple-200 text-purple-700 bg-purple-50'
      case 'coach': return 'badge badge-primary'
      case 'captain': return 'badge badge-warning'
      case 'steersperson': return 'badge badge-success'
      default: return 'badge badge-neutral'
    }
  }

  const getSkillBadgeColor = (skill) => {
    switch (skill) {
      case 'novice': return 'badge badge-neutral'
      case 'intermediate': return 'badge badge-primary'
      case 'advanced': return 'badge badge-success'
      case 'competitive': return 'badge badge-danger'
      default: return 'badge badge-neutral'
    }
  }

  const formatSide = (side) => {
    if (!side) return 'Not set'
    return side.charAt(0).toUpperCase() + side.slice(1)
  }

  const formatNamePrivate = (fullName) => {
    if (!fullName) return 'Unknown'
    const parts = fullName.trim().split(' ')
    if (parts.length === 1) return parts[0]
    const firstName = parts[0]
    const lastInitial = parts[parts.length - 1][0]
    return `${firstName} ${lastInitial}.`
  }

  const handleToggleActive = async (member) => {
    const newStatus = !member.is_active
    const result = await updateMember(member.id, { is_active: newStatus })
    if (result.success) {
      toast.success(`${member.full_name} is now ${newStatus ? 'active' : 'inactive'}`)
    }
  }

  const handleRoleChange = async (member, newRole) => {
    const result = await updateMember(member.id, { role: newRole })
    if (result.success) {
      toast.success(`${member.full_name}'s role updated to ${newRole}`)
    }
  }

  const handleToggleCoordinator = async (member) => {
    const newStatus = !member.is_coordinator
    const result = await updateMember(member.id, { is_coordinator: newStatus })
    if (result.success) {
      toast.success(newStatus
        ? `${member.full_name} is now a coordinator`
        : `Coordinator role removed for ${member.full_name}`
      )
    }
  }

  const handleAddGuest = async () => {
    if (!guestForm.full_name.trim()) {
      toast.error('Please enter guest name')
      return
    }
    if (!guestForm.weight_lbs || parseFloat(guestForm.weight_lbs) <= 0) {
      toast.error('Please enter valid weight')
      return
    }

    const result = await addGuestMember({
      full_name: guestForm.full_name.trim(),
      weight_kg: convertWeightForStorage(parseFloat(guestForm.weight_lbs), 'lbs'),
      skill_level: guestForm.skill_level,
      preferred_side: guestForm.preferred_side || null
    })

    if (result.success) {
      setIsGuestModalOpen(false)
      setGuestForm({
        full_name: '',
        weight_lbs: '',
        skill_level: 'novice',
        preferred_side: ''
      })
    }
  }

  const handleEditMember = () => {
    // Populate edit form with selected member data
    const heightFtIn = convertHeightForDisplay(selectedMember.height_cm, 'ftin')
    setEditForm({
      full_name: selectedMember.full_name || '',
      email: selectedMember.email || '',
      phone: selectedMember.phone || '',
      role: selectedMember.role || 'member',
      skill_level: selectedMember.skill_level || '',
      preferred_side: selectedMember.preferred_side || '',
      weight_lbs: selectedMember.weight_kg ? convertWeightForDisplay(selectedMember.weight_kg, 'lbs', 1) : '',
      height_feet: heightFtIn?.feet || '',
      height_inches: heightFtIn?.inches || '',
      gender: selectedMember.gender || '',
      emergency_contact_name: selectedMember.emergency_contact_name || '',
      emergency_contact_phone: selectedMember.emergency_contact_phone || '',
      medical_notes: selectedMember.medical_notes || '',
      is_active: selectedMember.is_active !== undefined ? selectedMember.is_active : true,
      can_steer: selectedMember.can_steer || false,
      can_drum: selectedMember.can_drum || false
    })
    setIsDetailsModalOpen(false)
    setIsEditModalOpen(true)
  }

  const handleSaveEdit = async () => {
    console.log('Save Edit clicked - Starting save process')
    console.log('Selected member:', selectedMember)
    console.log('Edit form data:', editForm)

    // Prevent double-clicking
    if (isSaving) {
      console.log('Already saving, ignoring click')
      return
    }

    setIsSaving(true)

    try {
      // Validation
      if (!editForm.full_name.trim()) {
        toast.error('Full name is required')
        setIsSaving(false)
        return
      }

      // Skip email validation for guests since they have placeholder emails
      if (!selectedMember.is_guest && !editForm.email.trim()) {
        toast.error('Email is required')
        setIsSaving(false)
        return
      }

      // Prepare updates object
      const updates = {
        full_name: editForm.full_name.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim() || null,
        role: editForm.role,
        skill_level: editForm.skill_level || null,
        preferred_side: editForm.preferred_side || null,
        weight_kg: editForm.weight_lbs ? convertWeightForStorage(parseFloat(editForm.weight_lbs), 'lbs') : null,
        height_cm: (editForm.height_feet || editForm.height_inches) ? feetInchesToCm(editForm.height_feet, editForm.height_inches) : null,
        gender: editForm.gender || null,
        emergency_contact_name: editForm.emergency_contact_name.trim() || null,
        emergency_contact_phone: editForm.emergency_contact_phone.trim() || null,
        medical_notes: editForm.medical_notes.trim() || null,
        is_active: editForm.is_active,
        can_steer: editForm.can_steer,
        can_drum: editForm.can_drum
      }

      console.log('Prepared updates:', updates)
      console.log('Calling updateMember with ID:', selectedMember.id)

      const result = await updateMember(selectedMember.id, updates)

      console.log('Update result:', result)

      if (result.success) {
        console.log('Update successful, closing modal and refreshing')
        setIsEditModalOpen(false)
        setSelectedMember(null)
        // Refresh the members list
        await fetchMembers()
      } else {
        console.error('Update failed:', result.error)
        toast.error('Failed to update member. Check console for details.')
      }
    } catch (error) {
      console.error('Unexpected error during save:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setIsEditModalOpen(false)
    setEditForm({
      full_name: '',
      email: '',
      phone: '',
      role: '',
      skill_level: '',
      preferred_side: '',
      weight_lbs: '',
      height_feet: '',
      height_inches: '',
      gender: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      medical_notes: '',
      is_active: true,
      can_steer: false,
      can_drum: false
    })
  }

  if (loading && members.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-600">Loading team roster...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Team Roster</h1>
        {(hasRole('admin') || hasRole('coach')) && (
          <button
            onClick={() => setIsGuestModalOpen(true)}
            className="btn btn-primary"
          >
            + Add Guest Paddler
          </button>
        )}
      </div>

      {/* Stats Cards - Admin Only */}
      {hasRole('admin') && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="stat-card">
            <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Total</h3>
            <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
          </div>
          <div className="stat-card border-l-4 border-l-green-500">
            <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Active</h3>
            <p className="text-2xl font-bold text-green-600">{stats.active}</p>
          </div>
          <div className="stat-card border-l-4 border-l-amber-500">
            <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Guests</h3>
            <p className="text-2xl font-bold text-amber-600">{stats.guests}</p>
          </div>
          <div className="stat-card border-l-4 border-l-blue-500">
            <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Coaches</h3>
            <p className="text-2xl font-bold text-blue-600">{stats.byRole.coach}</p>
          </div>
          <div className="stat-card border-l-4 border-l-purple-500">
            <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Admins</h3>
            <p className="text-2xl font-bold text-purple-600">{stats.byRole.admin}</p>
          </div>
        </div>
      )}

      {/* Filters - Admin Only */}
      {hasRole('admin') && (
        <div className="card mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Search */}
            <div>
              <label htmlFor="search" className="label">
                Search
              </label>
              <input
                id="search"
                type="text"
                className="input"
                placeholder="Name or email..."
                value={filters.search}
                onChange={(e) => setFilters({ search: e.target.value })}
              />
            </div>

            {/* Role Filter */}
            <div>
              <label htmlFor="role" className="label">
                Role
              </label>
              <select
                id="role"
                className="input"
                value={filters.role}
                onChange={(e) => setFilters({ role: e.target.value })}
              >
                <option value="all">All Roles</option>
                <option value="admin">Admin</option>
                <option value="coach">Coach</option>
                <option value="captain">Captain</option>
                <option value="steersperson">Steersperson</option>
                <option value="member">Paddler</option>
              </select>
            </div>

            {/* Skill Level Filter */}
            <div>
              <label htmlFor="skillLevel" className="label">
                Skill Level
              </label>
              <select
                id="skillLevel"
                className="input"
                value={filters.skillLevel}
                onChange={(e) => setFilters({ skillLevel: e.target.value })}
              >
                <option value="all">All Levels</option>
                <option value="novice">Novice</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="competitive">Competitive</option>
              </select>
            </div>

            {/* Active Status */}
            <div>
              <label htmlFor="isActive" className="label">
                Status
              </label>
              <select
                id="isActive"
                className="input"
                value={filters.isActive}
                onChange={(e) => setFilters({ isActive: e.target.value === 'true' })}
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>

            {/* Show Guests Toggle */}
            <div>
              <label htmlFor="showGuests" className="label">
                Show Guests
              </label>
              <select
                id="showGuests"
                className="input"
                value={filters.showGuests}
                onChange={(e) => setFilters({ showGuests: e.target.value === 'true' })}
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Members Table */}
      <div className="card overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Paddler
              </th>
              {hasRole('admin') && (
                <>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Coordinator
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Skill Level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Preferred Side
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredMembers.length === 0 ? (
              <tr>
                <td colSpan={hasRole('admin') ? "7" : "1"} className="px-6 py-8 text-center text-gray-500">
                  No paddlers found matching your filters
                </td>
              </tr>
            ) : (
              filteredMembers.map((member) => (
                <tr key={member.id} className={`hover:bg-gray-50 ${member.is_guest ? 'bg-orange-50' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {hasRole('admin') && <div className="text-2xl mr-3">{getRoleIcon(member.role)}</div>}
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-gray-900">
                            {hasRole('admin') ? member.full_name : formatNamePrivate(member.full_name)}
                          </span>
                          {hasRole('admin') && (
                            <button
                              onClick={() => handleToggleActive(member)}
                              className={`px-2 py-0.5 text-xs font-medium rounded transition-colors ${
                                member.is_active
                                  ? 'bg-success-100 text-success-700 hover:bg-success-200'
                                  : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                              }`}
                              title={`Click to set as ${member.is_active ? 'inactive' : 'active'}`}
                            >
                              {member.is_active ? '✓ Active' : '○ Inactive'}
                            </button>
                          )}
                          {member.is_guest && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-orange-200 text-orange-800 rounded">
                              GUEST
                            </span>
                          )}
                          {member.can_steer && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded" title="Can steer">
                              🚢 Steer
                            </span>
                          )}
                          {member.can_drum && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded" title="Can drum">
                              🥁 Drum
                            </span>
                          )}
                        </div>
                        {hasRole('admin') && <div className="text-sm text-gray-500">{member.email}</div>}
                      </div>
                    </div>
                  </td>
                  {hasRole('admin') && (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={member.role || 'paddler'}
                          onChange={(e) => handleRoleChange(member, e.target.value)}
                          className="text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="paddler">Paddler</option>
                          <option value="coach">Coach</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <input
                          type="checkbox"
                          checked={member.is_coordinator || false}
                          onChange={() => handleToggleCoordinator(member)}
                          className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500 cursor-pointer"
                          title={member.is_coordinator ? 'Remove coordinator privileges' : 'Grant coordinator privileges'}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {member.skill_level ? (
                          <span className={getSkillBadgeColor(member.skill_level)}>
                            {member.skill_level}
                          </span>
                        ) : (
                          <span className="text-sm text-slate-400">Not set</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatSide(member.preferred_side)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {member.phone || 'Not provided'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleViewDetails(member)}
                          className="text-primary-600 hover:text-primary-700 font-medium"
                        >
                          View Details
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Member Details Modal */}
      {isDetailsModalOpen && selectedMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Paddler Details</h2>
                <button
                  onClick={() => setIsDetailsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-6">
                {/* Basic Info */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Basic Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Full Name</p>
                      <p className="text-base font-medium text-gray-900">{selectedMember.full_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="text-base font-medium text-gray-900">{selectedMember.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Phone</p>
                      <p className="text-base font-medium text-gray-900">{selectedMember.phone || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Role</p>
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getRoleBadgeColor(selectedMember.role)}`}>
                        {selectedMember.role}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Dragon Boat Info */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Dragon Boat Info</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Skill Level</p>
                      <p className="text-base font-medium text-gray-900">{selectedMember.skill_level || 'Not set'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Preferred Side</p>
                      <p className="text-base font-medium text-gray-900">{formatSide(selectedMember.preferred_side)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Weight</p>
                      <p className="text-base font-medium text-gray-900">
                        {selectedMember.weight_kg ? formatWeight(selectedMember.weight_kg, 'lbs', 1) : 'Not provided'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Height</p>
                      <p className="text-base font-medium text-gray-900">
                        {selectedMember.height_cm ? formatHeight(selectedMember.height_cm, 'ftin') : 'Not provided'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Gender</p>
                      <p className="text-base font-medium text-gray-900">
                        {selectedMember.gender ? selectedMember.gender.charAt(0).toUpperCase() + selectedMember.gender.slice(1) : 'Not specified'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Emergency Contact */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Emergency Contact</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Contact Name</p>
                      <p className="text-base font-medium text-gray-900">
                        {selectedMember.emergency_contact_name || 'Not provided'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Contact Phone</p>
                      <p className="text-base font-medium text-gray-900">
                        {selectedMember.emergency_contact_phone || 'Not provided'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Medical Notes (Admin/Coach only) */}
                {hasRole('admin') && selectedMember.medical_notes && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Medical Notes (Admin Only)</h3>
                    <p className="text-base text-gray-700 p-3 bg-yellow-50 rounded border border-yellow-200">
                      {selectedMember.medical_notes}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-6 mt-6 border-t">
                <button
                  onClick={() => setIsDetailsModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Close
                </button>
                {hasRole('admin') && (
                  <button
                    className="btn btn-primary"
                    onClick={handleEditMember}
                  >
                    Edit Paddler
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Guest Paddler Modal */}
      {isGuestModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Add Guest Paddler</h2>
              <button
                onClick={() => setIsGuestModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-orange-800">
                Guest paddlers are temporary paddlers (e.g., visitors, trial paddlers). They can be added to lineups but are marked separately from regular team paddlers.
              </p>
            </div>

            <div className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="label">Full Name *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="John Doe"
                  value={guestForm.full_name}
                  onChange={(e) => setGuestForm({ ...guestForm, full_name: e.target.value })}
                />
              </div>

              {/* Weight */}
              <div>
                <label className="label">Weight (lbs) *</label>
                <input
                  type="number"
                  className="input"
                  placeholder="154"
                  min="1"
                  step="0.1"
                  value={guestForm.weight_lbs}
                  onChange={(e) => setGuestForm({ ...guestForm, weight_lbs: e.target.value })}
                />
                <p className="text-xs text-gray-500 mt-1">Required for boat balance calculations</p>
              </div>

              {/* Skill Level */}
              <div>
                <label className="label">Skill Level</label>
                <select
                  className="input"
                  value={guestForm.skill_level}
                  onChange={(e) => setGuestForm({ ...guestForm, skill_level: e.target.value })}
                >
                  <option value="novice">Novice</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="competitive">Competitive</option>
                </select>
              </div>

              {/* Preferred Side */}
              <div>
                <label className="label">Preferred Side</label>
                <select
                  className="input"
                  value={guestForm.preferred_side}
                  onChange={(e) => setGuestForm({ ...guestForm, preferred_side: e.target.value })}
                >
                  <option value="">No preference</option>
                  <option value="left">Left</option>
                  <option value="right">Right</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => {
                  setIsGuestModalOpen(false)
                  setGuestForm({
                    full_name: '',
                    weight_lbs: '',
                    skill_level: 'novice',
                    preferred_side: ''
                  })
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={handleAddGuest}
                className="btn btn-primary"
              >
                Add Guest
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {isEditModalOpen && selectedMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Edit Paddler</h2>
                <button
                  onClick={handleCancelEdit}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-6">
                {/* Basic Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Full Name *</label>
                      <input
                        type="text"
                        className="input"
                        value={editForm.full_name}
                        onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="label">Email *</label>
                      <input
                        type="email"
                        className="input"
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        disabled={selectedMember.is_guest}
                      />
                      {selectedMember.is_guest && (
                        <p className="text-xs text-gray-500 mt-1">Guest email cannot be changed</p>
                      )}
                    </div>
                    <div>
                      <label className="label">Phone</label>
                      <input
                        type="tel"
                        className="input"
                        value={editForm.phone}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="label">Role</label>
                      <select
                        className="input"
                        value={editForm.role}
                        onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                      >
                        <option value="member">Paddler</option>
                        <option value="captain">Captain</option>
                        <option value="steersperson">Steersperson</option>
                        <option value="coach">Coach</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">Status</label>
                      <select
                        className="input"
                        value={editForm.is_active}
                        onChange={(e) => setEditForm({ ...editForm, is_active: e.target.value === 'true' })}
                      >
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Dragon Boat Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Dragon Boat Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Skill Level</label>
                      <select
                        className="input"
                        value={editForm.skill_level}
                        onChange={(e) => setEditForm({ ...editForm, skill_level: e.target.value })}
                      >
                        <option value="">Not set</option>
                        <option value="novice">Novice</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                        <option value="competitive">Competitive</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">Preferred Side</label>
                      <select
                        className="input"
                        value={editForm.preferred_side}
                        onChange={(e) => setEditForm({ ...editForm, preferred_side: e.target.value })}
                      >
                        <option value="">No preference</option>
                        <option value="left">Left</option>
                        <option value="right">Right</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">Weight (lbs)</label>
                      <input
                        type="number"
                        className="input"
                        min="1"
                        step="0.1"
                        value={editForm.weight_lbs}
                        onChange={(e) => setEditForm({ ...editForm, weight_lbs: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="label">Height</label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <input
                            type="number"
                            className="input"
                            min="0"
                            max="8"
                            placeholder="5"
                            value={editForm.height_feet}
                            onChange={(e) => setEditForm({ ...editForm, height_feet: e.target.value })}
                          />
                          <p className="text-xs text-gray-500 mt-1">Feet</p>
                        </div>
                        <div>
                          <input
                            type="number"
                            className="input"
                            min="0"
                            max="11"
                            placeholder="10"
                            value={editForm.height_inches}
                            onChange={(e) => setEditForm({ ...editForm, height_inches: e.target.value })}
                          />
                          <p className="text-xs text-gray-500 mt-1">Inches</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="label">Gender</label>
                      <select
                        className="input"
                        value={editForm.gender}
                        onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                      >
                        <option value="">Prefer not to say</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Emergency Contact */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Emergency Contact</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Contact Name</label>
                      <input
                        type="text"
                        className="input"
                        value={editForm.emergency_contact_name}
                        onChange={(e) => setEditForm({ ...editForm, emergency_contact_name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="label">Contact Phone</label>
                      <input
                        type="tel"
                        className="input"
                        value={editForm.emergency_contact_phone}
                        onChange={(e) => setEditForm({ ...editForm, emergency_contact_phone: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Medical Notes */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Medical Notes (Admin Only)</h3>
                  <textarea
                    className="input min-h-[100px]"
                    placeholder="Any medical conditions, allergies, or special considerations..."
                    value={editForm.medical_notes}
                    onChange={(e) => setEditForm({ ...editForm, medical_notes: e.target.value })}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Medical notes are only visible to admins and coaches
                  </p>
                </div>

                {/* Special Skills/Certifications */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Special Skills & Certifications</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Indicate special qualifications for steering and drumming
                  </p>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editForm.can_steer}
                        onChange={(e) => setEditForm({ ...editForm, can_steer: e.target.checked })}
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
                        checked={editForm.can_drum}
                        onChange={(e) => setEditForm({ ...editForm, can_drum: e.target.checked })}
                        className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                      />
                      <div>
                        <span className="font-medium text-gray-900">Can Drum</span>
                        <p className="text-sm text-gray-600">Qualified to drum for the team</p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 mt-6 border-t">
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={handleCancelEdit}
                  className="btn btn-secondary"
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={handleSaveEdit}
                  className="btn btn-primary"
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
