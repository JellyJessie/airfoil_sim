// src/core/foilSimCore.js

import { Airfoil, UnitSystem, Environment } from "../physics/shapeCore.js";

// Map whatever FoilSimContext gives us to our Environment enum
function normalizeEnvironment(env) {
  // Already one of the enum values?
  if (
    env === Environment.EARTH ||
    env === Environment.MARS ||
    env === Environment.MERCURY ||
    env === Environment.VENUS
  ) {
    return env;
  }

  // numeric or string codes (legacy-style)
  if (env === 1 || env === "1" || env === "earth") return Environment.EARTH;
  if (env === 2 || env === "2" || env === "mars") return Environment.MARS;
  if (env === 3 || env === "3" || env === "mercury") return Environment.MERCURY;
  if (env === 4 || env === "4" || env === "venus") return Environment.VENUS;

  // fallback
  return Environment.EARTH;
}

function normalizeUnits(units) {
  if (
    units === UnitSystem.IMPERIAL ||
    units === "imperial" ||
    units === "english"
  ) {
    return UnitSystem.IMPERIAL;
  }
  return UnitSystem.METRIC;
}

// Minimal wrapper around the core Airfoil model
export function computeAirfoil(state) {
  const {
    angleDeg,
    camberPct,
    thicknessPct,
    velocity,
    altitude,
    chord,
    span,
    wingArea,
    environment,
    options,
  } = state;

  const {
    aspectRatioCorrection = true, // ar
    inducedDrag = true, // induced
    reynoldsCorrection = true, // reCorrection
    liftMode = 1, // liftAnalisis (1=Stall, 2=Ideal)
    units = "metric",
  } = options ?? {};

  const envKey = normalizeEnvironment(environment);
  const unitsKey = normalizeUnits(units);

  const airfoil = new Airfoil(
    angleDeg,
    camberPct,
    thicknessPct,
    velocity,
    altitude,
    chord,
    span,
    wingArea,
    {
      units: unitsKey,
      environment: envKey,
      aspectRatioCorrection,
      inducedDrag,
      reynoldsCorrection,
      liftMode,
    }
  );

  return {
    lift: airfoil.getLift(),
    drag: airfoil.getDrag(),
    cl: airfoil.getLiftCoefficient(),
    cd: airfoil.getDragCoefficient(),
    ld: airfoil.getLiftOverDrag(),
    reynolds: airfoil.getReynolds(),
  };
}

// convenience wrapper used by FoilSimPanel-style calls
export function computeFoilAerodynamics({
  angleDeg,
  camberPercent,
  thicknessPercent,
  velocity,
  altitude,
  wingArea,
  chord,
  aspectRatio,
  environment = Environment.EARTH,
  units = "metric",
}) {
  const span = chord * aspectRatio;

  const state = {
    angleDeg,
    camberPct: camberPercent,
    thicknessPct: thicknessPercent,
    velocity,
    altitude,
    chord,
    span,
    wingArea,
    environment,
    options: {
      aspectRatioCorrection: true,
      inducedDrag: true,
      reynoldsCorrection: true,
      liftMode: 1,
      units,
    },
  };

  return computeAirfoil(state);
}
