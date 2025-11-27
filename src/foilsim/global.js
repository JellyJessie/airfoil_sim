// src/foilsim/globals.js
// Modern, React-safe replacement for legacy "var" globals

export const globals = {
  // input variables
  angle: 0,
  camber: 0,
  thickness: 0,

  shapeSelect: 1, // 1=airfoil, 2=ellipse, etc.
  spin: 0.0,
  radius: 1.0,

  span: 20.0,
  clicks: 0,
  velocity: 100.0,
  altitude: 0.0,
  chord: 5.0,
  area: 100.0,

  chrdold: 5.0,
  spnold: 20.0,
  arold: 100.0,
  aspr: 4.0, // aspect ratio (AR)

  // environment
  environmentSelect: 1,
  unitsVar: 1, // 1=English, 2=Metric

  // UI selections
  inputButton: 1,
  outputButton: 1,
  liftAnalisis: 1,

  // boolean toggles
  ar: true, // aspect ratio correction
  induced: true, // induced drag
  reCorrection: true, // Reynolds correction

  // drag model
  dragBall: 1,

  // display modes
  display: 1,

  // global physics
  globalDensity: 0.00237,
  globalLift: 1,
  globalDrag: 1,
  globalPressure: 1,

  // UI strings
  shapeString: "Joukowski Airfoil",
  lenghtUnit: "ft",
  forceUnit: "lbs",
  velocityUnits: " mph",
  volume: 0.0,
  volumeUnits: "cu ft",
  areaUnits: "sq ft",
  selectClicked: 1,
  pressureUnits: "psi",

  // plotting
  plot: 1,

  // metric equivalents
  velocityMetric: 100.0 * 1.6,
  altitudeMetric: 0.0 * 0.3,
};
