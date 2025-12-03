import { useState, useMemo } from 'react'
import { format, startOfWeek, addDays } from 'date-fns'
import Icon from '../Icon'

export default function AssignExercisesModal({
  isOpen,
  onClose,
  exercises = [],
  categories = [],
  currentAssignments = [],
  weekStart,
  onAssign
}) {
  const [selectedExercises, setSelectedExercises] = useState(
    currentAssignments.map(a => a.exercise_id)
  )
  const [filterCategory, setFilterCategory] = useState('all')
  const [saving, setSaving] = useState(false)

  const filteredExercises = useMemo(() => {
    if (filterCategory === 'all') return exercises
    return exercises.filter(e => e.category_id === filterCategory)
  }, [exercises, filterCategory])

  const weekEnd = useMemo(() => {
    const start = new Date(weekStart)
    return format(addDays(start, 6), 'MMM d')
  }, [weekStart])

  const toggleExercise = (exerciseId) => {
    setSelectedExercises(prev =>
      prev.includes(exerciseId)
        ? prev.filter(id => id !== exerciseId)
        : [...prev, exerciseId]
    )
  }

  const handleSave = async () => {
    setSaving(true)
    await onAssign(selectedExercises, weekStart)
    setSaving(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-2xl h-[90vh] sm:h-auto sm:max-h-[85vh] flex flex-col overflow-hidden shadow-xl animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 p-5 pb-4 border-b border-slate-100">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-2 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            <Icon name="close" size={16} className="text-slate-500" />
          </button>
          <h2 className="text-lg font-bold text-slate-900">Assign Weekly Exercises</h2>
          <p className="text-sm text-slate-500 mt-1">
            Week of {format(new Date(weekStart), 'MMM d')} - {weekEnd}
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex-shrink-0 p-4 border-b border-slate-100 bg-slate-50/50 overflow-x-auto">
          <div className="flex gap-2">
            <button
              onClick={() => setFilterCategory('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                filterCategory === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 border border-slate-200'
              }`}
            >
              All ({exercises.length})
            </button>
            {categories.map(cat => {
              const count = exercises.filter(e => e.category_id === cat.id).length
              return (
                <button
                  key={cat.id}
                  onClick={() => setFilterCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                    filterCategory === cat.id
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  {cat.icon} {cat.name} ({count})
                </button>
              )
            })}
          </div>
        </div>

        {/* Exercise List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredExercises.map(exercise => {
            const isSelected = selectedExercises.includes(exercise.id)
            return (
              <button
                key={exercise.id}
                onClick={() => toggleExercise(exercise.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                  isSelected
                    ? 'bg-primary-50 border-2 border-primary-300'
                    : 'bg-slate-50 border-2 border-transparent hover:border-slate-200'
                }`}
              >
                <div className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center ${
                  isSelected
                    ? 'bg-primary-500 text-white'
                    : 'bg-white border-2 border-slate-300'
                }`}>
                  {isSelected && <Icon name="check" size={12} />}
                </div>
                <span className="text-xl flex-shrink-0">{exercise.category?.icon || ''}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800 truncate">{exercise.name}</span>
                    {exercise.is_dragon_boat_specific && (
                      <span className="px-1.5 py-0.5 text-[9px] font-bold bg-cyan-100 text-cyan-700 rounded">DB</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                    {exercise.default_duration_minutes && <span>{exercise.default_duration_minutes}m</span>}
                    {exercise.default_reps && <span>{exercise.default_reps} reps</span>}
                    {exercise.default_sets && <span>{exercise.default_sets} sets</span>}
                    <span className="capitalize">{exercise.difficulty}</span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-600">
              <strong className="text-primary-600">{selectedExercises.length}</strong> exercises selected
            </span>
            <button
              onClick={() => setSelectedExercises([])}
              className="text-xs font-semibold text-slate-500 hover:text-slate-700"
            >
              Clear all
            </button>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold rounded-xl shadow-sm shadow-primary-500/20 transition-all disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Assign Exercises'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
