import {
  getPSV,
  getFxg,
  getLrg,
  getLthg,
  getLxm,
  getLym,
  getRadm,
  getThetm,
  getLxmt,
  getLymt,
} from "./flowMath";
import { solveLyg } from "./streamlineSolver";
import { getConvdr } from "./foilPhysics";

export function generateFlowField({
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
