import { getConvdr } from "./foilPhysics";

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
