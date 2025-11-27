// src/foilsim/unitOps.js
import { globals } from "./globals.js";

export function unitsChange() {
  // This function should no longer use document.getElementById
  // React will handle opening/closing the dropdown
  globals.selectClicked = !globals.selectClicked;
}

// Convert to Imperial Units (FoilSim logic)
export function imperialUnits() {
  if (globals.unitsVar === 2) {
    globals.velocity /= 1.6;
    globals.altitude /= 0.3;
    globals.chord /= 0.3;
    globals.span /= 0.3;
    globals.area /= 0.09;
    globals.radius /= 0.3;
  }
  globals.unitsVar = 1;
}

// Convert to Metric Units (FoilSim logic)
export function metricUnits() {
  if (globals.unitsVar === 1) {
    globals.velocity *= 1.6;
    globals.altitude *= 0.3;
    globals.chord *= 0.3;
    globals.span *= 0.3;
    globals.area *= 0.09;
    globals.radius *= 0.3;
  }
  globals.unitsVar = 2;
}
