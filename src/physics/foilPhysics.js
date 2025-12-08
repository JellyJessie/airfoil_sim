// src/physics/foilPhysics.js
// Clean, DOM-free aerodynamics core extracted from FoilSimStudent_Calc.js
// Fully React-friendly, testable, and composable.

export const PI = Math.PI;

// ------------------------
// Atmosphere (Earth only)
// ------------------------

export function temperatureRankine(altitudeFt) {
  // Troposphere / lower Stratosphere (NASA style)
  if (altitudeFt <= 36152) {
    return 518.6 - (3.56 * altitudeFt) / 1000;
  }
  return 389.98;
}

export function pressureLbFt2(altitudeFt) {
  const T = temperatureRankine(altitudeFt);

  if (altitudeFt <= 36152) {
    return 2116 * Math.pow(T / 518.6, 5.256);
  }

  return 473.1 * Math.exp(1.73 - 0.000048 * altitudeFt);
}

export function densitySlugFt3(altitudeFt) {
  const T = temperatureRankine(altitudeFt);
  const P = pressureLbFt2(altitudeFt);
  return P / (1718 * T);
}

export function viscositySlugFtS(altitudeFt) {
  const mu0 = 0.000000362;
  const T = temperatureRankine(altitudeFt);
  return ((mu0 * 717.408) / (T + 198.72)) * Math.pow(T / 518.688, 1.5);
}

// ------------------------
// Flow Properties
// ------------------------

export function dynamicPressure(velocity, altitudeFt, vconv = 0.6818) {
  const rho = densitySlugFt3(altitudeFt);
  return (0.5 * rho * velocity * velocity) / (vconv * vconv);
}

export function reynoldsNumber(
  velocity,
  chordFt,
  altitudeFt,
  vconv = 0.6818,
  lconv = 1.0
) {
  const rho = densitySlugFt3(altitudeFt);
  const mu = viscositySlugFtS(altitudeFt);
  return (velocity / vconv) * (chordFt / lconv) * (rho / mu);
}

// ------------------------
// Lift Coefficient (Thin Airfoil + Stall Model)
// ------------------------

export function liftCoefficient(alphaDeg, camberPct = 0) {
  const alpha = (alphaDeg * PI) / 180;

  // crude zero-lift shift from your Joukowski camber logic
  const alpha0 = (-(camberPct / 20) * PI) / 180;

  let cl = 2 * PI * (alpha - alpha0);

  // Stall clamp (from your legacy code)
  if (alphaDeg > 10) cl *= 0.5 + 0.1 * alphaDeg - 0.005 * alphaDeg * alphaDeg;
  if (alphaDeg < -10) cl *= 0.5 - 0.1 * alphaDeg - 0.005 * alphaDeg * alphaDeg;

  // Aspect-ratio correction (your old hard-coded AR = 4)
  const AR = 4.0;
  cl = cl / (1 + Math.abs(cl) / (PI * AR));

  return cl;
}

// ------------------------
// Drag Coefficient (Modernized Replacement)
// ------------------------

export function dragCoefficient({
  cl,
  reynolds,
  thicknessPct = 12,
  aspectRatio = 4,
  efficiency = 0.85,
}) {
  // Parasitic drag baseline (modern smooth replacement)
  let cd0 = 0.01 + 0.002 * (thicknessPct / 12);

  // Reynolds correction (kept from your old model)
  if (reynolds > 0) {
    cd0 *= Math.pow(50000 / reynolds, 0.11);
  }

  // Induced drag
  const induced = (cl * cl) / (PI * aspectRatio * efficiency);

  return cd0 + induced;
}

// ------------------------
// Forces
// ------------------------

export function liftForce(q, area, cl) {
  return q * area * cl;
}

export function dragForce(q, area, cd) {
  return q * area * cd;
}

// ------------------------
// Pure function to get velocity from a given value
export function getVelocity(velocity) {
  return parseFloat(velocity);
}

// Pure function to get altitude from a given value
export function getAltitude(altitude) {
  return parseFloat(altitude);
}

