import {
  getConvdr,
  getxcVal,
  getycVal,
  getrVal,
  getGamVal,
} from "./foilPhysics"; // adjust paths/names to match your file

export function isNum(x) {
  return Number.isFinite(x);
}

export function safeNum(x, fallback = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

// -----------------------------------------------------------------------------
// Potential Streamline Value (replaces getPSV)
// -----------------------------------------------------------------------------

export function getPSV(k, nln2) {
  return -0.5 * (nln2 - 1) + 0.5 * (k - 1);
}

// -----------------------------------------------------------------------------
// Fixed upstream x (replaces getFxg)
// -----------------------------------------------------------------------------

export function getFxg() {
  return -10.0;
}

// -----------------------------------------------------------------------------
// Polar helpers
// -----------------------------------------------------------------------------

export function getLrg(x, y) {
  return Math.sqrt(x * x + y * y);
}

export function getLthg(x, y) {
  const convdr = getConvdr();
  return Math.atan2(y, x) / convdr;
}

// -----------------------------------------------------------------------------
// Joukowski map helpers
// -----------------------------------------------------------------------------

export function getLxm(r, theta) {
  const convdr = getConvdr();
  return (r + 1.0 / r) * Math.cos(convdr * theta);
}

export function getLym(r, theta) {
  const convdr = getConvdr();
  return (r - 1.0 / r) * Math.sin(convdr * theta);
}

export function getRadm(xm, ym) {
  return Math.sqrt(xm * xm + ym * ym);
}

export function getThetm(xm, ym) {
  const convdr = getConvdr();
  return Math.atan2(ym, xm) / convdr;
}

export function getLxmt(thetm, radm, alfval) {
  const convdr = getConvdr();
  return radm * Math.cos(convdr * (thetm - alfval));
}

export function getLymt(thetm, radm, alfval) {
  const convdr = getConvdr();
  return radm * Math.sin(convdr * (thetm - alfval));
}

/**
 * Pure version of your old getLyg(fxg, psv, alfval, rval, gamval)
 * Uses a Newton iteration to solve the streamline equation for y.
 */
function solveLyg({ fxg, psv, alphaDeg, rval, gamval }) {
  // Initial guess: ±10 depending on which side of the flow we are
  let ynew = psv < 0 ? -10.0 : 10.0;
  let yold = ynew;

  // Special handling near the stagnation streamline (psv ≈ 0)
  if (Math.abs(psv) < 0.001) {
    if (alphaDeg < 0.0) {
      ynew = rval;
    } else {
      ynew = -rval;
    }
    yold = ynew;
  }

  let fnew = 0.1;
  let iter = 1;

  while (Math.abs(fnew) >= 0.00001 && iter < 25) {
    iter++;

    // r^2 in the cylinder plane
    let rfac = fxg * fxg + ynew * ynew;
    if (rfac < rval * rval) {
      // protection: keep r outside the cylinder
      rfac = rval * rval + 0.01;
    }

    const term = 1.0 - (rval * rval) / rfac;
    const sqrtRfac = Math.sqrt(rfac);

    // Stream function residual (same as legacy)
    fnew = psv - ynew * term - gamval * Math.log(sqrtRfac / rval);

    // d(f)/d(y)
    let deriv =
      -term -
      (2.0 * ynew * ynew * rval * rval) / (rfac * rfac) -
      (gamval * ynew) / rfac;

    // If derivative is tiny, stop to avoid huge steps / NaNs
    if (Math.abs(deriv) < 1e-8) {
      break;
    }

    yold = ynew;
    ynew = ynew - (0.5 * fnew) / deriv; // same 0.5 relaxation factor as original
  }

  // Legacy code returns yold (last stable iterate), not the very last ynew
  return yold;
}

/**
 * Core flow-field generator.
 * This replaces your huge p5.js draw() + streamline loops with a pure function.
 *
 * It returns:
 *  - bodyPoints: points along the mapped airfoil surface
 *  - streamlines: array of { x, y } arrays, one per streamline
 */
// INTERNAL: generates streamlines only, using your structured helpers
function generateStreamlines({
  alphaDeg,
  xcval,
  ycval,
  rval,
  gamval,
  nStream = 15,
  nPoints = 37,
}) {
  const convdr = getConvdr();
  const nln2 = nStream / 2 + 1;
  const field = [];

  for (let k = 1; k <= nStream; k++) {
    const psv = getPSV(k, nln2);
    let fxg = getFxg();

    const streamline = [];

    for (let i = 1; i <= nPoints; i++) {
      const lyg = solveLyg({
        fxg,
        psv,
        alphaDeg,
        rval,
        gamval,
      });

      const lrg = getLrg(fxg, lyg);
      const lthg = getLthg(fxg, lyg);

      const lxgt = lrg * Math.cos(convdr * (lthg + alphaDeg));
      const lygt = lrg * Math.sin(convdr * (lthg + alphaDeg));

      const xshift = lxgt + xcval;
      const yshift = lygt + ycval;

      const lrgt = Math.sqrt(xshift * xshift + yshift * yshift);
      const lthgt = Math.atan2(yshift, xshift) / convdr;

      const lxm = getLxm(lrgt, lthgt);
      const lym = getLym(lrgt, lthgt);

      const radm = getRadm(lxm, lym);
      const thetm = getThetm(lxm, lym);

      const lxmt = getLxmt(thetm, radm, alphaDeg);
      const lymt = getLymt(thetm, radm, alphaDeg);

      streamline.push({
        xCylinder: fxg,
        yCylinder: lyg,
        xMapped: lxmt,
        yMapped: lymt,
      });

      fxg += 0.5; // legacy deltb
    }

    field.push(streamline);
  }

  return field;
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// -----------------------------------------------------------------------------
// Geometry
// NACA-like (simple camber line) geometry that matches your 2D panel expectation
// Returns BOTH a closed loop polyline and upper/lower arrays.
// -----------------------------------------------------------------------------
export function generateAirfoilGeometry({
  chord,
  camberPct,
  thicknessPct,
  n = 80,
  angleDeg = angleDeg,
}) {
  const m = (camberPct ?? 0) / 100;
  const t = (thicknessPct ?? 0) / 100;

  const x = [];
  for (let i = 0; i < n; i++) {
    const beta = (i / (n - 1)) * Math.PI;
    x.push((1 - Math.cos(beta)) / 2); // cosine spacing 0..1
  }

  // thickness distribution (classic NACA 00xx)
  const yt = x.map(
    (xi) =>
      5 *
      t *
      (0.2969 * Math.sqrt(Math.max(0, xi)) -
        0.126 * xi -
        0.3516 * xi ** 2 +
        0.2843 * xi ** 3 -
        0.1015 * xi ** 4)
  );

  // simple camber line (keeps your camberPct behavior stable)
  const yc = x.map((xi) => m * (2 * xi - xi ** 2));
  const dyc = x.map((xi) => m * (2 - 2 * xi));
  const theta = dyc.map((d) => Math.atan(d));

  const upper = x.map((xi, i) => ({
    x: chord * (xi - yt[i] * Math.sin(theta[i])),
    y: chord * (yc[i] + yt[i] * Math.cos(theta[i])),
  }));

  const lower = x.map((xi, i) => ({
    x: chord * (xi + yt[i] * Math.sin(theta[i])),
    y: chord * (yc[i] - yt[i] * Math.cos(theta[i])),
  }));

  // closed loop: upper LE->TE then lower TE->LE
  let loop = [...upper, ...lower.slice().reverse()];

  if (angleDeg) loop = loop.map((p) => rotateXY(p, angleDeg));

  return {
    upper: angleDeg ? upper.map((p) => rotateXY(p, angleDeg)) : upper,
    lower: angleDeg ? lower.map((p) => rotateXY(p, angleDeg)) : lower,
    loop,
  };
}

// the real shapeCore.js math
// NACA-like generic airfoil geometry (placeholder).
// Replace with the actual NASA geometry logic from shapeCore.js.
// NACA-style airfoil geometry (upper+lower)
// - camberPct: % chord (e.g. 2)
// - thicknessPct: % chord (e.g. 12.5)
// - chord: length in your plot units (usually 1.0)
// - camberPos: fraction of chord (p), default 0.4 (NACA 2412-style)
export function generateAirfoilCoordinates(state, numPoints = 101) {
  const chord = Number(state.chord ?? 1);
  const camberPct = Number(state.camberPct ?? 0);
  const thicknessPct = Number(state.thicknessPct ?? 12);
  const p = Number(state.camberPos ?? state.p ?? 0.4); // if you have p in state, use it

  const m = camberPct / 100; // max camber as fraction of chord
  const t = thicknessPct / 100; // thickness as fraction of chord
  const c = chord;

  // cosine spacing gives nicer LE resolution
  const x = [];
  for (let i = 0; i < numPoints; i++) {
    const beta = (i * Math.PI) / (numPoints - 1);
    x.push((1 - Math.cos(beta)) / 2); // 0..1
  }

  const upper = [];
  const lower = [];

  for (let i = 0; i < numPoints; i++) {
    const xc = x[i]; // 0..1
    const xi = xc * c; // physical x

    // thickness distribution (NACA)
    const yt =
      5 *
      t *
      c *
      (0.2969 * Math.sqrt(Math.max(xc, 1e-9)) -
        0.126 * xc -
        0.3516 * xc * xc +
        0.2843 * xc * xc * xc -
        0.1015 * xc * xc * xc * xc);

    // camber line yc and slope dyc/dx (piecewise, needs p)
    let yc = 0;
    let dyc = 0;
    if (m > 0 && p > 0 && p < 1) {
      if (xc < p) {
        yc = (m / (p * p)) * (2 * p * xc - xc * xc) * c;
        dyc = ((2 * m) / (p * p)) * (p - xc);
      } else {
        yc = (m / ((1 - p) * (1 - p))) * (1 - 2 * p + 2 * p * xc - xc * xc) * c;
        dyc = ((2 * m) / ((1 - p) * (1 - p))) * (p - xc);
      }
    }

    const theta = Math.atan(dyc);

    // rotate thickness normal to camber line
    const xu = xi - yt * Math.sin(theta);
    const yu = yc + yt * Math.cos(theta);
    const xl = xi + yt * Math.sin(theta);
    const yl = yc - yt * Math.cos(theta);

    upper.push({ x: xu, y: yu });
    lower.push({ x: xl, y: yl });
  }

  // return both and also a closed loop (easy for canvas)
  const loop = [...upper, ...lower.reverse()];
  return { upper, lower, loop };
}

// ---- normalize FoilSim-ish inputs ----
function normPct(x) {
  // supports: 0.02 (meaning 2%) OR 2 (meaning 2%)
  if (!Number.isFinite(x)) return 0;
  return x > 1 ? x / 100 : x;
}

// Generate upper/lower (each length n=19) as two polylines: LE -> TE
export function generateAirfoilUpperLower({
  chord = 1,
  camberPct = 0,
  thicknessPct = 0.12,
  n = 19, // IMPORTANT: 19 for classic FoilSim packing
}) {
  const m = normPct(camberPct); // max camber as fraction of chord
  const t = normPct(thicknessPct); // thickness as fraction of chord

  // cosine spacing x in [0..1]
  const x = [];
  for (let i = 0; i < n; i++) {
    const beta = (i / (n - 1)) * Math.PI;
    x.push((1 - Math.cos(beta)) / 2);
  }

  // thickness distribution (NACA-style)
  const yt = x.map((xi) => {
    const a0 = 0.2969;
    const a1 = -0.126;
    const a2 = -0.3516;
    const a3 = 0.2843;
    const a4 = -0.1015;
    return (
      5 *
      t *
      (a0 * Math.sqrt(Math.max(xi, 0)) +
        a1 * xi +
        a2 * xi * xi +
        a3 * xi * xi * xi +
        a4 * xi * xi * xi * xi)
    );
  });

  // simple parabolic camber line (FoilSim-like “m” only)
  const yc = x.map((xi) => m * (2 * xi - xi * xi));
  const dyc = x.map((xi) => m * (2 - 2 * xi));
  const theta = dyc.map((d) => Math.atan(d));

  // LE -> TE upper/lower
  const upper = x.map((xi, i) => ({
    x: chord * (xi - yt[i] * Math.sin(theta[i])),
    y: chord * (yc[i] + yt[i] * Math.cos(theta[i])),
  }));

  const lower = x.map((xi, i) => ({
    x: chord * (xi + yt[i] * Math.sin(theta[i])),
    y: chord * (yc[i] - yt[i] * Math.cos(theta[i])),
  }));

  return { upper, lower }; // both LE->TE
}

// Rotate points around origin in XY
export function rotateXY(p, deg) {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { x: p.x * c - p.y * s, y: p.x * s + p.y * c };
}

// Pack upper+lower into classic FoilSim arrays (1..37 with npt2=19)
export function packUpperLowerToXmYm({ upper, lower, alphaDeg = 0 }) {
  const npt2 = upper.length; // 19
  const nptc = 2 * npt2 - 1; // 37
  const xm0 = Array(nptc + 1).fill(0); // indices 0..37 (we use 1..37)
  const ym0 = Array(nptc + 1).fill(0);

  // optional AoA rotation of geometry (like legacy “view fixed freestream”)
  const U = alphaDeg ? upper.map((p) => rotateXY(p, alphaDeg)) : upper;
  const L = alphaDeg ? lower.map((p) => rotateXY(p, alphaDeg)) : lower;

  // 1..(npt2-1): LOWER surface TE->LE (excluding LE)
  // lower is LE->TE, so TE is last index
  for (let i = 1; i <= npt2 - 1; i++) {
    const p = L[npt2 - i]; // i=1 => TE, i=18 => near LE
    xm0[i] = p.x;
    ym0[i] = p.y;
  }

  // npt2: LE
  xm0[npt2] = U[0].x;
  ym0[npt2] = U[0].y;

  // (npt2+1)..nptc: UPPER surface LE->TE (excluding LE)
  for (let i = 1; i <= npt2 - 1; i++) {
    const p = U[i]; // start from U[1]
    xm0[npt2 + i] = p.x;
    ym0[npt2 + i] = p.y;
  }

  return { xm: [xm0], ym: [ym0], nptc, npt2 };
}

/**
 * Build FoilSim-style packed xm/ym arrays from a polyline.
 * Returns:
 *   xm = [ Float64Array(nptc+1) ] and ym = [ Float64Array(nptc+1) ]
 * where indices 1..nptc are valid (legacy-style).
 */
export function packXmYmFromLoop(loopPoints, nptc = 37) {
  const xm0 = new Array(nptc + 1).fill(0);
  const ym0 = new Array(nptc + 1).fill(0);

  if (!Array.isArray(loopPoints) || loopPoints.length < 4) {
    return { xm: [xm0], ym: [ym0] };
  }

  // Resample by index (fast + stable). For this UI it's sufficient.
  // If you want arc-length resampling later, we can swap it.
  for (let i = 1; i <= nptc; i++) {
    const t = (i - 1) / (nptc - 1);
    const idx = Math.round(t * (loopPoints.length - 1));
    const p = loopPoints[idx];
    xm0[i] = safeNum(p?.x, 0);
    ym0[i] = safeNum(p?.y, 0);
  }

  return { xm: [xm0], ym: [ym0] };
}
// Joukowski airfoil geometry (FoilSim / NASA style) - reordered to avoid chord line
// -----------------------------------------------------------------------------
/*export function generateJoukowskiAirfoilLoop({
  angleDeg,
  camberPct,
  thicknessPct,
  nptc = 37,
}) {
  const convdr = getConvdr();
  const ycval = getycVal(camberPct);
  const rval = getrVal(thicknessPct, camberPct);
  const xcval = getxcVal(thicknessPct, camberPct);
  const gamval = getGamVal(angleDeg, thicknessPct, camberPct); // Circulation is required for P/V

  const alfval = angleDeg * convdr;
  const raw = [];

  for (let index = 0; index < nptc; index++) {
    // 1. Calculate theta in the cylinder plane
    const thetDeg = (index * 360) / (nptc - 1);
    const thrad = thetDeg * convdr;

    // 2. Coordinates in cylinder plane
    const xg = rval * Math.cos(thrad) + xcval;
    const yg = rval * Math.sin(thrad) + ycval;

    const rg = Math.sqrt(xg * xg + yg * yg);
    const thg = Math.atan2(yg, xg); // radians

    // 3. Tangential Velocity on the cylinder surface
    // Vt = 2 * Vinf * sin(theta - alpha) + Gamma / (2 * pi * R)
    // We assume Vinf = 1.0 for the velocity ratio
    const vt = 2.0 * Math.sin(thrad - alfval) + gamval / (Math.PI * rval);

    // 4. Joukowski Mapping to Airfoil Plane
    let xm = (rg + 1.0 / rg) * Math.cos(thg);
    let ym = (rg - 1.0 / rg) * Math.sin(thg);

    // 5. Calculate Velocity Ratio (V/Vinf) using the complex derivative
    // |dW/dz| = |dW/dzeta| / |dz/dzeta|
    // |dz/dzeta| = |1 - 1/zeta^2|
    const zeta2 = rg * rg;
    const termX = 1.0 - Math.cos(2.0 * thg) / zeta2;
    const termY = Math.sin(2.0 * thg) / zeta2;
    const complexDeriv = Math.sqrt(termX * termX + termY * termY);

    // Local velocity ratio (plv)
    const vRatio = Math.abs(vt) / Math.max(complexDeriv, 0.01);

    // Pressure Coefficient (plp) via Bernoulli: Cp = 1 - (V/Vinf)^2
    const cp = 1.0 - vRatio * vRatio;

    // 6. Rotate to View Frame (Freestream Horizontal)
    const rdm = Math.sqrt(xm * xm + ym * ym);
    const thtm = Math.atan2(ym, xm);

    const finalX = rdm * Math.cos(thtm - alfval);
    const finalY = rdm * Math.sin(thtm - alfval);

    raw.push({
      x: finalX,
      y: finalY,
      cp: cp, // Will be mapped to plp
      vRatio: vRatio * 100, // Scaled for the fmtInt(v) in GeometryPanel
    });
  }

  // Find LE and TE to establish surface order (TE -> Upper -> LE -> Lower -> TE)
  let iLE = 0;
  let iTE = 0;
  for (let i = 1; i < raw.length; i++) {
    if (raw[i].x < raw[iLE].x) iLE = i;
    if (raw[i].x > raw[iTE].x) iTE = i;
  }

  const walk = (from, to) => {
    const out = [];
    let i = from;
    while (true) {
      out.push(raw[i]);
      if (i === to) break;
      i = (i + 1) % raw.length;
    }
    return out;
  };

  const path1 = walk(iTE, iLE);
  const avgY1 = path1.reduce((s, p) => s + p.y, 0) / path1.length;

  const upperTEtoLE = avgY1 >= 0 ? path1 : walk(iTE, iLE).reverse();
  const lowerLEtoTE = avgY1 >= 0 ? walk(iLE, iTE) : walk(iLE, iTE).reverse();

  // Closed loop for packing into xm/ym/plp/plv arrays
  const loop = [...upperTEtoLE, ...lowerLEtoTE.slice(1, -1)];

  return { loop, xcval, ycval, rval };
}*/
// src/physics/flowField.js

export function generateJoukowskiAirfoilLoop({
  angleDeg,
  camberPct,
  thicknessPct,
  nptc = 37,
}) {
  const convdr = Math.PI / 180;
  const ycval = getycVal(camberPct);
  const rval = getrVal(thicknessPct, camberPct);
  const xcval = getxcVal(thicknessPct, camberPct);
  const gamval = getGamVal(angleDeg, thicknessPct, camberPct);
  const alfval = angleDeg * convdr;

  const raw = [];
  // Generate a single 0-360 loop to avoid internal segments
  for (let i = 0; i < nptc; i++) {
    const thetaDeg = (i * 360) / (nptc - 1);
    const thrad = thetaDeg * convdr;

    const xg = rval * Math.cos(thrad) + xcval;
    const yg = rval * Math.sin(thrad) + ycval;
    const rg = Math.sqrt(xg * xg + yg * yg);
    const thg = Math.atan2(yg, xg);

    // Physics (P and V)
    const vt = 2.0 * Math.sin(thrad - alfval) + gamval / (Math.PI * rval);
    const zeta2 = rg * rg;
    const termX = 1.0 - Math.cos(2.0 * thg) / zeta2;
    const termY = Math.sin(2.0 * thg) / zeta2;
    const complexDeriv = Math.sqrt(termX * termX + termY * termY);

    const vRatio = Math.abs(vt) / Math.max(complexDeriv, 0.01);
    const cp = 1.0 - vRatio * vRatio;

    // Joukowski Mapping
    const lxm = (rg + 1.0 / rg) * Math.cos(thg);
    const lym = (rg - 1.0 / rg) * Math.sin(thg);

    // Rotation
    const rdm = Math.sqrt(lxm * lxm + lym * lym);
    const thtm = Math.atan2(lym, lxm);
    const x = rdm * Math.cos(thtm - alfval);
    const y = rdm * Math.sin(thtm - alfval);

    raw.push({ x, y, cp, vRatio: vRatio * 100 });
  }

  // Find the index of the Trailing Edge (furthest right point)
  let iTE = 0;
  for (let i = 1; i < raw.length; i++) {
    if (raw[i].x > raw[iTE].x) iTE = i;
  }

  // Reorder so the array starts and ends at the Trailing Edge
  const loop = [];
  for (let i = 0; i < nptc; i++) {
    loop.push(raw[(iTE + i) % nptc]);
  }

  return { loop, xcval, ycval, rval };
}
export function generateFlowField({
  angleDeg,
  camberPct,
  thicknessPct,
  nStream = 15,
  nPoints = 37,
}) {
  const convdr = getConvdr();
  const ycval = getycVal(camberPct);
  const rval = getrVal(thicknessPct, camberPct);
  const xcval = getxcVal(thicknessPct, camberPct);
  const gamval = getGamVal(angleDeg, thicknessPct, camberPct);

  // Body points (same as geometry generator)
  const { loop: bodyPoints } = generateJoukowskiAirfoilLoop({
    angleDeg,
    camberPct,
    thicknessPct,
    nptc: nPoints,
  });

  const streamlines = [];
  const nlnc = nStream;
  const nln2 = nlnc / 2 + 1;
  const nptc = nPoints;

  for (let k = 1; k <= nlnc; k++) {
    // same spacing as legacy getPSV (deltb=0.5)
    const psv = -0.5 * (nln2 - 1) + 0.5 * (k - 1);
    let fxg = -10.0; // upstream start
    const line = [];

    for (let idx = 1; idx <= nptc; idx++) {
      const lyg = solveLyg({ fxg, psv, alphaDeg: angleDeg, rval, gamval });

      // Cylinder-plane polar
      const lrg = Math.sqrt(fxg * fxg + lyg * lyg);
      const lthg = Math.atan2(lyg, fxg) / convdr;

      // rotate by AoA and shift to circle center (cylinder plane)
      let lxgt = lrg * Math.cos(convdr * (lthg + angleDeg));
      let lygt = lrg * Math.sin(convdr * (lthg + angleDeg));

      // translate cylinder
      lxgt += xcval;
      lygt += ycval;
      const lrgt = Math.sqrt(lxgt * lxgt + lygt * lygt);
      const lthgt = Math.atan2(lygt, lxgt) / convdr;

      // mapping
      let lxm = (lrgt + 1.0 / lrgt) * Math.cos(convdr * lthgt);
      let lym = (lrgt - 1.0 / lrgt) * Math.sin(convdr * lthgt);

      // rotate to view frame (free stream horizontal)
      const radm = Math.sqrt(lxm * lxm + lym * lym);
      const thetm = Math.atan2(lym, lxm) / convdr;

      lxm = radm * Math.cos(convdr * (thetm - angleDeg));
      lym = radm * Math.sin(convdr * (thetm - angleDeg));

      // stall model: freeze y on downstream side for separated streamlines
      if (angleDeg > 10.0 && psv > 0.0 && lxm > 0.0 && line.length > 0) {
        lym = line[line.length - 1].y;
      }
      if (angleDeg < -10.0 && psv < 0.0 && lxm > 0.0 && line.length > 0) {
        lym = line[line.length - 1].y;
      }

      line.push({ x: lxm, y: lym });

      // march along streamline: fxg += vxdir*deltb
      const thrad = convdr * lthg;
      const alfrad = convdr * angleDeg;

      const ur = Math.cos(thrad - alfrad) * (1.0 - (rval * rval) / (lrg * lrg));
      const uth =
        -Math.sin(thrad - alfrad) * (1.0 + (rval * rval) / (lrg * lrg)) -
        gamval / lrg;

      const vxdir = ur * Math.cos(thrad) - uth * Math.sin(thrad);
      fxg += vxdir * 0.5;
    }

    streamlines.push(line);
  }

  return {
    xcval,
    ycval,
    rval,
    gamval,
    bodyPoints,
    streamlines,
  };
}
