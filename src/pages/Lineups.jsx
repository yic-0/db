import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { useLineupStore } from '../store/lineupStore'
import { useRosterStore } from '../store/rosterStore'
import { useAuthStore } from '../store/authStore'
import { usePracticeStore } from '../store/practiceStore'
import toast from 'react-hot-toast'

export default function Lineups() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { lineups, currentLineup, loading, fetchLineups, createLineup, updateLineup, deleteLineup, setCurrentLineup, clearCurrentLineup } = useLineupStore()
  const { members, fetchMembers } = useRosterStore()
  const { user, hasRole } = useAuthStore()
  const { practices, rsvps, fetchPractices, fetchRSVPs } = usePracticeStore()

  const [isCreating, setIsCreating] = useState(false)
  const [editingLineupId, setEditingLineupId] = useState(null) // Track which lineup is being edited
  const [lineupName, setLineupName] = useState('')
  const [lineupNotes, setLineupNotes] = useState('')
  const [selectedPracticeId, setSelectedPracticeId] = useState('')
  const [rsvpFilter, setRsvpFilter] = useState('all')
  const [boatRows, setBoatRows] = useState(10) // Number of rows (pairs), default 10
  const [unitSystem, setUnitSystem] = useState('metric') // 'metric' | 'imperial'
  // Always allow secondary placements for quick alternates
  const comparisonMode = true

  // Available members pool
  const [availableMembers, setAvailableMembers] = useState([])

  // Boat positions (paddlers + steersperson + drummer + alternates)
  // Each position can have primary and secondary (for comparison)
  const [boatPositions, setBoatPositions] = useState({
    drummer: null,
    drummer_secondary: null,
    left: Array(10).fill(null),  // Positions 1-10 on left (will resize based on boatRows)
    left_secondary: Array(10).fill(null),
    right: Array(10).fill(null), // Positions 1-10 on right (will resize based on boatRows)
    right_secondary: Array(10).fill(null),
    steersperson: null,
    steersperson_secondary: null,
    alternates: [null, null, null, null] // 4 alternate slots
  })

  useEffect(() => {
    fetchLineups()
    fetchMembers()
    fetchPractices()
  }, [fetchLineups, fetchMembers, fetchPractices])

  // Handle URL parameter to load a specific lineup
  useEffect(() => {
    const lineupId = searchParams.get('lineup')
    if (lineupId && lineups.length > 0) {
      const lineup = lineups.find(l => l.id === lineupId)
      if (lineup) {
        handleLoadLineup(lineup)
        // Remove the URL parameter after loading
        searchParams.delete('lineup')
        setSearchParams(searchParams, { replace: true })
      }
    }
  }, [searchParams, lineups])

  // Fetch RSVPs when a practice is selected
  useEffect(() => {
    if (selectedPracticeId) {
      fetchRSVPs(selectedPracticeId)
    }
  }, [selectedPracticeId, fetchRSVPs])

  // Filter and sort members based on practice RSVP
  useEffect(() => {
    let filtered = members.filter(m => m.is_active)

    // If a practice is selected, filter by RSVP status
    if (selectedPracticeId && rsvps[selectedPracticeId]) {
      const practiceRsvps = rsvps[selectedPracticeId]

      filtered = filtered.map(member => {
        const rsvp = practiceRsvps.find(r => r.user_id === member.id)
        return {
          ...member,
          rsvpStatus: rsvp?.status || 'no_response'
        }
      })

      // Apply RSVP filter
      if (rsvpFilter !== 'all') {
        filtered = filtered.filter(m => m.rsvpStatus === rsvpFilter)
      }

      // Sort by RSVP status (yes first, then maybe, then no_response, then no)
      const statusOrder = { yes: 1, maybe: 2, no_response: 3, no: 4 }
      filtered.sort((a, b) => {
        const orderA = statusOrder[a.rsvpStatus] || 999
        const orderB = statusOrder[b.rsvpStatus] || 999
        return orderA - orderB
      })
    } else {
      // No practice selected, just add a default rsvpStatus
      filtered = filtered.map(member => ({
        ...member,
        rsvpStatus: null
      }))
    }

    setAvailableMembers(filtered)
  }, [members, selectedPracticeId, rsvps, rsvpFilter])

  const handleDragEnd = (result) => {
    const { source, destination } = result

    if (!destination) return

    let draggedMember = null

    const parseIndex = (id) => parseInt(id.split('-')[1])

    // Determine dragged member based on source droppable and index (0 = primary, 1 = secondary)
    if (source.droppableId === 'available') {
      draggedMember = availableMembers[source.index]
    } else if (source.droppableId === 'drummer') {
      draggedMember = source.index === 0 ? boatPositions.drummer : boatPositions.drummer_secondary
    } else if (source.droppableId === 'steersperson') {
      draggedMember = source.index === 0 ? boatPositions.steersperson : boatPositions.steersperson_secondary
    } else if (source.droppableId.startsWith('left-')) {
      const index = parseIndex(source.droppableId)
      draggedMember = source.index === 0 ? boatPositions.left[index] : boatPositions.left_secondary[index]
    } else if (source.droppableId.startsWith('right-')) {
      const index = parseIndex(source.droppableId)
      draggedMember = source.index === 0 ? boatPositions.right[index] : boatPositions.right_secondary[index]
    } else if (source.droppableId.startsWith('alternate-')) {
      const index = parseIndex(source.droppableId)
      draggedMember = boatPositions.alternates[index]
    }

    if (!draggedMember) return

    let newBoatPositions = { ...boatPositions }
    let newAvailableMembers = [...availableMembers]
    let displacedMember = null

    // Remove from source slot
    if (source.droppableId === 'available') {
      newAvailableMembers.splice(source.index, 1)
    } else if (source.droppableId === 'drummer') {
      if (source.index === 0) newBoatPositions.drummer = null
      else newBoatPositions.drummer_secondary = null
    } else if (source.droppableId === 'steersperson') {
      if (source.index === 0) newBoatPositions.steersperson = null
      else newBoatPositions.steersperson_secondary = null
    } else if (source.droppableId.startsWith('left-')) {
      const index = parseIndex(source.droppableId)
      if (source.index === 0) {
        newBoatPositions.left = [...boatPositions.left]
        newBoatPositions.left[index] = null
      } else {
        newBoatPositions.left_secondary = [...boatPositions.left_secondary]
        newBoatPositions.left_secondary[index] = null
      }
    } else if (source.droppableId.startsWith('right-')) {
      const index = parseIndex(source.droppableId)
      if (source.index === 0) {
        newBoatPositions.right = [...boatPositions.right]
        newBoatPositions.right[index] = null
      } else {
        newBoatPositions.right_secondary = [...boatPositions.right_secondary]
        newBoatPositions.right_secondary[index] = null
      }
    } else if (source.droppableId.startsWith('alternate-')) {
      const index = parseIndex(source.droppableId)
      newBoatPositions.alternates = [...boatPositions.alternates]
      newBoatPositions.alternates[index] = null
    }

    // Add to destination - if primary filled, use secondary; if both filled, replace secondary
    const placeInSeat = (primaryArr, secondaryArr, idx) => {
      if (!newBoatPositions[primaryArr] || newBoatPositions[primaryArr] === boatPositions[primaryArr]) {
        newBoatPositions[primaryArr] = [...boatPositions[primaryArr]]
      }
      if (!newBoatPositions[secondaryArr] || newBoatPositions[secondaryArr] === boatPositions[secondaryArr]) {
        newBoatPositions[secondaryArr] = [...boatPositions[secondaryArr]]
      }

      if (!newBoatPositions[primaryArr][idx]) {
        newBoatPositions[primaryArr][idx] = draggedMember
      } else if (!newBoatPositions[secondaryArr][idx]) {
        newBoatPositions[secondaryArr][idx] = draggedMember
      } else {
        displacedMember = newBoatPositions[secondaryArr][idx]
        newBoatPositions[secondaryArr][idx] = draggedMember
      }
    }

    if (destination.droppableId === 'available') {
      newAvailableMembers.splice(destination.index, 0, draggedMember)
    } else if (destination.droppableId === 'drummer') {
      if (!newBoatPositions.drummer) {
        displacedMember = null
        newBoatPositions.drummer = draggedMember
      } else if (!newBoatPositions.drummer_secondary) {
        displacedMember = null
        newBoatPositions.drummer_secondary = draggedMember
      } else {
        displacedMember = newBoatPositions.drummer_secondary
        newBoatPositions.drummer_secondary = draggedMember
      }
    } else if (destination.droppableId === 'steersperson') {
      if (!newBoatPositions.steersperson) {
        displacedMember = null
        newBoatPositions.steersperson = draggedMember
      } else if (!newBoatPositions.steersperson_secondary) {
        displacedMember = null
        newBoatPositions.steersperson_secondary = draggedMember
      } else {
        displacedMember = newBoatPositions.steersperson_secondary
        newBoatPositions.steersperson_secondary = draggedMember
      }
    } else if (destination.droppableId.startsWith('left-')) {
      const index = parseIndex(destination.droppableId)
      placeInSeat('left', 'left_secondary', index)
    } else if (destination.droppableId.startsWith('right-')) {
      const index = parseIndex(destination.droppableId)
      placeInSeat('right', 'right_secondary', index)
    } else if (destination.droppableId.startsWith('alternate-')) {
      const index = parseIndex(destination.droppableId)
      if (!newBoatPositions.alternates || newBoatPositions.alternates === boatPositions.alternates) {
        newBoatPositions.alternates = [...boatPositions.alternates]
      }
      displacedMember = newBoatPositions.alternates[index]
      newBoatPositions.alternates[index] = draggedMember
    }

    if (displacedMember) {
      newAvailableMembers.push(displacedMember)
    }

    setBoatPositions(newBoatPositions)
    setAvailableMembers(newAvailableMembers)
  }

  const handleBoatSizeChange = (newSize) => {
    const currentLeft = [...boatPositions.left]
    const currentRight = [...boatPositions.right]
    const currentLeftSecondary = [...(boatPositions.left_secondary || Array(boatRows).fill(null))]
    const currentRightSecondary = [...(boatPositions.right_secondary || Array(boatRows).fill(null))]

    // If shrinking the boat, move displaced members back to available
    if (newSize < boatRows) {
      const displacedMembers = [
        ...currentLeft.slice(newSize).filter(m => m !== null),
        ...currentRight.slice(newSize).filter(m => m !== null),
        ...currentLeftSecondary.slice(newSize).filter(m => m !== null),
        ...currentRightSecondary.slice(newSize).filter(m => m !== null)
      ]
      if (displacedMembers.length > 0) {
        setAvailableMembers([...availableMembers, ...displacedMembers])
      }
    }

    // Resize arrays (trim or extend with nulls)
    const newLeft = newSize > currentLeft.length
      ? [...currentLeft, ...Array(newSize - currentLeft.length).fill(null)]
      : currentLeft.slice(0, newSize)

    const newRight = newSize > currentRight.length
      ? [...currentRight, ...Array(newSize - currentRight.length).fill(null)]
      : currentRight.slice(0, newSize)

    const newLeftSecondary = newSize > currentLeftSecondary.length
      ? [...currentLeftSecondary, ...Array(newSize - currentLeftSecondary.length).fill(null)]
      : currentLeftSecondary.slice(0, newSize)

    const newRightSecondary = newSize > currentRightSecondary.length
      ? [...currentRightSecondary, ...Array(newSize - currentRightSecondary.length).fill(null)]
      : currentRightSecondary.slice(0, newSize)

    setBoatRows(newSize)
    setBoatPositions({
      ...boatPositions,
      left: newLeft,
      right: newRight,
      left_secondary: newLeftSecondary,
      right_secondary: newRightSecondary
    })

    toast.success(`Boat size changed to ${newSize} rows (${newSize * 2} paddlers)`)
  }

  const handleSaveLineup = async () => {
    console.log('handleSaveLineup called')
    console.log('lineupName:', lineupName)
    console.log('editingLineupId:', editingLineupId)

    if (!lineupName.trim()) {
      toast.error('Please enter a lineup name')
      return
    }

    // Build positions object with full member details for reference
    const positions = {
      drummer: boatPositions.drummer?.id || null,
      steersperson: boatPositions.steersperson?.id || null,
      paddlers: {
        left: boatPositions.left.map(m => m?.id || null),
        right: boatPositions.right.map(m => m?.id || null)
      },
      alternates: boatPositions.alternates.map(m => m?.id || null),
      // Store member details for quick reference
      members: {
        drummer: boatPositions.drummer ? {
          id: boatPositions.drummer.id,
          name: boatPositions.drummer.full_name,
          weight: boatPositions.drummer.weight_kg
        } : null,
        steersperson: boatPositions.steersperson ? {
          id: boatPositions.steersperson.id,
          name: boatPositions.steersperson.full_name,
          weight: boatPositions.steersperson.weight_kg
        } : null,
        left: boatPositions.left.map(m => m ? {
          id: m.id,
          name: m.full_name,
          weight: m.weight_kg
        } : null),
        right: boatPositions.right.map(m => m ? {
          id: m.id,
          name: m.full_name,
          weight: m.weight_kg
        } : null),
        alternates: boatPositions.alternates.map(m => m ? {
          id: m.id,
          name: m.full_name,
          weight: m.weight_kg
        } : null)
      },
      // Store balance metrics
      balance: {
        totalWeight: balance.totalWeight,
        leftTotal: balance.leftTotal,
        rightTotal: balance.rightTotal,
        frontTotal: balance.frontTotal,
        backTotal: balance.backTotal,
        sideBalance: balance.sideBalance,
        frontBackBalance: balance.frontBackBalance
      }
    }

    const lineupData = {
      name: lineupName,
      notes: lineupNotes || null,
      positions: positions,
      created_by: user.id
    }

    let result
    if (editingLineupId) {
      // Update existing lineup
      console.log('Updating lineup with data:', lineupData)
      result = await updateLineup(editingLineupId, lineupData)
      console.log('Update result:', result)
    } else {
      // Create new lineup
      console.log('Creating lineup with data:', lineupData)
      result = await createLineup(lineupData)
      console.log('Create result:', result)
    }

    if (result.success) {
      setLineupName('')
      setLineupNotes('')
      setEditingLineupId(null)
      setIsCreating(false)
      // Clear temp edit ID if this was a "Save as New"
      if (window.__tempEditId) {
        window.__tempEditId = null
      }
      toast.success(`Lineup "${lineupName}" ${editingLineupId ? 'updated' : 'saved'} successfully!`)
    } else {
      console.error(`Failed to ${editingLineupId ? 'update' : 'save'} lineup:`, result.error)
      toast.error(`Failed to ${editingLineupId ? 'update' : 'save'} lineup: ` + (result.error?.message || 'Unknown error'))
    }
  }

  const handleResetPositions = () => {
    // Only clear positions, keep editing state and name/notes
    setBoatPositions({
      drummer: null,
      drummer_secondary: null,
      left: Array(boatRows).fill(null),
      left_secondary: Array(boatRows).fill(null),
      right: Array(boatRows).fill(null),
      right_secondary: Array(boatRows).fill(null),
      steersperson: null,
      steersperson_secondary: null,
      alternates: [null, null, null, null]
    })
    setAvailableMembers(members.filter(m => m.is_active))
    toast.success('All positions cleared')
  }

  const handleClearLineup = () => {
    // Full reset - clear everything including editing state
    setBoatPositions({
      drummer: null,
      drummer_secondary: null,
      left: Array(boatRows).fill(null),
      left_secondary: Array(boatRows).fill(null),
      right: Array(boatRows).fill(null),
      right_secondary: Array(boatRows).fill(null),
      steersperson: null,
      steersperson_secondary: null,
      alternates: [null, null, null, null]
    })
    setAvailableMembers(members.filter(m => m.is_active))
    setEditingLineupId(null)
    setLineupName('')
    setLineupNotes('')
    toast.success('Lineup cleared')
  }

  const handleLoadLineup = (lineup) => {
    const positions = lineup.positions

    // Find member objects by ID from the current members array
    const findMember = (id) => members.find(m => m.id === id)

    // Get alternates array with backward compatibility
    const alternatesIds = positions.alternates || [null, null, null, null]

    // Reconstruct boat positions with actual member objects
    const newBoatPositions = {
      drummer: positions.drummer ? findMember(positions.drummer) : null,
      steersperson: positions.steersperson ? findMember(positions.steersperson) : null,
      left: positions.paddlers.left.map(id => id ? findMember(id) : null),
      right: positions.paddlers.right.map(id => id ? findMember(id) : null),
      alternates: alternatesIds.map(id => id ? findMember(id) : null)
    }

    // Update boat rows if lineup has different size
    const lineupRows = positions.paddlers.left.length
    if (lineupRows !== boatRows) {
      setBoatRows(lineupRows)
    }

    // Update boat positions
    setBoatPositions(newBoatPositions)

    // Set editing mode and lineup metadata
    setEditingLineupId(lineup.id)
    setLineupName(lineup.name)
    setLineupNotes(lineup.notes || '')

    // Remove loaded members from available pool
    const loadedMemberIds = new Set([
      positions.drummer,
      positions.steersperson,
      ...positions.paddlers.left,
      ...positions.paddlers.right,
      ...alternatesIds
    ].filter(id => id !== null))

    setAvailableMembers(members.filter(m => m.is_active && !loadedMemberIds.has(m.id)))

    toast.success(`Loaded lineup: ${lineup.name} (Editing mode)`)

    // Scroll to top to see the loaded lineup
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Calculate weight distribution and balance
  const calculateBalance = () => {
    const positions = boatPositions

    // Calculate primary weights
    const drummerWeight = positions.drummer?.weight_kg || 0
    const steerspersonWeight = positions.steersperson?.weight_kg || 0

    const leftWeights = positions.left.map(m => m?.weight_kg || 0)
    const rightWeights = positions.right.map(m => m?.weight_kg || 0)

    const leftTotal = leftWeights.reduce((sum, w) => sum + w, 0)
    const rightTotal = rightWeights.reduce((sum, w) => sum + w, 0)
    const totalWeight = drummerWeight + steerspersonWeight + leftTotal + rightTotal

    // Calculate secondary weights (for comparison)
    const drummerWeightSecondary = positions.drummer_secondary?.weight_kg || 0
    const steerspersonWeightSecondary = positions.steersperson_secondary?.weight_kg || 0

    const leftWeightsSecondary = (positions.left_secondary || []).map(m => m?.weight_kg || 0)
    const rightWeightsSecondary = (positions.right_secondary || []).map(m => m?.weight_kg || 0)

    const leftTotalSecondary = leftWeightsSecondary.reduce((sum, w) => sum + w, 0)
    const rightTotalSecondary = rightWeightsSecondary.reduce((sum, w) => sum + w, 0)
    const totalWeightSecondary = drummerWeightSecondary + steerspersonWeightSecondary + leftTotalSecondary + rightTotalSecondary

    // Calculate front/back balance (positions 1-5 vs 6-10)
    const frontLeft = leftWeights.slice(0, 5).reduce((sum, w) => sum + w, 0)
    const frontRight = rightWeights.slice(0, 5).reduce((sum, w) => sum + w, 0)
    const backLeft = leftWeights.slice(5).reduce((sum, w) => sum + w, 0)
    const backRight = rightWeights.slice(5).reduce((sum, w) => sum + w, 0)

    const frontTotal = drummerWeight + frontLeft + frontRight
    const backTotal = steerspersonWeight + backLeft + backRight

    // Calculate side-to-side balance
    const leftSideTotal = leftTotal
    const rightSideTotal = rightTotal
    const sideDiff = Math.abs(leftSideTotal - rightSideTotal)
    const sideBalance = totalWeight > 0 ? (sideDiff / totalWeight) * 100 : 0

    // Calculate front-back balance
    const frontBackDiff = Math.abs(frontTotal - backTotal)
    const frontBackBalance = totalWeight > 0 ? (frontBackDiff / totalWeight) * 100 : 0

    // Calculate comparison differences
    const hasSecondary = totalWeightSecondary > 0
    const totalWeightDiff = totalWeightSecondary - totalWeight
    const leftTotalDiff = leftTotalSecondary - leftTotal
    const rightTotalDiff = rightTotalSecondary - rightTotal

    return {
      totalWeight,
      leftTotal,
      rightTotal,
      frontTotal,
      backTotal,
      sideDiff,
      sideBalance,
      frontBackDiff,
      frontBackBalance,
      drummerWeight,
      steerspersonWeight,
      // Secondary comparison data
      hasSecondary,
      totalWeightSecondary,
      totalWeightDiff,
      leftTotalSecondary,
      leftTotalDiff,
      rightTotalSecondary,
      rightTotalDiff
    }
  }

  const balance = calculateBalance()

  const frontRatio = balance.totalWeight > 0 ? balance.frontTotal / balance.totalWeight : 0.5
  const altFrontRatio = balance.totalWeightSecondary > 0
    ? balance.frontTotalSecondary / balance.totalWeightSecondary
    : frontRatio

  const unitLabel = unitSystem === 'imperial' ? 'lb' : 'kg'
  const weightFactor = unitSystem === 'imperial' ? 2.20462262 : 1
  const formatWeight = (kgValue, digits = 1) => `${(kgValue * weightFactor).toFixed(digits)} ${unitLabel}`

  // Seat-by-seat weight heatmap (left row + right row)
  const drummerHeatWeight = boatPositions.drummer?.weight_kg || 0
  const steersHeatWeight = boatPositions.steersperson?.weight_kg || 0

  const leftWeights = boatPositions.left.map(m => m?.weight_kg || 0)
  const rightWeights = boatPositions.right.map(m => m?.weight_kg || 0)
  const altLeftWeights = boatPositions.left.map((m, idx) =>
    (m?.weight_kg || 0) + (boatPositions.left_secondary?.[idx]?.weight_kg || 0)
  )
  const altRightWeights = boatPositions.right.map((m, idx) =>
    (m?.weight_kg || 0) + (boatPositions.right_secondary?.[idx]?.weight_kg || 0)
  )
  const altDrummerHeatWeight = drummerHeatWeight + (boatPositions.drummer_secondary?.weight_kg || 0)
  const altSteersHeatWeight = steersHeatWeight + (boatPositions.steersperson_secondary?.weight_kg || 0)
  const maxSeat = Math.max(
    1,
    drummerHeatWeight,
    steersHeatWeight,
    altDrummerHeatWeight,
    altSteersHeatWeight,
    ...leftWeights,
    ...rightWeights,
    ...(altLeftWeights || []),
    ...(altRightWeights || [])
  )

  const pillStyle = (weight, isAlt = false) => ({
    writingMode: 'vertical-rl',
    backgroundColor: `rgba(${isAlt ? '251, 113, 133' : '244, 63, 94'}, ${Math.max(0.15, Math.min(1, weight / maxSeat))})`
  })

  const getBalanceStatus = (balancePercent) => {
    if (balancePercent < 3) return { label: 'Excellent', color: 'text-green-600', bg: 'bg-green-100' }
    if (balancePercent < 5) return { label: 'Good', color: 'text-blue-600', bg: 'bg-blue-100' }
    if (balancePercent < 8) return { label: 'Fair', color: 'text-yellow-600', bg: 'bg-yellow-100' }
    return { label: 'Unbalanced', color: 'text-red-600', bg: 'bg-red-100' }
  }

  const getRsvpBadge = (status) => {
    switch (status) {
      case 'yes':
        return { icon: '✓', label: 'Yes', color: 'bg-green-500 text-white' }
      case 'maybe':
        return { icon: '?', label: 'Maybe', color: 'bg-yellow-500 text-white' }
      case 'no':
        return { icon: '✗', label: 'No', color: 'bg-red-500 text-white' }
      case 'no_response':
        return { icon: '·', label: 'No Response', color: 'bg-gray-400 text-white' }
      default:
        return null
    }
  }

  const MemberCard = ({ member, index, isDragging, isSecondary = false }) => {
    const rsvpBadge = member.rsvpStatus ? getRsvpBadge(member.rsvpStatus) : null

    return (
      <Draggable draggableId={member.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={`p-2 mb-1 ${member.is_guest ? 'bg-orange-50' : 'bg-white'} border rounded-lg shadow-sm cursor-move hover:shadow-md transition-shadow ${
              snapshot.isDragging ? 'opacity-50' : ''
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-sm font-medium text-gray-900">
                    {member.full_name}
                  </span>
                  {isSecondary && (
                    <span className="px-1 py-0.5 text-[10px] font-semibold bg-orange-100 text-orange-700 rounded">
                      ALT
                    </span>
                  )}
                  {member.is_guest && (
                    <span className="px-1.5 py-0.5 text-xs font-bold bg-orange-200 text-orange-800 rounded">
                      GUEST
                    </span>
                  )}
                  {member.can_steer && (
                    <span className="px-1.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded" title="Can steer">
                      🚢 Steer
                    </span>
                  )}
                  {member.can_drum && (
                    <span className="px-1.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded" title="Can drum">
                      🥁 Drum
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500 flex gap-2 flex-wrap">
                  {member.weight_kg && <span className="font-semibold">{formatWeight(member.weight_kg)}</span>}
                  {member.preferred_side && <span>• {member.preferred_side}</span>}
                  {member.skill_level && <span>• {member.skill_level}</span>}
                </div>
              </div>
              {rsvpBadge && (
                <div className={`ml-2 flex-shrink-0 w-5 h-5 rounded-full ${rsvpBadge.color} flex items-center justify-center text-xs font-bold`} title={rsvpBadge.label}>
                  {rsvpBadge.icon}
                </div>
              )}
            </div>
          </div>
        )}
      </Draggable>
    )
  }

  const BoatPosition = ({ droppableId, member, label, side, secondaryMember = null }) => {
    const primaryWeight = member?.weight_kg || 0
    const secondaryWeight = secondaryMember?.weight_kg || 0
    const weightDiff = secondaryWeight - primaryWeight

    const cards = []
    if (member) cards.push({ member, isSecondary: false })
    if (secondaryMember) cards.push({ member: secondaryMember, isSecondary: true })

    return (
      <Droppable droppableId={droppableId}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`p-2 border-2 border-dashed rounded-lg min-h-[60px] flex flex-col gap-2 ${
              snapshot.isDraggingOver ? 'bg-primary-50 border-primary-300' : 'bg-gray-50 border-gray-300'
            }`}
          >
            {cards.length === 0 && <span className="text-xs text-gray-400">{label}</span>}
            {cards.map((card, idx) => (
              <MemberCard key={`${droppableId}-${card.member.id}-${card.isSecondary ? 'alt' : 'primary'}`} member={card.member} index={idx} isSecondary={card.isSecondary} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    )
  }

  if (!hasRole('admin')) {
    return (
      <div className="card">
        <p className="text-gray-600">
          Only admins and coaches can create lineups. Check the Lineups page to view existing lineups.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Lineup Builder</h1>
          {editingLineupId && (
            <p className="text-sm text-orange-600 mt-1">
              ✏️ Editing: {lineupName || 'Unnamed Lineup'}
            </p>
          )}
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <div className="flex items-center gap-1 bg-gray-100 px-3 py-1 rounded-full text-sm">
            <span className="text-gray-600">Units:</span>
            <button
              onClick={() => setUnitSystem('metric')}
              className={`px-2 py-0.5 rounded ${unitSystem === 'metric' ? 'bg-primary-600 text-white' : 'text-gray-700 hover:bg-gray-200'}`}
            >
              Metric
            </button>
            <button
              onClick={() => setUnitSystem('imperial')}
              className={`px-2 py-0.5 rounded ${unitSystem === 'imperial' ? 'bg-primary-600 text-white' : 'text-gray-700 hover:bg-gray-200'}`}
            >
              Imperial
            </button>
          </div>
          <button
            onClick={handleResetPositions}
            className="btn bg-gray-500 hover:bg-gray-600 text-white"
            title="Clear all positions but keep lineup info"
          >
            🔄 Reset
          </button>
          <button
            onClick={handleClearLineup}
            className="btn btn-secondary"
            title="Clear everything and start fresh"
          >
            Clear All
          </button>
          {editingLineupId && (
            <button
              onClick={() => {
                // Temporarily clear editing ID to save as new
                const tempEditId = editingLineupId
                setEditingLineupId(null)
                setIsCreating(true)
                // Store the temp ID in case user cancels
                window.__tempEditId = tempEditId
              }}
              className="btn bg-green-600 hover:bg-green-700 text-white"
              title="Create a new lineup based on this one"
            >
              💾 Save as New
            </button>
          )}
          <button
            onClick={() => setIsCreating(true)}
            className={`btn ${editingLineupId ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'btn-primary'}`}
          >
            {editingLineupId ? '✏️ Update Lineup' : '+ Save Lineup'}
          </button>
        </div>
      </div>

      {/* Boat Size Selector */}
      <div className="card mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="font-medium text-gray-700">Boat Size:</span>

          {/* Quick Select Buttons */}
          <div className="flex gap-2">
            {[5, 9, 10].map(size => (
              <button
                key={size}
                onClick={() => handleBoatSizeChange(size)}
                className={`px-3 py-2 rounded-lg font-medium transition-colors text-sm ${
                  boatRows === size
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {size}
              </button>
            ))}
          </div>

          <span className="text-gray-400">or</span>

          {/* Custom Dropdown */}
          <div className="flex items-center gap-2">
            <label htmlFor="boatSize" className="text-sm text-gray-600">Custom:</label>
            <select
              id="boatSize"
              value={boatRows}
              onChange={(e) => handleBoatSizeChange(parseInt(e.target.value))}
              className="input py-2 px-3 text-sm w-20"
            >
              {Array.from({ length: 9 }, (_, i) => i + 4).map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
            <span className="text-sm text-gray-600">rows</span>
          </div>

          {/* Info */}
          <span className="text-sm text-gray-600 ml-auto">
            = {boatRows * 2} paddlers + drummer + steersperson = <strong>{boatRows * 2 + 2} total</strong>
          </span>
        </div>
      </div>

      {/* Save/Update Lineup Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingLineupId ? 'Update Lineup' : window.__tempEditId ? 'Save as New Lineup' : 'Save Lineup'}
            </h2>
            {editingLineupId && (
              <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-sm text-orange-800">
                  ✏️ You are editing an existing lineup. Changes will be saved to the current lineup.
                </p>
              </div>
            )}
            {!editingLineupId && window.__tempEditId && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  💾 This will create a new lineup based on your current configuration. The original lineup will remain unchanged.
                </p>
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label htmlFor="lineupName" className="label">
                  Lineup Name *
                </label>
                <input
                  id="lineupName"
                  type="text"
                  className="input"
                  placeholder="Saturday Race Lineup"
                  value={lineupName}
                  onChange={(e) => setLineupName(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="lineupNotes" className="label">
                  Notes (Optional)
                </label>
                <textarea
                  id="lineupNotes"
                  className="input"
                  rows="3"
                  placeholder="Add notes about this lineup..."
                  value={lineupNotes}
                  onChange={(e) => setLineupNotes(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  // Restore editing state if user was doing "Save as New"
                  if (window.__tempEditId) {
                    setEditingLineupId(window.__tempEditId)
                    window.__tempEditId = null
                  }
                  setIsCreating(false)
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveLineup}
                className={`btn ${editingLineupId ? 'bg-orange-600 hover:bg-orange-700 text-white' : window.__tempEditId ? 'bg-green-600 hover:bg-green-700 text-white' : 'btn-primary'}`}
              >
                {editingLineupId ? 'Update' : window.__tempEditId ? 'Save as New' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Balance Panel */}
      <div className="card mb-6 bg-gradient-to-r from-blue-50 to-purple-50">
        <h3 className="font-semibold text-gray-900 mb-4">Weight Distribution & Balance</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Total Weight */}
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <p className="text-xs text-gray-600">Total Weight</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatWeight(balance.totalWeight)}
              {balance.hasSecondary && (
                <span className="text-sm ml-2 text-gray-600">
                  ({formatWeight(balance.totalWeightSecondary)} alt)
                </span>
              )}
            </p>
          </div>

          {/* Left vs Right */}
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <p className="text-xs text-gray-600">Left vs Right</p>
            <div className="flex items-center gap-2">
              <p className="text-lg font-bold text-gray-900">
                {formatWeight(balance.leftTotal)} / {formatWeight(balance.rightTotal)}
                {balance.hasSecondary && (
                  <span className="text-xs ml-1 text-gray-600">
                    ({formatWeight(balance.leftTotalSecondary)} / {formatWeight(balance.rightTotalSecondary)})
                  </span>
                )}
              </p>
            </div>
            <div className={`text-xs font-semibold mt-1 ${getBalanceStatus(balance.sideBalance).color}`}>
              Δ {formatWeight(balance.sideDiff)} ({balance.sideBalance.toFixed(1)}%)
            </div>
          </div>

          {/* Overall Balance Status */}
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <p className="text-xs text-gray-600">Balance Status</p>
            <div className="space-y-1 mt-1">
              <div className={`text-xs px-2 py-1 rounded ${getBalanceStatus(balance.sideBalance).bg} ${getBalanceStatus(balance.sideBalance).color} font-semibold`}>
                L/R: {getBalanceStatus(balance.sideBalance).label}
              </div>
            </div>
          </div>
        </div>

        {/* Visual Balance Bar */}
        <div className="space-y-3">
          {/* Left/Right Balance Bar */}
          <div>
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Left: {formatWeight(balance.leftTotal)}</span>
              <span>Right: {formatWeight(balance.rightTotal)}</span>
            </div>
            <div className="space-y-1">
              {/* Primary */}
              <div className="relative h-6 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`absolute left-0 h-full ${balance.leftTotal >= balance.rightTotal ? 'bg-cyan-600' : 'bg-sky-600'} transition-all z-10 opacity-90`}
                  style={{ width: `${balance.totalWeight > 0 ? (balance.leftTotal / balance.totalWeight) * 100 : 50}%` }}
                />
                <div
                  className={`absolute right-0 h-full ${balance.rightTotal > balance.leftTotal ? 'bg-cyan-600' : 'bg-sky-600'} transition-all z-10 opacity-90`}
                  style={{ width: `${balance.totalWeight > 0 ? (balance.rightTotal / balance.totalWeight) * 100 : 50}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                  <span className="text-xs font-bold text-white drop-shadow flex items-center gap-2">
                    <span>Δ {formatWeight(balance.sideDiff)}</span>
                    {balance.hasSecondary && (
                      <span className="text-[11px] text-gray-100">Alt Δ {formatWeight(balance.leftTotalSecondary - balance.rightTotalSecondary)}</span>
                    )}
                  </span>
                </div>
              </div>
                {/* Alternate */}
                {balance.hasSecondary && balance.totalWeightSecondary > 0 && (
                  <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                    <div
                      className={`absolute left-0 h-full ${balance.leftTotalSecondary >= balance.rightTotalSecondary ? 'bg-emerald-500' : 'bg-teal-400'} transition-all z-10 opacity-90`}
                      style={{ width: `${(balance.leftTotalSecondary / balance.totalWeightSecondary) * 100}%` }}
                  />
                  <div
                    className={`absolute right-0 h-full ${balance.rightTotalSecondary > balance.leftTotalSecondary ? 'bg-emerald-500' : 'bg-teal-500'} transition-all z-10 opacity-90`}
                    style={{ width: `${(balance.rightTotalSecondary / balance.totalWeightSecondary) * 100}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[10px] font-semibold text-white drop-shadow">
                        Alt Δ {formatWeight(balance.leftTotalSecondary - balance.rightTotalSecondary)}
                      </span>
                    </div>
                  </div>
                )}
            </div>
          </div>

          {/* Seat heatmap (top/bottom rows) */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-gray-600">
              <span>Seat heatmap (front to back)</span>
              {balance.hasSecondary && <span className="text-gray-500">Alt rows include secondary</span>}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-2 py-1 rounded-full text-white flex items-center justify-center" style={pillStyle(drummerHeatWeight)}>
                  Drummer
                </span>
                <div className="flex-1 space-y-1">
                  <div className="grid grid-cols-10 gap-1 h-4">
                    {leftWeights.map((w, idx) => (
                      <div key={`left-${idx}`} className="relative rounded-full overflow-hidden bg-gray-100 border border-gray-200">
                        <div
                          className="absolute inset-0 bg-rose-500"
                          style={{ opacity: Math.min(1, w / maxSeat) }}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-10 gap-1 h-4">
                    {rightWeights.map((w, idx) => (
                      <div key={`right-${idx}`} className="relative rounded-full overflow-hidden bg-gray-100 border border-gray-200">
                        <div
                          className="absolute inset-0 bg-rose-500"
                          style={{ opacity: Math.min(1, w / maxSeat) }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <span className="text-[10px] px-2 py-1 rounded-full text-white flex items-center justify-center" style={pillStyle(steersHeatWeight)}>
                  Steerer
                </span>
              </div>
            </div>

            {balance.hasSecondary && balance.totalWeightSecondary > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-2 py-1 rounded-full text-white flex items-center justify-center" style={pillStyle(altDrummerHeatWeight, true)}>
                    Drummer
                  </span>
                  <div className="flex-1 space-y-1">
                    <div className="grid grid-cols-10 gap-1 h-3">
                      {altLeftWeights.map((w, idx) => (
                        <div key={`alt-left-${idx}`} className="relative rounded-full overflow-hidden bg-gray-100 border border-gray-200">
                          <div
                            className="absolute inset-0 bg-rose-400"
                            style={{ opacity: Math.min(1, w / maxSeat) }}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-10 gap-1 h-3">
                      {altRightWeights.map((w, idx) => (
                        <div key={`alt-right-${idx}`} className="relative rounded-full overflow-hidden bg-gray-100 border border-gray-200">
                          <div
                            className="absolute inset-0 bg-rose-400"
                            style={{ opacity: Math.min(1, w / maxSeat) }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-1 rounded-full text-white flex items-center justify-center" style={pillStyle(altSteersHeatWeight, true)}>
                    Steerer
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 h-3 mt-1">
                  {[{ label: 'Drummer (alt)', weight: altDrummerHeatWeight }, { label: 'Steer (alt)', weight: altSteersHeatWeight }].map(pos => (
                    <div key={pos.label} className="relative rounded-full overflow-hidden bg-gray-100 border border-gray-200">
                      <div
                        className="absolute inset-0 bg-rose-400"
                        style={{ opacity: Math.min(1, pos.weight / maxSeat) }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[10px] font-semibold text-white drop-shadow-sm">{pos.label}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Helpful Tips */}
        <div className="mt-4 p-3 bg-white rounded-lg border border-blue-200">
          <p className="text-xs text-gray-600">
            <span className="font-semibold">💡 Tip:</span> Aim for less than 3% difference for excellent balance.
            Consider weight distribution when placing stronger paddlers.
          </p>
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Available Members Pool */}
          <div className="lg:col-span-1">
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">Available Members ({availableMembers.length})</h3>

              {/* Practice Selector */}
              <div className="mb-4 space-y-3">
                <div>
                  <label htmlFor="practiceSelect" className="label text-xs">
                    Filter by Practice
                  </label>
                  <select
                    id="practiceSelect"
                    className="input text-sm"
                    value={selectedPracticeId}
                    onChange={(e) => {
                      setSelectedPracticeId(e.target.value)
                      setRsvpFilter('all') // Reset RSVP filter when changing practice
                    }}
                  >
                    <option value="">All Members</option>
                    {practices
                      .filter(p => new Date(p.date) >= new Date(new Date().setHours(0, 0, 0, 0)))
                      .map(practice => (
                        <option key={practice.id} value={practice.id}>
                          {new Date(practice.date).toLocaleDateString()} - {practice.title}
                        </option>
                      ))}
                  </select>
                </div>

                {/* RSVP Filter - Only show when practice is selected */}
                {selectedPracticeId && (
                  <div>
                    <label htmlFor="rsvpFilter" className="label text-xs">
                      RSVP Status
                    </label>
                    <select
                      id="rsvpFilter"
                      className="input text-sm"
                      value={rsvpFilter}
                      onChange={(e) => setRsvpFilter(e.target.value)}
                    >
                      <option value="all">All Statuses</option>
                      <option value="yes">✓ Attending</option>
                      <option value="maybe">? Maybe</option>
                      <option value="no_response">· No Response</option>
                      <option value="no">✗ Not Attending</option>
                    </select>
                  </div>
                )}

                {/* Legend */}
                {selectedPracticeId && (
                  <div className="text-xs bg-gray-50 p-2 rounded">
                    <div className="font-semibold text-gray-700 mb-1">RSVP Legend:</div>
                    <div className="flex flex-wrap gap-2">
                      <span className="flex items-center gap-1">
                        <div className="w-4 h-4 rounded-full bg-green-500 text-white flex items-center justify-center font-bold">✓</div>
                        <span className="text-gray-600">Yes</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <div className="w-4 h-4 rounded-full bg-yellow-500 text-white flex items-center justify-center font-bold">?</div>
                        <span className="text-gray-600">Maybe</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <div className="w-4 h-4 rounded-full bg-gray-400 text-white flex items-center justify-center font-bold">·</div>
                        <span className="text-gray-600">None</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <div className="w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center font-bold">✗</div>
                        <span className="text-gray-600">No</span>
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <Droppable droppableId="available">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-[400px] p-2 border-2 border-dashed rounded-lg ${
                      snapshot.isDraggingOver ? 'bg-primary-50 border-primary-300' : 'border-gray-300'
                    }`}
                  >
                    {availableMembers.map((member, index) => (
                      <MemberCard key={member.id} member={member} index={index} />
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          </div>

          {/* Boat Visualization */}
          <div className="lg:col-span-3">
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">Dragon Boat (Standard 20)</h3>

              <div className="space-y-4">
                {/* Drummer */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Drummer</h4>
                  <BoatPosition
                    droppableId="drummer"
                    member={boatPositions.drummer}
                    label="Drag drummer here"
                    secondaryMember={boatPositions.drummer_secondary}
                  />
                </div>

                {/* Paddlers Grid */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Paddlers</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Left Side */}
                    <div>
                      <h5 className="text-xs font-medium text-gray-600 mb-2 text-center">Left Side</h5>
                      <div className="space-y-2">
                        {boatPositions.left.map((member, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-500 w-6">{index + 1}</span>
                            <div className="flex-1">
                              <BoatPosition
                                droppableId={`left-${index}`}
                                member={member}
                                label={`Position ${index + 1}`}
                                side="left"
                                secondaryMember={boatPositions.left_secondary?.[index]}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Right Side */}
                    <div>
                      <h5 className="text-xs font-medium text-gray-600 mb-2 text-center">Right Side</h5>
                      <div className="space-y-2">
                        {boatPositions.right.map((member, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-500 w-6">{index + 1}</span>
                            <div className="flex-1">
                              <BoatPosition
                                droppableId={`right-${index}`}
                                member={member}
                                label={`Position ${index + 1}`}
                                side="right"
                                secondaryMember={boatPositions.right_secondary?.[index]}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Steersperson */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Steersperson</h4>
                  <BoatPosition
                    droppableId="steersperson"
                    member={boatPositions.steersperson}
                    label="Drag steersperson here"
                    secondaryMember={boatPositions.steersperson_secondary}
                  />
                </div>

                {/* Alternates Section */}
                <div className="mt-6 pt-6 border-t-2 border-gray-300">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Alternates</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {boatPositions.alternates.map((member, index) => (
                      <div key={index}>
                        <h5 className="text-xs font-medium text-gray-600 mb-1">Alternate {index + 1}</h5>
                        <BoatPosition
                          droppableId={`alternate-${index}`}
                          member={member}
                          label={`Alt ${index + 1}`}
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Alternates are not included in balance calculations
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DragDropContext>

      {/* Saved Lineups */}
      <div className="card mt-6">
        <h3 className="font-semibold text-gray-900 mb-4">Saved Lineups</h3>
        {loading ? (
          <p className="text-gray-600">Loading lineups...</p>
        ) : lineups.length === 0 ? (
          <p className="text-gray-600">No saved lineups yet. Create your first lineup above!</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {lineups.map((lineup) => {
              const lineupBalance = lineup.positions?.balance
              return (
                <div key={lineup.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">{lineup.name}</h4>
                    {lineupBalance && (
                      <div className="text-right">
                        <p className="text-xs font-semibold text-gray-900">
                          {lineupBalance.totalWeight?.toFixed(0)} kg
                        </p>
                      </div>
                    )}
                  </div>

                  {lineup.notes && (
                    <p className="text-sm text-gray-600 mb-2">{lineup.notes}</p>
                  )}

                  {lineupBalance && (
                    <div className="space-y-1 mb-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">L/R Balance:</span>
                        <span className={`font-semibold ${getBalanceStatus(lineupBalance.sideBalance).color}`}>
                          {getBalanceStatus(lineupBalance.sideBalance).label}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">F/B Balance:</span>
                        <span className={`font-semibold ${getBalanceStatus(lineupBalance.frontBackBalance).color}`}>
                          {getBalanceStatus(lineupBalance.frontBackBalance).label}
                        </span>
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-gray-500 mb-3">
                    Created by {lineup.created_by_profile?.full_name || 'Unknown'}
                  </p>

                  <div className="flex gap-2">
                    <button
                      className="flex-1 text-sm bg-primary-600 text-white px-3 py-1.5 rounded hover:bg-primary-700 font-medium"
                      onClick={() => handleLoadLineup(lineup)}
                    >
                      Load
                    </button>
                    <button
                      className="text-sm text-red-600 hover:text-red-700 font-medium px-3 py-1.5"
                      onClick={() => {
                        if (confirm(`Delete lineup "${lineup.name}"?`)) {
                          deleteLineup(lineup.id)
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
