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

  // group seats into rows by x
  const rows = useMemo(() => {
    const byX = new Map();
    for (const seat of layout.seats) {
      const list = byX.get(seat.x) || [];
      list.push(seat);
      byX.set(seat.x, list);
    }
    const sortedX = Array.from(byX.keys()).sort((a, b) => a - b); // bow → stern

    return sortedX.map((x) => ({
      x,
      seats: byX
        .get(x)
        .slice()
        .sort((a, b) => {
          const order = (side) =>
            side === "port" ? 0 : side === "center" ? 1 : 2;
          return order(a.side) - order(b.side);
        }),
    }));
  }, [layout.seats]);

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

      {/* COG bar */}
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

      {/* Heatmap */}
      <div>
        <div className="flex items-end justify-between mb-1">
          <h4 className="text-sm font-medium">Seat leverage heatmap</h4>
          <span className="text-[11px] text-gray-500">
            Color intensity = |weight × distance from center|
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          {rows.map((row) => (
            <div
              key={row.x}
              className="flex items-center justify-center gap-2"
            >
              {/* x label */}
              <div className="w-16 text-right text-[11px] text-gray-500">
                x={row.x.toFixed(2)}
              </div>

              {/* seats */}
              <div className="flex flex-row gap-1.5">
                {row.seats.map((seat) => {
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
                      )}% of max in this lineup`}
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
          ))}
        </div>
      </div>
    </div>
  );
}

export default DragonBoatCogPanel;
