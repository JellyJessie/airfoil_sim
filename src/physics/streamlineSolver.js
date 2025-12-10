export function solveLyg({ fxg, psv, alphaDeg, rval, gamval }) {
  let ynew = psv < 0 ? -10.0 : 10.0;

  if (Math.abs(psv) < 0.001 && alphaDeg < 0) ynew = rval;
  if (Math.abs(psv) < 0.001 && alphaDeg >= 0) ynew = -rval;

  let fnew = 0.1;
  let iter = 1;

  while (Math.abs(fnew) >= 0.00001 && iter < 25) {
    iter++;

    let rfac = fxg * fxg + ynew * ynew;
    if (rfac < rval * rval) rfac = rval * rval + 0.01;

    fnew =
      psv -
      ynew * (1.0 - (rval * rval) / rfac) -
      gamval * Math.log(Math.sqrt(rfac) / rval);

    const deriv =
      -(1.0 - (rval * rval) / rfac) -
      (2.0 * ynew * ynew * rval * rval) / (rfac * rfac) -
      (gamval * ynew) / rfac;

    ynew = ynew - (0.5 * fnew) / deriv;
  }

  return ynew;
}
