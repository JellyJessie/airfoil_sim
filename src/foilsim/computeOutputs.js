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

// -----------------------------------------------------------------------------
// Surface pressure/velocity distribution (FoilSim legacy-style)
// Produces arrays indexed 1..nptc (index 0 unused) to match NASA/FoilSim tables.
// plv: surface speed (same units as input velocity)
// plp: Cp (pressure coefficient); if you want absolute pressure: p = p0 + Cp*q
// -----------------------------------------------------------------------------
function computeSurfacePV({
  angleDeg,
  velocity,
  xcval,
  ycval,
  rval,
  gamval,
  nptc = 37,
}) {
  const convdr = Math.PI / 180;
  const plv = new Array(nptc + 1).fill(0);
  const plp = new Array(nptc + 1).fill(0);

  for (let index = 1; index <= nptc; index++) {
    const thet = ((index - 1) * 360) / (nptc - 1);

    // --- cylinder plane velocity (non-dimensional, V∞=1) ---
    const rad = rval;
    const thrad = convdr * thet;
    const alfrad = convdr * angleDeg;

    const ur = Math.cos(thrad - alfrad) * (1.0 - (rval * rval) / (rad * rad));
    const uth =
      -Math.sin(thrad - alfrad) * (1.0 + (rval * rval) / (rad * rad)) -
      gamval / rad;

    const usq = ur * ur + uth * uth;

    // --- translate to generate airfoil & apply Joukowski Jacobian ---
    let xloc = rad * Math.cos(thrad) + xcval;
    let yloc = rad * Math.sin(thrad) + ycval;

    const rad2 = Math.sqrt(xloc * xloc + yloc * yloc);
    const thrad2 = Math.atan2(yloc, xloc);

    let jake1 = 1.0 - Math.cos(2.0 * thrad2) / (rad2 * rad2);
    let jake2 = Math.sin(2.0 * thrad2) / (rad2 * rad2);
    let jakesq = jake1 * jake1 + jake2 * jake2;

    // protection (legacy)
    if (Math.abs(jakesq) <= 0.01) jakesq = 0.01;

    const vsq = usq / jakesq;
    const velRatio = Math.sqrt(Math.max(0, vsq)); // V/V∞
    const cp = 1.0 - vsq; // Cp = (p - p∞)/q∞

    plv[index] = velRatio * velocity;
    plp[index] = cp;
  }

  return { plv, plp };
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
    angleDeg, // ✅ was -angleDeg
    camberPct,
    thicknessPct,
    nptc: 37,
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
  // ---------------------------------------------------------------------------
  // Surface P/V arrays on the airfoil (legacy-style)
  // NOTE: plp is Cp (pressure coefficient), plv is surface speed (same units as input velocity).
  // Arrays are indexed 1..37 (0 unused), matching classic FoilSim tables.
  // ---------------------------------------------------------------------------
  const sqrtTerm = Math.sqrt(Math.max(1e-9, rval * rval - ycval * ycval));
  const leg = xcval - sqrtTerm;
  const teg = xcval + sqrtTerm;

  // mapped-plane chord used by the classic Joukowski CL↔Gamma relation
  const lem = leg + 1.0 / leg;
  const tem = teg + 1.0 / teg;
  const chrdMapped = tem - lem;

  // circulation in the cylinder plane (dimensionless, V∞=1), consistent with the legacy PV/Cp formulas
  const gamval = (cl * chrdMapped) / (4.0 * Math.PI);

  const { plv, plp } = computeSurfacePV({
    angleDeg,
    velocity,
    xcval,
    ycval,
    rval,
    gamval,
    nptc: 37,
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
    airfoilLoop,
    ...flowField,
    plv,
    plp,
    gamval,

    // plots
    plots: {
      clAlpha,
      cdAlpha,
      ldAlpha,
    },
  };
}

export default computeOutputs;
