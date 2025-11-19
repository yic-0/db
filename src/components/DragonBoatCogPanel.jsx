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

  const rows = useMemo(() => {
    const byX = new Map();
    for (const seat of layout.seats) {
      const list = byX.get(seat.x) || [];
      list.push(seat);
      byX.set(seat.x, list);
    }
    const sortedX = Array.from(byX.keys()).sort((a, b) => a - b); // bow to stern

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
    <div className="relative overflow-hidden rounded-3xl border border-white/70 bg-gradient-to-br from-white via-gray-50 to-primary-50/35 shadow-soft p-5 text-sm">
      <div className="absolute right-[-80px] top-[-120px] w-[280px] h-[280px] bg-primary-200/30 blur-3xl rounded-full" />
      <div className="absolute left-[-120px] bottom-[-140px] w-[320px] h-[320px] bg-accent-200/30 blur-3xl rounded-full" />

      <div className="relative z-10 space-y-6">
        {/* Summary */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className="tagline text-primary-700">COG + Load</p>
            <h3 className="text-lg font-semibold text-gray-900">Center of gravity</h3>
            <p className="text-xs text-gray-500">Live from the current lineup.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="chip bg-primary-50 text-primary-700 border-primary-100">
              Total weight {cog.totalWeight.toFixed(1)} kg
            </span>
            <span className="chip bg-white text-gray-700 border-gray-200">
              {cgDirection === "balanced" ? "Balanced fore/aft" : cgDirection.replace("-", " ")}
            </span>
            <span className="chip bg-accent-50 text-accent-700 border-accent-100">
              x = {cog.xCg.toFixed(2)}
            </span>
          </div>
        </div>

        {/* COG bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-[11px] text-gray-500">
            <span>Bow (x = {xMin.toFixed(1)})</span>
            <span>Stern (x = {xMax.toFixed(1)})</span>
          </div>
          <div className="relative h-3 rounded-full border border-white/70 overflow-hidden shadow-inner bg-gradient-to-r from-sky-50 via-white to-rose-50">
            <div className="absolute inset-y-0 left-1/2 w-px bg-white/80 mix-blend-overlay" />
            <div
              className="absolute inset-y-[-6px] w-[3px] bg-gradient-to-b from-gray-900 via-gray-700 to-gray-900 rounded-full shadow-sm"
              style={{ left: `${cgPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-600">
            <span>{cgDirection === "balanced" ? "Centered" : cgDirection}</span>
            <span>Span: {(xMax - xMin).toFixed(1)} units</span>
          </div>
        </div>

        {/* Heatmap */}
        <div className="space-y-3">
          <div className="flex items-end justify-between">
            <h4 className="text-sm font-medium text-gray-900">Seat leverage heatmap</h4>
            <span className="text-[11px] text-gray-500">
              Color intensity = |weight x distance from center|
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {rows.map((row) => (
              <div
                key={row.x}
                className="flex items-center justify-center gap-3"
              >
                {/* x label */}
                <div className="w-16 text-right text-[11px] text-gray-500">
                  x={row.x.toFixed(2)}
                </div>

                {/* seats */}
                <div className="flex flex-row gap-2 flex-wrap">
                  {row.seats.map((seat) => {
                    const mNorm = momentBySeat.get(seat.id) ?? 0;
                    const intensity = mNorm;
                    const label = seat.id.replace("row", "R");
                    const bg = intensity
                      ? `linear-gradient(135deg, rgba(99,102,241,0.08), rgba(239,68,68,${0.2 + 0.45 * intensity}))`
                      : "linear-gradient(135deg, rgba(241,245,249,0.9), rgba(255,255,255,0.95))";
                    const ring =
                      intensity > 0.6 ? "ring-2 ring-red-200/80" : "ring-1 ring-gray-100";

                    return (
                      <div
                        key={seat.id}
                        className={`min-w-[80px] px-2.5 py-2 rounded-xl border border-gray-200 text-center text-[11px] leading-tight shadow-sm bg-white/80 backdrop-blur-sm ${ring}`}
                        style={{ backgroundImage: bg }}
                        title={`${seat.id}\nImpact: ${(mNorm * 100).toFixed(
                          0
                        )}% of max in this lineup`}
                      >
                        <div className="font-semibold truncate text-gray-900">{label}</div>
                        <div className="text-[10px] text-gray-700">
                          {(mNorm * 100).toFixed(0)}%
                        </div>
                        <div className="mt-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary-500 to-rose-500"
                            style={{ width: `${Math.min(100, Math.max(0, intensity * 100))}%` }}
                          />
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
    </div>
  );
}

export default DragonBoatCogPanel;
