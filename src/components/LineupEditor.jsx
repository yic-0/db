import { useState, useEffect, useMemo, useCallback } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import DragonBoatCogPanel from './DragonBoatCogPanel'
import DragonBoatLeftRightPanel from './DragonBoatLeftRightPanel'
import { computeSeatMomentsForLineup, computeCenterOfGravity, computeLeftRightDistribution } from '../lib/dragonboatCog'
import Icon from './Icon'

/**
 * LineupEditor - A modular, reusable drag-and-drop lineup builder component
 *
 * @param {Object} props
 * @param {Array} props.members - Array of member objects with id, full_name, weight_kg, gender, etc.
 * @param {Object} props.initialPositions - Optional initial boat positions to load
 * @param {number} props.boatSize - Number of rows (4-13), default 10
 * @param {string} props.unitSystem - 'imperial' or 'metric', default 'imperial'
 * @param {boolean} props.showBalancePanels - Show COG and L/R balance panels, default true
 * @param {boolean} props.showComparison - Show secondary/comparison lineup, default false
 * @param {boolean} props.compact - Use compact layout for modals, default false
 * @param {Function} props.onPositionsChange - Callback when positions change: (positions) => void
 * @param {Function} props.onSave - Optional save callback: (positions, name, notes) => void
 * @param {string} props.lineupName - Optional initial lineup name
 * @param {string} props.className - Additional CSS classes
 */
