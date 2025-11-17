import { useMemo, useState } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import DragonBoatCogPanel from '../components/DragonBoatCogPanel'
import DragonBoatLeftRightPanel from '../components/DragonBoatLeftRightPanel'
import { makeStandardDragonBoatLayout } from '../lib/dragonboatCog'

const demoAthletes = [
  { id: 'a1', name: 'Alex', weightKg: 78 },
  { id: 'a2', name: 'Bree', weightKg: 65 },
  { id: 'a3', name: 'Chen', weightKg: 82 },
  { id: 'a4', name: 'Dee', weightKg: 71 },
  { id: 'a5', name: 'Eli', weightKg: 69 },
  { id: 'a6', name: 'Fran', weightKg: 74 },
  { id: 'a7', name: 'Gus', weightKg: 80 },
  { id: 'a8', name: 'Hal', weightKg: 76 },
  { id: 'a9', name: 'Ivy', weightKg: 60 },
  { id: 'a10', name: 'Jay', weightKg: 68 }
]

export default function CogDemoPage() {
  const layout = useMemo(() => makeStandardDragonBoatLayout(5, 1, true, true), [])

  const initialLineup = useMemo(() => {
    return {
      id: 'demo',
      boatLayoutId: layout.id,
      name: 'Demo Lineup',
      assignments: []
    }
  }, [layout.id])

  const [lineup, setLineup] = useState(initialLineup)
  const [available, setAvailable] = useState(demoAthletes)

  const seatOrder = useMemo(() => {
    // order seats from bow to stern and port/starboard pairs
    return layout.seats
      .filter(s => s.id !== 'drummer' && s.id !== 'steer')
      .sort((a, b) => a.x - b.x || a.id.localeCompare(b.id))
  }, [layout.seats])

  const getAssignment = (seatId) => lineup.assignments.find(a => a.seatId === seatId)

  const handleDragEnd = (result) => {
    const { source, destination } = result
    if (!destination) return

    // dragging from available list
    if (source.droppableId === 'available') {
      const athlete = available[source.index]
      if (!athlete) return

      // if dropping onto another spot, remove any existing assignment for that seat or athlete
      if (destination.droppableId.startsWith('seat-')) {
        const seatId = destination.droppableId.replace('seat-', '')
        setLineup(prev => {
          const filtered = prev.assignments.filter(a => a.seatId !== seatId && a.athleteId !== athlete.id)
          return {
            ...prev,
            assignments: [...filtered, { seatId, athleteId: athlete.id }]
          }
        })
        // remove from available
        setAvailable(prev => prev.filter((_, idx) => idx !== source.index))
      }
    } else if (source.droppableId.startsWith('seat-')) {
      const seatId = source.droppableId.replace('seat-', '')
      const assign = getAssignment(seatId)
      if (!assign) return

      // moving back to available
      if (destination.droppableId === 'available') {
        const athlete = demoAthletes.find(a => a.id === assign.athleteId)
        setAvailable(prev => {
          const next = [...prev]
          next.splice(destination.index, 0, athlete)
          return next
        })
        setLineup(prev => ({
          ...prev,
          assignments: prev.assignments.filter(a => a.seatId !== seatId)
        }))
      } else if (destination.droppableId.startsWith('seat-')) {
        const destSeat = destination.droppableId.replace('seat-', '')
        setLineup(prev => {
          const others = prev.assignments.filter(a => a.seatId !== seatId && a.seatId !== destSeat)
          const destAssign = prev.assignments.find(a => a.seatId === destSeat)
          const resultAssignments = [...others, { seatId: destSeat, athleteId: assign.athleteId }]
          if (destAssign) {
            resultAssignments.push({ seatId, athleteId: destAssign.athleteId })
          }
          return { ...prev, assignments: resultAssignments }
        })
      }
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">COG + Left/Right Demo</h1>
        <p className="text-gray-600">Drag athletes onto seats to see center of gravity and port/starboard balance update live.</p>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="card lg:col-span-1">
            <h3 className="font-semibold text-gray-900 mb-3">Available Athletes</h3>
            <Droppable droppableId="available">
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="space-y-2 min-h-[200px]"
                >
                  {available.map((athlete, index) => (
                    <Draggable key={athlete.id} draggableId={`ath-${athlete.id}`} index={index}>
                      {(dragProvided) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          {...dragProvided.dragHandleProps}
                          className="p-3 border rounded bg-white shadow-sm flex items-center justify-between"
                        >
                          <span className="font-medium text-gray-900">{athlete.name}</span>
                          <span className="text-sm text-gray-600">{athlete.weightKg} kg</span>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>

          <div className="card lg:col-span-2">
            <h3 className="font-semibold text-gray-900 mb-3">Boat Seats</h3>
            <div className="flex flex-wrap gap-2">
              {layout.seats
                .filter(s => s.id === 'drummer' || s.id === 'steer')
                .map(seat => {
                  const assign = getAssignment(seat.id)
                  const athlete = demoAthletes.find(a => a.id === assign?.athleteId)
                  return (
                    <Droppable key={seat.id} droppableId={`seat-${seat.id}`}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className="p-3 border rounded bg-gray-50 min-w-[160px]"
                        >
                          <div className="text-sm font-semibold text-gray-900 mb-1">{seat.id}</div>
                          {athlete ? (
                            <Draggable draggableId={`seat-ath-${seat.id}`} index={0}>
                              {(dragProvided) => (
                                <div
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  {...dragProvided.dragHandleProps}
                                  className="p-2 border rounded bg-white shadow-sm flex justify-between"
                                >
                                  <span>{athlete.name}</span>
                                  <span className="text-sm text-gray-600">{athlete.weightKg} kg</span>
                                </div>
                              )}
                            </Draggable>
                          ) : (
                            <div className="text-xs text-gray-500">Drop athlete here</div>
                          )}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  )
                })}
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {seatOrder.map((seat, idx) => {
                const assign = getAssignment(seat.id)
                const athlete = demoAthletes.find(a => a.id === assign?.athleteId)
                return (
                  <Droppable key={seat.id} droppableId={`seat-${seat.id}`}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="p-3 border rounded bg-gray-50 min-h-[82px]"
                      >
                        <div className="text-sm font-semibold text-gray-900 mb-1">
                          {seat.side === 'port' ? 'Port' : 'Starboard'} {idx % 2 === 0 ? Math.floor(idx / 2) + 1 : Math.floor(idx / 2) + 1}
                        </div>
                        {athlete ? (
                          <Draggable draggableId={`seat-ath-${seat.id}`} index={0}>
                            {(dragProvided) => (
                              <div
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                {...dragProvided.dragHandleProps}
                                className="p-2 border rounded bg-white shadow-sm flex justify-between"
                              >
                                <span>{athlete.name}</span>
                                <span className="text-sm text-gray-600">{athlete.weightKg} kg</span>
                              </div>
                            )}
                          </Draggable>
                        ) : (
                          <div className="text-xs text-gray-500">Drop athlete here</div>
                        )}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                )
              })}
            </div>
          </div>
        </div>
      </DragDropContext>

      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">COG & Balance</h3>
          <p className="text-xs text-gray-500">Live from demo seats.</p>
        </div>
        <div className="space-y-4">
          <DragonBoatCogPanel layout={layout} athletes={demoAthletes} lineup={lineup} />
          <DragonBoatLeftRightPanel layout={layout} athletes={demoAthletes} lineup={lineup} />
        </div>
      </div>
    </div>
  )
}
