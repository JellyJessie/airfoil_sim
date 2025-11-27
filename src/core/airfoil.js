// src/core/airfoil.js
import { Shape } from "./shape.js";
import { ENVIRONMENT } from "./constants.js";

export class Airfoil extends Shape {
  constructor(params, options = {}) {
    super(params);
    this.options = {
      aspectRatioCorrection: true, // ar
      inducedDrag: true, // induced
      reynoldsCorrection: true, // reCorrection
      liftMode: "stall", // "stall" or "ideal" (liftAnalisis)
      ...options,
    };
  }

  // --- geometry helpers (from original Airfoil class) ---

  getCamVal() {
    return this.getCamber() / 25.0;
  }

  getThkVal() {
    return this.getThickness() / 25.0;
  }

  getYcVal() {
    return this.getCamVal() / 2.0;
  }

  getRVal() {
    const thk = this.getThkVal();
    const yc = this.getYcVal();
    return thk / 4.0 + Math.sqrt((thk * thk) / 16.0 + yc * yc + 1.0);
  }

  getXcVal() {
    const yc = this.getYcVal();
    const r = this.getRVal();
    return 1.0 - Math.sqrt(r * r - yc * yc);
  }

  getBeta() {
    const convdr = this.getConvDr();
    const r = this.getRVal();
    const yc = this.getYcVal();
    return Math.asin(yc / r) / convdr;
  }

  getGamVal() {
    const convdr = this.getConvDr();
    const beta = this.getBeta();
    const alpha = this.getAngle();
    const r = this.getRVal();
    return 2.0 * r * Math.sin((alpha + beta) * convdr);
  }

  getLeg() {
    const xc = this.getXcVal();
    const yc = this.getYcVal();
    const r = this.getRVal();
    return xc - Math.sqrt(r * r - yc * yc);
  }

  getTeg() {
    const xc = this.getXcVal();
    const yc = this.getYcVal();
    const r = this.getRVal();
    return xc + Math.sqrt(r * r - yc * yc);
  }

  getLem() {
    const leg = this.getLeg();
    return leg + 1.0 / leg;
  }

  getTem() {
    const teg = this.getTeg();
    return teg + 1.0 / teg;
  }

  getChrd() {
    return this.getTem() - this.getLem();
  }

  // --- aerodynamic coefficients ---

  getLiftCoefficient() {
    const pi = Math.PI;
    const alpha = this.getAngle();
    const gamval = this.getGamVal();
    const chrd = this.getChrd();

    if (this.getVelocity() === 0) return 0;

    let cl = (gamval * 4.0 * pi) / chrd;

    // stall factor (same as original)
    let stfact;
    if (alpha > 10.0) {
      stfact = 0.5 + 0.1 * alpha - 0.005 * alpha * alpha;
    } else if (alpha < -10.0) {
      stfact = 0.5 - 0.1 * alpha - 0.005 * alpha * alpha;
    } else {
      stfact = 1.0;
    }

    cl *= stfact;

    // aspect ratio correction
    if (this.options.aspectRatioCorrection) {
      const aspr = this.getAspectRatio();
      cl = cl / (1.0 + Math.abs(cl) / (pi * aspr));
    }

    return cl;
  }

  getDragCoefficient() {
    // NOTE: this mirrors the dragCam* polynomial logic from the original,
    // but wrapped in a method and with options for Re & induced drag.
    const camd = this.getCamber();
    const thkd = this.getThickness();
    const alfd = this.getAngle();

    // If "ideal" lift mode, drag is zero
    if (this.options.liftMode === "ideal" || this.getVelocity() === 0) {
      return 0;
    }

    // --- drag polynomial block (straight port of original) ---
    // For brevity here, I’m calling a helper.
    let dragco = baseProfileDragCoefficient(camd, thkd, alfd);

    const reynolds = this.getReynolds();
    const cl = this.getLiftCoefficient();
    const aspr = this.getAspectRatio();

    // Reynolds correction (original: dragco *= (50000/Re)^0.11)
    if (this.options.reynoldsCorrection && reynolds > 0) {
      dragco *= Math.pow(50000.0 / reynolds, 0.11);
    }

    // induced drag: CL^2 / (π AR 0.85)
    if (this.options.inducedDrag && aspr > 0) {
      dragco += (cl * cl) / (Math.PI * aspr * 0.85);
    }

    return dragco;
  }

  // --- forces ---

  getLift() {
    const v = this.getVelocity();
    if (v === 0) return 0;

    const q0 = this.getDynamicPressure(); // already includes V^2
    const cl = this.getLiftCoefficient();
    const s = this.getWingArea();
    const lconv = this.getLengthConv();
    const fconv = this.getForceConv();

    let lift = (q0 * s * cl) / (lconv * lconv);
    lift *= fconv;

    return lift;
  }

  getDrag() {
    const v = this.getVelocity();
    if (v === 0) return 0;

    const q0 = this.getDynamicPressure();
    const cd = this.getDragCoefficient();
    const s = this.getWingArea();
    const lconv = this.getLengthConv();
    const fconv = this.getForceConv();

    let drag = (cd * q0 * s) / (lconv * lconv);
    drag *= fconv;

    return drag;
  }

  getLiftOverDrag() {
    const lift = this.getLift();
    const drag = this.getDrag();
    if (lift === 0 || drag === 0) return 0;
    return lift / drag;
  }
}

// --- helper: raw profile drag polynomial from original JS ---
// This is basically FoilSimStudent_Calc.calculateDragCoefficient(camd,thkd,alfd)
// but isolated so Airfoil stays readable. :contentReference[oaicite:10]{index=10}
function baseProfileDragCoefficient(camd, thkd, alfd) {
  // Paste the polynomial block here exactly as in the original, but
  // written in modern JS (const/let, no document, no globals).
  // For brevity, the full block is omitted in this snippet, but structurally:
  //
  // 1. Compute dragCamXThkY polynomials in alfd
  // 2. Interpolate in camd (−20…20) to get dragThk5,10,15,20
  // 3. Interpolate in thkd (1…20) to get dragco
  //
  // Return dragco.
  //
  // You can literally port the block from FoilSimStudent_Calc.calculateDragCoefficient
  // into here with only variable name/style cleanups.

  // TODO: full polynomial port – but structure is ready.
  // For now, just return a small baseline to keep code compiling:
  return 0.02;
}

// --- D-style functional API for React / store usage ---
//
// This is what your React code will call: pass in a flat params object,
// get back all outputs needed for UI.

export function computeAirfoilAero(input, options) {
  const foil = new Airfoil(input, options);
  const cl = foil.getLiftCoefficient();
  const cd = foil.getDragCoefficient();
  const lift = foil.getLift();
  const drag = foil.getDrag();
  const ld = foil.getLiftOverDrag();
  const reynolds = foil.getReynolds();

  return {
    cl,
    cd,
    lift,
    drag,
    ld,
    reynolds,
  };
}
