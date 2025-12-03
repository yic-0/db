import { useState, useEffect, useMemo, useRef } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import Icon from './Icon'

/**
 * CompactLineupEditor - Ultra-compact, pill-based lineup builder
 * Designed for quick testing and mobile-friendly use
 */
export default function CompactLineupEditor({
  members = [],
  initialPositions = null,
  boatSize: initialBoatSize = 10,
  onPositionsChange,
  onSave,
  className = ''
}) {
  const [boatRows, setBoatRows] = useState(initialBoatSize)
  const [hoveredMember, setHoveredMember] = useState(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const containerRef = useRef(null)
  const isDraggingRef = useRef(false)

  // Boat positions
  const [boat, setBoat] = useState({
    drum: null,
    steer: null,
    L: Array(initialBoatSize).fill(null),
    R: Array(initialBoatSize).fill(null),
    alt: [null, null, null, null]
  })

  // Get weight range for color scaling
  const weightRange = useMemo(() => {
    const weights = members.filter(m => m.weight_kg).map(m => Number(m.weight_kg))
    if (weights.length === 0) return { min: 50, max: 100 }
    return { min: Math.min(...weights), max: Math.max(...weights) }
  }, [members])

  // Get weight color (blue for light, red for heavy)
  const getWeightColor = (weightKg) => {
    if (!weightKg) return 'bg-slate-200'
    const w = Number(weightKg)
    const range = weightRange.max - weightRange.min || 1
    const normalized = (w - weightRange.min) / range // 0-1

    if (normalized < 0.25) return 'bg-sky-400'
    if (normalized < 0.5) return 'bg-emerald-400'
    if (normalized < 0.75) return 'bg-amber-400'
    return 'bg-rose-400'
  }

  // Get assigned member IDs
  const assignedIds = useMemo(() => {
    const ids = new Set()
    if (boat.drum?.id) ids.add(boat.drum.id)
    if (boat.steer?.id) ids.add(boat.steer.id)
    boat.L.forEach(m => m?.id && ids.add(m.id))
    boat.R.forEach(m => m?.id && ids.add(m.id))
    boat.alt.forEach(m => m?.id && ids.add(m.id))
    return ids
  }, [boat])

  // Available members
  const available = useMemo(() =>
    members.filter(m => m.is_active && !assignedIds.has(m.id))
      .sort((a, b) => (b.weight_kg || 0) - (a.weight_kg || 0)),
    [members, assignedIds]
  )

  // Notify parent
  useEffect(() => {
    onPositionsChange?.(boat)
  }, [boat])

  // Balance stats
  const stats = useMemo(() => {
    let leftW = 0, rightW = 0, totalW = 0, m = 0, f = 0
    const addWeight = (member) => {
      if (!member) return 0
      const w = Number(member.weight_kg) || 0
      if (member.gender?.toLowerCase() === 'male') m++
      else if (member.gender?.toLowerCase() === 'female') f++
      return w
    }

    totalW += addWeight(boat.drum)
    totalW += addWeight(boat.steer)
    boat.L.forEach(member => { const w = addWeight(member); leftW += w; totalW += w })
    boat.R.forEach(member => { const w = addWeight(member); rightW += w; totalW += w })
    boat.alt.forEach(member => totalW += addWeight(member))

    const delta = leftW - rightW
    const paddlerCount = boat.L.filter(Boolean).length + boat.R.filter(Boolean).length

    return { leftW, rightW, delta, totalW, m, f, paddlerCount }
  }, [boat])

  // Format name as "First L."
  const shortName = (name) => {
    if (!name) return '?'
    const parts = name.trim().split(' ')
    if (parts.length === 1) return parts[0].slice(0, 6)
    return `${parts[0].slice(0, 5)} ${parts[parts.length - 1][0]}.`
  }

  // Track drag lifecycle to prevent "Cannot stop drag when no active drag" error
  const handleDragStart = () => {
    isDraggingRef.current = true
  }

  const handleBeforeCapture = () => {
    isDraggingRef.current = true
  }

  // Handle drag end
  const handleDragEnd = (result) => {
    // Guard against drag end when no drag is active
    if (!isDraggingRef.current) return
    isDraggingRef.current = false

    const { source, destination, draggableId } = result
    if (!destination) return

    // Find member
    let member = available.find(m => m.id === draggableId)
    if (!member) {
      // Check boat positions
      if (boat.drum?.id === draggableId) member = boat.drum
      else if (boat.steer?.id === draggableId) member = boat.steer
      else {
        for (let i = 0; i < boatRows; i++) {
          if (boat.L[i]?.id === draggableId) { member = boat.L[i]; break }
          if (boat.R[i]?.id === draggableId) { member = boat.R[i]; break }
        }
        if (!member) {
          for (let i = 0; i < 4; i++) {
            if (boat.alt[i]?.id === draggableId) { member = boat.alt[i]; break }
          }
        }
      }
    }
    if (!member) return

    setBoat(prev => {
      const next = { ...prev, L: [...prev.L], R: [...prev.R], alt: [...prev.alt] }

      // Remove from source
      if (source.droppableId !== 'pool') {
        if (source.droppableId === 'drum') next.drum = null
        else if (source.droppableId === 'steer') next.steer = null
        else if (source.droppableId.startsWith('L')) next.L[parseInt(source.droppableId.slice(1))] = null
        else if (source.droppableId.startsWith('R')) next.R[parseInt(source.droppableId.slice(1))] = null
        else if (source.droppableId.startsWith('alt')) next.alt[parseInt(source.droppableId.slice(3))] = null
      }

      // Add to destination
      if (destination.droppableId !== 'pool') {
        if (destination.droppableId === 'drum') next.drum = member
        else if (destination.droppableId === 'steer') next.steer = member
        else if (destination.droppableId.startsWith('L')) next.L[parseInt(destination.droppableId.slice(1))] = member
        else if (destination.droppableId.startsWith('R')) next.R[parseInt(destination.droppableId.slice(1))] = member
        else if (destination.droppableId.startsWith('alt')) next.alt[parseInt(destination.droppableId.slice(3))] = member
      }

      return next
    })
  }

  // Member Pill component
  const MemberPill = ({ member, index, droppableId, mini = false }) => {
    if (!member) return null
    const isM = member.gender?.toLowerCase() === 'male'
    const isF = member.gender?.toLowerCase() === 'female'
    const lb = member.weight_kg ? Math.round(member.weight_kg * 2.205) : '?'

    // Get preferred side indicator
    const side = member.preferred_side?.toLowerCase()
    const sideLabel = side === 'left' ? 'L' : side === 'right' ? 'R' : side === 'both' ? 'B' : null
    const sideColor = side === 'left' ? 'bg-indigo-600' : side === 'right' ? 'bg-orange-600' : 'bg-slate-600'

    return (
      <Draggable draggableId={member.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            onMouseEnter={(e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              setTooltipPos({ x: rect.left, y: rect.bottom + 4 })
              setHoveredMember(member)
            }}
            onMouseLeave={() => setHoveredMember(null)}
            className={`
              flex items-center gap-0.5 rounded-full font-medium
              cursor-grab active:cursor-grabbing select-none whitespace-nowrap
              transition-all border border-white/50 shadow-sm
              ${getWeightColor(member.weight_kg)} text-white
              ${snapshot.isDragging ? 'scale-110 shadow-lg z-50 ring-2 ring-white' : 'hover:scale-105'}
              ${mini ? 'px-1 py-0 text-[8px]' : 'px-1.5 py-0.5 text-[10px]'}
            `}
            style={{ ...provided.draggableProps.style, touchAction: 'none' }}
          >
            {/* Side indicator - show first for quick scanning */}
            {!mini && sideLabel && (
              <span className={`rounded-full flex items-center justify-center font-bold ${sideColor} w-3 h-3 text-[8px]`}>
                {sideLabel}
              </span>
            )}
            <span className={`truncate ${mini ? 'max-w-[35px]' : 'max-w-[50px]'}`}>{shortName(member.full_name)}</span>
            {!mini && <span className="opacity-80">{lb}</span>}
            <span className={`rounded-full flex items-center justify-center font-bold ${isF ? 'bg-pink-600' : isM ? 'bg-blue-600' : 'bg-slate-500'} ${mini ? 'w-2.5 h-2.5 text-[6px]' : 'w-3 h-3 text-[8px]'}`}>
              {isF ? 'F' : isM ? 'M' : '?'}
            </span>
          </div>
        )}
      </Draggable>
    )
  }

  // Seat slot component
  const Seat = ({ id, member, label, side, mini = false }) => (
    <Droppable droppableId={id}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={`
            rounded-full border transition-all flex items-center justify-center
            ${snapshot.isDraggingOver ? 'border-primary-400 bg-primary-100 scale-105' : member ? 'border-transparent bg-slate-100' : 'border-dashed border-slate-300 bg-slate-50'}
            ${side === 'L' ? 'rounded-r-lg' : side === 'R' ? 'rounded-l-lg' : ''}
            ${mini ? 'min-h-[18px] min-w-[55px]' : 'min-h-[24px] min-w-[90px]'}
          `}
          style={{ touchAction: 'none' }}
        >
          {member ? (
            <MemberPill member={member} index={0} droppableId={id} mini={mini} />
          ) : (
            <span className={`text-slate-400 font-medium ${mini ? 'text-[7px]' : 'text-[9px]'}`}>{label}</span>
          )}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  )

  // Reset
  const handleReset = () => {
    setBoat({
      drum: null,
      steer: null,
      L: Array(boatRows).fill(null),
      R: Array(boatRows).fill(null),
      alt: [null, null, null, null]
    })
  }

  return (
    <DragDropContext onBeforeCapture={handleBeforeCapture} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div ref={containerRef} className={`compact-lineup ${className}`}>
        {/* Stats Bar */}
        <div className="flex items-center justify-between gap-2 mb-2 px-2 py-1.5 bg-slate-800 rounded-lg text-white text-[10px]">
          <div className="flex items-center gap-3">
            <span className="font-bold">{stats.paddlerCount} paddlers</span>
            <span className="text-blue-400">{stats.m}M</span>
            <span className="text-pink-400">{stats.f}F</span>
          </div>
          <div className="flex items-center gap-3">
            <span>L: {Math.round(stats.leftW * 2.205)}lb</span>
            <span>R: {Math.round(stats.rightW * 2.205)}lb</span>
            <span className={`font-bold ${Math.abs(stats.delta) < 5 ? 'text-green-400' : Math.abs(stats.delta) < 15 ? 'text-amber-400' : 'text-red-400'}`}>
              Δ{stats.delta > 0 ? '+' : ''}{Math.round(stats.delta * 2.205)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <select
              value={boatRows}
              onChange={(e) => {
                const n = Number(e.target.value)
                setBoatRows(n)
                setBoat(prev => ({
                  ...prev,
                  L: prev.L.length < n ? [...prev.L, ...Array(n - prev.L.length).fill(null)] : prev.L.slice(0, n),
                  R: prev.R.length < n ? [...prev.R, ...Array(n - prev.R.length).fill(null)] : prev.R.slice(0, n)
                }))
              }}
              className="bg-slate-700 text-white text-[10px] px-1 py-0.5 rounded border-none"
            >
              {[6, 8, 10, 12].map(n => <option key={n} value={n}>{n}R</option>)}
            </select>
            <button onClick={handleReset} className="px-1.5 py-0.5 bg-slate-700 hover:bg-red-600 rounded text-[10px]">
              ↺
            </button>
          </div>
        </div>

        {/* Balance Bar */}
        <div className="h-2 bg-slate-200 rounded-full mb-2 overflow-hidden flex">
          <div
            className="bg-gradient-to-r from-blue-500 to-blue-400 transition-all"
            style={{ width: `${stats.leftW + stats.rightW > 0 ? (stats.leftW / (stats.leftW + stats.rightW)) * 100 : 50}%` }}
          />
          <div
            className="bg-gradient-to-r from-rose-400 to-rose-500 transition-all"
            style={{ width: `${stats.leftW + stats.rightW > 0 ? (stats.rightW / (stats.leftW + stats.rightW)) * 100 : 50}%` }}
          />
        </div>

        <div className="flex gap-2">
          {/* Boat */}
          <div className="flex-1 bg-gradient-to-b from-sky-100 to-blue-100 rounded-xl p-2 border border-sky-200">
            {/* Drummer */}
            <div className="flex justify-center mb-1">
              <Seat id="drum" member={boat.drum} label="🥁" />
            </div>

            {/* Rows */}
            <div className="space-y-0.5">
              {Array.from({ length: boatRows }).map((_, i) => (
                <div key={i} className="flex items-center gap-0.5">
                  <Seat id={`L${i}`} member={boat.L[i]} label={`L${i + 1}`} side="L" />
                  <div className="w-4 text-center text-[8px] font-bold text-slate-400">{i + 1}</div>
                  <Seat id={`R${i}`} member={boat.R[i]} label={`R${i + 1}`} side="R" />
                </div>
              ))}
            </div>

            {/* Steersperson */}
            <div className="flex justify-center mt-1">
              <Seat id="steer" member={boat.steer} label="🚢" />
            </div>

            {/* Alternates */}
            <div className="mt-2 pt-2 border-t border-sky-200">
              <div className="text-[8px] text-slate-500 text-center mb-0.5">ALT</div>
              <div className="flex justify-center gap-0.5">
                {[0, 1, 2, 3].map(i => (
                  <Seat key={i} id={`alt${i}`} member={boat.alt[i]} label={`A${i + 1}`} mini />
                ))}
              </div>
            </div>
          </div>

          {/* Pool */}
          <div className="w-32 bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="px-2 py-1 bg-slate-100 border-b border-slate-200 text-[10px] font-bold text-slate-600">
              Pool ({available.length})
            </div>
            <Droppable droppableId="pool">
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="flex-1 p-1 overflow-y-auto max-h-[400px] flex flex-wrap content-start gap-0.5"
                  style={{ touchAction: 'none' }}
                >
                  {available.map((member, i) => (
                    <MemberPill key={member.id} member={member} index={i} droppableId="pool" />
                  ))}
                  {provided.placeholder}
                  {available.length === 0 && (
                    <p className="text-[9px] text-slate-400 text-center w-full py-2">All assigned!</p>
                  )}
                </div>
              )}
            </Droppable>
          </div>
        </div>

        {/* Hover Tooltip */}
        {hoveredMember && (
          <div
            className="fixed z-50 bg-slate-900 text-white text-[10px] px-2 py-1.5 rounded-lg shadow-xl pointer-events-none"
            style={{ left: tooltipPos.x, top: tooltipPos.y }}
          >
            <div className="font-bold">{hoveredMember.full_name}</div>
            <div className="flex gap-2 text-slate-300">
              <span>{hoveredMember.weight_kg ? `${Math.round(hoveredMember.weight_kg * 2.205)}lb / ${Math.round(hoveredMember.weight_kg)}kg` : 'No weight'}</span>
              <span>{hoveredMember.preferred_side || 'No pref'}</span>
            </div>
            {hoveredMember.skill_level && <div className="text-slate-400">{hoveredMember.skill_level}</div>}
          </div>
        )}

        {/* Save Button */}
        {onSave && (
          <button
            onClick={() => onSave(boat)}
            className="mt-2 w-full py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold rounded-lg"
          >
            Save Lineup
          </button>
        )}

        {/* Legends */}
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3 text-[9px] text-slate-500">
          {/* Weight Legend */}
          <div className="flex items-center gap-1">
            <span>Light</span>
            <div className="flex gap-0.5">
              <div className="w-4 h-2 rounded-full bg-sky-400" />
              <div className="w-4 h-2 rounded-full bg-emerald-400" />
              <div className="w-4 h-2 rounded-full bg-amber-400" />
              <div className="w-4 h-2 rounded-full bg-rose-400" />
            </div>
            <span>Heavy</span>
          </div>
          {/* Side Preference Legend */}
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-indigo-600 text-white text-[7px] font-bold flex items-center justify-center">L</span>
            <span className="w-3 h-3 rounded-full bg-orange-600 text-white text-[7px] font-bold flex items-center justify-center">R</span>
            <span className="w-3 h-3 rounded-full bg-slate-600 text-white text-[7px] font-bold flex items-center justify-center">B</span>
            <span>Side</span>
          </div>
        </div>
      </div>
    </DragDropContext>
  )
}