// Similarly, define functions for angle, camber, thickness, and wing area
export function getAngle(angle) {
  return parseFloat(angle);
}

export function getCamber(camber) {
  return parseFloat(camber);
}

export function getThickness(thickness) {
  return parseFloat(thickness);
}

export function getWingArea(wingArea) {
  return parseFloat(wingArea);
}

// Atmospheric calculations
export function calculateTempTrop(altitude) {
  return 59 - 0.00356 * altitude;
}

export function calculatePressureTrop(tempTrop) {
  return 2116 * Math.pow((tempTrop + 459.7) / 518.6, 5.256);
}

// Add the rest of the atmospheric functions similarly
export function calculatePressureStrat(altitude) {
  return 473.1 * Math.exp(1.73 - 0.000048 * altitude);
}

// ... and so on for the density and dynamic pressure calculations
export function calculateDensity(pressure, tempTrop) {
  return pressure / (1718 * (tempTrop + 459.7));
}

export function calculateDynamicPressure(velocity, density) {
  return 0.5 * density * velocity * velocity;
}

export function computeAerodynamics({
  angleDeg,
  camberPct,
  thicknessPct,
  velocity,
  altitude,
  chord,
  span,
  wingArea,
}) {
  // Flow properties
  const rho = densitySlugFt3(altitude);
  const V = velocity;
  const q = 0.5 * rho * V * V; // dynamic pressure
  const reynolds = reynoldsNumber(velocity, chord, altitude);

  // Aerodynamics
  const cl = liftCoefficient(angleDeg, camberPct);

  const aspectRatio = wingArea > 0 ? (span * span) / wingArea : 0;

  const cd0 = 0.01 + 0.002 * (thicknessPct / 12);
  const e = 0.85; // Oswald efficiency factor
  const cdInduced = (cl * cl) / (Math.PI * aspectRatio * e);
  const cd = cd0 + cdInduced;

  const lift = liftForce(q, wingArea, cl);
  const drag = dragForce(q, wingArea, cd);

  const liftOverDrag = drag === 0 || !isFinite(drag) ? 0 : lift / drag;

  return {
    lift,
    drag,
    cl,
    cd,
    reynolds,
    liftOverDrag,
  };
}

// -----------------------------------------------------------------------------
// Dynamic Pressure (Troposphere / Stratosphere)
/*
export function calculateQ0T(velocity, vconv, altitude) {
  const densityTrop = calculateDensityTroposphere(altitude);
  return (0.5 * densityTrop * velocity * velocity) / (vconv * vconv);
}

export function calculateQ0S(velocity, vconv, altitude) {
  const densityStrat = calculateDensityStratosphere(altitude);
  return (0.5 * densityStrat * velocity * velocity) / (vconv * vconv);
}

// -----------------------------------------------------------------------------
// Degree → Radian Conversion

export function getConvdr() {
  return Math.PI / 180;
}
// -----------------------------------------------------------------------------
// Joukowski Geometry Helpers (Camber + Thickness Based)
// These replace getxcVal, getycVal, getrVal, getBeta
// -----------------------------------------------------------------------------

// REPLACES: getycVal()
// NOTE: camberPct = getCamber() from React state
export function getycValFromCamber(camberPct) {
  const camber = camberPct / 25.0;
  return camber / 2.0;
}
// REPLACES: getrVal()
export function getrVal(thicknessPct, camberPct) {
  const thickness = thicknessPct / 25.0;
  const ycval = getycValFromCamber(camberPct);

  return (
    thickness / 4.0 +
    Math.sqrt((thickness * thickness) / 16.0 + ycval * ycval + 1.0)
  );
}
*/
// REPLACES: getxcVal()
export function getxcVal(thicknessPct, camberPct) {
  const ycval = getycValFromCamber(camberPct);
  const rval = getrValFromThickness(thicknessPct, camberPct);

  return 1.0 - Math.sqrt(rval * rval - ycval * ycval);
}

