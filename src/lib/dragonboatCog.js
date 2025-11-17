// src/lib/dragonboatCog.js

// layout example shape:
// {
//   id: "standard-10",
//   name: "Standard 10-row boat",
//   seats: [{ id: "row0-port", x: -4.5, side: "port" }, ...]
// }

// athlete example shape:
// { id: "a1", name: "Alice", weightKg: 65 }

// lineup example shape:
// {
//   id: "lineup1",
//   boatLayoutId: "standard-10",
//   name: "Race lineup",
//   assignments: [{ seatId: "row0-port", athleteId: "a1" }, ...]
// }

/**
 * Helper: create a standard layout with N rows and optional drummer/steer.
 */
export function makeStandardDragonBoatLayout(
  numRows,
  rowSpacing = 1,
  includeDrummer = true,
  includeSteer = true
) {
  const seats = [];
  const centerIndex = (numRows - 1) / 2;

  for (let r = 0; r < numRows; r++) {
    const x = (r - centerIndex) * rowSpacing;

    seats.push(
      { id: `row${r}-port`, side: "port", x },
      { id: `row${r}-starboard`, side: "starboard", x }
    );
  }

  const bowX = (0 - centerIndex) * rowSpacing;
  const sternX = ((numRows - 1) - centerIndex) * rowSpacing;

  if (includeDrummer) {
    seats.push({ id: "drummer", side: "center", x: bowX - rowSpacing });
  }
  if (includeSteer) {
    seats.push({ id: "steer", side: "center", x: sternX + rowSpacing });
  }

  return {
    id: `standard-${numRows}`,
    name: `Standard ${numRows}-row boat`,
    seats,
  };
}

/**
 * Compute center of gravity along the boat.
 * Returns { xCg, totalWeight }.
 */
export function computeCenterOfGravity(layout, athletes, lineup) {
  const seatById = new Map(layout.seats.map((s) => [s.id, s]));
  const athleteById = new Map(athletes.map((a) => [a.id, a]));

  let totalWeight = 0;
  let totalMoment = 0;

  for (const assign of lineup.assignments) {
    const seat = seatById.get(assign.seatId);
    const athlete = athleteById.get(assign.athleteId);
    if (!seat || !athlete) continue;

    const w = athlete.weightKg;
    const x = seat.x;

    totalWeight += w;
    totalMoment += w * x;
  }

  if (totalWeight === 0) {
    return { xCg: 0, totalWeight: 0 };
  }

  return {
    xCg: totalMoment / totalWeight,
    totalWeight,
  };
}

/**
 * Compute lineup-specific seat moments for heatmap.
 * Returns an array of { seatId, x, weight, athleteId, moment, momentNormalized }.
 */
export function computeSeatMomentsForLineup(layout, athletes, lineup) {
  const seatById = new Map(layout.seats.map((s) => [s.id, s]));
  const athleteById = new Map(athletes.map((a) => [a.id, a]));

  const raw = [];

  for (const assign of lineup.assignments) {
    const seat = seatById.get(assign.seatId);
    const athlete = athleteById.get(assign.athleteId);
    if (!seat || !athlete) continue;

    const w = athlete.weightKg;
    const x = seat.x;
    const moment = Math.abs(w * x);

    raw.push({
      seatId: seat.id,
      x,
      weight: w,
      athleteId: athlete.id,
      moment,
    });
  }

  const maxMoment =
    raw.length > 0 ? Math.max(...raw.map((r) => r.moment), 1e-6) : 1e-6;

  return raw.map((r) => ({
    ...r,
    momentNormalized: r.moment / maxMoment,
  }));
}

/**
 * Compute port/starboard/center weight distribution.
 */
export function computeLeftRightDistribution(layout, athletes, lineup) {
  const seatById = new Map(layout.seats.map((s) => [s.id, s]));
  const athleteById = new Map(athletes.map((a) => [a.id, a]));

  let portWeight = 0;
  let starboardWeight = 0;
  let centerWeight = 0;

  const normalizeSide = (seat, seatId) => {
    const side = seat?.side?.toLowerCase?.();
    if (side) return side;
    const id = (seatId || '').toLowerCase();
    if (id.includes('port') || id.startsWith('l')) return 'port';
    if (id.includes('starboard') || id.startsWith('r')) return 'starboard';
    return 'center';
  };

  for (const assign of lineup.assignments) {
    const seat = seatById.get(assign.seatId);
    const athlete = athleteById.get(assign.athleteId);
    if (!athlete) continue;

    const side = normalizeSide(seat, assign.seatId);
    const w = athlete.weightKg || 0;
    if (side === 'port' || side === 'left') portWeight += w;
    else if (side === 'starboard' || side === 'right') starboardWeight += w;
    else centerWeight += w;
  }

  const lrTotal = portWeight + starboardWeight;
  const portRatio = lrTotal > 0 ? (portWeight / lrTotal) * 100 : 50;
  const starboardRatio = lrTotal > 0 ? (starboardWeight / lrTotal) * 100 : 50;
  const diff = portRatio - starboardRatio;

  let statusLabel = 'Balanced';
  let statusColor = { bg: 'bg-green-100', text: 'text-green-800' };
  if (diff > 3) {
    statusLabel = 'Port heavy';
    statusColor = { bg: 'bg-blue-100', text: 'text-blue-800' };
  } else if (diff < -3) {
    statusLabel = 'Starboard heavy';
    statusColor = { bg: 'bg-emerald-100', text: 'text-emerald-800' };
  }

  return {
    portWeight,
    starboardWeight,
    centerWeight,
    portRatio,
    starboardRatio,
    statusLabel,
    statusColor,
  };
}
