// src/foilsim/computeOutputs.js
//
// Clean, React-friendly computeOutputs()
// Single source of truth for outputs used by OutputsPanel / Geometry / Plots.
//
// Fixes & guarantees:
//  1) Normalizes state field names + camber/thickness units (fraction -> percent when needed)
//  2) Uses ONE consistent drag model everywhere (cd = cd0 + cdi when enabled)
//  3) Computes Cd(α) and L/D(α) once (no redundant recompute loops)
//  4) Links flow-field circulation to computed CL so Cp/streamlines align with lift
//  5) Produces NASA-style probe arrays plp/plv (Cp + velocity ratio) for Geometry/Cp/overlay

import {
  dynamicPressure,
  liftCoefficient,
  calculateLiftForce,
  calculateDragForce,
  calculateReynolds,
  calculateClAlpha,
  calculateCdAlpha,
  calculateLdAlpha,
  densitySlugFt3,
  calculateQ0T,
  calculateQ0S,
} from "../physics/foilPhysics";

import {
  buildLiftDragBarData,
  calculateLiftToDrag,
} from "../physics/plotHelpers";
import {
  generateAirfoilCoordinates,
  generateAirfoilGeometry,
  generateFlowField,
} from "../physics/flowField.js";
import { normalizeInputs } from "../components/foilSimCore.js";

/**
 * One drag model used everywhere:
 *   cd = cd0 + cdi (when toggles enabled)
 */
function computeDragModel({
  camberPct,
  thicknessPct,
  reynolds,
  cl,
  aspectRatio,
  induced,
  reCorrection,
  efficiency,
}) {
  // Baseline parasitic drag (FoilSim-style heuristic)
  let cd0 = 0.01 + 0.002 * (thicknessPct / 12.0) + 0.0001 * Math.abs(camberPct);

  // Optional Reynolds correction
  if (reCorrection && reynolds > 0) {
    cd0 *= Math.pow(50000 / reynolds, 0.11);
  }

  // Induced drag
  let cdi = 0;
  if (induced && aspectRatio > 0) {
    cdi = (cl * cl) / (Math.PI * aspectRatio * (efficiency || 0.85));
  }

  return { cd0, cdi, cd: cd0 + cdi };
}

/**
 * NASA-style surface probe sampler (based on legacy getVel):
 * returns velocity ratio (Vlocal/V∞) and Cp (1 - (Vlocal/V∞)^2) along the mapped surface.
 */
function computeSurfaceProbes({
  alphaDeg,
  rval,
  gamval,
  xcval,
  ycval,
  nptc = 37,
}) {
  const convdr = Math.PI / 180;
  const alfrad = convdr * alphaDeg;

  const plvRatio = Array(40).fill(0); // Vlocal/V∞
  const plcp = Array(40).fill(0); // Cp

  for (let index = 1; index <= nptc; index++) {
    const theta = ((index - 1) * 360) / (nptc - 1);
    const thrad = convdr * theta;

    // cylinder plane radius (sample on cylinder surface)
    let rad = rval;

    // velocity in cylinder plane
    const ur = Math.cos(thrad - alfrad) * (1.0 - (rval * rval) / (rad * rad));
    const uth =
      -Math.sin(thrad - alfrad) * (1.0 + (rval * rval) / (rad * rad)) -
      gamval / rad;

    const usq = ur * ur + uth * uth;

    // translate cylinder to generate airfoil, then compute Jacobian at that location
    let xloc = rad * Math.cos(thrad) + xcval;
    let yloc = rad * Math.sin(thrad) + ycval;

    rad = Math.sqrt(xloc * xloc + yloc * yloc);
    const thloc = Math.atan2(yloc, xloc);

    const jake1 = 1.0 - Math.cos(2.0 * thloc) / (rad * rad);
    const jake2 = Math.sin(2.0 * thloc) / (rad * rad);
    let jakesq = jake1 * jake1 + jake2 * jake2;
    if (Math.abs(jakesq) <= 0.01) jakesq = 0.01;

    const vsq = usq / jakesq; // (Vlocal/V∞)^2 in this non-dimensional form

    const vRatio = Math.sqrt(Math.max(vsq, 0));
    plvRatio[index] = vRatio;
    plcp[index] = 1.0 - vsq;
  }

  return { plvRatio, plcp };
}

// -----------------------------------------------------------------------------
// MAIN COMPUTE FUNCTION
// -----------------------------------------------------------------------------

