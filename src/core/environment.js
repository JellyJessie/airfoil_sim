// src/core/environment.js
import { ENVIRONMENT } from "../physics/shapeCore.js";
import { lengthConv, velocityConv } from "../physics/shapeCore.js";

const MU0_AIR = 0.000000362;
const MU0_WATER = 0.0000272;

// --- Earth atmosphere (English units, as in NASA code) ---

function tempEarth_F(hiteFt) {
  // hite: ft
  if (hiteFt <= 36152) return 518.6 - 3.56 * (hiteFt / 1000); // R
  if (hiteFt >= 36152 && hiteFt <= 82345) return 389.98; // R
  return 389.98; // clamp
}

function pressureEarth(psfTempR, hiteFt) {
  // ps0 in lbf/ft^2
  if (hiteFt <= 36152) {
    return 2116.0 * Math.pow(psfTempR / 518.6, 5.256);
  }
  if (hiteFt >= 36152 && hiteFt <= 82345) {
    return 2116 * 0.2236 * Math.exp((36000.0 - hiteFt) / (53.35 * 389.98));
  }
  return 2116 * 0.2236 * Math.exp((36000.0 - hiteFt) / (53.35 * 389.98));
}

function vaporPressureEarth(tempF, rlhum = 0) {
  // rlhum in %, tempF in F
  return (rlhum * (2.685 + 0.00354 * Math.pow(tempF, 2.245))) / 100.0;
}

function viscosityFromSutherland(mu0, ts0) {
  // ts0 in Rankine
  return (mu0 * 717.408 * Math.pow(ts0 / 518.688, 1.5)) / (ts0 + 198.72);
}

// top-level environment API (Earth, Mars, Mercury, Venus)

export function getAtmosphere({
  environment,
  altitude, // in UI units (ft or m depending on units)
  units,
}) {
  const lconv = lengthConv(units);
  const hite = altitude / lconv; // convert to ft-equivalent "hite" used in original code
  const vconv = velocityConv(units);

  switch (environment) {
    case ENVIRONMENT.EARTH: {
      const ts0 = tempEarth_F(hite); // actually Rankine in original Shape
      const tempF = ts0 - 459.6;
      const rlhum = 0.0; // original student app uses 0 unless water env :contentReference[oaicite:3]{index=3}
      const pvap = vaporPressureEarth(tempF, rlhum);
      const ps0 = pressureEarth(ts0, hite);
      const rgas = 1716;
      const rho = (ps0 - 0.379 * pvap) / (rgas * ts0);
      const mu = viscosityFromSutherland(MU0_AIR, ts0);
      const q0 = (rho * 0.5) / (vconv * vconv); // multiply by V^2 later

      return {
        rho,
        mu,
        ps0,
        q0Factor: q0, // dynamic pressure: q0Factor * V^2
        ts0,
        tempF,
      };
    }

    case ENVIRONMENT.MARS: {
      const rgas = 1149;
      let ts0;
      if (hite <= 22960) ts0 = 434.02 - 0.548 * (hite / 1000.0);
      else ts0 = 449.36 - 1.217 * (hite / 1000.0);

      const ps0 = 14.62 * Math.pow(Math.E, -0.00003 * hite); // troposphere + stratosphere :contentReference[oaicite:4]{index=4}
      const rho = ps0 / (rgas * ts0);
      const mu = viscosityFromSutherland(MU0_AIR, ts0);
      const q0 = (rho * 0.5) / (vconv * vconv);

      return { rho, mu, ps0, q0Factor: q0, ts0 };
    }

    case ENVIRONMENT.MERCURY: {
      // depth is negative altitude / lconv in original code :contentReference[oaicite:5]{index=5}
      const hite = -altitude / lconv;
      const rho = 1.94; // slug/ft^3
      const g0 = units === "english" ? 32.2 : 9.81;
      const ps0 = 2116.0 - rho * g0 * hite;
      const ts0 = 520;
      const mu = viscosityFromSutherland(MU0_WATER, ts0);
      const q0 = (rho * 0.5) / (vconv * vconv);
      return { rho, mu, ps0, q0Factor: q0, ts0 };
    }

    case ENVIRONMENT.VENUS: {
      const ts0 = 1331.6;
      const ps0 = 194672.0;
      const rgas = 1149;
      const rho = ps0 / (rgas * ts0);
      const mu = viscosityFromSutherland(MU0_AIR, ts0);
      const q0 = (rho * 0.5) / (vconv * vconv);
      return { rho, mu, ps0, q0Factor: q0, ts0 };
    }

    default:
      throw new Error(`Unknown environment: ${environment}`);
  }
}
