// src/foilsim/computeOutputs.js
//
// Clean, React-friendly computeOutputs()
// Fully wired to the new DOM-free physics core in foilPhysics.js

import {
  dynamicPressure,
  reynoldsNumber,
  liftCoefficient,
  dragCoefficient,
  liftForce,
  dragForce,
  calculateLiftCoefficientJoukowski,
  calculateLiftForce,
  calculateDragCoefficientModern,
  calculateDragForce,
  calculateReynolds,
  calculateDrag,
} from "../physics/foilPhysics";

// Optional: if you still want enum-style units/env elsewhere
import { UnitSystem, Environment } from "../physics/shapeCore.js";

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
    induced,
    reCorrection,

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
  const reynolds = reynoldsNumber(velocity, chord, altitude);

  // --- aerodynamics ----------------------------------------------------------

  // Lift coefficient (thin airfoil + stall model)
  const cl = liftCoefficient(angleDeg, camberPct);

  const aspectRatio = wingArea > 0 ? (span * span) / wingArea : 0;

  const cd = dragCoefficient({
    cl,
    reynolds,
    thicknessPct,
    aspectRatio: aspectRatio || 4,
  });

  const lift = liftForce(q, wingArea, cl);
  const drag = dragForce(q, wingArea, cd);

  const liftOverDrag = drag !== 0 && isFinite(drag) ? lift / drag : 0;

  // --- CL–alpha plot sweep ---------------------------------------------------

  const clAlpha = buildAlphaSweep({
    camberPct,
    alphaMin: -10,
    alphaMax: 20,
    step: 1,
  });

  // --- structured output for panels -----------------------------------------

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

    // environment (minimal, can be extended)
    velocity,
    altitude,
    q,

    // plot panel
    plots: {
      clAlpha, // { alphas: [...], cls: [...] }
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

// Drag coefficient
const cd = calculateDragCoefficientModern({
  camberDeg: camberPct,
  thicknessPct,
  alphaDeg: angleDeg,
  reynolds,
  cl,
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

const reynolds = calculateReynolds({
  velocity,
  altitude,
  chord,
  densityTrop,
  densityStrat,
});


*/