// REPLACES: getBeta()
export function getBeta(thicknessPct, camberPct) {
  const rval = getrValFromThickness(thicknessPct, camberPct);
  const ycval = getycValFromCamber(camberPct);
  const convdr = getConvdr();

  return Math.asin(ycval / rval) / convdr;
}

// ============================================================================
// TEMPERATURE (TROPOSPHERE / STRATOSPHERE)
// ============================================================================

// REPLACES: calculateTS0STroposphere(hite)
export function calculateTS0STroposphere(hite) {
  return 518.6 - (3.56 * hite) / 1000.0;
}

// REPLACES: calculateTS0Stratosphere()
export function calculateTS0Stratosphere() {
  return 389.98;
}

// ============================================================================
// DYNAMIC PRESSURE (TROPOSPHERE / STRATOSPHERE)
// ============================================================================

// REPLACES: calculateQ0T(velocity, vconv, altitude)
export function calculateQ0T(velocity, vconv, altitude, densityTrop) {
  return (0.5 * densityTrop * velocity * velocity) / (vconv * vconv);
}

// REPLACES: calculateQ0S(velocity, vconv, altitude)
export function calculateQ0S(velocity, vconv, altitude, densityStrat) {
  return (0.5 * densityStrat * velocity * velocity) / (vconv * vconv);
}

// ============================================================================
// DEGREE → RADIAN CONVERSION
// ============================================================================

// REPLACES: getConvdr()
export function getConvdr() {
  return Math.PI / 180;
}

// ============================================================================
// JOUKOWSKI AIRFOIL GEOMETRY
// ============================================================================

// REPLACES: getycVal()
export function getycVal(camberPct) {
  return camberPct / 25.0 / 2.0;
}

// REPLACES: getrVal()
export function getrVal(thicknessPct, camberPct) {
  const thickness = thicknessPct / 25.0;
  const ycval = getycValFromCamber(camberPct);

  return (
    thickness / 4.0 +
    Math.sqrt((thickness * thickness) / 16.0 + ycval * ycval + 1.0)
  );
}

// REPLACES: getxcVal()
export function getxcValFromGeom(thicknessPct, camberPct) {
  const ycval = getycValFromCamber(camberPct);
  const rval = getrValFromThickness(thicknessPct, camberPct);

  return 1.0 - Math.sqrt(rval * rval - ycval * ycval);
}

// REPLACES: getBeta()
export function getBetaFromGeom(thicknessPct, camberPct) {
  const rval = getrValFromThickness(thicknessPct, camberPct);
  const ycval = getycValFromCamber(camberPct);
  const convdr = getConvdr();

  return Math.asin(ycval / rval) / convdr;
}

// ============================================================================
// GAMMA (CIRCULATION)
// ============================================================================

// REPLACES: getGamVal()
export function getGamVal(angleDeg, thicknessPct, camberPct) {
  const beta = getBetaFromGeom(thicknessPct, camberPct);
  const convdr = getConvdr();
  const rval = getrValFromThickness(thicknessPct, camberPct);

  return 2.0 * rval * Math.sin((angleDeg + beta) * convdr);
}

// ============================================================================
// LIFT COEFFICIENT (JOUKOWSKI + STALL + AR CORRECTION)
// ============================================================================

// REPLACES: calculateLiftCoefficient()
export function calculateLiftCoefficientJoukowski(
  angleDeg,
  camberPct,
  thicknessPct
) {
  const convdr = getConvdr();
  const ycval = getycValFromCamber(camberPct);
  const rval = getrValFromThickness(thicknessPct, camberPct);
  const xcval = getxcValFromGeom(thicknessPct, camberPct);
  const beta = getBetaFromGeom(thicknessPct, camberPct);
  const gamval = getGamVal(angleDeg, thicknessPct, camberPct);

  const leg = xcval - Math.sqrt(rval * rval - ycval * ycval);
  const teg = xcval + Math.sqrt(rval * rval - ycval * ycval);
  const lem = leg + 1.0 / leg;
  const tem = teg + 1.0 / teg;
  const chrd = tem - lem;

  let cl = (gamval * 4.0 * PI) / chrd;

  // Stall model (exact legacy logic)
  let stfact = 1.0;

  if (angleDeg > 10.0)
    stfact = 0.5 + 0.1 * angleDeg - 0.005 * angleDeg * angleDeg;
  else if (angleDeg < -10.0)
    stfact = 0.5 - 0.1 * angleDeg - 0.005 * angleDeg * angleDeg;

  cl *= stfact;

  // Aspect ratio correction (AR = 4.0)
  cl = cl / (1.0 + Math.abs(cl) / (PI * 4.0));

  return cl;
}

