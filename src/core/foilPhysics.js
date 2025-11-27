// src/core/foilPhysics.js

// — Units helpers —
// expand/adjust the constants to match the original NASA code.

export function toSIFromImperial({ V, chord, rho, mu, area }) {
  // mph -> m/s, ft -> m, slug/ft^3 -> kg/m^3, slug/(ft·s) -> Pa·s, ft^2 -> m^2
  const V_si = V * 0.44704;
  const chord_si = chord * 0.3048;
  const rho_si = rho * 515.378818; // slug/ft^3 → kg/m^3
  const mu_si = mu * 47.88025898; // slug/(ft·s) → Pa·s
  const area_si = area * 0.09290304; // ft^2 → m^2

  return { V: V_si, chord: chord_si, rho: rho_si, mu: mu_si, area: area_si };
}

export function normalizeInputs(state) {
  const { units, V, chord, rho, mu, area } = state;

  if (units === "metric") {
    // already SI
    return { V, chord, rho, mu, area };
  }

  return toSIFromImperial({ V, chord, rho, mu, area });
}

// — Core formulas —

// Reynolds number
export function computeReynoldsNumber({ rho, V, chord, mu }) {
  return (rho * V * chord) / mu;
}

// Placeholder for lift curve slope / CL calculation.
// Here you’ll bring in the real FoilSim math from FoilSimStudent_Calc.js / shapeCore.js.
export function computeLiftCoefficient(state) {
  const { angleDeg, camberPercent, thicknessPercent, shape } = state;
  const alphaRad = (angleDeg * Math.PI) / 180;

  // NOTE: Replace the below with the real FoilSim implementation.
  // This is just a simple linear CL-alpha with some tweaks.
  let a0 = 2 * Math.PI; // per radian
  if (shape === "plate") a0 *= 0.9;
  if (shape === "cylinder" || shape === "ball") a0 *= 0.7;

  const camberEffect = 1 + camberPercent / 100;
  const thicknessEffect = 1 - Math.max(0, (thicknessPercent - 12) / 100);

  const cL = a0 * alphaRad * camberEffect * thicknessEffect;
  return cL;
}

// Very simplified drag model to be replaced by the NASA drag curve logic.
export function computeDragCoefficient(state, cL) {
  const baseCd0 = 0.02;
  const k = 0.04; // induced drag factor placeholder
  return baseCd0 + k * cL * cL;
}

// Full solver: takes a FoilState-like object and returns a new object
// with outputs filled in.
export function solveFoil(state) {
  const { V, chord, rho, mu, area } = normalizeInputs(state);

  const reynolds = computeReynoldsNumber({ rho, V, chord, mu });
  const cL = computeLiftCoefficient(state);
  const cD = computeDragCoefficient(state, cL);

  const q = 0.5 * rho * V * V; // dynamic pressure
  const lift = q * area * cL;
  const drag = q * area * cD;
  const ldRatio = cD === 0 ? 0 : cL / cD;

  return {
    ...state,
    reynolds,
    cL,
    cD,
    lift,
    drag,
    ldRatio,
  };
}
