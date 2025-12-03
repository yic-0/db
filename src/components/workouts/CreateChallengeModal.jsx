import { useState } from 'react'
import { format, addDays, addWeeks } from 'date-fns'
import Icon from '../Icon'

const EMOJI_OPTIONS = ['💪', '🏆', '🔥', '⚡', '🚣', '🎯', '💥', '🌟']
const COLOR_OPTIONS = [
  { value: '#0891b2', label: 'Cyan' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#f97316', label: 'Orange' },
  { value: '#10b981', label: 'Green' },
  { value: '#ef4444', label: 'Red' },
  { value: '#3b82f6', label: 'Blue' }
]

export default function CreateChallengeModal({
  isOpen,
  onClose,
  onCreate,
  editChallenge = null
}) {
  const [form, setForm] = useState({
    title: editChallenge?.title || '',
    description: editChallenge?.description || '',
    dragon_boat_relevance: editChallenge?.dragon_boat_relevance || '',
    start_date: editChallenge?.start_date || format(new Date(), 'yyyy-MM-dd'),
    end_date: editChallenge?.end_date || format(addWeeks(new Date(), 4), 'yyyy-MM-dd'),
    starter_target: editChallenge?.starter_target || 2,
    starter_label: editChallenge?.starter_label || 'Starter',
    committed_target: editChallenge?.committed_target || 4,
    committed_label: editChallenge?.committed_label || 'Committed',
    intense_target: editChallenge?.intense_target || 6,
    intense_label: editChallenge?.intense_label || 'Intense',
    team_goal: editChallenge?.team_goal || 200,
    emoji: editChallenge?.emoji || '💪',
    color: editChallenge?.color || '#0891b2'
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!form.title || !form.start_date || !form.end_date) return

    setSaving(true)
    await onCreate({
      ...form,
      is_active: true
    })
    setSaving(false)
    onClose()
  }

  const setDuration = (weeks) => {
    setForm(prev => ({
      ...prev,
      end_date: format(addWeeks(new Date(prev.start_date), weeks), 'yyyy-MM-dd')
    }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg h-[90vh] sm:h-auto sm:max-h-[85vh] flex flex-col overflow-hidden shadow-xl animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
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
          <h2 className="text-lg font-bold text-slate-900">
            {editChallenge ? 'Edit Challenge' : 'Create Training Challenge'}
          </h2>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Title & Emoji */}
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Emoji</label>
              <div className="flex gap-1 flex-wrap w-24">
                {EMOJI_OPTIONS.map(emoji => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, emoji }))}
                    className={`w-8 h-8 rounded-lg text-lg flex items-center justify-center transition-all ${
                      form.emoji === emoji
                        ? 'bg-primary-100 ring-2 ring-primary-500'
                        : 'bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Challenge Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Winter Training Block"
                className="input"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="What's this challenge about?"
              rows={2}
              className="input resize-none"
            />
          </div>

          {/* Dragon Boat Relevance */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              🚣 Why This Helps Paddling
            </label>
            <textarea
              value={form.dragon_boat_relevance}
              onChange={(e) => setForm(prev => ({ ...prev, dragon_boat_relevance: e.target.value }))}
              placeholder="How does this challenge improve dragon boat performance?"
              rows={2}
              className="input resize-none"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Start Date</label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm(prev => ({ ...prev, start_date: e.target.value }))}
                className="input"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">End Date</label>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm(prev => ({ ...prev, end_date: e.target.value }))}
                className="input"
              />
            </div>
          </div>

          {/* Quick Duration */}
          <div className="flex gap-2">
            {[2, 4, 6, 8].map(weeks => (
              <button
                key={weeks}
                type="button"
                onClick={() => setDuration(weeks)}
                className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
              >
                {weeks} weeks
              </button>
            ))}
          </div>

          {/* Tier Targets */}
          <div className="p-4 bg-slate-50 rounded-xl space-y-3">
            <label className="block text-xs font-bold text-slate-600">Tier Targets (exercises/week)</label>

            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <div className="p-2 bg-emerald-50 rounded-lg mb-1">
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={form.starter_target}
                    onChange={(e) => setForm(prev => ({ ...prev, starter_target: parseInt(e.target.value) || 2 }))}
                    className="w-full text-center text-xl font-bold text-emerald-700 bg-transparent border-none focus:ring-0"
                  />
                </div>
                <input
                  type="text"
                  value={form.starter_label}
                  onChange={(e) => setForm(prev => ({ ...prev, starter_label: e.target.value }))}
                  className="w-full text-center text-xs font-medium text-slate-600 bg-transparent border-none focus:ring-0"
                />
              </div>

              <div className="text-center">
                <div className="p-2 bg-blue-50 rounded-lg mb-1">
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={form.committed_target}
                    onChange={(e) => setForm(prev => ({ ...prev, committed_target: parseInt(e.target.value) || 4 }))}
                    className="w-full text-center text-xl font-bold text-blue-700 bg-transparent border-none focus:ring-0"
                  />
                </div>
                <input
                  type="text"
                  value={form.committed_label}
                  onChange={(e) => setForm(prev => ({ ...prev, committed_label: e.target.value }))}
                  className="w-full text-center text-xs font-medium text-slate-600 bg-transparent border-none focus:ring-0"
                />
              </div>

              <div className="text-center">
                <div className="p-2 bg-rose-50 rounded-lg mb-1">
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={form.intense_target}
                    onChange={(e) => setForm(prev => ({ ...prev, intense_target: parseInt(e.target.value) || 6 }))}
                    className="w-full text-center text-xl font-bold text-rose-700 bg-transparent border-none focus:ring-0"
                  />
                </div>
                <input
                  type="text"
                  value={form.intense_label}
                  onChange={(e) => setForm(prev => ({ ...prev, intense_label: e.target.value }))}
                  className="w-full text-center text-xs font-medium text-slate-600 bg-transparent border-none focus:ring-0"
                />
              </div>
            </div>
          </div>

          {/* Team Goal */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Team Goal (total exercises)</label>
            <input
              type="number"
              min="10"
              value={form.team_goal}
              onChange={(e) => setForm(prev => ({ ...prev, team_goal: parseInt(e.target.value) || 200 }))}
              className="input"
            />
            <p className="text-xs text-slate-500 mt-1">Combined exercise completions from all participants</p>
          </div>

          {/* Color */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Accent Color</label>
            <div className="flex gap-2">
              {COLOR_OPTIONS.map(color => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, color: color.value }))}
                  className={`w-8 h-8 rounded-full transition-all ${
                    form.color === color.value ? 'ring-2 ring-offset-2 ring-slate-400' : ''
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.label}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-4 border-t border-slate-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!form.title || saving}
            className="flex-1 py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold rounded-xl shadow-sm shadow-primary-500/20 transition-all disabled:opacity-50"
          >
            {saving ? 'Saving...' : editChallenge ? 'Update' : 'Create Challenge'}
          </button>
        </div>
      </div>
    </div>
  )
}
