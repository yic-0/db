import React, { useMemo } from "react";
import {
  computeCenterOfGravity,
  computeSeatMomentsForLineup,
} from "../lib/dragonboatCog";

function DragonBoatCogPanel({ layout, athletes, lineup }) {
  const cog = useMemo(
    () => computeCenterOfGravity(layout, athletes, lineup),
    [layout, athletes, lineup]
  );

  const seatMoments = useMemo(
    () => computeSeatMomentsForLineup(layout, athletes, lineup),
    [layout, athletes, lineup]
  );

  const momentBySeat = useMemo(() => {
    const map = new Map();
    for (const sm of seatMoments) {
      map.set(sm.seatId, sm.momentNormalized);
    }
    return map;
  }, [seatMoments]);

  const xValues = layout.seats.map((s) => s.x);
  const xMin = Math.min(...xValues);
  const xMax = Math.max(...xValues);
  const span = xMax - xMin || 1;
  const cgPercent = ((cog.xCg - xMin) / span) * 100;

  const cgDirection =
    cog.xCg > 0 ? "stern-heavy" : cog.xCg < 0 ? "bow-heavy" : "balanced";

  // Group seats by side (port / center / starboard), then sort by x (bow→stern)
  const sideGroups = useMemo(() => {
    const groups = {
      port: [],
      center: [],
      starboard: [],
    };

    for (const seat of layout.seats) {
      const side = seat.side || "center";
      if (!groups[side]) groups[side] = [];
      groups[side].push(seat);
    }

    Object.keys(groups).forEach((side) => {
      groups[side] = groups[side].slice().sort((a, b) => a.x - b.x); // bow→stern
    });

    return groups;
  }, [layout.seats]);

  const sideOrder = ["port", "center", "starboard"];
  const sideLabel = {
    port: "Port",
    center: "Center",
    starboard: "Starboard",
  };

  return (
    <div className="flex flex-col gap-4 max-w-3xl text-sm">
      {/* Summary */}
      <div>
        <h3 className="text-base font-semibold">Center of gravity</h3>
        <div className="mt-1 text-xs text-gray-600 space-y-0.5">
          <div>Total weight: {cog.totalWeight.toFixed(1)} kg</div>
          <div>
            COG position: {cog.xCg.toFixed(2)} units (
            {cgDirection === "balanced" ? "balanced" : cgDirection})
          </div>
        </div>
      </div>

      {/* COG bar (bow→stern) */}
      <div>
        <div className="flex justify-between text-[11px] text-gray-500 mb-1">
          <span>Bow (x = {xMin.toFixed(1)})</span>
          <span>Stern (x = {xMax.toFixed(1)})</span>
        </div>
        <div className="relative h-4 rounded-full border border-gray-300 overflow-hidden bg-gradient-to-r from-sky-100 via-gray-50 to-rose-100">
          <div
            className="absolute inset-y-[-4px] w-[2px] bg-gray-800"
            style={{ left: `${cgPercent}%` }}
          />
        </div>
      </div>

      {/* Horizontal boat heatmap (bow→stern left to right) */}
      <div>
        <div className="flex items-end justify-between mb-1">
          <h4 className="text-sm font-medium">Seat leverage heatmap</h4>
          <span className="text-[11px] text-gray-500">
            Color intensity = |weight × distance from center|
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          {sideOrder.map((sideKey) => {
            const seats = sideGroups[sideKey] || [];
            if (!seats.length) return null;

            return (
              <div
                key={sideKey}
                className="flex items-center gap-2"
              >
                {/* side label */}
                <div className="w-16 text-right text-[11px] text-gray-500">
                  {sideLabel[sideKey]}
                </div>

                {/* seats laid out from bow (left) to stern (right) */}
                <div className="flex flex-row gap-1.5">
                  {seats.map((seat) => {
                    const mNorm = momentBySeat.get(seat.id) ?? 0;
                    const intensity = mNorm;
                    const bg = intensity
                      ? `rgba(239, 68, 68, ${0.15 + 0.65 * intensity})`
                      : "rgb(249,250,251)";

                    const label = seat.id.replace("row", "R");

                    return (
                      <div
                        key={seat.id}
                        className="min-w-[68px] px-1.5 py-1 rounded border border-gray-300 text-center text-[11px] leading-tight"
                        style={{ backgroundColor: bg }}
                        title={`${seat.id}\nImpact: ${(mNorm * 100).toFixed(
                          0
                        )}% of max in this lineup\nx=${seat.x.toFixed(2)}`}
                      >
                        <div className="font-semibold truncate">{label}</div>
                        <div className="text-[10px] text-gray-700">
                          {(mNorm * 100).toFixed(0)}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default DragonBoatCogPanel;
