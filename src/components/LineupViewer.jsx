import { useState } from 'react'
import { useRosterStore } from '../store/rosterStore'
import { useAuthStore } from '../store/authStore'
import { convertWeightForDisplay } from '../utils/weightConverter'

export default function LineupViewer({ lineup, isOpen: initialOpen = true }) {
  const { members } = useRosterStore()
  const { profile } = useAuthStore()
  const [isOpen, setIsOpen] = useState(initialOpen)

  // Get user's weight preference (default to 'lbs' if not set)
  const displayUnit = profile?.weight_unit || 'lbs'

  const findMember = (memberId) => {
    return members.find(m => m.id === memberId)
  }

  const positions = lineup.positions

  if (!positions) {
    return (
      <div className="text-center py-4 text-gray-500">
        No lineup data available
      </div>
    )
  }

  const drummer = positions.drummer ? findMember(positions.drummer) : null
  const steersperson = positions.steersperson ? findMember(positions.steersperson) : null
  const leftPaddlers = positions.paddlers?.left?.map(id => id ? findMember(id) : null) || []
  const rightPaddlers = positions.paddlers?.right?.map(id => id ? findMember(id) : null) || []

  const balance = positions.balance || {}

  const renderPaddler = (paddler, position, side) => {
    if (!paddler) {
      return (
        <div className="h-full min-h-[72px] flex items-center justify-center text-center py-3 px-2 bg-gray-50 rounded border-2 border-dashed border-gray-300">
          <span className="text-xs text-gray-400">Empty</span>
        </div>
      )
    }

    return (
      <div className={`h-full min-h-[72px] flex flex-col justify-center text-center py-2 px-2 rounded border-2 ${
        side === 'left' ? 'bg-blue-50 border-blue-300' : 'bg-green-50 border-green-300'
      }`}>
        <div className="flex items-center justify-center gap-1">
          <span className="font-semibold text-sm text-gray-900">{paddler.full_name}</span>
          {paddler.is_guest && (
            <span className="px-1 py-0.5 text-xs font-bold bg-orange-200 text-orange-800 rounded">
              G
            </span>
          )}
        </div>
        {paddler.weight_kg && (
          <div className="text-xs text-gray-600">
            {convertWeightForDisplay(paddler.weight_kg, paddler.weight_unit || 'lbs', 1)}{paddler.weight_unit || 'lbs'}
          </div>
        )}
        {paddler.skill_level && (
          <div className="text-xs text-gray-500">{paddler.skill_level}</div>
        )}
      </div>
    )
  }

  return (
    <div className="border rounded-lg">
      {/* Collapsible Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">
            {isOpen ? '▼' : '▶'}
          </span>
          <span className="font-medium text-gray-900">View Boat Configuration</span>
        </div>
        <span className="text-sm text-gray-500">
          {isOpen ? 'Click to collapse' : 'Click to expand'}
        </span>
      </button>

      {/* Lineup Content */}
      {isOpen && (
        <div className="p-4 border-t space-y-6">
          {/* Balance Stats */}
          {balance.totalWeight && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">Balance Statistics</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-xs text-gray-600">Total Weight</div>
                  <div className="text-lg font-bold text-gray-900">
                    {convertWeightForDisplay(balance.totalWeight, displayUnit, 1)} {displayUnit}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-600">Left Side</div>
                  <div className="text-lg font-bold text-blue-600">
                    {convertWeightForDisplay(balance.leftTotal, displayUnit, 1)} {displayUnit}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-600">Right Side</div>
                  <div className="text-lg font-bold text-green-600">
                    {convertWeightForDisplay(balance.rightTotal, displayUnit, 1)} {displayUnit}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-600">L/R Difference</div>
                  <div className={`text-lg font-bold ${
                    Math.abs(balance.sideDiff || 0) > 20 ? 'text-red-600' : 'text-gray-900'
                  }`}>
                    {convertWeightForDisplay(Math.abs(balance.sideDiff || 0), displayUnit, 1)} {displayUnit}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Boat Layout */}
          <div className="space-y-4">
            {/* Drummer */}
            <div>
              <div className="text-xs font-medium text-gray-600 mb-2 text-center">DRUMMER</div>
              {drummer ? (
                <div className="max-w-xs mx-auto">
                  <div className="text-center py-3 px-4 bg-purple-50 border-2 border-purple-300 rounded-lg">
                    <div className="flex items-center justify-center gap-1">
                      <span className="font-semibold text-gray-900">{drummer.full_name}</span>
                      {drummer.is_guest && (
                        <span className="px-1.5 py-0.5 text-xs font-bold bg-orange-200 text-orange-800 rounded">
                          GUEST
                        </span>
                      )}
                    </div>
                    {drummer.weight_kg && (
                      <div className="text-sm text-gray-600">
                        {convertWeightForDisplay(drummer.weight_kg, drummer.weight_unit || 'lbs', 1)}{drummer.weight_unit || 'lbs'}
                      </div>
                    )}
                    {drummer.skill_level && (
                      <div className="text-xs text-gray-500">{drummer.skill_level}</div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="max-w-xs mx-auto text-center py-3 px-4 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg">
                  <span className="text-sm text-gray-400">No drummer assigned</span>
                </div>
              )}
            </div>

            {/* Paddlers */}
            <div>
              <div className="text-xs font-medium text-gray-600 mb-3 text-center">PADDLERS</div>
              <div className="grid grid-cols-[auto_1fr_1fr] gap-3">
                {/* Position Labels (Center Column) */}
                <div className="flex flex-col gap-2 pt-[28px]">
                  {leftPaddlers.map((_, idx) => (
                    <div key={idx} className="text-xs text-gray-500 text-center min-h-[72px] flex items-center justify-center">
                      {idx + 1}
                    </div>
                  ))}
                </div>

                {/* Left Side */}
                <div>
                  <div className="text-xs font-medium text-blue-700 mb-2 text-center">LEFT SIDE</div>
                  <div className="space-y-2">
                    {leftPaddlers.map((paddler, idx) => (
                      <div key={idx} className="min-h-[72px]">
                        {renderPaddler(paddler, idx + 1, 'left')}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right Side */}
                <div>
                  <div className="text-xs font-medium text-green-700 mb-2 text-center">RIGHT SIDE</div>
                  <div className="space-y-2">
                    {rightPaddlers.map((paddler, idx) => (
                      <div key={idx} className="min-h-[72px]">
                        {renderPaddler(paddler, idx + 1, 'right')}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Steersperson */}
            <div>
              <div className="text-xs font-medium text-gray-600 mb-2 text-center">STEERSPERSON</div>
              {steersperson ? (
                <div className="max-w-xs mx-auto">
                  <div className="text-center py-3 px-4 bg-orange-50 border-2 border-orange-300 rounded-lg">
                    <div className="flex items-center justify-center gap-1">
                      <span className="font-semibold text-gray-900">{steersperson.full_name}</span>
                      {steersperson.is_guest && (
                        <span className="px-1.5 py-0.5 text-xs font-bold bg-orange-200 text-orange-800 rounded">
                          GUEST
                        </span>
                      )}
                    </div>
                    {steersperson.weight_kg && (
                      <div className="text-sm text-gray-600">
                        {convertWeightForDisplay(steersperson.weight_kg, steersperson.weight_unit || 'lbs', 1)}{steersperson.weight_unit || 'lbs'}
                      </div>
                    )}
                    {steersperson.skill_level && (
                      <div className="text-xs text-gray-500">{steersperson.skill_level}</div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="max-w-xs mx-auto text-center py-3 px-4 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg">
                  <span className="text-sm text-gray-400">No steersperson assigned</span>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {lineup.notes && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="text-xs font-medium text-gray-700 mb-1">Lineup Notes:</div>
              <p className="text-sm text-gray-900">{lineup.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
