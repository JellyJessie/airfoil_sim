import {
  getConvdr,
  getxcValFromGeom,
  getycVal,
  getrVal,
  getGamVal,
} from "./foilPhysics"; // adjust paths/names to match your file

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
 * Legacy getLyg() root-solver, rewritten pure.
 * This is the same algorithm you posted, just without globals.
 */
export function getLyg(fxg, psv, alfval, rval, gamval) {
  let fnew = 0.1;
  let ynew = 10.0;
  let yold = 10.0;

  if (psv < 0.0) ynew = -10.0;
  if (Math.abs(psv) < 0.001 && alfval < 0.0) ynew = rval;
  if (Math.abs(psv) < 0.001 && alfval >= 0.0) ynew = -rval;

  let iter = 1;
  while (Math.abs(fnew) >= 0.00001 && iter < 25) {
    ++iter;
    let rfac = fxg * fxg + ynew * ynew;
    if (rfac < rval * rval) {
      rfac = rval * rval + 0.01;
    }
    fnew =
      psv -
      ynew * (1.0 - (rval * rval) / rfac) -
      gamval * Math.log(Math.sqrt(rfac) / rval);

    const deriv =
      -(1.0 - (rval * rval) / rfac) -
      (2.0 * ynew * ynew * rval * rval) / (rfac * rfac) -
      (gamval * ynew) / rfac;

    yold = ynew;
    ynew = yold - (0.5 * fnew) / deriv;
  }

  return yold;
}

/**
 * Pure version of your old getLyg(fxg, psv, alfval, rval, gamval)
 * Uses a Newton iteration to solve the streamline equation for y.
 */
export function solveLyg({ fxg, psv, alphaDeg, rval, gamval }) {
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

// PUBLIC: the generateFlowField your React app / computeOutputs uses
export function generateFlowField({
  alphaDeg, // angle of attack in degrees
  xcval, // circle center x (cylinder plane)
  ycval, // circle center y (cylinder plane)
  rval, // circle radius
  gamval, // circulation
  nStream = 15,
  nPoints = 37,
}) {
  const convdr = getConvdr();
  const nlnc = nStream;
  const nln2 = nlnc / 2 + 1;
  const nptc = nPoints;

  // ---------------------------------------------------------------------------
  // 1) Airfoil body points (mapped from circle → Joukowski → AoA frame)
  // ---------------------------------------------------------------------------
  const bodyPoints = [];
  for (let index = 1; index <= nptc; index++) {
    const thet = ((index - 1) * 360) / (nptc - 1);
    const xg = rval * Math.cos(convdr * thet) + xcval;
    const yg = rval * Math.sin(convdr * thet) + ycval;
    const rg = Math.sqrt(xg * xg + yg * yg);
    const thg = Math.atan2(yg, xg) / convdr;

    // Joukowski mapping
    let xm = (rg + 1.0 / rg) * Math.cos(convdr * thg);
    let ym = (rg - 1.0 / rg) * Math.sin(convdr * thg);

    // rotate so freestream is horizontal (subtract AoA)
    const rdm = Math.sqrt(xm * xm + ym * ym);
    const thtm = Math.atan2(ym, xm) / convdr;
    xm = rdm * Math.cos((thtm - alphaDeg) * convdr);
    ym = rdm * Math.sin((thtm - alphaDeg) * convdr);

    bodyPoints.push({ x: xm, y: ym });
  }

  // ---------------------------------------------------------------------------
  // 2) Streamlines (modernized genFlow, data-only)
  // ---------------------------------------------------------------------------
  const streamlines = [];

  for (let k = 1; k <= nlnc; k++) {
    const psv = -0.5 * (nln2 - 1) + 0.5 * (k - 1); // same as legacy getPSV
    let fxg = -10.0; // same as legacy getFxg()
    const line = [];

    for (let index = 1; index <= nptc; index++) {
      // cylinder-plane y from streamline equation (legacy getLyg)
      const lyg = solveLyg({ fxg, psv, alphaDeg, rval, gamval });

      // cylinder-plane polar
      let lrg = Math.sqrt(fxg * fxg + lyg * lyg);
      let lthg = Math.atan2(lyg, fxg) / convdr;

      // rotate by AoA and shift to circle center (cylinder plane)
      let lxgt = lrg * Math.cos(convdr * (lthg + alphaDeg));
      let lygt = lrg * Math.sin(convdr * (lthg + alphaDeg));

      // translate cylinder → physical plane
      lxgt += xcval;
      lygt += ycval;
      let lrgt = Math.sqrt(lxgt * lxgt + lygt * lygt);
      let lthgt = Math.atan2(lygt, lxgt) / convdr;

      // Kutta–Joukowski mapping
      let lxm = (lrgt + 1.0 / lrgt) * Math.cos(convdr * lthgt);
      let lym = (lrgt - 1.0 / lrgt) * Math.sin(convdr * lthgt);

      // rotate to AoA frame (free stream horizontal)
      const radm = Math.sqrt(lxm * lxm + lym * lym);
      const thetm = Math.atan2(lym, lxm) / convdr;
      let lxmt = radm * Math.cos(convdr * (thetm - alphaDeg));
      let lymt = radm * Math.sin(convdr * (thetm - alphaDeg));

      // stall model: freeze y downstream of separation, same as legacy
      if (alphaDeg > 10.0 && psv > 0.0 && lxmt > 0.0 && line.length > 0) {
        lymt = line[line.length - 1].y;
      }
      if (alphaDeg < -10.0 && psv < 0.0 && lxmt > 0.0 && line.length > 0) {
        lymt = line[line.length - 1].y;
      }

      line.push({ x: lxmt, y: lymt });

      // march along streamline in x (legacy fxg += vxdir * deltb)
      const rad = lrg;
      const theta = lthg;
      const thrad = convdr * theta;
      const alfrad = convdr * alphaDeg;

      const ur = Math.cos(thrad - alfrad) * (1.0 - (rval * rval) / (rad * rad));
      const uth =
        -Math.sin(thrad - alfrad) * (1.0 + (rval * rval) / (rad * rad)) -
        gamval / rad;

      const vxdir = ur * Math.cos(thrad) - uth * Math.sin(thrad);
      const deltb = 0.5;
      fxg += vxdir * deltb;
    }

    streamlines.push(line);
  }

  return {
    bodyPoints,
    streamlines,
  };
}
