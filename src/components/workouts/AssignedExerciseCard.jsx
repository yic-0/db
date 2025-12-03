import { useState } from 'react'
import Icon from '../Icon'

export default function AssignedExerciseCard({
  exercise,
  isCompleted,
  onToggle,
  teammatesCompleted = 0,
  onShowDetails,
  isRequired = true
}) {
  const [isAnimating, setIsAnimating] = useState(false)

  const handleToggle = async () => {
    setIsAnimating(true)
    await onToggle()
    setTimeout(() => setIsAnimating(false), 300)
  }

  return (
    <div
      className={`group relative flex items-center gap-3 p-3 sm:p-4 rounded-xl cursor-pointer transition-all duration-200 ${
        isCompleted
          ? 'bg-gradient-to-r from-success-50 to-emerald-50/50 border border-success-200/60'
          : 'bg-white/80 backdrop-blur-sm border border-slate-200/60 hover:border-primary-200 hover:shadow-sm'
      }`}
      onClick={handleToggle}
    >
      {/* Checkbox */}
      <div className={`relative flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-200 ${
        isCompleted
          ? 'bg-gradient-to-br from-success-500 to-emerald-500 text-white shadow-sm shadow-success-500/30'
          : 'bg-slate-100 border-2 border-slate-300 group-hover:border-primary-300'
      } ${isAnimating ? 'scale-110' : ''}`}>
        {isCompleted && <Icon name="check" size={14} />}
      </div>

      {/* Exercise Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`font-semibold text-sm sm:text-base transition-all ${
            isCompleted ? 'text-success-700 line-through decoration-2' : 'text-slate-800'
          }`}>
            {exercise.name}
          </span>
          {exercise.is_dragon_boat_specific && (
            <span className="px-1.5 py-0.5 text-[9px] font-bold bg-cyan-100 text-cyan-700 rounded uppercase tracking-wide">
              DB
            </span>
          )}
          {!isRequired && (
            <span className="px-1.5 py-0.5 text-[9px] font-bold bg-slate-100 text-slate-500 rounded">
              Optional
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          {/* Exercise metrics */}
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            {exercise.default_duration_minutes && (
              <span className="flex items-center gap-0.5">
                <Icon name="clock" size={11} />
                {exercise.default_duration_minutes}m
              </span>
            )}
            {exercise.default_reps && (
              <span>{exercise.default_reps} reps</span>
            )}
            {exercise.default_sets && (
              <span>{exercise.default_sets} sets</span>
            )}
          </div>
          {/* Teammates indicator */}
          {teammatesCompleted > 0 && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 bg-primary-50 text-primary-600 rounded text-[10px] font-semibold">
              <Icon name="roster" size={10} />
              {teammatesCompleted}
            </span>
          )}
        </div>
      </div>

      {/* Category Icon */}
      <div
        className="flex-shrink-0 text-xl sm:text-2xl opacity-80 group-hover:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation()
          onShowDetails?.(exercise)
        }}
      >
        {exercise.category?.icon || ''}
      </div>

      {/* Hover info icon */}
      {exercise.dragon_boat_benefit && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onShowDetails?.(exercise)
          }}
          className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 p-1 rounded-full bg-slate-100 hover:bg-slate-200 transition-all"
        >
          <Icon name="information" size={12} className="text-slate-500" />
        </button>
      )}
    </div>
  )
}
