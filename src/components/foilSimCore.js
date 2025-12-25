// src/core/foilSimCore.js
import { UnitSystem, Environment, Airfoil } from "./shape.js";

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

export function normalizeInputs(state) {
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

  // Options (defaults match your store snippet)
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
  } = normalizeInputs(state);

  const {
    aspectRatioCorrection = true, // ar
    inducedDrag = true, // induced
    reynoldsCorrection = true, // reCorrection
    liftMode = 1, // liftAnalisis (1=Stall, 2=Ideal)
    units = "metric",
  } = options ?? {};

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
      units,
      environment,
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
