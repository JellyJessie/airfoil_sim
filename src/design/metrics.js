// Simple small-angle Cl ~ 2π α (radians). You can replace with your exact model.
export function computeMetrics(state) {
  const { V, rho, chord, mu, angleDeg, S, units } = state;
  const alphaRad = (angleDeg * Math.PI) / 180;
  const q = 0.5 * rho * V * V; // dynamic pressure
  const Cl = 2 * Math.PI * alphaRad; // small-angle thin airfoil theory
  const Lift = q * S * Cl; // lift
  const Re = (rho * V * chord) / Math.max(mu, 1e-12);

  // If imperial, q in psf and Lift in lbf for the display (we convert here)
  if (units === "imperial") {
    // 1 Pa = 0.020885434233 psf ; 1 N = 0.224809 lbf
    return {
      q: q * 0.020885434233,
      Re,
      Cl,
      Lift: Lift * 0.22480894387,
    };
  }
  return { q, Re, Cl, Lift };
}
