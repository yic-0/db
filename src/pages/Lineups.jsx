import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { useLineupStore } from '../store/lineupStore'
import { useRosterStore } from '../store/rosterStore'
import { useAuthStore } from '../store/authStore'
import { usePracticeStore } from '../store/practiceStore'
import { useEventStore } from '../store/eventStore'
import toast from 'react-hot-toast'
import DragonBoatCogPanel from '../components/DragonBoatCogPanel'
import DragonBoatLeftRightPanel from '../components/DragonBoatLeftRightPanel'
import { computeSeatMomentsForLineup, computeCenterOfGravity, computeLeftRightDistribution } from '../lib/dragonboatCog'
import Icon from '../components/Icon'

export default function Lineups() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { lineups, currentLineup, loading, fetchLineups, createLineup, updateLineup, deleteLineup } = useLineupStore()
  const { members, fetchMembers } = useRosterStore()
  const { user, hasRole } = useAuthStore()
  const { practices, rsvps, fetchPractices, fetchRSVPs, fetchEventRSVPs } = usePracticeStore()
  const { events, fetchEvents } = useEventStore()

  const [isCreating, setIsCreating] = useState(false)
  const [editingLineupId, setEditingLineupId] = useState(null)
  const [lineupName, setLineupName] = useState('')
  const [lineupNotes, setLineupNotes] = useState('')
  const [selectedPracticeId, setSelectedPracticeId] = useState('')
  const [selectedEventId, setSelectedEventId] = useState('')
  const [rsvpFilter, setRsvpFilter] = useState('all')
  const [boatRows, setBoatRows] = useState(10)
  const [unitSystem, setUnitSystem] = useState('imperial')
  const [showComparison, setShowComparison] = useState(false)
  const [showBalancePanels, setShowBalancePanels] = useState(true)
  const [showAvailableMembers, setShowAvailableMembers] = useState(true)
  const [showSavedLineups, setShowSavedLineups] = useState(false)
  const [isSaveAs, setIsSaveAs] = useState(false)

  // Draggable bottom sheet state
  const [drawerHeight, setDrawerHeight] = useState(140) // Initial collapsed height
  const [isDraggingDrawer, setIsDraggingDrawer] = useState(false)
  const drawerRef = useRef(null)
  const dragStartY = useRef(0)
  const dragStartHeight = useRef(0)

  // Snap points for the drawer (in pixels from bottom)
  const DRAWER_MIN = 100
  const DRAWER_MID = Math.min(400, typeof window !== 'undefined' ? window.innerHeight * 0.5 : 400)
  const DRAWER_MAX = typeof window !== 'undefined' ? window.innerHeight * 0.85 : 600

  // Handle drawer drag
  const handleDrawerTouchStart = useCallback((e) => {
    if (e.target.closest('.member-card-draggable')) return // Don't interfere with DnD
    setIsDraggingDrawer(true)
    dragStartY.current = e.touches[0].clientY
    dragStartHeight.current = drawerHeight
  }, [drawerHeight])

  const handleDrawerTouchMove = useCallback((e) => {
    if (!isDraggingDrawer) return
    const deltaY = dragStartY.current - e.touches[0].clientY
    const newHeight = Math.max(DRAWER_MIN, Math.min(DRAWER_MAX, dragStartHeight.current + deltaY))
    setDrawerHeight(newHeight)
  }, [isDraggingDrawer])

  const handleDrawerTouchEnd = useCallback(() => {
    if (!isDraggingDrawer) return
    setIsDraggingDrawer(false)

    // Snap to nearest point
    const snapPoints = [DRAWER_MIN, DRAWER_MID, DRAWER_MAX]
    const closest = snapPoints.reduce((prev, curr) =>
      Math.abs(curr - drawerHeight) < Math.abs(prev - drawerHeight) ? curr : prev
    )
    setDrawerHeight(closest)
  }, [isDraggingDrawer, drawerHeight])

  // Quick snap buttons
  const snapDrawerTo = (target) => {
    setDrawerHeight(target)
  }

  // Available members pool
  const [availableMembers, setAvailableMembers] = useState([])

  // Boat positions
  const [boatPositions, setBoatPositions] = useState({
    drummer: null,
    drummer_secondary: null,
    left: Array(10).fill(null),
    left_secondary: Array(10).fill(null),
    right: Array(10).fill(null),
    right_secondary: Array(10).fill(null),
    steersperson: null,
    steersperson_secondary: null,
    alternates: [null, null, null, null]
  })

  useEffect(() => {
    fetchLineups()
    fetchMembers()
    fetchPractices()
    fetchEvents()
  }, [fetchLineups, fetchMembers, fetchPractices, fetchEvents])

  // Handle URL parameter to load a specific lineup
  useEffect(() => {
    const lineupId = searchParams.get('lineup')
    if (lineupId && lineups.length > 0) {
      const lineup = lineups.find(l => l.id === lineupId)
      if (lineup) {
        handleLoadLineup(lineup)
        searchParams.delete('lineup')
        setSearchParams(searchParams, { replace: true })
      }
    }
  }, [searchParams, lineups])

  // Handle URL parameter when creating lineup for an event
  useEffect(() => {
    const eventId = searchParams.get('event')
    const eventName = searchParams.get('eventName')
    if (eventId && eventName && !isCreating) {
      setLineupName(decodeURIComponent(eventName))
      setIsCreating(true)
      searchParams.delete('event')
      searchParams.delete('eventName')
      setSearchParams(searchParams, { replace: true })
    }
  }, [searchParams])

  // Fetch RSVPs when a practice or event is selected
  useEffect(() => {
    if (selectedPracticeId) {
      fetchRSVPs(selectedPracticeId)
    } else if (selectedEventId) {
      fetchEventRSVPs(selectedEventId)
    }
  }, [selectedPracticeId, selectedEventId, fetchRSVPs, fetchEventRSVPs])

  // Filter and sort members based on practice or event RSVP
  useEffect(() => {
    let filtered = (members || []).filter(m => m.is_active)

    let rsvpData = null
    if (selectedPracticeId && rsvps[selectedPracticeId]) {
      rsvpData = rsvps[selectedPracticeId]
    } else if (selectedEventId && rsvps[`event_${selectedEventId}`]) {
      rsvpData = rsvps[`event_${selectedEventId}`]
    }

    if (rsvpData) {
      filtered = filtered.map(member => {
        const rsvp = rsvpData.find(r => r.user_id === member.id)
        return {
          ...member,
          rsvpStatus: rsvp?.status || 'no_response'
        }
      })

      if (rsvpFilter !== 'all') {
        filtered = filtered.filter(m => m.rsvpStatus === rsvpFilter)
      }

      const statusOrder = { yes: 1, maybe: 2, no_response: 3, no: 4 }
      filtered.sort((a, b) => {
        const orderA = statusOrder[a.rsvpStatus] || 999
        const orderB = statusOrder[b.rsvpStatus] || 999
        return orderA - orderB
      })
    } else {
      filtered = filtered.map(member => ({
        ...member,
        rsvpStatus: null
      }))
    }

    // Filter out members already in the boat
    const positionedMemberIds = new Set()
    const addIds = (m) => { if (m?.id) positionedMemberIds.add(m.id) }
    
    addIds(boatPositions.drummer)
    addIds(boatPositions.steersperson)
    boatPositions.left.forEach(addIds)
    boatPositions.right.forEach(addIds)
    boatPositions.alternates.forEach(addIds)
    
    // Add secondary/comparison members too
    addIds(boatPositions.drummer_secondary)
    addIds(boatPositions.steersperson_secondary)
    boatPositions.left_secondary?.forEach(addIds)
    boatPositions.right_secondary?.forEach(addIds)

    setAvailableMembers(filtered.filter(m => !positionedMemberIds.has(m.id)))
  }, [members, selectedPracticeId, selectedEventId, rsvps, rsvpFilter, boatPositions]) 

  // Handle drag start - add body class to prevent scroll
  const handleDragStart = () => {
    document.body.classList.add('is-dragging')
  }

  const handleDragEnd = (result) => {
    document.body.classList.remove('is-dragging')
    const { source, destination, draggableId } = result
    if (!destination) return

    let draggedMember = null
    const parseIndex = (id) => parseInt(id.split('-')[1])

    // Find the dragged member object from source
    if (source.droppableId === 'available') {
      draggedMember = availableMembers[source.index]
    } else {
        const match = (m) => m?.id === draggableId ? m : null

        if (source.droppableId === 'drummer') {
            draggedMember = match(boatPositions.drummer) || match(boatPositions.drummer_secondary)
        } else if (source.droppableId === 'steersperson') {
            draggedMember = match(boatPositions.steersperson) || match(boatPositions.steersperson_secondary)
        } else if (source.droppableId.startsWith('left-')) {
            const idx = parseIndex(source.droppableId)
            draggedMember = match(boatPositions.left[idx]) || match(boatPositions.left_secondary[idx])
        } else if (source.droppableId.startsWith('right-')) {
            const idx = parseIndex(source.droppableId)
            draggedMember = match(boatPositions.right[idx]) || match(boatPositions.right_secondary[idx])
        } else if (source.droppableId.startsWith('alternate-')) {
            const idx = parseIndex(source.droppableId)
            draggedMember = match(boatPositions.alternates[idx])
        }
    }

    if (!draggedMember) return

    let newBoatPositions = { ...boatPositions }

    // Helper to remove from source using ID check
    const removeFromSource = () => {
        const removeIfMatch = (m) => m?.id === draggableId ? null : m

        if (source.droppableId === 'available') {
            // Handled by state update
        } else if (source.droppableId === 'drummer') {
            newBoatPositions.drummer = removeIfMatch(newBoatPositions.drummer)
            newBoatPositions.drummer_secondary = removeIfMatch(newBoatPositions.drummer_secondary)
        } else if (source.droppableId === 'steersperson') {
            newBoatPositions.steersperson = removeIfMatch(newBoatPositions.steersperson)
            newBoatPositions.steersperson_secondary = removeIfMatch(newBoatPositions.steersperson_secondary)
        } else if (source.droppableId.startsWith('left-')) {
            const idx = parseIndex(source.droppableId)
            newBoatPositions.left = [...newBoatPositions.left]
            newBoatPositions.left_secondary = [...newBoatPositions.left_secondary]
            
            newBoatPositions.left[idx] = removeIfMatch(newBoatPositions.left[idx])
            newBoatPositions.left_secondary[idx] = removeIfMatch(newBoatPositions.left_secondary[idx])
        } else if (source.droppableId.startsWith('right-')) {
            const idx = parseIndex(source.droppableId)
            newBoatPositions.right = [...newBoatPositions.right]
            newBoatPositions.right_secondary = [...newBoatPositions.right_secondary]

            newBoatPositions.right[idx] = removeIfMatch(newBoatPositions.right[idx])
            newBoatPositions.right_secondary[idx] = removeIfMatch(newBoatPositions.right_secondary[idx])
        } else if (source.droppableId.startsWith('alternate-')) {
            const idx = parseIndex(source.droppableId)
            newBoatPositions.alternates = [...newBoatPositions.alternates]
            newBoatPositions.alternates[idx] = removeIfMatch(newBoatPositions.alternates[idx])
        }
    }

    // Helper to add to destination
    const addToDest = () => {
        if (destination.droppableId === 'available') return 

        const placeIn = (primaryField, secondaryField, idx = null) => {
            const get = (field, i) => i !== null ? newBoatPositions[field][i] : newBoatPositions[field]
            const set = (field, i, val) => {
                if (i !== null) {
                    if (!newBoatPositions[field]) newBoatPositions[field] = [...boatPositions[field]] 
                    const arr = [...newBoatPositions[field]]
                    arr[i] = val
                    newBoatPositions[field] = arr
                } else {
                    newBoatPositions[field] = val
                }
            }

            if (!get(primaryField, idx)) {
                set(primaryField, idx, draggedMember)
            } else if (secondaryField && !get(secondaryField, idx)) {
                set(secondaryField, idx, draggedMember)
            } else if (secondaryField) {
                set(secondaryField, idx, draggedMember)
            } else {
                set(primaryField, idx, draggedMember)
            }
        }

        if (destination.droppableId === 'drummer') placeIn('drummer', 'drummer_secondary')
        else if (destination.droppableId === 'steersperson') placeIn('steersperson', 'steersperson_secondary')
        else if (destination.droppableId.startsWith('left-')) placeIn('left', 'left_secondary', parseIndex(destination.droppableId))
        else if (destination.droppableId.startsWith('right-')) placeIn('right', 'right_secondary', parseIndex(destination.droppableId))
        else if (destination.droppableId.startsWith('alternate-')) placeIn('alternates', null, parseIndex(destination.droppableId))
    }
    
    removeFromSource()
    addToDest()
    
    setBoatPositions(newBoatPositions)
  }

  const handleBoatSizeChange = (newSize) => {
    const resizeArr = (arr) => {
        if (!arr) return Array(newSize).fill(null)
        if (newSize > arr.length) return [...arr, ...Array(newSize - arr.length).fill(null)]
        return arr.slice(0, newSize)
    }
    
    setBoatRows(newSize)
    setBoatPositions(prev => ({
        ...prev,
        left: resizeArr(prev.left),
        right: resizeArr(prev.right),
        left_secondary: resizeArr(prev.left_secondary),
        right_secondary: resizeArr(prev.right_secondary),
    }))
  }

  const handleSaveLineup = async () => {
    if (!lineupName.trim()) {
        toast.error('Please enter a lineup name')
        return
    }
    
    const positions = {
      drummer: boatPositions.drummer?.id || null,
      steersperson: boatPositions.steersperson?.id || null,
      paddlers: {
        left: boatPositions.left.map(m => m?.id || null),
        right: boatPositions.right.map(m => m?.id || null)
      },
      alternates: boatPositions.alternates.map(m => m?.id || null),
      // Include secondary for saving if backend supports it (assuming simple schema for now)
      // If schema supports custom JSON, we can save it all
      drummer_secondary: boatPositions.drummer_secondary?.id || null,
      steersperson_secondary: boatPositions.steersperson_secondary?.id || null,
      paddlers_secondary: {
          left: boatPositions.left_secondary.map(m => m?.id || null),
          right: boatPositions.right_secondary.map(m => m?.id || null)
      }
    }
    
    const lineupData = { name: lineupName, notes: lineupNotes || null, positions, created_by: user.id }
    
    let result
    if (editingLineupId && !isSaveAs) {
        result = await updateLineup(editingLineupId, lineupData)
    } else {
        result = await createLineup(lineupData)
    }

    if (result.success) {
        toast.success(editingLineupId && !isSaveAs ? 'Lineup updated!' : 'Lineup saved!')
        setEditingLineupId(result.data?.id || null)
        setIsCreating(false)
        setIsSaveAs(false)
        if (window.__tempEditId) window.__tempEditId = null
    } else {
        toast.error('Failed to save lineup')
    }
  }

  const handleResetPositions = () => {
    setBoatPositions(prev => ({
        ...prev,
        drummer: null, drummer_secondary: null, steersperson: null, steersperson_secondary: null,
        left: Array(boatRows).fill(null), left_secondary: Array(boatRows).fill(null),
        right: Array(boatRows).fill(null), right_secondary: Array(boatRows).fill(null),
        alternates: [null, null, null, null]
    }))
    toast.success('Positions cleared')
  }

  const handleClearLineup = () => {
    handleResetPositions()
    setLineupName('')
    setLineupNotes('')
    setEditingLineupId(null)
  }

  const handleLoadLineup = (lineup) => {
    const findMember = (id) => (members || []).find(m => m.id === id)
    const p = lineup.positions
    
    const mapMembers = (ids) => (ids || []).map(id => findMember(id) || null)
    const fill = (arr, len) => {
        const res = arr ? [...arr] : []
        while (res.length < len) res.push(null)
        return res.slice(0, len)
    }

    const loadedRows = p.paddlers?.left?.length || 10
    if (loadedRows !== boatRows) setBoatRows(loadedRows)

    setBoatPositions({
        drummer: findMember(p.drummer),
        drummer_secondary: findMember(p.drummer_secondary),
        steersperson: findMember(p.steersperson),
        steersperson_secondary: findMember(p.steersperson_secondary),
        left: fill(mapMembers(p.paddlers?.left), loadedRows),
        right: fill(mapMembers(p.paddlers?.right), loadedRows),
        left_secondary: fill(mapMembers(p.paddlers_secondary?.left), loadedRows),
        right_secondary: fill(mapMembers(p.paddlers_secondary?.right), loadedRows),
        alternates: fill(mapMembers(p.alternates), 4)
    })
    setLineupName(lineup.name)
    setLineupNotes(lineup.notes)
    setEditingLineupId(lineup.id)
  }

  const weightFactor = unitSystem === 'imperial' ? 2.20462 : 1
  const unitLabel = unitSystem === 'imperial' ? 'lb' : 'kg'
  const formatWt = (kg) => kg ? `${(kg * weightFactor).toFixed(0)} ${unitLabel}` : '-'

  const getWeightKg = (athlete) => {
    if (!athlete) return 0
    if (typeof athlete.weight_kg === 'number') return athlete.weight_kg
    if (typeof athlete.weightKg === 'number') return athlete.weightKg
    if (typeof athlete.weight_lbs === 'number') return athlete.weight_lbs / 2.20462
    if (typeof athlete.weight === 'number') return athlete.weight
    return 0
  }

  // Count genders for current lineup state
  const countGenders = (positions, isSecondary = false) => {
    let m = 0, f = 0
    const check = (mem) => {
        if (!mem) return
        const g = mem.gender?.toLowerCase()
        if (g === 'male') m++
        else if (g === 'female') f++
    }
    
    if (isSecondary) {
        check(positions.drummer_secondary)
        check(positions.steersperson_secondary)
        positions.left_secondary?.forEach(check)
        positions.right_secondary?.forEach(check)
    } else {
        check(positions.drummer)
        check(positions.steersperson)
        positions.left.forEach(check)
        positions.right.forEach(check)
    }
    return { m, f }
  }

  const primaryGenderCount = useMemo(() => countGenders(boatPositions, false), [boatPositions])
  const secondaryGenderCount = useMemo(() => countGenders(boatPositions, true), [boatPositions])

  const cogLayout = useMemo(() => {
    const spacing = 1
    const seats = []
    seats.push({ id: 'drummer', name: 'Drummer', x: -(boatRows + 1) * spacing })
    for (let i = 0; i < boatRows; i++) {
      const x = -(boatRows - i) * spacing
      seats.push({ id: `L${i + 1}`, name: `L${i + 1}`, x, side: 'port' })
      seats.push({ id: `R${i + 1}`, name: `R${i + 1}`, x, side: 'starboard' })
    }
    seats.push({ id: 'steer', name: 'Steer', x: spacing * 1.5 })
    return {
      id: `standard-${boatRows}`,
      name: `${boatRows}-row boat`,
      seats
    }
  }, [boatRows])

  const cogAthletes = useMemo(() => {
    return members.map(m => ({
      id: m.id,
      name: m.full_name || m.name || 'Unknown',
      weightKg: getWeightKg(m)
    }))
  }, [members])

  const cogLineup = useMemo(() => {
    const assignments = []
    const addAssignment = (seatId, member) => {
      if (member?.id) assignments.push({ seatId, athleteId: member.id })
    }
    addAssignment('drummer', boatPositions.drummer)
    for (let i = 0; i < boatRows; i++) {
      addAssignment(`L${i + 1}`, boatPositions.left?.[i])
      addAssignment(`R${i + 1}`, boatPositions.right?.[i])
    }
    addAssignment('steer', boatPositions.steersperson)

    return {
      id: currentLineup?.id || 'scratch',
      boatLayoutId: cogLayout.id,
      name: currentLineup?.name || lineupName || 'Lineup',
      assignments
    }
  }, [boatPositions, boatRows, currentLineup, lineupName, cogLayout.id])

  const cogLineupSecondary = useMemo(() => {
    const assignments = []
    const addAssignment = (seatId, member) => {
      if (member?.id) assignments.push({ seatId, athleteId: member.id })
    }
    
    addAssignment('drummer', boatPositions.drummer_secondary)
    for (let i = 0; i < boatRows; i++) {
      addAssignment(`L${i + 1}`, boatPositions.left_secondary?.[i])
      addAssignment(`R${i + 1}`, boatPositions.right_secondary?.[i])
    }
    addAssignment('steer', boatPositions.steersperson_secondary)

    return {
      id: 'secondary',
      boatLayoutId: cogLayout.id,
      name: 'Secondary Lineup',
      assignments
    }
  }, [boatPositions, boatRows, cogLayout.id])

  const seatLeverageMap = useMemo(() => {
    try {
      if (!cogLayout || !cogAthletes || !cogLineup) return new Map();
      const seatMoments = computeSeatMomentsForLineup(cogLayout, cogAthletes, cogLineup)
      const map = new Map()
      for (const sm of seatMoments) {
        map.set(sm.seatId, sm.momentNormalized)
      }
      return map
    } catch (e) {
      console.error('Failed to compute seat moments', e)
      return new Map()
    }
  }, [cogLayout, cogAthletes, cogLineup])

  const seatLeverageMapSecondary = useMemo(() => {
    try {
      if (!cogLayout || !cogAthletes || !cogLineupSecondary) return new Map();
      const seatMoments = computeSeatMomentsForLineup(cogLayout, cogAthletes, cogLineupSecondary)
      const map = new Map()
      for (const sm of seatMoments) {
        map.set(sm.seatId, sm.momentNormalized)
      }
      return map
    } catch (e) {
        return new Map()
    }
  }, [cogLayout, cogAthletes, cogLineupSecondary])

  const hasSecondaryMembers = useMemo(() => {
    return !!(
      boatPositions.drummer_secondary ||
      boatPositions.steersperson_secondary ||
      boatPositions.left_secondary?.some(m => m !== null) ||
      boatPositions.right_secondary?.some(m => m !== null)
    )
  }, [boatPositions])

  // -- Sub-Components -- //

  const MemberCard = ({ member, index, isSecondary, leverage = 0, noMarginBottom = false }) => {
    if (!member) return null;

    const intensity = leverage || 0
    const bgGradient = intensity > 0
      ? `linear-gradient(135deg, rgba(99,102,241,0.08), rgba(239,68,68,${0.2 + 0.45 * intensity}))`
      : member.is_guest
        ? 'linear-gradient(135deg, rgba(251,146,60,0.1), rgba(251,146,60,0.2))'
        : 'linear-gradient(135deg, rgba(241,245,249,0.9), rgba(255,255,255,0.95))'

    return (
      <Draggable draggableId={String(member.id)} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={`
              member-card-draggable
              relative p-1.5 rounded-lg border shadow-sm bg-white/90 backdrop-blur-sm cursor-grab active:cursor-grabbing select-none transition-all
              ${snapshot.isDragging ? 'z-[9999] scale-105 shadow-xl ring-2 ring-primary-400 rotate-1' : 'hover:border-primary-300 hover:shadow-md'}
              ${isSecondary ? 'border-l-4 border-l-purple-400' : 'border-l-4 border-l-blue-400'}
              ${!noMarginBottom ? 'mb-1' : ''}
              border-slate-200
            `}
            style={{
              backgroundImage: bgGradient,
              ...provided.draggableProps.style,
              transformOrigin: 'top left',
              touchAction: 'none', // Critical for mobile drag-drop
            }}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0 mr-1">
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="font-bold text-xs text-slate-800 truncate max-w-[110px] leading-tight">{member.full_name}</span>
                  {member.gender && (
                    <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold text-white ${member.gender.toLowerCase() === 'female' ? 'bg-pink-400' : 'bg-blue-400'}`}>
                      {member.gender.charAt(0).toUpperCase()}
                    </span>
                  )}
                  {member.is_guest && (
                    <span className="px-1 text-[8px] font-bold bg-amber-100 text-amber-700 rounded border border-amber-200 leading-none">G</span>
                  )}
                  {member.can_steer && <span className="text-[9px]" title="Steer">🚢</span>}
                  {member.can_drum && <span className="text-[9px]" title="Drum">🥁</span>}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 text-[9px] text-slate-500 uppercase tracking-wide font-medium flex-wrap leading-tight">
                  <span>{formatWt(member.weight_kg)}</span>
                  {member.preferred_side && (
                    <>
                      <span className="text-slate-300">•</span>
                      <span>{member.preferred_side}</span>
                    </>
                  )}
                  {member.skill_level && (
                    <>
                      <span className="text-slate-300">•</span>
                      <span>{member.skill_level.slice(0, 3)}</span>
                    </>
                  )}
                </div>
              </div>
              {member.rsvpStatus && (
                <div className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white ${
                    member.rsvpStatus === 'yes' ? 'bg-green-500' : 
                    member.rsvpStatus === 'no' ? 'bg-red-500' : 
                    member.rsvpStatus === 'maybe' ? 'bg-amber-500' : 'bg-slate-300'
                }`} title={`RSVP: ${member.rsvpStatus === 'no_response' ? 'No Response' : member.rsvpStatus}`}>
                  {member.rsvpStatus === 'yes' ? '✓' : 
                   member.rsvpStatus === 'no' ? '✗' : 
                   member.rsvpStatus === 'maybe' ? '?' : '·'}
                </div>
              )}
            </div>
            {intensity > 0 && (
              <div className="mt-1 flex items-center gap-1">
                <div className="flex-1 h-0.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary-500 to-rose-500"
                    style={{ width: `${Math.min(100, Math.max(0, intensity * 100))}%` }}
                  />
                </div>
                <span className="text-[8px] font-mono text-slate-500 min-w-[20px] text-right leading-none">
                  {(intensity * 100).toFixed(0)}%
                </span>
              </div>
            )}
          </div>
        )}
      </Draggable>
    )
  }

  const BoatPosition = ({ id, member, label, secondaryMember, leverage = 0, secondaryLeverage = 0 }) => {
    return (
      <Droppable droppableId={id}>
        {(provided, snapshot) => {
          const cards = []
          if (member) cards.push({ data: member, type: 'primary', lev: leverage })
          if (secondaryMember) cards.push({ data: secondaryMember, type: 'secondary', lev: secondaryLeverage })

          return (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`
                relative min-h-[64px] rounded-lg border-2 transition-all duration-200 flex flex-col justify-center py-0.5 px-0.5 gap-0.5
                ${snapshot.isDraggingOver ? 'border-primary-400 bg-primary-50/70 scale-[1.02] shadow-lg' : 'border-slate-200 bg-slate-50/50'}
                ${!member && !secondaryMember ? 'border-dashed' : 'border-solid bg-white shadow-sm'}
              `}
              style={{ touchAction: 'none' }}
            >
              {!member && !secondaryMember && (
                <div className="text-center">
                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{label}</span>
                </div>
              )}
              
              {cards.map((card, idx) => (
                 <MemberCard 
                    key={card.data.id} 
                    member={card.data} 
                    index={idx} 
                    isSecondary={card.type === 'secondary'} 
                    leverage={card.lev} 
                    noMarginBottom={true}
                 />
              ))}
              
              {provided.placeholder}
            </div>
          )
        }}
      </Droppable>
    )
  }

  if (!hasRole('admin') && !hasRole('coach')) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">Access Restricted</p>
        <p className="text-sm text-slate-400 mt-2">Only coaches and admins can access the lineup builder.</p>
      </div>
    )
  }

  const getMemberDetailsForPreview = (id) => {
     const m = (members || []).find(member => member.id === id)
     if (!m) return { weight: 0, name: 'Unknown', initial: '?', gender: 'unknown' }
     return {
       weight: getWeightKg(m),
       name: m.full_name || 'Unknown',
       initial: (m.full_name || '?').charAt(0).toUpperCase(),
       gender: m.gender ? m.gender.toLowerCase() : 'unknown'
     }
  }

  const computeSavedLineupStats = (lineup) => {
     const p = lineup.positions
     if (!p || !p.paddlers || !p.paddlers.left) return null

     const rows = p.paddlers.left.length
     // Reconstruct layout
     const spacing = 1
     const seats = []
     seats.push({ id: 'drummer', name: 'Drummer', x: -(rows + 1) * spacing })
     for (let i = 0; i < rows; i++) {
       const x = -(rows - i) * spacing
       seats.push({ id: `L${i + 1}`, name: `L${i + 1}`, x, side: 'port' })
       seats.push({ id: `R${i + 1}`, name: `R${i + 1}`, x, side: 'starboard' })
     }
     seats.push({ id: 'steer', name: 'Steer', x: spacing * 1.5 })
     const layout = { id: 'saved', seats }

     // Reconstruct athletes & assignment
     const assignment = []
     const athletes = [] // minimal subset
     let m = 0, f = 0 // Gender count
     
     const add = (sid, uid) => {
        if (uid) {
           assignment.push({ seatId: sid, athleteId: uid })
           const mem = (members || []).find(m => m.id === uid)
           if (mem) {
               athletes.push({ id: uid, name: mem.full_name, weightKg: getWeightKg(mem) })
               if (mem.gender?.toLowerCase() === 'male') m++
               else if (mem.gender?.toLowerCase() === 'female') f++
           }
        }
     }
     add('drummer', p.drummer)
     add('steer', p.steersperson)
     p.paddlers.left.forEach((id, i) => add(`L${i+1}`, id))
     p.paddlers.right.forEach((id, i) => add(`R${i+1}`, id))

     const lineupObj = { id: lineup.id, boatLayoutId: 'saved', assignments: assignment }
     
     try {
        const cog = computeCenterOfGravity(layout, athletes, lineupObj)
        const bal = computeLeftRightDistribution(layout, athletes, lineupObj)
        const delta = Math.abs(bal.portWeight - bal.starboardWeight)
        return { cog, bal, delta, genders: { m, f } }
     } catch (e) {
        return null
     }
  }

  const GenderCount = ({ count }) => (
      <div className="flex items-center gap-2 text-xs font-medium text-slate-600 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
          <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-400"></span>
              <span>{count.m}</span>
          </div>
          <span className="text-slate-300">|</span>
          <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-pink-400"></span>
              <span>{count.f}</span>
          </div>
      </div>
  )

  const LineupVisualPreview = ({ isSecondary }) => {
     const drummer = isSecondary ? boatPositions.drummer_secondary : boatPositions.drummer
     const steer = isSecondary ? boatPositions.steersperson_secondary : boatPositions.steersperson
     const leftArr = isSecondary ? boatPositions.left_secondary : boatPositions.left
     const rightArr = isSecondary ? boatPositions.right_secondary : boatPositions.right
     
     const renderDot = (member, role) => {
        const w = getWeightKg(member)
        const max = 100
        const alpha = w > 0 ? Math.min(1, Math.max(0.2, w / max)) : 0.1
        const initial = member?.full_name?.charAt(0).toUpperCase() || ''
        // Use primary-secondary colors unless we want gender colors in preview? 
        // User asked for "quick reference count of M:F", usually implies seeing it.
        // Let's stick to M/F colors for dots in preview as well for consistency with Saved Lineups preview
        const isF = member?.gender?.toLowerCase() === 'female'
        const isM = member?.gender?.toLowerCase() === 'male'
        
        // If gender is known, use gender color, else use role color
        let color = isSecondary ? '168, 85, 247' : '59, 130, 246' // Purple/Blue fallback
        if (isF) color = '244, 114, 182' // Pink-400
        else if (isM) color = '96, 165, 250' // Blue-400
        
        return (
            <div 
               className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-sm border border-slate-200"
               style={{ 
                   backgroundColor: member ? `rgba(${color}, ${alpha + 0.3})` : '#f1f5f9',
                   borderColor: member ? 'transparent' : '#cbd5e1'
               }}
               title={member ? `${role}: ${member.full_name} (${formatWt(w)})` : `${role}: Empty`}
            >
               {initial}
            </div>
        )
     }

     return (
        <div className="mt-4 p-3 bg-white rounded-lg border border-slate-100 shadow-sm overflow-x-auto">
           <div className="flex items-center justify-between mb-2">
               <h4 className="text-xs font-bold text-slate-400 uppercase">{isSecondary ? 'Alternate Chart' : 'Primary Chart'}</h4>
               {/* Optional: Gender count here too? No, redundant with header */}
           </div>
           <div className="flex items-center gap-2 min-w-max">
              <div className="flex flex-col justify-center h-full">
                 {renderDot(drummer, 'Drummer')}
              </div>
              <div className="flex flex-col gap-1">
                 <div className="flex gap-1">
                    {(leftArr || []).map((m, i) => <div key={`l-${i}`}>{renderDot(m, `L${i+1}`)}</div>)}
                 </div>
                 <div className="flex gap-1">
                    {(rightArr || []).map((m, i) => <div key={`r-${i}`}>{renderDot(m, `R${i+1}`)}</div>)}
                 </div>
              </div>
              <div className="flex flex-col justify-center h-full">
                 {renderDot(steer, 'Steer')}
              </div>
           </div>
        </div>
     )
  }

  return (
    <div className="pb-48 lg:pb-10 space-y-3">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="page-header mb-1">Lineup Builder</h1>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            {editingLineupId ? (
                <>
                    <span>Editing: <strong>{lineupName}</strong></span>
                    <button 
                        onClick={() => { setIsSaveAs(false); setIsCreating(true); }} 
                        className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-primary-500 transition-colors"
                        title="Rename Lineup"
                    >
                        <Icon name="edit" size={14} />
                    </button>
                </>
            ) : (
                'Drafting New Lineup'
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {/* Boat Size Controls */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg mr-2">
             <span className="text-xs font-bold text-slate-400 px-2">Rows:</span>
             {[5, 9, 10].map(size => (
                <button 
                   key={size}
                   onClick={() => handleBoatSizeChange(size)}
                   className={`px-2 py-1 rounded-md text-xs font-bold transition-all ${boatRows === size ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                >
                   {size}
                </button>
             ))}
             <select 
                value={boatRows} 
                onChange={(e) => handleBoatSizeChange(parseInt(e.target.value))}
                className="ml-1 bg-transparent text-xs font-bold text-slate-600 focus:outline-none cursor-pointer"
             >
                {Array.from({length: 9}, (_, i) => i + 4).map(n => (
                   <option key={n} value={n}>{n}</option>
                ))}
             </select>
          </div>

          <button onClick={() => setShowComparison(!showComparison)} className={`btn btn-sm ${showComparison ? 'btn-secondary border-blue-400 bg-blue-50 text-blue-700' : 'btn-secondary'}`}>
             <Icon name="lineups" size={16} className="mr-1" /> Compare
          </button>
          <div className="bg-slate-100 p-1 rounded-lg flex items-center">
             <button onClick={() => setUnitSystem('imperial')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${unitSystem === 'imperial' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>LB</button>
             <button onClick={() => setUnitSystem('metric')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${unitSystem === 'metric' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>KG</button>
          </div>
          
          <button onClick={handleResetPositions} className="btn btn-secondary btn-sm">
            <Icon name="trash" size={16} className="mr-1" /> Reset
          </button>

          {editingLineupId ? (
            <>
                <button 
                    onClick={() => { 
                        setIsSaveAs(true); 
                        setLineupName(lineupName + ' (Copy)'); 
                        setIsCreating(true); 
                    }} 
                    className="btn btn-secondary btn-sm"
                >
                    <Icon name="copy" size={16} className="mr-1" /> Copy
                </button>
                <button 
                    onClick={() => { 
                        setIsSaveAs(false); 
                        setIsCreating(true); 
                    }} 
                    className="btn btn-primary btn-sm shadow-lg shadow-primary-500/20"
                >
                    <Icon name="check" size={16} className="mr-1" /> Update
                </button>
            </>
          ) : (
            <button 
                onClick={() => { 
                    setIsSaveAs(false); 
                    setIsCreating(true); 
                }} 
                className="btn btn-primary btn-sm shadow-lg shadow-primary-500/20"
            >
                <Icon name="check" size={16} className="mr-1" /> Save
            </button>
          )}

          <button onClick={() => setShowSavedLineups(true)} className="btn btn-secondary btn-sm">
            <Icon name="lineups" size={16} className="mr-1" /> Load
          </button>
        </div>
      </div>

      <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 items-start">
          
          {/* Sidebar: Roster (Mobile Drawer / Desktop Sidebar) */}
          <div
            ref={drawerRef}
            className={`
              fixed bottom-0 left-0 right-0 z-50 bg-white shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.15)] border-t border-slate-200 rounded-t-2xl
              lg:sticky lg:top-32 lg:z-10 lg:shadow-sm lg:border lg:rounded-xl lg:h-auto lg:max-h-[calc(100vh-200px)] lg:flex lg:flex-col
              ${isDraggingDrawer ? '' : 'transition-[height] duration-300 ease-out'}
            `}
            style={{
              height: typeof window !== 'undefined' && window.innerWidth < 1024 ? `${drawerHeight}px` : 'auto'
            }}
          >
            {/* Mobile Drawer Handle - Draggable */}
            <div
              className="lg:hidden w-full flex flex-col items-center pt-2 pb-1 cursor-grab active:cursor-grabbing touch-none"
              onTouchStart={handleDrawerTouchStart}
              onTouchMove={handleDrawerTouchMove}
              onTouchEnd={handleDrawerTouchEnd}
            >
              <div className={`w-12 h-1.5 rounded-full transition-colors ${isDraggingDrawer ? 'bg-primary-400' : 'bg-slate-300'}`} />
              <div className="text-[10px] text-slate-400 mt-1">Drag to resize</div>
            </div>

            <div className="px-4 pb-2 lg:p-4 lg:border-b lg:border-slate-100 flex justify-between items-center lg:bg-slate-50/50 lg:rounded-t-xl sticky top-0 z-20 bg-white">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm lg:text-base">
                <Icon name="roster" size={18} className="text-slate-400" />
                Available ({availableMembers.length})
              </h3>
              {/* Quick snap buttons for mobile */}
              <div className="lg:hidden flex items-center gap-1">
                <button
                  onClick={() => snapDrawerTo(DRAWER_MIN)}
                  className={`w-6 h-6 rounded flex items-center justify-center text-xs ${drawerHeight <= DRAWER_MIN + 20 ? 'bg-primary-100 text-primary-600' : 'bg-slate-100 text-slate-500'}`}
                  title="Minimize"
                >
                  ▼
                </button>
                <button
                  onClick={() => snapDrawerTo(DRAWER_MID)}
                  className={`w-6 h-6 rounded flex items-center justify-center text-xs ${drawerHeight > DRAWER_MIN + 20 && drawerHeight < DRAWER_MAX - 50 ? 'bg-primary-100 text-primary-600' : 'bg-slate-100 text-slate-500'}`}
                  title="Half"
                >
                  ◆
                </button>
                <button
                  onClick={() => snapDrawerTo(DRAWER_MAX)}
                  className={`w-6 h-6 rounded flex items-center justify-center text-xs ${drawerHeight >= DRAWER_MAX - 50 ? 'bg-primary-100 text-primary-600' : 'bg-slate-100 text-slate-500'}`}
                  title="Maximize"
                >
                  ▲
                </button>
              </div>
            </div>
            
            <div className="px-4 pb-2 lg:p-3 lg:bg-slate-50 lg:border-b lg:border-slate-100 space-y-2 sticky top-[56px] z-20">
               <select 
                 className="input text-xs py-1.5 w-full" 
                 value={selectedPracticeId ? `practice_${selectedPracticeId}` : selectedEventId ? `event_${selectedEventId}` : ''}
                 onChange={(e) => {
                    const val = e.target.value
                    if (val.startsWith('practice_')) { setSelectedPracticeId(val.split('_')[1]); setSelectedEventId('') }
                    else if (val.startsWith('event_')) { setSelectedEventId(val.split('_')[1]); setSelectedPracticeId('') }
                    else { setSelectedPracticeId(''); setSelectedEventId('') }
                 }}
               >
                 <option value="">All Active Members</option>
                 <optgroup label="Practices">
                    {practices
                       .filter(p => new Date(p.date) >= new Date(new Date().setHours(0,0,0,0)))
                       .sort((a, b) => new Date(a.date) - new Date(b.date))
                       .slice(0, 10)
                       .map(p => <option key={p.id} value={`practice_${p.id}`}>{new Date(p.date).toLocaleDateString()} - {p.title}</option>)}
                 </optgroup>
                 <optgroup label="Races">
                    {events
                       .filter(e => e.event_type === 'race' && new Date(e.event_date) >= new Date(new Date().setHours(0,0,0,0)))
                       .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
                       .slice(0, 10)
                       .map(e => <option key={e.id} value={`event_${e.id}`}>{new Date(e.event_date).toLocaleDateString()} - {e.title}</option>)}
                 </optgroup>
                 <optgroup label="Other Events">
                    {events
                       .filter(e => e.event_type !== 'race' && new Date(e.event_date) >= new Date(new Date().setHours(0,0,0,0)))
                       .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
                       .slice(0, 10)
                       .map(e => <option key={e.id} value={`event_${e.id}`}>{new Date(e.event_date).toLocaleDateString()} - {e.title}</option>)}
                 </optgroup>
               </select>

               {(selectedPracticeId || selectedEventId) && (
                   <select 
                      className="input text-xs py-1.5 w-full"
                      value={rsvpFilter}
                      onChange={(e) => setRsvpFilter(e.target.value)}
                   >
                      <option value="all">All Statuses</option>
                      <option value="yes">✓ Attending</option>
                      <option value="maybe">? Maybe</option>
                      <option value="no_response">· No Response</option>
                      <option value="no">✗ Not Attending</option>
                   </select>
               )}
            </div>

            <div className="flex-1 overflow-y-auto p-3 bg-slate-50/30 lg:rounded-b-xl overscroll-contain">
              <Droppable droppableId="available">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-[100px] lg:min-h-[200px] transition-colors rounded-xl ${snapshot.isDraggingOver ? 'bg-blue-50/50 ring-2 ring-blue-100' : ''} grid grid-cols-2 lg:grid-cols-1 gap-2`}
                    style={{ touchAction: 'pan-y' }} // Allow vertical scroll but improve drag
                  >
                    {availableMembers.length === 0 ? (
                      <div className="col-span-2 lg:col-span-1 text-center py-8 text-slate-400 text-sm">
                        All members are in the lineup
                      </div>
                    ) : (
                      availableMembers.map((m, i) => <MemberCard key={m.id} member={m} index={i} isSecondary={false} />)
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          </div>

          <div className="space-y-4 lg:order-last">
            
            {showBalancePanels && (
              <div className="space-y-3">
                 {/* ... Balance Panels ... */}
                 <div className="relative">
                    <div className="flex items-center justify-between mb-2 ml-1">
                        {showComparison && <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Primary Lineup</h3>}
                        <GenderCount count={primaryGenderCount} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <DragonBoatLeftRightPanel 
                           layout={cogLayout} 
                           athletes={cogAthletes} 
                           lineup={cogLineup} 
                           unitSystem={unitSystem} 
                           formatWeight={formatWt} 
                        />
                        <DragonBoatCogPanel 
                           layout={cogLayout} 
                           athletes={cogAthletes} 
                           lineup={cogLineup} 
                           formatWeight={formatWt} 
                        />
                    </div>
                    {showComparison && <LineupVisualPreview isSecondary={false} />}
                 </div>

                 {showComparison && (
                    <div className="relative p-4 rounded-xl bg-purple-50/50 border border-purple-100">
                        <div className="flex items-center justify-between mb-2 ml-1">
                            <h3 className="text-xs font-bold text-purple-400 uppercase tracking-wide flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                                Secondary Lineup
                            </h3>
                            <GenderCount count={secondaryGenderCount} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <DragonBoatLeftRightPanel 
                              layout={cogLayout} 
                              athletes={cogAthletes} 
                              lineup={cogLineupSecondary} 
                              unitSystem={unitSystem} 
                              formatWeight={formatWt} 
                           />
                           <DragonBoatCogPanel 
                              layout={cogLayout} 
                              athletes={cogAthletes} 
                              lineup={cogLineupSecondary} 
                              formatWeight={formatWt} 
                           />
                        </div>
                        <LineupVisualPreview isSecondary={true} />
                    </div>
                 )}
              </div>
            )}

            <div className="relative">
               <div className="absolute inset-0 bg-slate-100 rounded-[3rem] -z-10 opacity-50 transform scale-x-105" />

               <div className="space-y-2 p-2">
                  <div className="flex justify-center mb-4">
                     <div className="w-32">
                        <BoatPosition 
                           id="drummer" 
                           member={boatPositions.drummer} 
                           label="Drummer" 
                           secondaryMember={boatPositions.drummer_secondary} 
                           leverage={seatLeverageMap.get('drummer') || 0} 
                           secondaryLeverage={seatLeverageMapSecondary.get('drummer') || 0}
                        />
                     </div>
                  </div>

                  <div className="space-y-1">
                     {boatPositions.left.map((_, i) => (
                        <div key={i} className="flex items-center justify-center gap-2 md:gap-4">
                           <div className="flex-1 max-w-[200px]">
                              <BoatPosition 
                                 id={`left-${i}`} 
                                 member={boatPositions.left[i]} 
                                 label={`Left ${i+1}`} 
                                 secondaryMember={boatPositions.left_secondary?.[i]} 
                                 leverage={seatLeverageMap.get(`L${i+1}`) || 0} 
                                 secondaryLeverage={seatLeverageMapSecondary.get(`L${i+1}`) || 0}
                              />
                           </div>
                           <div className="w-6 text-center text-[10px] font-bold text-slate-300">{i+1}</div>
                           <div className="flex-1 max-w-[200px]">
                              <BoatPosition 
                                 id={`right-${i}`} 
                                 member={boatPositions.right[i]} 
                                 label={`Right ${i+1}`} 
                                 secondaryMember={boatPositions.right_secondary?.[i]} 
                                 leverage={seatLeverageMap.get(`R${i+1}`) || 0} 
                                 secondaryLeverage={seatLeverageMapSecondary.get(`R${i+1}`) || 0}
                              />
                           </div>
                        </div>
                     ))}
                  </div>

                  <div className="flex justify-center mt-4">
                     <div className="w-32">
                        <BoatPosition 
                           id="steersperson" 
                           member={boatPositions.steersperson} 
                           label="Steer" 
                           secondaryMember={boatPositions.steersperson_secondary} 
                           leverage={seatLeverageMap.get('steer') || 0} 
                           secondaryLeverage={seatLeverageMapSecondary.get('steer') || 0}
                        />
                     </div>
                  </div>
               </div>
            </div>

            <div className="card bg-slate-50 border-dashed border-2 border-slate-200">
               <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Alternates / Reserves</h4>
               <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {boatPositions.alternates.map((_, i) => (
                     <BoatPosition key={i} id={`alternate-${i}`} member={boatPositions.alternates[i]} label={`Alt ${i+1}`} />
                  ))}
               </div>
            </div>

          </div>
        </div>
      </DragDropContext>
      {/* ... modals ... */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
              <h2 className="text-xl font-bold text-slate-900 mb-4">
                {isSaveAs ? 'Save as New Lineup' : (editingLineupId ? 'Update Lineup' : 'Save Lineup')}
              </h2>
              <input 
                className="input mb-4" 
                placeholder="Lineup Name (e.g., Race 1 Heat)" 
                value={lineupName} 
                onChange={e => setLineupName(e.target.value)} 
                autoFocus
              />
              <textarea 
                className="input mb-6" 
                rows="3" 
                placeholder="Notes..." 
                value={lineupNotes} 
                onChange={e => setLineupNotes(e.target.value)} 
              />
              <div className="flex justify-end gap-3">
                 <button onClick={() => setIsCreating(false)} className="btn btn-secondary">Cancel</button>
                 <button onClick={handleSaveLineup} className="btn btn-primary">
                    {isSaveAs ? 'Save Copy' : (editingLineupId ? 'Update' : 'Save')}
                 </button>
              </div>
           </div>
        </div>
      )}

      {showSavedLineups && (
         <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
               <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                  <h2 className="text-lg font-bold text-slate-900">Saved Lineups</h2>
                  <button onClick={() => setShowSavedLineups(false)}><Icon name="close" size={20} /></button>
               </div>
               <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-slate-50/50">
                  {lineups.map(l => {
                     const stats = computeSavedLineupStats(l)
                     return (
                     <div key={l.id} className="card hover:shadow-md transition-all cursor-pointer group" onClick={() => { handleLoadLineup(l); setShowSavedLineups(false); }}>
                        <div className="flex justify-between items-start">
                           <h3 className="font-bold text-slate-800 group-hover:text-primary-600 transition-colors">{l.name}</h3>
                           <span className="text-xs text-slate-400">{new Date(l.created_at).toLocaleDateString()}</span>
                        </div>
                        {l.notes && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{l.notes}</p>}
                        
                        {/* Mini Stats */}
                        {stats && (
                           <div className="mt-2 grid grid-cols-3 gap-2 text-[10px] font-medium text-slate-500">
                              <div 
                                className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded cursor-help col-span-1"
                                title={`Port: ${formatWt(stats.bal.portWeight)} | Starboard: ${formatWt(stats.bal.starboardWeight)} | Delta: ${formatWt(stats.delta)}`}
                              >
                                 <Icon name="lineups" size={12} />
                                 <span>{stats.bal?.statusLabel} ({formatWt(stats.delta)})</span>
                              </div>
                              <div 
                                className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded cursor-help col-span-1 justify-center"
                                title={`Total Weight: ${formatWt(stats.cog.totalWeight)}`}
                              >
                                 <Icon name="target" size={12} />
                                 <span>{stats.cog?.xCg.toFixed(2)}</span>
                              </div>
                              <div className="col-span-1 flex justify-end">
                                <div className="flex items-center gap-2 text-xs font-medium text-slate-600 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                                    <div className="flex items-center gap-1">
                                        <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                                        <span>{stats.genders.m}</span>
                                    </div>
                                    <span className="text-slate-300">|</span>
                                    <div className="flex items-center gap-1">
                                        <span className="w-2 h-2 rounded-full bg-pink-400"></span>
                                        <span>{stats.genders.f}</span>
                                    </div>
                                </div>
                              </div>
                           </div>
                        )}

                        {/* Transposed Preview */}
                        <div className="mt-3 p-2 bg-white border border-slate-100 rounded-lg shadow-inner flex flex-col gap-1">
                           <div className="flex gap-1 justify-center">
                              {(l.positions?.paddlers?.left || []).map((id, idx) => {
                                 const d = getMemberDetailsForPreview(id);
                                 const w = d.weight;
                                 const max = 100; 
                                 const alpha = w > 0 ? Math.min(1, Math.max(0.2, w / max)) : 0.1;
                                 const isF = d.gender === 'female'
                                 const isM = d.gender === 'male'
                                 const color = isF ? '244, 114, 182' : isM ? '96, 165, 250' : '148, 163, 184'
                                 
                                 return (
                                    <div 
                                       key={idx} 
                                       className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white shadow-sm" 
                                       style={{ backgroundColor: id ? `rgba(${color}, ${alpha + 0.3})` : '#f1f5f9', border: id ? 'none' : '1px solid #cbd5e1' }} 
                                       title={w > 0 ? `${d.name} - ${formatWt(w)}` : 'Empty'}
                                    >
                                       {id && d.initial}
                                    </div>
                                 );
                              })}
                           </div>
                           <div className="flex gap-1 justify-center">
                              {(l.positions?.paddlers?.right || []).map((id, idx) => {
                                 const d = getMemberDetailsForPreview(id);
                                 const w = d.weight;
                                 const max = 100;
                                 const alpha = w > 0 ? Math.min(1, Math.max(0.2, w / max)) : 0.1;
                                 const isF = d.gender === 'female'
                                 const isM = d.gender === 'male'
                                 const color = isF ? '244, 114, 182' : isM ? '96, 165, 250' : '148, 163, 184'

                                 return (
                                    <div 
                                       key={idx} 
                                       className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white shadow-sm" 
                                       style={{ backgroundColor: id ? `rgba(${color}, ${alpha + 0.3})` : '#f1f5f9', border: id ? 'none' : '1px solid #cbd5e1' }}
                                       title={w > 0 ? `${d.name} - ${formatWt(w)}` : 'Empty'}
                                    >
                                       {id && d.initial}
                                    </div>
                                 );
                              })}
                           </div>
                        </div>

                        <div className="mt-3 flex justify-end gap-2">
                           <button 
                              onClick={(e) => { e.stopPropagation(); if(confirm('Delete?')) deleteLineup(l.id); }}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"
                           >
                              <Icon name="trash" size={14} />
                           </button>
                        </div>
                     </div>
                  )})}
                  {lineups.length === 0 && <p className="text-center col-span-full text-slate-500 py-8">No saved lineups found.</p>}
               </div>
            </div>
         </div>
      )}
    </div>
  )
}