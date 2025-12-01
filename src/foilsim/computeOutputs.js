// src/foilsim/computeOutputs.js
//
// Modern, React-friendly physics pipeline.
// Consumes FoilSimContext state and returns a structured outputs object.
//
// No NASA globals, no DOM, no shapeString, no old methods.
// Works with your new object-based Shape / Airfoil classes.

import { UnitSystem, Environment } from "../physics/shapeCore.js";
import { Airfoil, Ellipse, Plate, Cylinder, Ball } from "../core/shape.js";

// --- mappers -----------------------------------------------------------------

function mapUnits(units) {
  if (units === UnitSystem.IMPERIAL || units === UnitSystem.METRIC) {
    return units;
  }
  if (units === 1 || units === "imperial" || units === "english") {
    return UnitSystem.IMPERIAL;
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

function mapShape(shapeCode) {
  switch (shapeCode) {
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

// -----------------------------------------------------------------------------
// MAIN COMPUTE FUNCTION
// -----------------------------------------------------------------------------

export function computeOutputs(state) {
  // 1) destructure the FoilSim state
  const {
    angleDeg,
    camberPct,
    thicknessPct,
    velocity,
    altitude,
    chord,
    span,
    wingArea,

    units,
    environment,

    // modern model flags
    shapeSelect,
    ar,
    induced,
    reCorrection,
    liftAnalisis, // 1 = stall-clamp, 2 = ideal
    radius,
    spin,
  } = state;

  // 2) normalize units + environment + shape type
  const unitSystem = mapUnits(units);
  const envEnum = mapEnvironment(environment);
  const shapeType = mapShape(shapeSelect);

  // 3) base configuration passed into the new Shape constructors
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

  // 4) build all shape objects (object-style constructors)
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

  // 5) select which object is active
  let obj = airfoil;
  if (shapeSelect === 2) obj = ellipse;
  if (shapeSelect === 3) obj = plate;
  if (shapeSelect === 4) obj = cylinder;
  if (shapeSelect === 5) obj = ball;

  // 6) fundamental flow properties from getAtmosphere()
  const atm = obj.getAtmosphere();
  const rho = atm?.rho ?? 0;
  const mu = atm?.mu ?? 0;
  const q0Factor = atm?.q0Factor ?? 0;
  const ps0 = atm?.ps0 ?? 0;
  const ts0 = atm?.ts0 ?? 0; // Rankine (NASA style)

  const temperatureF = ts0 - 459.67;
  const temperatureC = ((temperatureF - 32) * 5) / 9;

  const dynamicPressure = obj.getDynamicPressure();
  const reynolds = obj.getReynolds();

  // 7) aerodynamic coefficients and forces
  let cl = 0,
    cd = 0,
    lift = 0,
    drag = 0,
    ld = 0;

  if (obj instanceof Airfoil) {
    cl = obj.getLiftCoefficient();
    cd = obj.getDragCoefficient();
    lift = obj.getLift();
    drag = obj.getDrag();
    ld = obj.getLiftOverDrag();
  }

  // 8) Assemble a clean modern outputs object
  return {
    shapeType,
    aerodynamics: {
      cl,
      cd,
      lift,
      drag,
      liftOverDrag: ld,
      reynolds,
    },
    environment: {
      rho,
      mu,
      ps0,
      temperatureRankine: ts0,
      temperatureF,
      temperatureC,
      dynamicPressure,
    },
    geometry: {
      chord,
      span,
      wingArea,
      aspectRatio: span && chord ? span / chord : 0,
      angleDeg,
      camberPct,
      thicknessPct,
    },
    _activeBody: obj,
  };
}
