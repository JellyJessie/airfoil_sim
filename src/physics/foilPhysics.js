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
  if (altitudeFt <= 36152) {
    const temp = 518.6 - 0.00356 * altitudeFt;
    const pressure = 2116 * Math.pow(temp / 518.6, 5.256);
    return pressure / (1716 * temp);
  } else {
    const temp = 389.98;
    const pressure = 473.1 * Math.exp((36152 - altitudeFt) / 20805);
    return pressure / (1716 * temp);
  }
}

export function viscositySlugFtS(altitudeFt) {
  const mu0 = 0.000000362;
  const T = temperatureRankine(altitudeFt);
  return ((mu0 * 717.408) / (T + 198.72)) * Math.pow(T / 518.688, 1.5);
}

export function getDensityFromAltitude(altitude) {
  return densitySlugFt3(altitude);
}
// ------------------------
// Flow Properties
// ------------------------

export function dynamicPressure(velocity, altitudeFt, vconv = 0.6818) {
  const rho = densitySlugFt3(altitudeFt);
  return (0.5 * rho * velocity * velocity) / (vconv * vconv);
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

/*export function dragCoefficient({
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
}*/
export function calculateDragCoefficient({
  camberDeg,
  thicknessPct,
  alphaDeg,
  reynolds,
  cl,
  aspectRatio = 4.0,
  efficiency = 0.85,
}) {
  const camLevels = [0, 5, 10, 15, 20];
  const thkLevels = [5, 10, 15, 20];

  const camLow = camLevels.filter((c) => c <= camberDeg).pop() ?? 0;
  const camHigh = camLevels.find((c) => c >= camberDeg) ?? 20;

  const thkLow = thkLevels.filter((t) => t <= thicknessPct).pop() ?? 5;
  const thkHigh = thkLevels.find((t) => t >= thicknessPct) ?? 20;

  const cdLL = poly(alphaDeg, DRAG_POLYS[thkLow][camLow]);
  const cdLH = poly(alphaDeg, DRAG_POLYS[thkHigh][camLow]);
  const cdHL = poly(alphaDeg, DRAG_POLYS[thkLow][camHigh]);
  const cdHH = poly(alphaDeg, DRAG_POLYS[thkHigh][camHigh]);

  const cdCamLow = lerp(thicknessPct, thkLow, thkHigh, cdLL, cdLH);
  const cdCamHigh = lerp(thicknessPct, thkLow, thkHigh, cdHL, cdHH);

  let cd0 = lerp(camberDeg, camLow, camHigh, cdCamLow, cdCamHigh);

  if (reynolds > 0) {
    cd0 *= Math.pow(50000 / reynolds, 0.11);
  }

  const induced = (cl * cl) / (PI * aspectRatio * efficiency);

  return cd0 + induced;
}
/* ============================
   Polynomial evaluation
============================ */
function poly(alpha, c) {
  return (
    c[0] * alpha ** 6 +
    c[1] * alpha ** 5 +
    c[2] * alpha ** 4 +
    c[3] * alpha ** 3 +
    c[4] * alpha ** 2 +
    c[5] * alpha +
    c[6]
  );
}

/* ============================
   Polynomial database
============================ */
const DRAG_POLYS = {
  5: {
    0: [-9e-7, 0, 0.0007, 0.0008, 0, 0, 0.015],
    5: [4e-8, -7e-7, -1e-5, 0.0009, 0, 0.0033, 0.0301],
    10: [-9e-9, -6e-8, 5e-6, 3e-5, -0.0001, -0.0025, 0.0615],
    15: [8e-10, -5e-8, -1e-6, 3e-5, 0.0008, -0.0027, 0.0612],
    20: [8e-9, 1e-8, -5e-6, 6e-6, 0.001, -0.001, 0.1219],
  },

  10: {
    0: [-1e-8, 6e-8, 6e-6, -2e-5, -0.0002, 0.0017, 0.0196],
    5: [3e-9, 6e-8, -2e-6, -3e-5, 0.0008, 0.0038, 0.0159],
    10: [-5e-9, -3e-8, 2e-6, 1e-5, 0.0004, -3e-5, 0.0624],
    15: [-2e-9, -2e-8, -5e-7, 8e-6, 0.0009, 0.0034, 0.0993],
    20: [2e-9, -3e-8, -2e-6, 2e-5, 0.0009, 0.0023, 0.1581],
  },

  15: {
    0: [-5e-9, 7e-8, 3e-6, -3e-5, -7e-5, 0.0017, 0.0358],
    5: [-4e-9, -8e-9, 2e-6, -9e-7, 0.0002, 0.0031, 0.0351],
    10: [3e-9, 3e-8, -2e-6, -1e-5, 0.0009, 0.004, 0.0543],
    15: [3e-9, 5e-8, -2e-6, -3e-5, 0.0008, 0.0087, 0.1167],
    20: [3e-10, -3e-8, -6e-7, 3e-5, 0.0006, 0.0008, 0.1859],
  },

  20: {
    0: [-3e-9, 2e-8, 2e-6, -8e-6, -4e-5, 0.0003, 0.0416],
    5: [-3e-9, -7e-8, 1e-6, 3e-5, 0.0004, 5e-5, 0.0483],
    10: [1e-8, 4e-8, -6e-6, -2e-5, 0.0014, 0.007, 0.0692],
    15: [3e-9, -9e-8, -3e-6, 4e-5, 0.001, 0.0021, 0.139],
    20: [3e-9, -7e-8, -3e-6, 4e-5, 0.0012, 0.001, 0.1856],
  },
};

/* ============================
   Linear interpolation
============================ */
function lerp(x, x0, x1, y0, y1) {
  return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
}

/* ============================
   Main Physically Faithful Model
============================ */

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
*/

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
export function getycVal(camberPct) {
  return camberPct / 25.0 / 2.0;
}

export function getrVal(thicknessPct, camberPct) {
  const thickness = thicknessPct / 25.0;
  const ycval = getycVal(camberPct);

  return (
    thickness / 4.0 +
    Math.sqrt((thickness * thickness) / 16.0 + ycval * ycval + 1.0)
  );
}

export function getxcVal(thicknessPct, camberPct) {
  const ycval = getycVal(camberPct);
  const rval = getrVal(thicknessPct, camberPct);

  return 1.0 - Math.sqrt(rval * rval - ycval * ycval);
}

export function getBeta(thicknessPct, camberPct) {
  const rval = getrVal(thicknessPct, camberPct);
  const ycval = getycVal(camberPct);
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
// GAMMA (CIRCULATION)
// ============================================================================
export function getGamVal(angleDeg, thicknessPct, camberPct) {
  const beta = getBeta(thicknessPct, camberPct);
  const convdr = getConvdr();
  const rval = getrVal(thicknessPct, camberPct);

  return 2.0 * rval * Math.sin((angleDeg + beta) * convdr);
}

// ============================================================================
// LIFT COEFFICIENT (JOUKOWSKI + STALL + AR CORRECTION)
// ============================================================================
export function calculateLiftCoefficient(
  angleDeg,
  camberPct,
  thicknessPct,
  aspectRatio = 4.0 // FoilSim legacy default if you don’t pass AR
) {
  const convdr = getConvdr();
  const ycval = getycVal(camberPct);
  const rval = getrVal(thicknessPct, camberPct);
  const xcval = getxcVal(thicknessPct, camberPct);
  const beta = getBeta(thicknessPct, camberPct);
  const gamval = getGamVal(angleDeg, thicknessPct, camberPct);

  const leg = xcval - Math.sqrt(rval * rval - ycval * ycval);
  const teg = xcval + Math.sqrt(rval * rval - ycval * ycval);
  const lem = leg + 1.0 / leg;
  const tem = teg + 1.0 / teg;
  const chrd = tem - lem;

  let cl = (gamval * 4.0 * PI) / chrd;

  // Stall model (legacy)
  let stfact = 1.0;
  if (angleDeg > 10.0)
    stfact = 0.5 + 0.1 * angleDeg - 0.005 * angleDeg * angleDeg;
  else if (angleDeg < -10.0)
    stfact = 0.5 - 0.1 * angleDeg - 0.005 * angleDeg * angleDeg;

  cl *= stfact;

  // Aspect ratio correction (legacy form)
  const AR =
    Number.isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : 4.0;
  cl = cl / (1.0 + Math.abs(cl) / (PI * AR));

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

  // Temperature model
  let ts0;
  if (hite <= 36152.0) {
    ts0 = calculateTS0STroposphere(hite);
  } else {
    ts0 = calculateTS0Stratosphere();
  }

  // Viscosity
  const viscos = calculateViscosity(mu0, ts0);

  // Reynolds
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

export function calculateClAlpha({
  camberPct,
  thicknessPct,
  velocity,
  alphaMin = -10,
  alphaMax = 20,
  step = 1,
  getCl, // (alphaDeg, camberPct, thicknessPct) => cl
}) {
  const alphas = [];
  const cls = [];

  const clFn =
    getCl ??
    ((alphaDeg, camberPct) => {
      const deg2rad = Math.PI / 180;
      const alpha = alphaDeg * deg2rad;
      const alpha0 = (-(camberPct || 0) / 20) * deg2rad;
      let cl = 2 * Math.PI * (alpha - alpha0);
      const clMax = 1.8;
      return Math.max(-clMax, Math.min(clMax, cl));
    });

  for (let a = alphaMin; a <= alphaMax; a += step) {
    alphas.push(a);
    cls.push(velocity === 0 ? 0 : clFn(a, camberPct, thicknessPct));
  }

  return { alphas, cls };
}

// --- Build CD–α sweep for Plot Panel (PURE, no computeAero) ---
// getCd signature: (alphaDeg, camberPct, thicknessPct, extra) => cd

const getCl = (alphaDeg, camberPct, thicknessPct) =>
  liftCoefficient(alphaDeg, camberPct, thicknessPct);

const getCd = (
  alphaDeg,
  camberPct,
  thicknessPct,
  { reynolds, aspectRatio, efficiency }
) =>
  calculateDragCoefficient({
    camberDeg: camberPct,
    thicknessPct,
    alphaDeg,
    reynolds,
    cl: getCl(alphaDeg, camberPct, thicknessPct),
    aspectRatio,
    efficiency,
  });

export function calculateCdAlpha({
  camberPct,
  thicknessPct,
  velocity,

  // sweep config
  alphaMin = -10,
  alphaMax = 20,
  step = 1,

  // physics inputs you may want inside getCd
  reynolds,
  aspectRatio,
  efficiency = 0.85,

  // required: your CD model
  getCd,
}) {
  if (typeof getCd !== "function") {
    throw new Error("calculateCdAlpha: getCd must be a function");
  }

  const alphas = [];
  const cds = [];

  for (let a = alphaMin; a <= alphaMax; a += step) {
    alphas.push(a);

    if (!velocity) {
      cds.push(0);
      continue;
    }

    const cd = getCd(a, camberPct, thicknessPct, {
      reynolds,
      aspectRatio,
      efficiency,
    });

    cds.push(Number.isFinite(cd) ? cd : 0);
  }

  return { alphas, cds };
}

// --- Build L/D–α sweep for Plot Panel (PURE, no computeAero) ---
// getCl signature: (alphaDeg, camberPct, thicknessPct, extra) => cl
// getCd signature: (alphaDeg, camberPct, thicknessPct, extra) => cd
export function calculateLdAlpha({
  camberPct,
  thicknessPct,
  velocity,

  // sweep config
  alphaMin = -10,
  alphaMax = 20,
  step = 1,

  // physics inputs you may want inside models
  reynolds,
  aspectRatio,
  efficiency = 0.85,

  // required
  getCl,
  getCd,
}) {
  if (typeof getCl !== "function") {
    throw new Error("calculateLdAlphaSweep: getCl must be a function");
  }
  if (typeof getCd !== "function") {
    throw new Error("calculateLdAlphaSweep: getCd must be a function");
  }

  const alphas = [];
  const lds = [];

  for (let a = alphaMin; a <= alphaMax; a += step) {
    alphas.push(a);

    if (!velocity) {
      lds.push(0);
      continue;
    }

    const cl = getCl(a, camberPct, thicknessPct, {
      reynolds,
      aspectRatio,
      efficiency,
    });

    const cd = getCd(a, camberPct, thicknessPct, {
      reynolds,
      aspectRatio,
      efficiency,
    });

    const ld =
      Number.isFinite(cl) && Number.isFinite(cd) && cd !== 0 ? cl / cd : 0;

    lds.push(ld);
  }

  return { alphas, lds };
}
