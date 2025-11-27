import { deg2rad } from "./geometry";

// Thin airfoil small-angle baseline. Replace with your FoilSim models (Cp, stall, etc.).
export function metrics(state) {
  const { V, rho, chord, mu, angleDeg, S, units } = state;
  const a = deg2rad(angleDeg);
  const q = 0.5 * rho * V * V;
  const Cl = 2 * Math.PI * a;
  const Lift = q * S * Cl;
  const Re = (rho * V * chord) / Math.max(mu, 1e-12);

  if (units === "imperial") {
    return {
      q: q * 0.020885434233, // Pa -> psf
      Cl,
      Re,
      Lift: Lift * 0.22480894387, // N -> lbf
    };
  }
  return { q, Cl, Re, Lift };
}

// Example Cp distribution placeholder (upper & lower arrays along chord).
// Replace with FoilSim's Cp model.
export function cpDistribution(state, n = 100) {
  const x = Array.from({ length: n }, (_, i) => i / (n - 1));
  const cpU = x.map((xi) => -1.2 + 0.4 * Math.cos(Math.PI * xi));
  const cpL = x.map((xi) => -0.6 + 0.2 * Math.cos(Math.PI * xi));
  return { x, cpU, cpL };
}
