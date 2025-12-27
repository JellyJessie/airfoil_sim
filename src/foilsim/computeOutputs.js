// src/foilsim/computeOutputs.js
// Authoritative FoilSim computeOutputs(): forces + plots + full airfoil geometry + flow field.
// - No DOM access
// - Produces xm/ym as a packed closed loop (37 points by default, FoilSim-style indexing)

import {
  dynamicPressure,
  liftCoefficient,
  calculateLiftForce,
  calculateDragForce,
  calculateDragCoefficient,
  calculateReynolds,
  calculateClAlpha,
  calculateCdAlpha,
  calculateLdAlpha,
  densitySlugFt3,
  calculateQ0T,
  calculateQ0S,
} from "../physics/foilPhysics";

import {
  generateFlowField,
  generateJoukowskiAirfoilLoop,
  safeNum,
} from "../physics/flowField";

import {
  buildLiftDragBarData,
  calculateLiftToDrag,
} from "../physics/plotHelpers";

// Pack xm/ym from the loop IN LOOP ORDER (prevents the “straight line” artifact)
function packXmYmFromLoopOrder(loop, nptc = 37) {
  const xm = Array.from({ length: 1 }, () => Array(nptc + 1).fill(undefined));
  const ym = Array.from({ length: 1 }, () => Array(nptc + 1).fill(undefined));

  // legacy-style 1..nptc
  for (let i = 1; i <= nptc; i++) {
    const p = loop[i - 1];
    xm[0][i] = p?.x;
    ym[0][i] = p?.y;
  }
  return { xm, ym };
}

export function computeOutputs(state) {
  const angleDeg = safeNum(state.angleDeg, 0);
  const camberPct = safeNum(state.camberPct, 0);
  const thicknessPct = safeNum(state.thicknessPct, 12.5);
  const velocity = safeNum(state.velocity, 0);
  const altitude = safeNum(state.altitude, 0);
  const chord = safeNum(state.chord, 1);
  const span = safeNum(state.span, 4);
  const wingArea = safeNum(state.wingArea, chord * span);

  // Flow properties (legacy-style)
  const vconv = 0.6818; // mph -> ft/s conversion used in old FoilSim
  const densityTrop = densitySlugFt3(altitude);
  const densityStrat = densityTrop * 0.9;
  const q0T = calculateQ0T(velocity, vconv, altitude, densityTrop);
  const q0S = calculateQ0S(velocity, vconv, altitude, densityStrat);

  const reynolds = calculateReynolds({
    velocity,
    altitude,
    chord,
    densityTrop,
    densityStrat,
  });

  // CL / CD
  const cl = liftCoefficient(angleDeg, camberPct, thicknessPct);
  const aspectRatio = wingArea > 0 ? (span * span) / wingArea : 0;

  const cd = calculateDragCoefficient({
    camberDeg: camberPct,
    thicknessPct,
    alphaDeg: angleDeg,
    reynolds,
    cl,
    aspectRatio,
    efficiency: 1.0,
  });

  // Forces
  const lift = calculateLiftForce(
    velocity,
    altitude,
    wingArea,
    vconv,
    q0T,
    q0S,
    cl
  );

  const drag = calculateDragForce(
    velocity,
    altitude,
    wingArea,
    vconv,
    q0T,
    q0S,
    cd
  );

  // Plots
  const getCl = (aDeg) => liftCoefficient(aDeg, camberPct, thicknessPct);
  const getCd = (aDeg) =>
    calculateDragCoefficient({
      camberDeg: camberPct,
      thicknessPct,
      alphaDeg: aDeg,
      reynolds,
      cl: getCl(aDeg),
      aspectRatio,
      efficiency: 1.0,
    });

  const clAlpha = calculateClAlpha({
    camberPct,
    thicknessPct,
    velocity,
    alphaMin: -10,
    alphaMax: 20,
    step: 1,
    getCl: (aDeg) => getCl(aDeg),
  });

  const cdAlpha = calculateCdAlpha({
    camberPct,
    thicknessPct,
    velocity,
    reynolds,
    aspectRatio,
    getCd: (aDeg) => getCd(aDeg),
  });

  const ldAlpha = calculateLdAlpha({
    camberPct,
    thicknessPct,
    velocity,
    reynolds,
    aspectRatio,
    getCl: (aDeg) => getCl(aDeg),
    getCd: (aDeg) => getCd(aDeg),
  });

  // ---------------------------------------------------------------------------
  // Geometry (authoritative Joukowski loop)
  // FIX #1: DO NOT negate angleDeg here.
  // If you want "flow fixed, airfoil rotates", rotate ONLY the airfoil loop (this).
  // ---------------------------------------------------------------------------
  const {
    loop: airfoilLoop,
    xcval,
    ycval,
    rval,
  } = generateJoukowskiAirfoilLoop({
    angleDeg: -angleDeg,
    camberPct,
    thicknessPct,
    nptc: 37,
  });
  // We create arrays of size 38 to allow for 1-based indexing (1..37)
  const plp = Array(38).fill(undefined);
  const plv = Array(38).fill(undefined);
  // We iterate through the loop to populate surface physics data
  airfoilLoop.forEach((pt, index) => {
    const i = index + 1; // Convert to 1-based indexing for GeometryPanel
    if (i <= 37) {
      // Use Cp (Pressure Coefficient) and Velocity Ratio from the Joukowski math
      plp[i] = pt.cp ?? 0;
      plv[i] = pt.vRatio ?? 0;
    }
  });

  // FIX #2: pack xm/ym directly in loop order (prevents interior chord line)
  const { xm, ym } = packXmYmFromLoopOrder(airfoilLoop, 37);

  // ---------------------------------------------------------------------------
  // Flow field
  // If you want fixed freestream direction, keep alphaDeg = 0 here.
  // The airfoil rotates via airfoilLoop above.
  // ---------------------------------------------------------------------------
  const flowField = generateFlowField({
    angleDeg,
    camberPct,
    thicknessPct,
    nStream: 15,
    nPoints: 37,
  });

  const ld = calculateLiftToDrag(lift, drag);
  const barData = buildLiftDragBarData(lift, drag);

  return {
    // inputs
    angleDeg,
    camberPct,
    thicknessPct,
    velocity,
    altitude,
    chord,
    span,
    wingArea,

    // aero
    cl,
    cd,
    lift,
    drag,
    reynolds,
    ld,
    barData,

    // geometry + flow
    xcval,
    ycval,
    rval,
    xm,
    ym,
    plp, // ✅ Now returned for GeometryPanel
    plv, // ✅ Now returned for GeometryPanel
    airfoilLoop,
    flowField,

    // plots
    plots: {
      clAlpha,
      cdAlpha,
      ldAlpha,
    },
  };
}

export default computeOutputs;
