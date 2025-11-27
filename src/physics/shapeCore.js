// src/physics/shapeCore.js

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

// -----------------------------------------------------------------------------
// Base Shape class: stores geometry, flow, and environment
// -----------------------------------------------------------------------------

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
    { units = UnitSystem.METRIC, environment = Environment.EARTH } = {}
  ) {
    this.angle = angle; // deg
    this.camber = camber; // %
    this.thickness = thickness; // %
    this.velocity = velocity; // V input
    this.altitude = altitude;
    this.chord = chord;
    this.span = span;
    this.wingArea = wingArea;

    this.units = units;
    this.environment = environment;
  }

  // --- setters / getters -----------------------------------------------------

  setAngle(a) {
    this.angle = a;
  }
  setCamber(c) {
    this.camber = c;
  }
  setThickness(t) {
    this.thickness = t;
  }
  setVelocity(v) {
    this.velocity = v;
  }
  setAltitude(h) {
    this.altitude = h;
  }
  setChord(c) {
    this.chord = c;
  }
  setSpan(s) {
    this.span = s;
  }
  setWingArea(S) {
    this.wingArea = S;
  }
  setUnits(u) {
    this.units = u;
  }
  setEnvironment(env) {
    this.environment = env;
  }

  getAngle() {
    return this.angle;
  }
  getCamber() {
    return this.camber;
  }
  getThickness() {
    return this.thickness;
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
  getWingArea() {
    return this.wingArea;
  }

  getAspr() {
    const c = this.getChord();
    const b = this.getSpan();
    if (!c || !b) return 0;
    return b / c;
  }

  // --- unit conversions (inspired by original NASA code) --------------------

  // these mimic the old vconv / lconv / fconv logic so your numbers
  // "feel" similar to the applet

  // velocity conversion factor used in old code
  getVconv() {
    switch (this.units) {
      case UnitSystem.IMPERIAL:
        // mph -> ft/s
        return 0.6818;
      case UnitSystem.METRIC:
        // km/h -> m/s (approx same flavor as old 1.097)
        return 1.097;
      default:
        return 1.0;
    }
  }

  // length conversion factor
  getLconv() {
    switch (this.units) {
      case UnitSystem.IMPERIAL:
        // ft
        return 1.0;
      case UnitSystem.METRIC:
        // ft -> m
        return 0.3048;
      default:
        return 1.0;
    }
  }

  // force conversion (lb -> N)
  getFconv() {
    switch (this.units) {
      case UnitSystem.IMPERIAL:
        return 1.0;
      case UnitSystem.METRIC:
        return 4.448;
      default:
        return 1.0;
    }
  }

  // ---------------------------------------------------------------------------
  // Simple atmosphere models (much simpler than the full original, but good
  // enough for demo and keeps everything parameter-driven).
  // ---------------------------------------------------------------------------

  // we work internally in SI-like units and just tweak with vconv / lconv

  _getRhoAndMu() {
    // density [kg/m^3], dynamic viscosity [Pa·s] – rough constants
    switch (this.environment) {
      case Environment.MARS:
        return { rho: 0.02, mu: 1e-5 }; // very thin air
      case Environment.MERCURY:
        return { rho: 1000.0, mu: 1e-3 }; // mercury
      case Environment.VENUS:
        return { rho: 65.0, mu: 9e-5 }; // very dense
      case Environment.EARTH:
      default:
        return { rho: 1.225, mu: 1.81e-5 }; // sea-level air
    }
  }

  // convert input velocity to m/s-ish for physics
  _getVelocitySI() {
    const V = this.getVelocity();
    if (!V) return 0;

    if (this.units === UnitSystem.IMPERIAL) {
      // mph -> m/s
      return V * 0.44704;
    }
    // assume metric "m/s like"
    return V;
  }

  // chord to meters-ish
  _getChordSI() {
    const c = this.getChord();
    if (!c) return 0;
    if (this.units === UnitSystem.IMPERIAL) {
      // ft -> m
      return c * 0.3048;
    }
    return c;
  }

  _getAreaSI() {
    const S = this.getWingArea();
    if (!S) return 0;
    if (this.units === UnitSystem.IMPERIAL) {
      // ft^2 -> m^2
      return S * 0.092903;
    }
    return S;
  }

  // dynamic pressure 0.5 rho V^2 (SI-ish)
  _getQ() {
    const { rho } = this._getRhoAndMu();
    const V = this._getVelocitySI();
    return 0.5 * rho * V * V;
  }

  // public Reynolds number: rho V c / mu
  getReynolds() {
    const { rho, mu } = this._getRhoAndMu();
    const V = this._getVelocitySI();
    const c = this._getChordSI();
    if (!rho || !V || !c || !mu) return 0;
    return (rho * V * c) / mu;
  }
}

