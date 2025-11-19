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
  const delta = Math.abs(portWeight - starboardWeight)

  return (
    <div className="p-4 rounded-2xl border border-white/70 bg-gradient-to-br from-white via-gray-50 to-primary-50/40 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary-500/10 to-primary-300/30 flex items-center justify-center text-primary-700 font-semibold shadow-inner">
            ⚖️
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.08em] text-gray-500">Weight Distribution</p>
            <p className="text-sm font-semibold text-gray-800">Port vs Starboard Balance</p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColor?.bg || 'bg-gray-100'} ${statusColor?.text || 'text-gray-700'} shadow-sm`}>
          {statusLabel || 'Balanced'}
        </span>
      </div>

      {/* Total Weight & Delta */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-white/80 border border-gray-100 p-2">
          <p className="text-[11px] uppercase tracking-wide text-gray-500">Total Weight</p>
          <p className="text-xl font-bold text-gray-900">{total.toFixed(1)} kg</p>
        </div>
        <div className="rounded-lg bg-white/80 border border-gray-100 p-2">
          <p className="text-[11px] uppercase tracking-wide text-gray-500">Delta (Δ)</p>
          <p className="text-xl font-bold text-gray-900">{delta.toFixed(1)} kg</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
        <div className="rounded-lg bg-white/80 border border-gray-100 p-2">
          <p className="text-[11px] uppercase tracking-wide text-gray-500">Port</p>
          <p className="font-semibold text-gray-900">{portWeight.toFixed(1)} kg</p>
        </div>
        <div className="rounded-lg bg-white/80 border border-gray-100 p-2">
          <p className="text-[11px] uppercase tracking-wide text-gray-500">Center</p>
          <p className="font-semibold text-gray-900">{centerWeight.toFixed(1)} kg</p>
        </div>
        <div className="rounded-lg bg-white/80 border border-gray-100 p-2">
          <p className="text-[11px] uppercase tracking-wide text-gray-500">Starboard</p>
          <p className="font-semibold text-gray-900">{starboardWeight.toFixed(1)} kg</p>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Port {portRatio.toFixed(1)}%</span>
        <span className="text-gray-400">Center {centerPct.toFixed(1)}%</span>
        <span>Starboard {starboardRatio.toFixed(1)}%</span>
      </div>

      <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden border border-white/70">
        <div
          className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-blue-500/90 to-blue-400"
          style={{ width: `${portPct}%` }}
          title={`Port ${portWeight.toFixed(1)} kg`}
        />
        {centerPct > 0 && (
          <div
            className="absolute top-0 bottom-0 bg-gradient-to-r from-gray-300 to-gray-200"
            style={{ left: `${portPct}%`, width: `${centerPct}%` }}
            title={`Center ${centerWeight.toFixed(1)} kg`}
          />
        )}
        <div
          className="absolute right-0 top-0 bottom-0 bg-gradient-to-r from-emerald-400 to-emerald-500"
          style={{ width: `${starPct}%` }}
          title={`Starboard ${starboardWeight.toFixed(1)} kg`}
        />
        <div className="absolute inset-y-0 left-1/2 w-px bg-white/80 mix-blend-overlay" />
      </div>
    </div>
  )
}
