// src/foilsim/computeOutputs.js
//
// Clean, React-friendly computeOutputs()
// Single source of truth for outputs used by OutputsPanel / Geometry / Plots.
// Fixes:
//  1) Normalizes state field names + camber/thickness units (fraction -> percent when needed)
//  2) Uses ONE consistent drag model everywhere (cd = cd0 + cdi when enabled)
//  3) Computes Cd(α) and L/D(α) once (no redundant recompute loops)
//  4) Links flow-field circulation to computed CL so Cp/streamlines align with lift

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
import { generateFlowField } from "../physics/flowField.js";
import { Environment, UnitSystem } from "../components/shape.js";

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function mapUnits(units) {
  if (units === UnitSystem.IMPERIAL || units === "imperial" || units === 1)
    return UnitSystem.IMPERIAL;
  return UnitSystem.METRIC;
}

function mapEnvironment(environmentSelect) {
  switch (environmentSelect) {
    case 2:
      return Environment.MARS;
    case 3:
      return Environment.MERCURY;
    case 4:
      return Environment.VENUS;
    case 1:
    default:
      return Environment.EARTH;
  }
}

function mapShape(shapeSelect) {
  switch (shapeSelect) {
    case 1:
      return "airfoil";
    case 2:
      return "ellipse";
    case 3:
      return "plate";
    case 4:
      return "cylinder";
    case 5:
      return "ball";
    default:
      return "airfoil";
  }
}

/**
 * Normalize incoming UI state.
 * Supports both legacy-ish names and the new React store names.
 */
function normalizeInputs(state) {
  const unitsRaw = state.units;
  const unitSystem = mapUnits(unitsRaw);

  const environmentSelect = state.environmentSelect ?? state.environment ?? 1;
  const environment = mapEnvironment(environmentSelect);

  const shapeSelect = state.shapeSelect ?? 1;
  const shapeType = mapShape(shapeSelect);

  // Angle: state.alphaDeg (new) or state.angleDeg (old)
  const angleDeg = Number(state.angleDeg ?? state.alphaDeg ?? 0);

  // Camber/thickness: state.m/state.t are usually fractions (0.02, 0.12).
  // If camberPct/thicknessPct exist, assume they are already percent.
  const camberPct = Number(
    state.camberPct ?? (Number.isFinite(state.m) ? state.m * 100 : 0)
  );
  const thicknessPct = Number(
    state.thicknessPct ?? (Number.isFinite(state.t) ? state.t * 100 : 0)
  );

  // Speed: state.V (new) or state.velocity (old)
  const velocity = Number(state.velocity ?? state.V ?? 0);

  const altitude = Number(state.altitude ?? 0);
  const chord = Number(state.chord ?? 1);
  const span = Number(state.span ?? 1);

  // Area: state.S (new) or state.wingArea (old)
  const wingArea = Number(state.wingArea ?? state.S ?? 0);

  const radius = Number(state.radius ?? 0);
  const spin = Number(state.spin ?? 0);

  // Options
  const induced = state.induced ?? true;
  const reCorrection = state.reCorrection ?? true;
  const efficiency = Number(state.efficiency ?? 0.85);

  return {
    unitSystem,
    environmentSelect,
    environment,
    shapeSelect,
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
  };
}

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
  const q = dynamicPressure(velocity, altitude); // q = 0.5 rho V^2 (psf-equivalent in this model)

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
  // Performance plots
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
  // Flow field + probes (geometry / Cp visualization)
  // ---------------------------------------------------------------------------
  // We link circulation to CL so streamlines/Cp align with lift.
  // For 2D airfoil: Cl = 2*Gamma / (V*c)  =>  Gamma = 0.5*Cl*V*c
  const Gamma = 0.5 * cl * velocity * chord;

  // The flow-field module uses a non-dimensional circulation term inside uth = ... - gamval/rad.
  // A reasonable normalization is gamval = Gamma / (2*pi*V) (so it scales with Gamma and keeps units consistent).
  const gamval = velocity !== 0 ? Gamma / (2.0 * Math.PI * velocity) : 0;

  // Safety defaults (until you wire a real circle -> airfoil shape system)
  const xcval = 0;
  const ycval = 0;
  const rval = 1;

  const flowField = generateFlowField({
    alphaDeg: angleDeg,
    xcval,
    ycval,
    rval,
    gamval,
  });

  // Geometry arrays (NASA-compatible 2 x N)
  const nptc = 37;
  const MAX_J = 40;
  const xm = [Array(MAX_J).fill(0), Array(MAX_J).fill(0)];
  const ym = [Array(MAX_J).fill(0), Array(MAX_J).fill(0)];

  if (flowField?.bodyPoints?.length) {
    const nn = Math.min(nptc, flowField.bodyPoints.length);
    for (let i = 0; i < nn; i++) {
      const p = flowField.bodyPoints[i];
      xm[0][i] = p.x;
      ym[0][i] = p.y;
      xm[1][i] = p.x;
      ym[1][i] = p.y;
    }
  }

  // Probe arrays plv/plp (display units), consistent with Cp:
  // Cp = 1 - (Vlocal/V)^2 ;  p = p∞ + Cp*q∞
  const convdr = Math.PI / 180;
  const plv = Array(MAX_J).fill(0);
  const plp = Array(MAX_J).fill(0);

  const pconv = unitSystem === UnitSystem.IMPERIAL ? 14.7 : 101.3;
  const pInfDisplay = pconv;
  const qInfDisplay = (q / 2116.0) * pconv;

  for (let idx = 0; idx < nptc; idx++) {
    const thetaDeg = (idx * 360.0) / (nptc - 1);
    const thetaRad = thetaDeg * convdr;
    const alphaRad = angleDeg * convdr;

    // Tangential speed on cylinder surface with circulation
    const vTheta =
      -2.0 * velocity * Math.sin(thetaRad - alphaRad) +
      Gamma / (2.0 * Math.PI * rval);

    const vLocal = Math.abs(vTheta);
    plv[idx] = vLocal;

    const cp =
      velocity !== 0 ? 1.0 - (vLocal * vLocal) / (velocity * velocity) : 0;
    plp[idx] = pInfDisplay + cp * qInfDisplay;
  }

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

    // aero gage panel
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
