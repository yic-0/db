import React, { useMemo } from "react";
import { computeCenterOfGravity } from "../lib/dragonboatCog";
import Icon from "./Icon";

/**
 * DragonBoatCogPanel - Center of Gravity Visualization
 */
function DragonBoatCogPanel({ layout, athletes, lineup, formatWeight = (kg) => `${kg.toFixed(1)} kg` }) {
  const cog = useMemo(() => {
    try {
      if (!layout || !athletes || !lineup) return null;
      return computeCenterOfGravity(layout, athletes, lineup);
    } catch (err) {
      console.error("COG Calculation Error:", err);
      return null;
    }
  }, [layout, athletes, lineup]);

  if (!cog) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm p-4">
        <p className="text-xs text-slate-400 text-center">Insufficient data for COG</p>
      </div>
    );
  }

  const xValues = layout.seats.map((s) => s.x);
  const xMin = Math.min(...xValues);
  const xMax = Math.max(...xValues);
  const span = xMax - xMin || 1;
  const cgPercent = ((cog.xCg - xMin) / span) * 100;

  const cgDirection =
    cog.xCg > 0 ? "stern-heavy" : cog.xCg < 0 ? "bow-heavy" : "balanced";

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-blue-50/30 opacity-50" />
      
      <div className="relative z-10 space-y-4">
        {/* Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600">
              <Icon name="target" size={18} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Center of Gravity</p>
              <p className="text-xs text-slate-500">Longitudinal Balance</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 font-medium border border-slate-200">
              {formatWeight(cog.totalWeight)} Total
            </span>
            <span className={`px-2.5 py-1 rounded-md font-medium border ${
              cgDirection === "balanced" 
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-amber-50 text-amber-700 border-amber-200"
            }`}>
              {cgDirection === "balanced" ? "Balanced" : cgDirection.replace("-", " ")}
            </span>
          </div>
        </div>

        {/* COG bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] font-medium text-slate-400 uppercase tracking-wider">
            <span>Bow</span>
            <span>Stern</span>
          </div>
          <div className="relative h-3 rounded-full bg-slate-100 border border-slate-200 overflow-hidden shadow-inner">
            {/* Center Line */}
            <div className="absolute inset-y-0 left-1/2 w-0.5 bg-slate-300 -ml-px z-0" />
            
            {/* Balance Gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-blue-500/5" />
            
            {/* Indicator */}
            <div
              className="absolute top-0 bottom-0 w-1.5 bg-primary-600 rounded-full shadow-sm z-10 transition-all duration-500 ease-out"
              style={{ left: `calc(${cgPercent}% - 3px)` }}
            />
          </div>
          <div className="flex justify-center">
             <span className="text-[10px] font-mono text-slate-400">
               offset: {cog.xCg > 0 ? '+' : ''}{cog.xCg.toFixed(2)}
             </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DragonBoatCogPanel;