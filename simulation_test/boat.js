// src/physics/boat.js

import { DEFAULT_PADDLE_PARAMS, strokeSampleAtPhase } from "./paddle";

export const DEFAULT_BOAT_PARAMS = {
  mass: 350,           // kg (boat + crew; tweak as desired)
  dragCoeff: 30,       // N / (m/s)^2 (tunable "hull drag" factor)
  initialSpeed: 0,     // m/s
  simDuration: 20,     // seconds
  timeStep: 0.02       // seconds
};

/**
 * paddlers: array of
 * {
 *   id,
 *   label,
 *   phaseOffset: number (0–1; fraction of stroke),
 *   strengthFactor: number (0.5–1.5 etc.)
 * }
 *
 * boatParams: overrides for DEFAULT_BOAT_PARAMS
 * paddleParams: overrides for DEFAULT_PADDLE_PARAMS (shared stroke shape)
 */
export function simulateBoat({
  paddlers,
  boatParams = {},
  paddleParams = {}
}) {
  const boat = { ...DEFAULT_BOAT_PARAMS, ...boatParams };
  const paddleBase = { ...DEFAULT_PADDLE_PARAMS, ...paddleParams };

  const { simDuration, timeStep, mass, dragCoeff, initialSpeed } = boat;
  const { strokeRate } = paddleBase;

  const strokeDuration = 60 / strokeRate;
  const steps = Math.max(1, Math.floor(simDuration / timeStep));

  let t = 0;
  let v = initialSpeed;
  let x = 0;

  const samples = [];

  // Precompute phase offsets in seconds for each paddler
  const paddlersWithOffsets = paddlers.map((p) => ({
    ...p,
    phaseOffsetSec: (p.phaseOffset || 0) * strokeDuration,
    strengthFactor: p.strengthFactor != null ? p.strengthFactor : 1
  }));

  for (let i = 0; i <= steps; i++) {
    const tCurrent = i * timeStep;

    // Sum forces from all paddles
    let F_paddles = 0;

    paddlersWithOffsets.forEach((p) => {
      const phaseTime = (tCurrent + p.phaseOffsetSec) % strokeDuration;
      const phase = phaseTime / strokeDuration;

      const { F_forward } = strokeSampleAtPhase(paddleBase, phase);

      F_paddles += F_forward * p.strengthFactor;
    });

    // Simple quadratic drag opposing forward motion
    const speed = Math.max(v, 0);
    const F_drag = dragCoeff * speed * speed;

    const F_net = F_paddles - F_drag;
    const a = F_net / mass;

    // Integrate motion (Euler)
    v = v + a * timeStep;
    if (v < 0) v = 0; // don't go backwards in this simple model
    x = x + v * timeStep;

    samples.push({
      t: tCurrent,
      F_paddles,
      F_drag,
      F_net,
      speed: v,
      distance: x
    });
  }

  // Summary stats
  const totalTime = simDuration;
  const finalSample = samples[samples.length - 1];
  const avgSpeed =
    samples.reduce((acc, s) => acc + s.speed, 0) / samples.length;

  const avgNetForce =
    samples.reduce((acc, s) => acc + s.F_net, 0) / samples.length;

  return {
    samples,
    summary: {
      totalTime,
      finalSpeed: finalSample.speed,
      distance: finalSample.distance,
      avgSpeed,
      avgNetForce
    },
    boat: boat,
    paddleParams: paddleBase,
    paddlers: paddlersWithOffsets
  };
}