export default function LineupEditor({
  members = [],
  initialPositions = null,
  boatSize: initialBoatSize = 10,
  unitSystem: initialUnitSystem = 'imperial',
  showBalancePanels: initialShowBalance = true,
  showComparison: initialShowComparison = false,
  compact = false,
  onPositionsChange,
  onSave,
  lineupName: initialName = '',
  className = ''
}) {
  // State
  const [boatRows, setBoatRows] = useState(initialBoatSize)
  const [unitSystem, setUnitSystem] = useState(initialUnitSystem)
  const [showComparison, setShowComparison] = useState(initialShowComparison)
  const [showBalancePanels, setShowBalancePanels] = useState(initialShowBalance)
  const [lineupName, setLineupName] = useState(initialName)
  const [lineupNotes, setLineupNotes] = useState('')

  // Boat positions state
  const [boatPositions, setBoatPositions] = useState({
    drummer: null,
    drummer_secondary: null,
    left: Array(initialBoatSize).fill(null),
    left_secondary: Array(initialBoatSize).fill(null),
    right: Array(initialBoatSize).fill(null),
    right_secondary: Array(initialBoatSize).fill(null),
    steersperson: null,
    steersperson_secondary: null,
    alternates: [null, null, null, null]
  })

  // Available members (not in boat)
  const [availableMembers, setAvailableMembers] = useState([])

  // Load initial positions if provided
  useEffect(() => {
    if (initialPositions) {
      loadPositions(initialPositions)
    }
  }, [initialPositions])

  // Update available members when boat positions change
  useEffect(() => {
    const assignedIds = new Set()

    const addToSet = (m) => { if (m?.id) assignedIds.add(m.id) }

    addToSet(boatPositions.drummer)
    addToSet(boatPositions.drummer_secondary)
    addToSet(boatPositions.steersperson)
    addToSet(boatPositions.steersperson_secondary)
    boatPositions.left.forEach(addToSet)
    boatPositions.left_secondary.forEach(addToSet)
    boatPositions.right.forEach(addToSet)
    boatPositions.right_secondary.forEach(addToSet)
    boatPositions.alternates.forEach(addToSet)

    const filtered = members.filter(m => m.is_active && !assignedIds.has(m.id))
    setAvailableMembers(filtered)

    // Notify parent of position changes
    if (onPositionsChange) {
      onPositionsChange(boatPositions)
    }
  }, [boatPositions, members, onPositionsChange])

  // Helper functions
  const getWeightKg = (athlete) => {
    if (!athlete) return 0
    if (athlete.weight_kg) return Number(athlete.weight_kg)
    if (athlete.weightKg) return Number(athlete.weightKg)
    return 0
  }

  const formatWeight = (kg) => {
    if (!kg) return '-'
    if (unitSystem === 'metric') return `${Math.round(kg)}kg`
    return `${Math.round(kg * 2.205)}lb`
  }

  // Load positions from saved lineup
  const loadPositions = (positions) => {
    const findMember = (id) => members.find(m => m.id === id) || null

    const mapArray = (arr) => arr ? arr.map(id => findMember(id)) : []

    const newPositions = {
      drummer: findMember(positions.drummer),
      drummer_secondary: findMember(positions.drummer_secondary),
      steersperson: findMember(positions.steersperson),
      steersperson_secondary: findMember(positions.steersperson_secondary),
      left: mapArray(positions.paddlers?.left),
      left_secondary: mapArray(positions.paddlers_secondary?.left),
      right: mapArray(positions.paddlers?.right),
      right_secondary: mapArray(positions.paddlers_secondary?.right),
      alternates: mapArray(positions.alternates)
    }

    // Adjust boat size if needed
    const loadedSize = positions.paddlers?.left?.length || initialBoatSize
    if (loadedSize !== boatRows) {
      setBoatRows(loadedSize)
    }

    setBoatPositions(newPositions)
  }

  // Get serialized positions for saving
  const getSerializedPositions = () => ({
    drummer: boatPositions.drummer?.id || null,
    steersperson: boatPositions.steersperson?.id || null,
    paddlers: {
      left: boatPositions.left.map(m => m?.id || null),
      right: boatPositions.right.map(m => m?.id || null)
    },
    alternates: boatPositions.alternates.map(m => m?.id || null),
    drummer_secondary: boatPositions.drummer_secondary?.id || null,
    steersperson_secondary: boatPositions.steersperson_secondary?.id || null,
    paddlers_secondary: {
      left: boatPositions.left_secondary.map(m => m?.id || null),
      right: boatPositions.right_secondary.map(m => m?.id || null)
    }
  })

  // Handle drag end
  const handleDragEnd = (result) => {
    document.body.classList.remove('is-dragging')
    const { source, destination, draggableId } = result
    if (!destination) return

    let draggedMember = null
    const parseIndex = (id) => parseInt(id.split('-')[1])

    // Find dragged member from source
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

    // Remove from source
    const removeFromSource = () => {
      const removeIfMatch = (m) => m?.id === draggableId ? null : m

      if (source.droppableId === 'drummer') {
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

    // Add to destination
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

  // Handle boat size change
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

  // Reset all positions
  const handleReset = () => {
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
  }

  // Calculate balance stats
  const balanceStats = useMemo(() => {
    const spacing = 1
    const seats = []
    seats.push({ id: 'drummer', name: 'Drummer', x: -(boatRows + 1) * spacing })
    for (let i = 0; i < boatRows; i++) {
      const x = -(boatRows - i) * spacing
      seats.push({ id: `L${i + 1}`, name: `L${i + 1}`, x, side: 'port' })
      seats.push({ id: `R${i + 1}`, name: `R${i + 1}`, x, side: 'starboard' })
    }
    seats.push({ id: 'steer', name: 'Steer', x: spacing * 1.5 })

    const layout = { id: 'current', seats }
    const athletes = members.map(m => ({
      id: m.id,
      name: m.full_name,
      weightKg: getWeightKg(m)
    }))

    const assignment = []
    if (boatPositions.drummer?.id) assignment.push({ seatId: 'drummer', athleteId: boatPositions.drummer.id })
    if (boatPositions.steersperson?.id) assignment.push({ seatId: 'steer', athleteId: boatPositions.steersperson.id })
    boatPositions.left.forEach((m, i) => {
      if (m?.id) assignment.push({ seatId: `L${i + 1}`, athleteId: m.id })
    })
    boatPositions.right.forEach((m, i) => {
      if (m?.id) assignment.push({ seatId: `R${i + 1}`, athleteId: m.id })
    })

    const lineup = { id: 'current', boatLayoutId: 'current', assignments: assignment }

    try {
      const cog = computeCenterOfGravity(layout, athletes, lineup)
      const lr = computeLeftRightDistribution(layout, athletes, lineup)
      const moments = computeSeatMomentsForLineup(layout, athletes, lineup, cog)
      return { cog, lr, moments, layout, athletes, lineup }
    } catch (e) {
      return null
    }
  }, [boatPositions, boatRows, members])

  // Gender count
  const genderCount = useMemo(() => {
    let m = 0, f = 0
    const count = (member) => {
      if (member?.gender?.toLowerCase() === 'male') m++
      else if (member?.gender?.toLowerCase() === 'female') f++
    }
    count(boatPositions.drummer)
    count(boatPositions.steersperson)
    boatPositions.left.forEach(count)
    boatPositions.right.forEach(count)
    return { male: m, female: f }
  }, [boatPositions])

  // Member Card component
  const MemberCard = ({ member, index, isSecondary = false, leverage = 0, noMarginBottom = false }) => {
    if (!member) return null

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
              member-card-draggable relative p-1.5 rounded-lg border shadow-sm bg-white/90 backdrop-blur-sm cursor-grab active:cursor-grabbing select-none transition-all
              ${snapshot.isDragging ? 'z-[9999] scale-105 shadow-xl ring-2 ring-primary-400 rotate-1' : 'hover:border-primary-300 hover:shadow-md'}
              ${isSecondary ? 'border-l-4 border-l-purple-400' : 'border-l-4 border-l-blue-400'}
              ${!noMarginBottom ? 'mb-1' : ''}
              border-slate-200
            `}
            style={{
              backgroundImage: bgGradient,
              ...provided.draggableProps.style,
              touchAction: 'none',
            }}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0 mr-1">
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="font-bold text-xs text-slate-800 truncate max-w-[100px] leading-tight">{member.full_name}</span>
                  {member.gender && (
                    <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold text-white ${member.gender.toLowerCase() === 'female' ? 'bg-pink-400' : 'bg-blue-400'}`}>
                      {member.gender.charAt(0).toUpperCase()}
                    </span>
                  )}
                  {member.is_guest && (
                    <span className="px-1 text-[8px] font-bold bg-amber-100 text-amber-700 rounded border border-amber-200 leading-none">G</span>
                  )}
                </div>
                <div className="flex items-center gap-1 mt-0.5 text-[9px] text-slate-500 uppercase tracking-wide font-medium flex-wrap leading-tight">
                  <span>{formatWeight(member.weight_kg)}</span>
                  {member.preferred_side && (
                    <>
                      <span className="text-slate-300">•</span>
                      <span>{member.preferred_side}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            {intensity > 0 && (
              <div className="mt-1 flex items-center gap-1">
                <div className="flex-1 h-0.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary-500 to-rose-500"
                    style={{ width: `${Math.min(100, Math.max(0, intensity * 100))}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </Draggable>
    )
  }

  // Boat Position component
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
                relative min-h-[52px] rounded-lg border-2 transition-all duration-200 flex flex-col justify-center py-0.5 px-0.5 gap-0.5
                ${snapshot.isDraggingOver ? 'border-primary-400 bg-primary-50/70 scale-[1.02] shadow-lg' : 'border-slate-200 bg-slate-50/50'}
                ${!member && !secondaryMember ? 'border-dashed' : 'border-solid bg-white shadow-sm'}
              `}
              style={{ touchAction: 'none' }}
            >
              {!member && !secondaryMember && (
                <div className="text-center">
                  <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">{label}</span>
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

  return (
    <DragDropContext
      onDragStart={() => document.body.classList.add('is-dragging')}
      onDragEnd={handleDragEnd}
    >
      <div className={`lineup-editor ${className}`}>
        {/* Controls */}
        <div className={`flex flex-wrap items-center gap-2 ${compact ? 'mb-2' : 'mb-3'} p-2 bg-slate-50 rounded-lg`}>
          {/* Boat Size */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-slate-500">Rows:</span>
            <select
              value={boatRows}
              onChange={(e) => handleBoatSizeChange(Number(e.target.value))}
              className="text-xs px-1.5 py-1 border border-slate-200 rounded bg-white"
            >
              {[4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          {/* Unit System */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setUnitSystem(unitSystem === 'imperial' ? 'metric' : 'imperial')}
              className="text-xs px-2 py-1 bg-white border border-slate-200 rounded hover:bg-slate-50"
            >
              {unitSystem === 'imperial' ? 'lb' : 'kg'}
            </button>
          </div>

          {/* Toggle Balance */}
          <button
            onClick={() => setShowBalancePanels(!showBalancePanels)}
            className={`text-xs px-2 py-1 rounded border ${showBalancePanels ? 'bg-primary-100 border-primary-300 text-primary-700' : 'bg-white border-slate-200'}`}
          >
            Balance
          </button>

          {/* Toggle Comparison */}
          <button
            onClick={() => setShowComparison(!showComparison)}
            className={`text-xs px-2 py-1 rounded border ${showComparison ? 'bg-purple-100 border-purple-300 text-purple-700' : 'bg-white border-slate-200'}`}
          >
            Compare
          </button>

          {/* Reset */}
          <button
            onClick={handleReset}
            className="text-xs px-2 py-1 bg-white border border-slate-200 rounded hover:bg-red-50 hover:border-red-200 hover:text-red-600"
          >
            Reset
          </button>

          {/* Gender count */}
          <div className="ml-auto flex items-center gap-2 text-xs">
            <span className="text-blue-600 font-medium">{genderCount.male}M</span>
            <span className="text-pink-500 font-medium">{genderCount.female}F</span>
          </div>
        </div>

        <div className={`flex gap-2 ${compact ? 'flex-col lg:flex-row' : ''}`}>
          {/* Boat Layout */}
          <div className="flex-1">
            {/* Balance Panels */}
            {showBalancePanels && balanceStats && (
              <div className={`grid grid-cols-2 gap-2 ${compact ? 'mb-2' : 'mb-3'}`}>
                <DragonBoatLeftRightPanel
                  layout={balanceStats.layout}
                  athletes={balanceStats.athletes}
                  lineup={balanceStats.lineup}
                  unitSystem={unitSystem}
                  formatWeight={formatWeight}
                />
                <DragonBoatCogPanel
                  layout={balanceStats.layout}
                  athletes={balanceStats.athletes}
                  lineup={balanceStats.lineup}
                  formatWeight={formatWeight}
                />
              </div>
            )}

            {/* Boat Grid */}
            <div className="bg-gradient-to-b from-sky-50 to-blue-50 rounded-xl p-2 border border-sky-200">
              {/* Drummer */}
              <div className="flex justify-center mb-2">
                <div className="w-28">
                  <BoatPosition
                    id="drummer"
                    member={boatPositions.drummer}
                    secondaryMember={showComparison ? boatPositions.drummer_secondary : null}
                    label="Drum"
                  />
                </div>
              </div>

              {/* Paddler Rows */}
              <div className="space-y-1">
                {Array.from({ length: boatRows }).map((_, i) => (
                  <div key={i} className="grid grid-cols-[1fr_20px_1fr] gap-1 items-center">
                    <BoatPosition
                      id={`left-${i}`}
                      member={boatPositions.left[i]}
                      secondaryMember={showComparison ? boatPositions.left_secondary[i] : null}
                      label={`L${i + 1}`}
                      leverage={balanceStats?.moments?.[`L${i + 1}`]?.intensity || 0}
                    />
                    <div className="text-center text-[9px] font-bold text-slate-400">{i + 1}</div>
                    <BoatPosition
                      id={`right-${i}`}
                      member={boatPositions.right[i]}
                      secondaryMember={showComparison ? boatPositions.right_secondary[i] : null}
                      label={`R${i + 1}`}
                      leverage={balanceStats?.moments?.[`R${i + 1}`]?.intensity || 0}
                    />
                  </div>
                ))}
              </div>

              {/* Steersperson */}
              <div className="flex justify-center mt-2">
                <div className="w-28">
                  <BoatPosition
                    id="steersperson"
                    member={boatPositions.steersperson}
                    secondaryMember={showComparison ? boatPositions.steersperson_secondary : null}
                    label="Steer"
                  />
                </div>
              </div>
            </div>

            {/* Alternates */}
            <div className="mt-2">
              <div className="text-[10px] font-semibold text-slate-500 uppercase mb-1">Alternates</div>
              <div className="grid grid-cols-4 gap-1">
                {boatPositions.alternates.map((_, i) => (
                  <BoatPosition
                    key={i}
                    id={`alternate-${i}`}
                    member={boatPositions.alternates[i]}
                    label={`Alt${i + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Available Members */}
          <div className={`${compact ? 'w-full lg:w-48' : 'w-52'} flex-shrink-0`}>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-2 py-1.5 bg-slate-50 border-b border-slate-200">
                <span className="text-xs font-semibold text-slate-600">
                  Available ({availableMembers.length})
                </span>
              </div>
              <Droppable droppableId="available">
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`p-1.5 ${compact ? 'max-h-48' : 'max-h-96'} overflow-y-auto`}
                    style={{ touchAction: 'none' }}
                  >
                    {availableMembers.map((member, index) => (
                      <MemberCard key={member.id} member={member} index={index} />
                    ))}
                    {provided.placeholder}
                    {availableMembers.length === 0 && (
                      <p className="text-xs text-slate-400 text-center py-2">All members assigned</p>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          </div>
        </div>

        {/* Save Section (if onSave provided) */}
        {onSave && (
          <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="Lineup name..."
                value={lineupName}
                onChange={(e) => setLineupName(e.target.value)}
                className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg"
              />
              <button
                onClick={() => onSave(getSerializedPositions(), lineupName, lineupNotes)}
                disabled={!lineupName.trim()}
                className="px-4 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
            <textarea
              placeholder="Notes (optional)..."
              value={lineupNotes}
              onChange={(e) => setLineupNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg resize-none"
            />
          </div>
        )}
      </div>
    </DragDropContext>
  )
}

// Export a function to get positions for external use
LineupEditor.getEmptyPositions = (boatRows = 10) => ({
  drummer: null,
  steersperson: null,
  paddlers: {
    left: Array(boatRows).fill(null),
    right: Array(boatRows).fill(null)
  },
  alternates: [null, null, null, null],
  drummer_secondary: null,
  steersperson_secondary: null,
  paddlers_secondary: {
    left: Array(boatRows).fill(null),
    right: Array(boatRows).fill(null)
  }
})
