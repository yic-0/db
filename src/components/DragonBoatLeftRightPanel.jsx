import React, { useMemo } from 'react'
import { computeLeftRightDistribution } from '../lib/dragonboatCog'

// Props: { layout, athletes, lineup }
export default function DragonBoatLeftRightPanel({ layout, athletes, lineup }) {
  const dist = useMemo(() => {
    try {
      return computeLeftRightDistribution(layout, athletes, lineup)
    } catch (e) {
      console.error('Failed to compute left/right distribution', e)
      return null
    }
  }, [layout, athletes, lineup])

  if (!dist) {
    return <p className="text-sm text-gray-500">Insufficient data for balance summary.</p>
  }

  const {
    portWeight,
    starboardWeight,
    centerWeight,
    portRatio,
    starboardRatio,
    statusLabel,
    statusColor
  } = dist

  const total = portWeight + starboardWeight + centerWeight
  const portPct = total > 0 ? (portWeight / total) * 100 : 50
  const starPct = total > 0 ? (starboardWeight / total) * 100 : 50
  const centerPct = total > 0 ? (centerWeight / total) * 100 : 0

  return (
    <div className="space-y-3">
      <div className="flex justify-between text-sm text-gray-700">
        <span>Port: {portWeight.toFixed(1)} kg</span>
        <span>Center: {centerWeight.toFixed(1)} kg</span>
        <span>Starboard: {starboardWeight.toFixed(1)} kg</span>
      </div>
      <div className="text-xs text-gray-500">
        Split: Port {portRatio.toFixed(1)}% / Starboard {starboardRatio.toFixed(1)}%
      </div>
      <div className="flex items-center gap-2 text-sm">
        <span className={`px-2 py-1 rounded ${statusColor?.bg || 'bg-gray-100'} ${statusColor?.text || 'text-gray-700'}`}>
          {statusLabel || 'Balanced'}
        </span>
      </div>
      <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="absolute left-0 top-0 bottom-0 bg-blue-500"
          style={{ width: `${portPct}%` }}
          title={`Port ${portWeight.toFixed(1)} kg`}
        />
        {centerPct > 0 && (
          <div
            className="absolute top-0 bottom-0 bg-gray-400"
            style={{ left: `${portPct}%`, width: `${centerPct}%` }}
            title={`Center ${centerWeight.toFixed(1)} kg`}
          />
        )}
        <div
          className="absolute right-0 top-0 bottom-0 bg-green-500"
          style={{ width: `${starPct}%` }}
          title={`Starboard ${starboardWeight.toFixed(1)} kg`}
        />
      </div>
    </div>
  )
}
