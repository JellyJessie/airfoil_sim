// src/core/airfoilGeometry.js

// the real shapeCore.js math
// NACA-like generic airfoil geometry (placeholder).
// Replace with the actual NASA geometry logic from shapeCore.js.

export function generateAirfoilCoordinates(state, numPoints = 101) {
  const { camberPercent, thicknessPercent, chord, shape } = state;

  if (shape !== "airfoil") {
    // Other shapes can be handled in separate functions below.
    return generateNonAirfoilShape(state, numPoints);
  }

  const m = camberPercent / 100; // crude mapping
  const t = thicknessPercent / 100;
  const c = chord;

  const x = [];
  const yUpper = [];
  const yLower = [];

  for (let i = 0; i < numPoints; i++) {
    const xi = (c * i) / (numPoints - 1);
    const xc = xi / c;

    // Simple symmetric thickness distribution + basic camber line — replace with FoilSim formulas
    const yt =
      5 *
      t *
      c *
      (0.2969 * Math.sqrt(xc) -
        0.126 * xc -
        0.3516 * xc * xc +
        0.2843 * xc * xc * xc -
        0.1015 * xc * xc * xc * xc);
    const yc = m * c * (2 * xc - xc * xc);

    x.push(xi);
    yUpper.push(yc + yt);
    yLower.push(yc - yt);
  }

  return { x, yUpper, yLower };
}

export function generateNonAirfoilShape(state, numPoints = 101) {
  const { shape, chord } = state;
  const x = [];
  const yUpper = [];
  const yLower = [];

  if (shape === "plate") {
    for (let i = 0; i < numPoints; i++) {
      const xi = (chord * i) / (numPoints - 1);
      x.push(xi);
      yUpper.push(0);
      yLower.push(0);
    }
  } else if (shape === "ellipse") {
    const a = chord / 2;
    const b = chord / 4; // just an example
    for (let i = 0; i < numPoints; i++) {
      const theta = (Math.PI * i) / (numPoints - 1);
      const xi = a * (1 - Math.cos(theta));
      const yi = b * Math.sin(theta);
      x.push(xi);
      yUpper.push(yi);
      yLower.push(-yi);
    }
  } else {
    // cylinder, ball, etc. can be added here similarly.
  }

  return { x, yUpper, yLower };
}