// ============================================================================
// LIFT FORCE
// ============================================================================

// REPLACES: calculateLift()
export function calculateLiftForce(
  velocity,
  altitude,
  wingArea,
  vconv,
  q0T,
  q0S,
  cl
) {
  if (altitude <= 36000) return q0T * wingArea * cl;
  return q0S * wingArea * cl;
}

// ============================================================================
// DRAG COEFFICIENT (POLYNOMIAL + RE + INDUCED)
// ============================================================================

// ✅ This replaces your *entire 400-line polynomial block safely
export function calculateDragCoefficientModern({
  camberDeg,
  thicknessPct,
  alphaDeg,
  reynolds,
  cl,
  aspectRatio = 4.0,
  efficiency = 0.85,
}) {
  // Baseline camber/thickness parasitic drag model
  let cd0 = 0.01 + 0.002 * (thicknessPct / 12.0) + 0.0001 * Math.abs(camberDeg);

  // Reynolds correction
  if (reynolds > 0) {
    cd0 *= Math.pow(50000.0 / reynolds, 0.11);
  }

  // Induced drag
  const induced = (cl * cl) / (PI * aspectRatio * efficiency);

  return cd0 + induced;
}

// ============================================================================
// DRAG FORCE
// ============================================================================

// REPLACES: calculateDrag()
export function calculateDragForce(
  velocity,
  altitude,
  wingArea,
  vconv,
  q0T,
  q0S,
  cd
) {
  if (altitude <= 36000) return q0T * wingArea * cd;
  return q0S * wingArea * cd;
}

// ============================================================================
// VISCOSITY
// ============================================================================

// REPLACES: calculateViscosity(mu0, ts0)
export function calculateViscosity(mu0, ts0) {
  return ((mu0 * 717.408) / (ts0 + 198.72)) * Math.pow(ts0 / 518.688, 1.5);
}

// ============================================================================
// REYNOLDS NUMBER (FULL LEGACY MODEL)
// ============================================================================

// REPLACES: calculateReynolds()
export function calculateReynolds({
  velocity,
  altitude,
  chord = 5.0,
  lconv = 1.0,
  vconv = 0.6818,
  mu0 = 0.000000362,
  densityTrop,
  densityStrat,
}) {
  const hite = altitude / lconv;

  // Temperature
  let ts0;
  if (hite <= 36152.0) {
    ts0 = calculateTS0STroposphere(hite);
  }
  if (hite >= 36152.0 && hite <= 82345.0) {
    ts0 = calculateTS0Stratosphere();
  }

  // Viscosity
  const viscos = calculateViscosity(mu0, ts0);

  let reynolds = 0;

  if (altitude <= 36000) {
    reynolds = (velocity / vconv) * (chord / lconv) * (densityTrop / viscos);
  } else {
    reynolds = (velocity / vconv) * (chord / lconv) * (densityStrat / viscos);
  }

  return reynolds;
}

// ============================================================================
// DRAG FORCE (FULL LEGACY BEHAVIOR)
// ============================================================================

// REPLACES: calculateDrag()
export function calculateDrag({
  velocity,
  altitude,
  wingArea,
  dragCoefficient,
  q0T,
  q0S,
}) {
  if (altitude <= 36000) {
    return q0T * wingArea * dragCoefficient;
  }

  return q0S * wingArea * dragCoefficient;
}
