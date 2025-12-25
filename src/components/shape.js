import { getAtmosphere } from "./environment.js";

export const UnitSystem = Object.freeze({
  IMPERIAL: "imperial", // original "english"
  METRIC: "metric",
});

export const Environment = Object.freeze({
  EARTH: "Earth",
  MARS: "Mars",
  MERCURY: "Mercury",
  VENUS: "Venus",
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
export class Shape {
  constructor({
    angleDeg,
    camberPercent,
    thicknessPercent,
    velocity,
    altitude,
    chord,
    span,
    wingArea,
    units = UnitSystem.METRIC,
    environment = Environment.EARTH,
  }) {
    this.angleDeg = angleDeg;
    this.camberPercent = camberPercent;
    this.thicknessPercent = thicknessPercent;
    this.velocity = velocity;
    this.altitude = altitude;
    this.chord = chord;
    this.span = span;
    this.wingArea = wingArea;
    this.units = units;
    this.environment = environment;
  }

  // --- getters/setters (minimal for now) ---

  setAngle(angleDeg) {
    this.angleDeg = angleDeg;
  }
  getAngle() {
    return this.angleDeg;
  }

  getCamber() {
    return this.camberPercent;
  }

  getThickness() {
    return this.thicknessPercent;
  }

  getVelocity() {
    return this.velocity;
  }

  getAltitude() {
    return this.altitude;
  }

  getChord() {
    return this.chord;
  }

  getSpan() {
    return this.span;
  }

  getAspectRatio() {
    return this.span / this.chord;
  }

  getWingArea() {
    return this.wingArea;
  }

  // Inside class Shape in shape.js
  getXcVal() {
    const thickness = this.thicknessPercent / 25.0;
    const ycval = this.getYcVal();
    const rval = this.getRVal();
    return 1.0 - Math.sqrt(Math.max(0, rval * rval - ycval * ycval));
  }

  getYcVal() {
    // Map camber percentage to ycval
    return this.camberPercent / 20.0;
  }

  getRVal() {
    const thickness = this.thicknessPercent / 25.0;
    const ycval = this.getYcVal();
    return (
      thickness / 4.0 +
      Math.sqrt(
        Math.max(0, (thickness * thickness) / 16.0 + ycval * ycval + 1.0)
      )
    );
  }
  // --- helpers ---

  getConvDr() {
    return Math.PI / 180;
  }

  getUnits() {
    return this.units;
  }

  getEnvironment() {
    return this.environment;
  }

  getVelocityConv() {
    return velocityConv(this.units);
  }

  getLengthConv() {
    return lengthConv(this.units);
  }

  getForceConv() {
    return forceConv(this.units);
  }

  getAtmosphere() {
    return getAtmosphere({
      environment: this.environment,
      altitude: this.altitude,
      units: this.units,
    });
  }
  _getEnvScalar(kind, envOverride) {
    const env = envOverride ?? this.environment;

    const { rho, ps0, q0Factor, ts0, mu } = getAtmosphere({
      environment: env,
      altitude: this.altitude,
      units: this.units,
    });

    const v = this.getVelocity();

    switch (kind) {
      case "rho":
        return rho;
      case "pressure":
        return ps0;
      case "q0":
        // match your getDynamicPressure style: q0Factor * V^2
        return q0Factor * v * v;
      case "temp":
        return ts0;
      case "mu":
        return mu;
      default:
        return undefined;
    }
  }

  getReynolds() {
    const { rho, mu } = this.getAtmosphere();
    const vconv = this.getVelocityConv();
    const lconv = this.getLengthConv();
    const chord = this.getChord();
    const v = this.getVelocity();
    if (v === 0 || mu === 0) return 0;
    return (v / vconv) * (chord / lconv) * (rho / mu);
  }

  getDynamicPressure() {
    // q0 = 0.5 * rho * V^2 / vconv^2
    const { q0Factor } = this.getAtmosphere();
    const v = this.getVelocity();
    return q0Factor * v * v;
  }

  getPconv() {
    switch (this.units) {
      case UnitSystem.IMPERIAL:
        return 14.7; // psi
      case UnitSystem.METRIC:
        return 101.3; // kPa
      default:
        return 1.0;
    }
  }
  getPiD2() {
    return Math.PI / 2;
  }

  //
  // density
  getRhoEarth() {
    return this._getEnvScalar("rho", Environment.EARTH);
  }
  getRhoMars() {
    return this._getEnvScalar("rho", Environment.MARS);
  }
  getRhoMercury() {
    return this._getEnvScalar("rho", Environment.MERCURY);
  }
  getRhoVenus() {
    return this._getEnvScalar("rho", Environment.VENUS);
  }

  // static pressure
  getPressureEarth() {
    return this._getEnvScalar("pressure", Environment.EARTH);
  }
  getPressureMars() {
    return this._getEnvScalar("pressure", Environment.MARS);
  }
  getPressureMercury() {
    return this._getEnvScalar("pressure", Environment.MERCURY);
  }
  getPressureVenus() {
    return this._getEnvScalar("pressure", Environment.VENUS);
  }

  // dynamic pressure q0
  getQ0Earth() {
    return this._getEnvScalar("q0", Environment.EARTH);
  }
  getQ0Mars() {
    return this._getEnvScalar("q0", Environment.MARS);
  }
  getQ0Mercury() {
    return this._getEnvScalar("q0", Environment.MERCURY);
  }
  getQ0Venus() {
    return this._getEnvScalar("q0", Environment.VENUS);
  }

  // temperature
  getTempEarth() {
    return this._getEnvScalar("temp", Environment.EARTH);
  }
  getTempMars() {
    return this._getEnvScalar("temp", Environment.MARS);
  }
  getMercuryTemp() {
    return this._getEnvScalar("temp", Environment.MERCURY);
  }
  getTempVenus() {
    return this._getEnvScalar("temp", Environment.VENUS);
  }

  // viscosity
  getViscosEarth() {
    return this._getEnvScalar("mu", Environment.EARTH);
  }
  getViscosMars() {
    return this._getEnvScalar("mu", Environment.MARS);
  }
  getViscosMercury() {
    return this._getEnvScalar("mu", Environment.MERCURY);
  }
  getViscosVenus() {
    return this._getEnvScalar("mu", Environment.VENUS);
  }
}
export class Airfoil extends Shape {
  constructor({
    angleDeg,
    camberPercent,
    thicknessPercent,
    velocity,
    altitude,
    chord,
    span,
    wingArea,
    units = UnitSystem.METRIC,
    environment = Environment.EARTH,
    aspectRatioCorrection = true,
    inducedDrag = true,
    reynoldsCorrection = true,
    liftMode = 1, // 1 = "stall" (clamped), 2 = "ideal"
  }) {
    super({
      angleDeg,
      camberPercent,
      thicknessPercent,
      velocity,
      altitude,
      chord,
      span,
      wingArea,
      units,
      environment,
    });

    this.aspectRatioCorrection = aspectRatioCorrection;
    this.inducedDrag = inducedDrag;
    this.reynoldsCorrection = reynoldsCorrection;
    this.liftMode = liftMode;
  }

  // ---- coefficients ---------------------------------------------------------

  getLiftCoefficient() {
    const deg2rad = Math.PI / 180;
    const alpha = this.getAngle() * deg2rad; // rad

    const camberPct = this.getCamber() || 0;
    const alpha0 = (-camberPct / 20) * deg2rad; // crude zero-lift shift

    let cl = 2 * Math.PI * (alpha - alpha0);

    if (this.liftMode === 1) {
      const clMax = 1.8;
      if (cl > clMax) cl = clMax;
      if (cl < -clMax) cl = -clMax;
    }

    if (this.aspectRatioCorrection) {
      const ar = this.getAspectRatio() || 1;
      cl = cl / (1 + Math.abs(cl) / (Math.PI * ar));
    }

    if (!this.getVelocity()) {
      cl = 0;
    }

    return cl;
  }

  _getBaseCd0() {
    const tPct = this.getThickness() || 0;
    return 0.01 + 0.02 * (tPct / 12.0);
  }

  getDragCoefficient() {
    if (!this.getVelocity()) return 0;

    let cd = this._getBaseCd0();
    const cl = this.getLiftCoefficient();
    const ar = this.getAspectRatio() || 1;

    if (this.inducedDrag) {
      const k = 1 / (Math.PI * ar * 0.85);
      cd += k * cl * cl;
    }

    if (this.reynoldsCorrection) {
      const re = this.getReynolds();
      if (re > 0) {
        const reRef = 5e4;
        const factor = Math.pow(reRef / Math.max(re, reRef), 0.11);
        cd *= factor;
      }
    }

    return cd;
  }

  // ---- forces ---------------------------------------------------------------

  getLift() {
    if (!this.getVelocity()) return 0;

    const q = this.getDynamicPressure(); // uses Shape.getDynamicPressure()
    const S = this.getWingArea();
    const cl = this.getLiftCoefficient();

    return q * S * cl;
  }

  getDrag() {
    if (!this.getVelocity()) return 0;

    const q = this.getDynamicPressure();
    const S = this.getWingArea();
    const cd = this.getDragCoefficient();

    return q * S * cd;
  }

  getLiftOverDrag() {
    const L = this.getLift();
    const D = this.getDrag();
    if (!this.getVelocity() || !isFinite(L) || !isFinite(D) || D === 0) {
      return 0;
    }
    return L / D;
  }
}
export class Ellipse extends Shape {
  constructor(config) {
    // config is the same shape as for Shape
    super(config);
  }
}
export class Plate extends Shape {
  constructor(config) {
    super(config);
  }
}
export class Cylinder extends Shape {
  constructor(config) {
    super(config);
  }
}
export class Ball extends Shape {
  constructor(config) {
    super(config);
  }
}
