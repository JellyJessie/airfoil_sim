// src/core/foilState.js
// implicit globals.

// All inputs + some outputs we may cache
export const defaultFoilState = {
  units: "imperial", // "imperial" | "metric"
  shape: "airfoil", // "airfoil" | "ellipse" | "plate" | "cylinder" | "ball"
  angleDeg: 5.0,
  camberPercent: 0.0,
  thicknessPercent: 12.5,

  // “modes” that used to be driven by the top buttons
  inputMode: "shape", // "flight" | "shape" | "analysis" | "selectPlot" | "size"
  outputMode: "geometry", // "geometry" | "data" | "gages" | "plot"

  // Flight conditions
  V: 150, // speed
  rho: 1.225, // density
  mu: 1.81e-5, // viscosity
  chord: 1.0,
  span: 5.0,
  area: 5.0, // wing area

  // Outputs (can be computed instead of stored, but we keep here for convenience)
  lift: 0,
  drag: 0,
  cL: 0,
  cD: 0,
  reynolds: 0,
  ldRatio: 0,
};

// Simple immutable update helper
export function updateFoilState(state, patch) {
  return { ...state, ...patch };
}
