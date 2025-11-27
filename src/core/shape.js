// src/core/shape.js
import { velocityConv, lengthConv, forceConv } from "./units.js";
import { getAtmosphere } from "./environment.js";

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
    units,
    environment,
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
}
