import { useState } from 'react'
import Icon from '../Icon'

const TIERS = [
  {
    id: 'starter',
    label: 'Starter',
    emoji: '',
    description: 'Perfect for beginners or busy weeks',
    bgClass: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200',
    selectedClass: 'bg-emerald-100 border-emerald-400 ring-2 ring-emerald-400/30',
    textClass: 'text-emerald-700'
  },
  {
    id: 'committed',
    label: 'Committed',
    emoji: '',
    description: 'Solid training commitment',
    bgClass: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
    selectedClass: 'bg-blue-100 border-blue-400 ring-2 ring-blue-400/30',
    textClass: 'text-blue-700'
  },
  {
    id: 'intense',
    label: 'Intense',
    emoji: '',
    description: 'For the dedicated paddler',
    bgClass: 'bg-rose-50 hover:bg-rose-100 border-rose-200',
    selectedClass: 'bg-rose-100 border-rose-400 ring-2 ring-rose-400/30',
    textClass: 'text-rose-700'
  }
]

export default function ChallengeTierPicker({
  challenge,
  isOpen,
  onClose,
  onSelect,
  currentTier = null,
  title = 'Choose Your Tier'
}) {
  const [selectedTier, setSelectedTier] = useState(currentTier)

  if (!isOpen) return null

  const handleConfirm = () => {
    if (selectedTier) {
      onSelect(selectedTier)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md overflow-hidden shadow-xl animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 pb-3 border-b border-slate-100">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-2 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            <Icon name="close" size={16} className="text-slate-500" />
          </button>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{challenge?.emoji || ''}</span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{title}</h2>
              <p className="text-xs text-slate-500">{challenge?.title}</p>
            </div>
          </div>
        </div>

        {/* Tier Options */}
        <div className="p-5 space-y-3">
          <p className="text-sm text-slate-600 mb-4">
            Select how many exercises per week you want to commit to. Everyone contributes to the team goal regardless of tier!
          </p>

          {TIERS.map(tier => {
            const target = challenge?.[`${tier.id}_target`] || (tier.id === 'starter' ? 2 : tier.id === 'committed' ? 4 : 6)
            const isSelected = selectedTier === tier.id

            return (
              <button
                key={tier.id}
                onClick={() => setSelectedTier(tier.id)}
                className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                  isSelected ? tier.selectedClass : tier.bgClass
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{tier.emoji}</span>
                    <div>
                      <div className={`font-bold ${tier.textClass}`}>
                        {challenge?.[`${tier.id}_label`] || tier.label}
                      </div>
                      <div className="text-xs text-slate-500">{tier.description}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${tier.textClass}`}>{target}</div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-wide">per week</div>
                  </div>
                </div>
                {isSelected && (
                  <div className="mt-3 pt-3 border-t border-current/10 flex items-center gap-2">
                    <Icon name="check" size={14} className={tier.textClass} />
                    <span className={`text-xs font-semibold ${tier.textClass}`}>Selected</span>
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedTier}
            className="flex-1 py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 disabled:from-slate-300 disabled:to-slate-300 text-white font-semibold rounded-xl shadow-sm shadow-primary-500/20 transition-all disabled:shadow-none"
          >
            {currentTier ? 'Update Tier' : 'Join Challenge'}
          </button>
        </div>
      </div>
    </div>
  )
}
