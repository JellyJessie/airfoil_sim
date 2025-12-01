// src/physics/shapeCore.js

// -----------------------------------------------------------------------------
// Enums / literals
// -----------------------------------------------------------------------------

export const UnitSystem = Object.freeze({
  IMPERIAL: "imperial", // original "english"
  METRIC: "metric",
});

export const Environment = Object.freeze({
  EARTH: "earth",
  MARS: "mars",
  MERCURY: "mercury",
  VENUS: "venus",
});

export function velocityConv(units) {
  if (units === UnitSystem.ENGLISH) return 0.6818;
  if (units === UnitSystem.METRIC) return 1.097;
  throw new Error(`Unknown units for velocityConv: ${units}`);
}

export function lengthConv(units) {
  if (units === UnitSystem.ENGLISH) return 1.0;
  if (units === UnitSystem.METRIC) return 0.3048;
  throw new Error(`Unknown units for lengthConv: ${units}`);
}

export function forceConv(units) {
  if (units === UnitSystem.ENGLISH) return 1.0;
  if (units === UnitSystem.METRIC) return 4.448;
  throw new Error(`Unknown units for forceConv: ${units}`);
}

export function pressureConv(units) {
  if (units === UnitSystem.ENGLISH) return 14.7;
  if (units === UnitSystem.METRIC) return 101.3;
  throw new Error(`Unknown units for pressureConv: ${units}`);
}

// -----------------------------------------------------------------------------
// Base Shape class: stores geometry, flow, and environment
// -----------------------------------------------------------------------------
// --- Shape core -------------------------------------------------------------
// NOTE: This is adapted from NASA's original Shape class logic, but with:
//   - no DOM access
//   - no global environmentSelect or getUnits()
//   - configuration driven via constructor / setters.
//
// You can progressively pull over the remaining methods from shapeCore.js.
/*
export class Shape {
  constructor(
    angle,
    camber,
    thickness,
    velocity,
    altitude,
    chord,
    span,
    wingArea,
    { units = UnitSystem.IMPERIAL, environment = Environment.EARTH } = {}
  ) {
    this.angle = angle;
    this.camber = camber;
    this.thickness = thickness;
    this.velocity = velocity;
    this.altitude = altitude;
    this.chord = chord;
    this.span = span;
    this.wingArea = wingArea;

    this.units = units;
    this.environment = environment;
  }

    }
}
*/
