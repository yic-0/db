import React, { useMemo } from 'react'
import { computeLeftRightDistribution } from '../lib/dragonboatCog'
import Icon from './Icon'

// Props: { layout, athletes, lineup, unitSystem, formatWeight }
export default function DragonBoatLeftRightPanel({ layout, athletes, lineup, unitSystem = 'metric', formatWeight = (kg) => `${kg.toFixed(1)} kg` }) {
  const dist = useMemo(() => {
    try {
      if (!layout || !athletes || !lineup) return null;
      return computeLeftRightDistribution(layout, athletes, lineup)
    } catch (e) {
      console.error('Failed to compute left/right distribution', e)
      return null
    }
  }, [layout, athletes, lineup])

  if (!dist) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm p-4">
        <p className="text-xs text-slate-400 text-center">Insufficient data for Balance</p>
      </div>
    );
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
    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-blue-50/30 opacity-50" />
      
      <div className="relative z-10 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <Icon name="lineups" size={18} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Side Balance</p>
              <p className="text-xs text-slate-500">Port vs Starboard</p>
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide border ${
            statusLabel === 'Balanced' 
              ? 'bg-green-50 text-green-700 border-green-200' 
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}>
            {statusLabel || 'Balanced'}
          </span>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Port</p>
            <p className="text-sm font-bold text-slate-700">{formatWeight(portWeight)}</p>
          </div>
          <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Delta</p>
            <p className={`text-sm font-bold ${delta < 5 ? 'text-green-600' : 'text-amber-600'}`}>
              {formatWeight(delta)}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Starboard</p>
            <p className="text-sm font-bold text-slate-700">{formatWeight(starboardWeight)}</p>
          </div>
        </div>

        {/* Visual Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] font-medium text-slate-400">
            <span>{portRatio.toFixed(1)}%</span>
            <span>{starboardRatio.toFixed(1)}%</span>
          </div>
          
          <div className="relative h-3 rounded-full bg-slate-100 border border-slate-200 overflow-hidden shadow-inner flex">
            {/* Port Bar */}
            <div 
              className="h-full bg-red-500 transition-all duration-500" 
              style={{ width: `${portPct}%` }} 
            />
            {/* Center Bar (Cox/Drum) */}
            {centerPct > 0 && (
              <div 
                className="h-full bg-slate-300 transition-all duration-500" 
                style={{ width: `${centerPct}%` }} 
              />
            )}
            {/* Starboard Bar */}
            <div 
              className="h-full bg-green-500 transition-all duration-500" 
              style={{ width: `${starPct}%` }} 
            />
            
            {/* Center Marker */}
            <div className="absolute inset-y-0 left-1/2 w-0.5 bg-white/50 -ml-px z-10" />
          </div>
        </div>
      </div>
    </div>
  )
}