// src/core/units.js
import { UNITS } from "../physics/shapeCore.js";

export function velocityConv(units) {
  if (units === UNITS.ENGLISH) return 0.6818;
  if (units === UNITS.METRIC) return 1.097;
  throw new Error(`Unknown units for velocityConv: ${units}`);
}

export function lengthConv(units) {
  if (units === UNITS.ENGLISH) return 1.0;
  if (units === UNITS.METRIC) return 0.3048;
  throw new Error(`Unknown units for lengthConv: ${units}`);
}

export function forceConv(units) {
  if (units === UNITS.ENGLISH) return 1.0;
  if (units === UNITS.METRIC) return 4.448;
  throw new Error(`Unknown units for forceConv: ${units}`);
}

export function pressureConv(units) {
  if (units === UNITS.ENGLISH) return 14.7;
  if (units === UNITS.METRIC) return 101.3;
  throw new Error(`Unknown units for pressureConv: ${units}`);
}
