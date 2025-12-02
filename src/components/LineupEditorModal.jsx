import { useEffect } from 'react'
import LineupEditor from './LineupEditor'
import Icon from './Icon'

/**
 * LineupEditorModal - A modal wrapper for the LineupEditor component
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Callback when modal closes
 * @param {Array} props.members - Array of member objects
 * @param {Object} props.initialPositions - Optional initial positions to load
 * @param {string} props.title - Modal title
 * @param {Function} props.onSave - Optional save callback: (positions, name, notes) => void
 * @param {string} props.lineupName - Optional initial lineup name
 * @param {number} props.boatSize - Initial boat size (default 10)
 */
export default function LineupEditorModal({
  isOpen,
  onClose,
  members = [],
  initialPositions = null,
  title = 'Lineup Editor',
  onSave,
  lineupName = '',
  boatSize = 10
}) {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[90vh] mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-primary-600 to-primary-700">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Icon name="users" size={20} className="text-white/80" />
            {title}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <LineupEditor
            members={members}
            initialPositions={initialPositions}
            boatSize={boatSize}
            compact={true}
            onSave={onSave}
            lineupName={lineupName}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * QuickLineupEditor - A compact inline version for testing ideas quickly
 * Can be embedded anywhere without the modal wrapper
 */
export function QuickLineupEditor({
  members = [],
  initialPositions = null,
  boatSize = 10,
  onPositionsChange,
  className = ''
}) {
  return (
    <div className={`quick-lineup-editor ${className}`}>
      <LineupEditor
        members={members}
        initialPositions={initialPositions}
        boatSize={boatSize}
        compact={true}
        showBalancePanels={true}
        onPositionsChange={onPositionsChange}
      />
    </div>
  )
}
