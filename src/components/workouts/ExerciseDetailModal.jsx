import Icon from '../Icon'

export default function ExerciseDetailModal({ exercise, isOpen, onClose }) {
  if (!isOpen || !exercise) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden shadow-xl animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative p-5 pb-4 border-b border-slate-100">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-2 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            <Icon name="close" size={16} className="text-slate-500" />
          </button>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{exercise.category?.icon || ''}</span>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{exercise.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-medium text-slate-500 capitalize">{exercise.category?.name}</span>
                {exercise.is_dragon_boat_specific && (
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-cyan-100 text-cyan-700 rounded-full">
                    Dragon Boat Specific
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 overflow-y-auto max-h-[60vh]">
          {/* Metrics */}
          <div className="grid grid-cols-3 gap-3">
            {exercise.default_duration_minutes && (
              <div className="text-center p-3 bg-slate-50 rounded-xl">
                <div className="text-2xl font-bold text-slate-900">{exercise.default_duration_minutes}</div>
                <div className="text-xs text-slate-500 mt-0.5">minutes</div>
              </div>
            )}
            {exercise.default_sets && (
              <div className="text-center p-3 bg-slate-50 rounded-xl">
                <div className="text-2xl font-bold text-slate-900">{exercise.default_sets}</div>
                <div className="text-xs text-slate-500 mt-0.5">sets</div>
              </div>
            )}
            {exercise.default_reps && (
              <div className="text-center p-3 bg-slate-50 rounded-xl">
                <div className="text-2xl font-bold text-slate-900">{exercise.default_reps}</div>
                <div className="text-xs text-slate-500 mt-0.5">reps</div>
              </div>
            )}
          </div>

          {/* Description */}
          {exercise.description && (
            <div>
              <h3 className="text-sm font-bold text-slate-700 mb-2">Description</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{exercise.description}</p>
            </div>
          )}

          {/* Dragon Boat Benefit - The key new feature */}
          {exercise.dragon_boat_benefit && (
            <div className="p-4 bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl border border-cyan-100">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">🚣</span>
                <h3 className="text-sm font-bold text-cyan-800">Why This Helps Your Paddling</h3>
              </div>
              <p className="text-sm text-cyan-700 leading-relaxed">{exercise.dragon_boat_benefit}</p>
            </div>
          )}

          {/* Difficulty */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Difficulty</span>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              exercise.difficulty === 'beginner'
                ? 'bg-green-100 text-green-700'
                : exercise.difficulty === 'intermediate'
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-red-100 text-red-700'
            }`}>
              {exercise.difficulty?.charAt(0).toUpperCase() + exercise.difficulty?.slice(1)}
            </span>
          </div>

          {/* Video Link */}
          {exercise.video_url && (
            <a
              href={exercise.video_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 p-3 bg-primary-50 hover:bg-primary-100 text-primary-700 rounded-xl font-semibold text-sm transition-colors"
            >
              <Icon name="link" size={16} />
              Watch Demo Video
            </a>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100">
          <button
            onClick={onClose}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}