export function computeOutputs(state) {
  const n = normalizeInputs(state);

  const {
    unitSystem,
    environment,
    shapeType,
    angleDeg,
    camberPct,
    thicknessPct,
    velocity,
    altitude,
    chord,
    span,
    wingArea,
    radius,
    spin,
    induced,
    reCorrection,
    efficiency,
  } = n;

  // ---------------------------------------------------------------------------
  // Flow properties
  // ---------------------------------------------------------------------------
  const q = dynamicPressure(velocity, altitude); // q∞ (dynamic pressure, model units)

  const vconv = 0.6818; // legacy conversion used in calculateLiftForce/DragForce
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

  // ---------------------------------------------------------------------------
  // Aerodynamics (CL, CD, forces)
  // ---------------------------------------------------------------------------
  const cl = liftCoefficient(angleDeg, camberPct, thicknessPct);

  const aspectRatio = wingArea > 0 ? (span * span) / wingArea : 0;

  // Single drag model source-of-truth
  const { cd0, cdi, cd } = computeDragModel({
    camberPct,
    thicknessPct,
    reynolds,
    cl,
    aspectRatio,
    induced,
    reCorrection,
    efficiency,
  });

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

  const liftOverDrag = drag !== 0 ? lift / drag : 0;
  const barData = buildLiftDragBarData(lift, drag);
  const ld = calculateLiftToDrag(lift, drag);

  // ---------------------------------------------------------------------------
  // Performance plots (computed ONCE)
  // ---------------------------------------------------------------------------
  const getCl = (alpha, camber, thick) => liftCoefficient(alpha, camber, thick);

  const getCd = (
    alpha,
    camber,
    thick,
    { reynolds, aspectRatio, efficiency }
  ) => {
    const clLocal = getCl(alpha, camber, thick);
    return computeDragModel({
      camberPct: camber,
      thicknessPct: thick,
      reynolds,
      cl: clLocal,
      aspectRatio,
      induced,
      reCorrection,
      efficiency,
    }).cd;
  };

  const clAlpha = calculateClAlpha({
    camberPct,
    thicknessPct,
    velocity,
    alphaMin: -10,
    alphaMax: 20,
    step: 1,
    getCl: (alpha, camber) => liftCoefficient(alpha, camber, thicknessPct),
  });

  const cdAlpha = calculateCdAlpha({
    camberPct,
    thicknessPct,
    velocity,
    reynolds,
    aspectRatio,
    getCd,
  });

  const ldAlpha = calculateLdAlpha({
    camberPct,
    thicknessPct,
    velocity,
    reynolds,
    aspectRatio,
    getCl,
    getCd,
  });

  // Stall detection (first negative slope in Cl-alpha)
  let stallAlpha = null;
  for (let i = 1; i < clAlpha.alphas.length; i++) {
    const dCl = clAlpha.cls[i] - clAlpha.cls[i - 1];
    if (stallAlpha === null && dCl < 0) {
      stallAlpha = clAlpha.alphas[i - 1];
      break;
    }
  }
  const isStalled = stallAlpha !== null && angleDeg >= stallAlpha;

  // Optimal L/D
  let optimalLD = 0;
  let optimalAlpha = 0;
  for (let i = 0; i < ldAlpha.alphas.length; i++) {
    if (ldAlpha.lds[i] > optimalLD) {
      optimalLD = ldAlpha.lds[i];
      optimalAlpha = ldAlpha.alphas[i];
    }
  }

  // ---------------------------------------------------------------------------
  // Flow field + geometry + probes (geometry / Cp visualization)
  // ---------------------------------------------------------------------------
  // Link circulation to CL so streamlines/Cp align with lift.
  // For 2D airfoil: Cl = 2*Gamma / (V*c)  =>  Gamma = 0.5*Cl*V*c
  const Gamma = 0.5 * cl * velocity * chord;

  // Safety defaults (until you wire a real circle->airfoil parameterization)
  const xcval = 0;
  const ycval = 0;
  const rval = 1;

  // Non-dimensional circulation term used by flowField.js in uth = ... - gamval/rad.
  const gamval = velocity !== 0 ? Gamma / (2.0 * Math.PI * velocity) : 0;

  const geo = generateAirfoilGeometry({
    chord,
    camberPct,
    thicknessPct,
    n: 80,
    angleDeg: -angleDeg, // airfoil rotates with AoA
  });

  const { loop } = generateAirfoilCoordinates(state, 101);

  // NASA/Foilsim legacy arrays for GeometryPanel + overlays (2 rows)
  /*const MAX_J = 40;
  const xm = [Array(MAX_J).fill(0), Array(MAX_J).fill(0)];
  const ym = [Array(MAX_J).fill(0), Array(MAX_J).fill(0)];

  // Map 37 samples from upper/lower to legacy indices 1..37.
  // Upper: LE->TE (0..n-1), Lower: LE->TE too, but GeometryPanel often expects
  // lower in separate row. We'll sample from the generated upper/lower arrays.
  const nptc = 37;
  const sampleIdx = (arr, i) => Math.round((i * (arr.length - 1)) / (nptc - 1));

  for (let i = 1; i <= nptc; i++) {
    const iu = sampleIdx(geo.upper, i - 1);
    const il = sampleIdx(geo.lower, i - 1);
    xm[0][i] = geo.upper[iu].x;
    ym[0][i] = geo.upper[iu].y;
    xm[1][i] = geo.lower[il].x;
    ym[1][i] = geo.lower[il].y;
  }
*/

  const flowField = generateFlowField({
    alphaDeg: -angleDeg,
    xcval,
    ycval,
    rval,
    gamval,
    nStream: 15,
    nPoints: 37,
  });

  // Geometry arrays (NASA-compatible 2 x N)
  // ---------------------------------------------------------
  const nptc = 37;
  const npt2 = 19;
  const MAX_J = 40;

  const xm = [Array(MAX_J).fill(0), Array(MAX_J).fill(0)];
  const ym = [Array(MAX_J).fill(0), Array(MAX_J).fill(0)];

  if (flowField?.bodyPoints?.length >= nptc) {
    // bodyPoints assumed CCW around airfoil
    // Split into upper/lower by Y sign (robust & simple)
    const pts = flowField.bodyPoints;

    const upper = pts.filter((p) => p.y >= 0);
    const lower = pts.filter((p) => p.y < 0);

    // Sort surfaces in FoilSim order
    upper.sort((a, b) => a.x - b.x); // LE → TE
    lower.sort((a, b) => b.x - a.x); // TE → LE

    // Leading edge
    const le = pts.reduce((m, p) => (p.x < m.x ? p : m), pts[0]);

    // Fill LOWER: i = 1..18
    for (let k = 0; k < 18 && k < lower.length; k++) {
      const i = 1 + k;
      xm[0][i] = lower[k].x;
      ym[0][i] = lower[k].y;
    }

    // LE point
    xm[0][npt2] = le.x;
    ym[0][npt2] = le.y;

    // Fill UPPER: i = 20..36
    for (let k = 0; k < 18 && k < upper.length; k++) {
      const i = npt2 + 1 + k;
      xm[0][i] = upper[k].x;
      ym[0][i] = upper[k].y;
    }

    // Mirror row 1 for legacy compatibility
    for (let i = 1; i <= 36; i++) {
      xm[1][i] = xm[0][i];
      ym[1][i] = ym[0][i];
    }
  }

  // Probes for Geometry/Cp/overlay: Cp + velocity ratio along surface
  const { plvRatio, plcp } = computeSurfaceProbes({
    alphaDeg: angleDeg,
    rval,
    gamval,
    xcval,
    ycval,
    nptc,
  });

  const plp = plcp; // Cp
  const plv = plvRatio; // Vlocal/V∞

  // ---------------------------------------------------------------------------
  // Return payload
  // ---------------------------------------------------------------------------
  return {
    // geometry arrays (USED by GeometryPanel + probe overlay)
    xm,
    ym,
    plp,
    plv,

    // dynamic pressure for Cp (q∞)
    q0: q,

    // optional debug
    flowField,

    // geometry panel
    shapeType,
    angleDeg,
    camberPct,
    thicknessPct,
    chord,
    span,
    wingArea,
    aspectRatio,

    airfoilLoop: loop, // for FlowCanvas

    // aero gauges  panel
    cl,
    cd,
    lift,
    drag,
    reynolds,
    liftOverDrag,

    // drag breakdown
    cd0,
    cdi,

    // environment (minimal)
    velocity,
    altitude,
    unitSystem,
    environment,

    // plot panel
    plots: {
      clAlpha,
      cdAlpha,
      ldAlpha,
    },

    // future (optional)
    rotation: {
      radius,
      spin,
    },

    flowField: {
      ...flowField,
      xcval, // Make sure these are passed through!
      ycval,
      rval,
    },

    // analysis extras
    isStalled,
    stallAlpha,
    optimalAlpha,
    optimalLD,

    // bar chart helper
    barData,
    ld,
  };
}