// -----------------------------------------------------------------------------
// Airfoil class: aerodynamic coefficients + lift/drag based on Shape
// -----------------------------------------------------------------------------

export class Airfoil extends Shape {
  constructor(
    angle,
    camber,
    thickness,
    velocity,
    altitude,
    chord,
    span,
    wingArea,
    {
      units = UnitSystem.METRIC,
      environment = Environment.EARTH,
      aspectRatioCorrection = true,
      inducedDrag = true,
      reynoldsCorrection = true,
      liftMode = 1, // 1 = "stall" (clamped), 2 = "ideal" (no stall clamp)
    } = {}
  ) {
    super(angle, camber, thickness, velocity, altitude, chord, span, wingArea, {
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
    // thin-airfoil type CL with simple camber effect
    const deg2rad = Math.PI / 180;
    const alpha = this.getAngle() * deg2rad; // rad

    // simple "zero-lift angle" shift based on camber (% of chord)
    const camberPct = this.getCamber() || 0;
    const alpha0 = (-camberPct / 20) * deg2rad; // crude

    let cl = 2 * Math.PI * (alpha - alpha0); // thin-airfoil slope

    // stall clamp in "realistic" mode
    if (this.liftMode === 1) {
      const clMax = 1.8;
      if (cl > clMax) cl = clMax;
      if (cl < -clMax) cl = -clMax;
    }

    // simple aspect-ratio correction (similar spirit to NASA code)
    if (this.aspectRatioCorrection) {
      const ar = this.getAspr() || 1;
      cl = cl / (1 + Math.abs(cl) / (Math.PI * ar));
    }

    if (!this.getVelocity()) {
      cl = 0;
    }

    return cl;
  }

  _getBaseCd0() {
    // crude parasitic drag: increases with thickness slightly
    const tPct = this.getThickness() || 0;
    return 0.01 + 0.02 * (tPct / 12.0);
  }

  getDragCoefficient() {
    if (!this.getVelocity()) return 0;

    let cd = this._getBaseCd0();
    const cl = this.getLiftCoefficient();
    const ar = this.getAspr() || 1;

    // induced drag term: k * CL^2
    if (this.inducedDrag) {
      const k = 1 / (Math.PI * ar * 0.85);
      cd += k * cl * cl;
    }

    // Reynolds correction similar in spirit to original: lower Re => more drag
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

  _getQeffective() {
    // dynamic pressure in SI-ish units; we'll scale to user units later
    return this._getQ();
  }

  getLift() {
    if (!this.getVelocity()) return 0;

    const q = this._getQeffective();
    const S = this._getAreaSI();
    const cl = this.getLiftCoefficient();

    // Lift in "SI-ish" Newtons
    let L = q * S * cl;

    // Convert back to something consistent with original units idea
    // We just use Fconv as a global scale knob.
    const fconv = this.getFconv();
    L *= fconv;

    return L;
  }

  getDrag() {
    if (!this.getVelocity()) return 0;

    const q = this._getQeffective();
    const S = this._getAreaSI();
    const cd = this.getDragCoefficient();

    let D = q * S * cd;

    const fconv = this.getFconv();
    D *= fconv;

    return D;
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

  // --- basic getters / setters (unchanged idea) -----------------------------

  setAngle(angle) {
    this.angle = angle;
  }
  setCamber(camber) {
    this.camber = camber;
  }
  setThickness(thickness) {
    this.thickness = thickness;
  }
  setVelocity(velocity) {
    this.velocity = velocity;
  }
  setAltitude(altitude) {
    this.altitude = altitude;
  }
  setChord(chord) {
    this.chord = chord;
  }
  setSpan(span) {
    this.span = span;
  }
  setWingArea(wingArea) {
    this.wingArea = wingArea;
  }

  setUnits(units) {
    this.units = units;
  }
  setEnvironment(environment) {
    this.environment = environment;
  }

  getAngle() {
    return this.angle;
  }
  getCamber() {
    return this.camber;
  }
  getThickness() {
    return this.thickness;
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
  getWingArea() {
    return this.wingArea;
  }

  getAspr() {
    return this.getSpan() / this.getChord();
  }

  // --- original thermodynamic helpers (same formulas, no DOM) --------------

  getRGasEarth() {
    return 1716;
  } // :contentReference[oaicite:2]{index=2}
  getGamaEarth() {
    return 1.4;
  }

  getConvDr() {
    return Math.PI / 180;
  }
  getPiD2() {
    return Math.PI / 2;
  }
  getMu0() {
    return 0.000000362;
  }

  // altitude / environment helpers (same as original, but rely only on this.*)
  getLconv() {
    // ORIGINAL: looked at document.getElementById("unitsButton").innerHTML. :contentReference[oaicite:3]{index=3}
    // NOW: purely driven by this.units.
    switch (this.units) {
      case UnitSystem.IMPERIAL:
        return 1.0;
      case UnitSystem.METRIC:
        return 0.3048;
      default:
        return 1.0;
    }
  }

  getVconv() {
    // ORIGINAL: dependent on DOM units button. :contentReference[oaicite:4]{index=4}
    switch (this.units) {
      case UnitSystem.IMPERIAL:
        return 0.6818;
      case UnitSystem.METRIC:
        return 1.097;
      default:
        return 1.0;
    }
  }

  getFconv() {
    // ORIGINAL: english=1, metric=4.448. :contentReference[oaicite:5]{index=5}
    switch (this.units) {
      case UnitSystem.IMPERIAL:
        return 1.0;
      case UnitSystem.METRIC:
        return 4.448;
      default:
        return 1.0;
    }
  }

  getPconv() {
    // ORIGINAL: english=14.7, metric=101.3. :contentReference[oaicite:6]{index=6}
    switch (this.units) {
      case UnitSystem.IMPERIAL:
        return 14.7;
      case UnitSystem.METRIC:
        return 101.3;
      default:
        return 1.0;
    }
  }

  getHite() {
    const altitude = this.getAltitude();
    const lconv = this.getLconv();
    return altitude / lconv;
  }

  // --- Earth atmosphere (same formulas as original Shape) -------------------

  getTempEarth() {
    const hite = this.getHite();
    let tempEarth = 0;

    if (hite <= 36152) {
      tempEarth = 518.6 - (3.56 * hite) / 1000;
    } else if (hite >= 36152 && hite <= 82345) {
      tempEarth = 389.98;
    }
    return tempEarth;
  }

  getPressureEarth() {
    const tempEarth = this.getTempEarth();
    const hite = this.getHite();
    let pressureEarth = 0;

    if (hite <= 36152) {
      pressureEarth = 2116.0 * Math.pow(tempEarth / 518.6, 5.256);
    } else if (hite >= 36152 && hite <= 82345) {
      pressureEarth =
        2116 * 0.2236 * Math.exp((36000.0 - hite) / (53.35 * 389.98));
    }
    return pressureEarth;
  }

  getTemfEarth() {
    const tempEarth = this.getTempEarth();
    let temf = tempEarth - 459.6;
    if (temf <= 0.0) temf = 0.0;
    return temf;
  }

  getPvapEarth() {
    const temf = this.getTemfEarth();
    const rlhum = 0.0; // original: depends on environmentSelect / rlhum. :contentReference[oaicite:7]{index=7}
    const pvap = (rlhum * (2.685 + 0.00354 * Math.pow(temf, 2.245))) / 100.0;
    return pvap;
  }

  getRhoEarth() {
    const ps0 = this.getPressureEarth();
    const rgas = this.getRGasEarth();
    const ts0 = this.getTempEarth();
    const pvap = this.getPvapEarth();
    // original code recomputes rho then overwrites with humidity-adjusted one
    return (ps0 - 0.379 * pvap) / (rgas * ts0);
  }

  getViscosEarth() {
    const mu0 = this.getMu0();
    const ts0 = this.getTempEarth();
    return ((mu0 * 717.408) / (ts0 + 198.72)) * Math.pow(ts0 / 518.688, 1.5);
  }

  // --- Mars / Mercury / Venus helpers (same formulas as original) -------------

  // (shortened for brevity — you can copy your existing getRGasMars,
  //  getTempMars, getRhoMars, getViscosMars, getRhoMercury, getViscosMercury,
  //  getRhoVenus, getViscosVenus straight from shapeCore.js)

  getRGasMars() {
    return 1149;
  }
  getGamaMars() {
    return 1.29;
  }

  getTempMars() {
    const hite = this.getHite();
    if (hite <= 22960) return 434.02 - (0.548 * hite) / 1000.0;
    return 449.36 - (1.217 * hite) / 1000.0;
  }

  getPressureMars() {
    const hite = this.getHite();
    // both branches same in original
    return 14.62 * Math.pow(2.71828, -0.00003 * hite);
  }

  getRhoMars() {
    const ts0 = this.getTempMars();
    const rgas = this.getRGasMars();
    const ps0 = this.getPressureMars();
    return ps0 / (rgas * ts0);
  }

  getViscosMars() {
    const ts0 = this.getTempMars();
    const mu0 = this.getMu0();
    return ((mu0 * 717.408) / (ts0 + 198.72)) * Math.pow(ts0 / 518.688, 1.5);
  }

  // Mercury
  getMercuryTemp() {
    return 520;
  }
  getRhoMercury() {
    return 1.94;
  }

  getHiteConstMercury() {
    const altitude = this.getAltitude();
    const lconv = this.getLconv();
    return -altitude / lconv;
  }

  getPressureMercury() {
    const g0 = this.units === UnitSystem.IMPERIAL ? 32.2 : 9.81;
    const hite = this.getHiteConstMercury();
    const rho = this.getRhoMercury();
    return 2116.0 - rho * g0 * hite;
  }

  getMu0Mercury() {
    return 0.0000272;
  }

  getViscosMercury() {
    const ts0 = this.getMercuryTemp();
    const mu0 = this.getMu0Mercury();
    return ((mu0 * 717.408) / (ts0 + 198.72)) * Math.pow(ts0 / 518.688, 1.5);
  }

  // venus
  getRGasVenus() {
    return 1149;
  }
  getGamaVenus() {
    return 1.29;
  }
  getTempVenus() {
    return 1331.6;
  }
  getPressureVenus() {
    return 194672.0;
  }

  getRhoVenus() {
    const ts0 = this.getTempVenus();
    const rgas = this.getRGasVenus();
    const ps0 = this.getPressureVenus();
    return ps0 / (rgas * ts0);
  }

  getViscosVenus() {
    const ts0 = this.getTempVenus();
    const mu0 = this.getMu0();
    return ((mu0 * 717.408) / (ts0 + 198.72)) * Math.pow(ts0 / 518.688, 1.5);
  }

  // --- dynamic pressure helpers (still pure) --------------------------------

  getQ0Earth() {
    const vconv = this.getVconv();
    const vfsd = this.getVelocity();
    const rho = this.getRhoEarth();
    return (0.5 * rho * vfsd * vfsd) / (vconv * vconv);
  }

  getQ0Mars() {
    const vconv = this.getVconv();
    const vfsd = this.getVelocity();
    const rho = this.getRhoMars();
    return (0.5 * rho * vfsd * vfsd) / (vconv * vconv);
  }

  getQ0Mercury() {
    const vconv = this.getVconv();
    const vfsd = this.getVelocity();
    const rho = this.getRhoMercury();
    return (0.5 * rho * vfsd * vfsd) / (vconv * vconv);
  }

  getQ0Venus() {
    const vconv = this.getVconv();
    const vfsd = this.getVelocity();
    const rho = this.getRhoVenus();
    return (0.5 * rho * vfsd * vfsd) / (vconv * vconv);
  }

  // --- fully parameter-driven Reynolds number -------------------------------

  /**
   * Returns Reynolds number, using:
   *   - this.environment: "earth" | "mars" | "mercury" | "venus"
   *   - current velocity, chord, units
   * NO DOM, NO globals.

  getReynolds() {
    let rho = 0;
    let viscos = 0;

    switch (this.environment) {
      case Environment.EARTH:
        rho = this.getRhoEarth();
        viscos = this.getViscosEarth();
        break;
      case Environment.MARS:
        rho = this.getRhoMars();
        viscos = this.getViscosMars();
        break;
      case Environment.mercury:
        rho = this.getRhoMercury();
        viscos = this.getViscosMercury();
        break;
      case Environment.VENUS:
        rho = this.getRhoVenus();
        viscos = this.getViscosVenus();
        break;
      default:
        // Fallback to Earth if unknown
        rho = this.getRhoEarth();
        viscos = this.getViscosEarth();
        break;
    }

    const lconv = this.getLconv();
    const chord = this.getChord();
    const vfsd = this.getVelocity();
    const vconv = this.getVconv();

    const reynolds = (vfsd / vconv) * (chord / lconv) * (rho / viscos);
    return reynolds;
  }
}
*/
