import { useState, useEffect } from 'react'
import { usePracticeStore } from '../store/practiceStore'
import { format } from 'date-fns'
import { convertWeightForDisplay } from '../utils/weightConverter'

export default function MemberHistoryModal({ member, isOpen, onClose }) {
  const { fetchMemberHistory } = usePracticeStore()
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && member) {
      loadHistory()
    }
  }, [isOpen, member])

  const loadHistory = async () => {
    setLoading(true)
    const result = await fetchMemberHistory(member.id, 10) // Last 10 practices with notes
    if (result.success) {
      setHistory(result.data)
    }
    setLoading(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b bg-gray-50">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{member.full_name}</h2>
              <p className="text-sm text-gray-600 mt-1">
                Paddler History & Notes
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            >
              ×
            </button>
          </div>

          {/* Member Info Summary */}
          <div className="mt-4 flex gap-4 text-sm text-gray-600">
            {member.skill_level && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                {member.skill_level}
              </span>
            )}
            {member.preferred_side && (
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded">
                {member.preferred_side} side
              </span>
            )}
            {member.weight_kg && (
              <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded">
                {convertWeightForDisplay(member.weight_kg, member.weight_unit || 'lbs', 1)}{member.weight_unit || 'lbs'}
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="text-gray-600">Loading history...</div>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-2">No previous notes found</p>
              <p className="text-sm text-gray-500">
                Notes from past practices will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-gray-600 mb-4">
                Showing {history.length} most recent practice{history.length !== 1 ? 's' : ''} with notes
              </div>

              {history.map((record, index) => (
                <div
                  key={record.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  {/* Practice Info */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {record.practice?.title || 'Practice'}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {record.practice?.date && format(new Date(record.practice.date), 'EEEE, MMM d, yyyy')}
                        {record.checked_in_at && (
                          <span className="ml-2">
                            • Checked in: {format(new Date(record.checked_in_at), 'h:mm a')}
                          </span>
                        )}
                      </p>
                    </div>
                    <span className="text-xs text-gray-500">
                      {index === 0 ? 'Most recent' : `${index + 1} practice${index !== 0 ? 's' : ''} ago`}
                    </span>
                  </div>

                  {/* Notes */}
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                    <div className="text-xs font-medium text-gray-600 mb-1">Coach Notes:</div>
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">
                      {record.member_notes}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-end">
          <button onClick={onClose} className="btn-primary">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
