// src/foilsim/computeOutputs.js
//
// Clean, React-friendly computeOutputs()
// Fully wired to the new DOM-free physics core in foilPhysics.js

import {
  dynamicPressure,
  liftCoefficient,
  liftForce,
  dragForce,
  calculateLiftCoefficientJoukowski,
  calculateLiftForce,
  calculateDragCoefficient,
  calculateDragForce,
  calculateReynolds,
  calculateDrag,
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
  if (units === UnitSystem.IMPERIAL || units === "imperial" || units === 1) {
    return UnitSystem.IMPERIAL;
  }
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

// Build CL–α sweep for Plot Panel
function buildAlphaSweep({
  camberPct,
  alphaMin = -10,
  alphaMax = 20,
  step = 1,
}) {
  const alphas = [];
  const cls = [];

  for (let a = alphaMin; a <= alphaMax; a += step) {
    const cl = liftCoefficient(a, camberPct);
    alphas.push(a);
    cls.push(cl);
  }

  return { alphas, cls };
}

// -----------------------------------------------------------------------------
// MAIN COMPUTE FUNCTION
// -----------------------------------------------------------------------------

export function computeOutputs(state) {
  const {
    // geometry / inputs
    angleDeg,
    camberPct,
    thicknessPct,
    velocity,
    altitude,
    chord,
    span,
    wingArea,

    // discrete selections
    units,
    environment: environmentSelect,
    shapeSelect,

    // aero options
    liftAnalisis, // 1 = stall model, 2 = ideal
    ar,

    // rotating body (future extension)
    radius,
    spin,
  } = state;

  // --- normalize selections --------------------------------------------------

  const unitSystem = mapUnits(units);
  const environment = mapEnvironment(environmentSelect);
  const shapeType = mapShape(shapeSelect);

  // --- flow properties -------------------------------------------------------

  const q = dynamicPressure(velocity, altitude); // q = 0.5 rho V^2
  const vconv = 0.6818;
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

  // --- aerodynamics ----------------------------------------------------------

  // Lift coefficient (thin airfoil + stall model)
  const cl = liftCoefficient(angleDeg, camberPct);

  const aspectRatio = wingArea > 0 ? (span * span) / wingArea : 0;

  // --- CL–alpha plot sweep ---------------------------------------------------

  const clAlpha = buildAlphaSweep({
    camberPct,
    alphaMin: -10,
    alphaMax: 20,
    step: 1,
  });

  // Drag coefficient
  const cd = calculateDragCoefficient({
    camberDeg: 7.5,
    thicknessPct: 12,
    alphaDeg: 8,
    reynolds: 80000,
    cl: 0.9,
    aspectRatio: 4.0,
    efficiency: 0.85,
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

  const liftOverDrag = drag !== 0 ? lift / drag : 0;
  const barData = buildLiftDragBarData(lift, drag);
  const ld = calculateLiftToDrag(lift, drag);
  // ================= FLOW FIELD SAFETY DEFAULTS =================

  // These prevent genFlowField crashes if shape system not wired yet
  const xcval = 0; // center x
  const ycval = 0; // center y
  const rval = 1; // cylinder radius
  const gamval = 0; // circulation

  const flowField = generateFlowField({
    alphaDeg: angleDeg,
    xcval,
    ycval,
    rval,
    gamval,
  });

  // --- structured output for panels -----------------------------------------
  // ================= PERFORMANCE ANALYSIS =================

  // Build Cd(α) and L/D(α)
  const cdAlpha = [];
  const ldAlpha = [];
  // --- drag breakdown: Cd0 (parasitic) + Cdi (induced) -----------------------
  const { induced, reCorrection } = state; // make sure these exist in state

  // Baseline parasitic drag (same as in your faithful model)
  let cd0 = 0.01 + 0.002 * (thicknessPct / 12.0) + 0.0001 * Math.abs(camberPct);

  // Optional Reynolds correction
  if (reCorrection && reynolds > 0) {
    cd0 *= Math.pow(50000 / reynolds, 0.11);
  }

  // Induced drag term
  let cdi = 0;
  if (induced) {
    const efficiency = 0.85;
    cdi = (cl * cl) / (Math.PI * aspectRatio * efficiency);
  }

  // (optional) If you want, you can also recompute cd_total = cd0 + cdi
  // and compare to your existing `cd` for debugging.

  let optimalLD = 0;
  let optimalAlpha = 0;
  let stallAlpha = null;

  // Detect stall by dCl/dα turning negative
  for (let i = 1; i < clAlpha.alphas.length; i++) {
    const alphaPrev = clAlpha.alphas[i - 1];
    const alpha = clAlpha.alphas[i];

    const dCl = clAlpha.cls[i] - clAlpha.cls[i - 1];

    // Stall detection (first slope drop)
    if (stallAlpha === null && dCl < 0) {
      stallAlpha = alphaPrev;
    }
  }

  // Compute L/D curve
  for (let i = 0; i < clAlpha.alphas.length; i++) {
    const cl_i = clAlpha.cls[i];

    const cd_i = calculateDragCoefficient({
      camberDeg: camberPct,
      thicknessPct,
      alphaDeg: clAlpha.alphas[i],
      reynolds,
      cl: cl_i,
      aspectRatio,
    });

    cdAlpha.push(cd_i);

    const ld_i = cd_i !== 0 ? cl_i / cd_i : 0;
    ldAlpha.push(ld_i);

    if (ld_i > optimalLD) {
      optimalLD = ld_i;
      optimalAlpha = clAlpha.alphas[i];
    }
  }

  // Current stall state
  const isStalled = stallAlpha !== null && angleDeg >= stallAlpha;

  return {
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

    // ✅ NEW: drag breakdown
    cd0, // parasitic
    cdi, // induced

    // environment (minimal, can be extended)
    velocity,
    altitude,
    q0: altitude <= 36000 ? q0T : q0S,

    // plot panel
    plots: {
      clAlpha,
      cdAlpha, // ✅ NEW
      ldAlpha, // ✅ NEW
    },

    // future (optional)
    rotation: {
      radius,
      spin,
    },

    // raw selections (debugging / UI logic)
    units: unitSystem,
    environment,
  };
}
/*
export function plotGraph({ lift, drag }, plotRef) {
  if (!plotRef?.current) return;

  const data = [
    {
      x: ["Lift", "Drag"],
      y: [lift, drag],
      type: "bar",
    },
  ];

  Plotly.newPlot(plotRef.current, data);
}

*/
