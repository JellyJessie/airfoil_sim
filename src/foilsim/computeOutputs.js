// src/foilsim/computeOutputs.js

import { UnitSystem, Environment } from "../physics/shapeCore.js";
import { Airfoil, Ellipse, Plate, Cylinder, Ball } from "../core/shape.js";

// --- mappers ---------------------------------------------------------------

function mapUnits(units) {
  // allow string ("metric"/"imperial") or enum or numeric
  if (units === UnitSystem.IMPERIAL || units === "imperial" || units === 1) {
    return UnitSystem.IMPERIAL;
  }
  if (units === UnitSystem.METRIC || units === "metric" || units === 2) {
    return UnitSystem.METRIC;
  }
  return UnitSystem.METRIC;
}

function mapEnvironment(envCode) {
  switch (envCode) {
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

// Build a CL–α sweep around the current airfoil configuration
function buildAlphaSweep(airfoil, alphaMin = -10, alphaMax = 20, step = 1) {
  const alphas = [];
  const cls = [];

  const originalAngle = airfoil.getAngle();

  for (let a = alphaMin; a <= alphaMax; a += step) {
    airfoil.setAngle(a);
    alphas.push(a);
    cls.push(airfoil.getLiftCoefficient());
  }

  // restore original AoA so we don’t surprise the rest of the code
  airfoil.setAngle(originalAngle);

  return { alphas, cls };
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------

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
    environment: environmentSelect, // 1..4
    shapeSelect, // 1..5

    // options / physics toggles
    ar,
    induced,
    reCorrection,
    liftAnalisis, // 1 = stall, 2 = ideal

    // spinning body
    radius,
    spin,
  } = state;

  const unitSystem = mapUnits(units);
  const envEnum = mapEnvironment(environmentSelect);
  const shapeType = mapShape(shapeSelect);

  // Base config for all shapes
  const baseCfg = {
    angleDeg,
    camberPercent: camberPct,
    thicknessPercent: thicknessPct,
    velocity,
    altitude,
    chord,
    span,
    wingArea,
    units: unitSystem,
    environment: envEnum,
  };

  // Build bodies
  const airfoil = new Airfoil({
    ...baseCfg,
    aspectRatioCorrection: ar,
    inducedDrag: induced,
    reynoldsCorrection: reCorrection,
    liftMode: liftAnalisis,
  });

  const ellipse = new Ellipse(baseCfg);
  const plate = new Plate(baseCfg);
  const cylinder = new Cylinder({ ...baseCfg, radius, spin });
  const ball = new Ball({ ...baseCfg, radius, spin });

  // Active body based on shapeSelect
  let obj = airfoil;
  if (shapeSelect === 2) obj = ellipse;
  if (shapeSelect === 3) obj = plate;
  if (shapeSelect === 4) obj = cylinder;
  if (shapeSelect === 5) obj = ball;

  // Environment / flow
  const atm = obj.getAtmosphere();
  const rho = atm?.rho ?? 0;
  const mu = atm?.mu ?? 0;
  const q0Factor = atm?.q0Factor ?? 0;
  const ps0 = atm?.ps0 ?? 0;
  const ts0 = atm?.ts0 ?? 0; // Rankine

  const temperatureF = ts0 - 459.67;
  const temperatureC = ((temperatureF - 32) * 5) / 9;

  const dynamicPressure = obj.getDynamicPressure();
  const reynolds = obj.getReynolds();

  // Aerodynamics (currently implemented for Airfoil)
  let cl = 0;
  let cd = 0;
  let lift = 0;
  let drag = 0;
  let liftOverDrag = 0;

  if (obj instanceof Airfoil) {
    cl = obj.getLiftCoefficient();
    cd = obj.getDragCoefficient();
    lift = obj.getLift();
    drag = obj.getDrag();
    liftOverDrag = obj.getLiftOverDrag();
  }

  // CL–α sweep for plots (always based on airfoil for now)
  const clAlpha = buildAlphaSweep(airfoil, -10, 20, 1);

  return {
    // basic geometry / inputs
    angleDeg,
    camberPct,
    thicknessPct,
    velocity,
    altitude,
    chord,
    span,
    wingArea,
    shapeType,

    // aero summary
    lift,
    drag,
    cl,
    cd,
    reynolds,
    liftOverDrag,

    // environment
    rho,
    mu,
    ps0,
    q0Factor,
    temperatureRankine: ts0,
    temperatureF,
    temperatureC,
    dynamicPressure,

    // plot data
    plots: {
      clAlpha, // { alphas: [...], cls: [...] }
    },

    // keep bodies for advanced use/inspection
    _bodies: {
      airfoil,
      ellipse,
      plate,
      cylinder,
      ball,
      active: obj,
    },
  };
}
