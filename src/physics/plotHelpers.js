// -----------------------------------------------------------------------------
// L/D Ratio (replaces calculateLDRatio)
// -----------------------------------------------------------------------------

export function calculateLiftToDrag(lift, drag) {
  if (!drag || !isFinite(drag)) return 0;
  return lift / drag;
}

// -----------------------------------------------------------------------------
// Plot Data Generator (replaces plotGraph + calculate)
// -----------------------------------------------------------------------------

export function buildLiftDragBarData(lift, drag) {
  return [
    {
      x: ["Lift", "Drag"],
      y: [lift, drag],
      type: "bar",
    },
  ];
}

export function formatDataReport(out, state) {
  const {
    shapeSelect,
    camberPct,
    thicknessPct,
    chord,
    span,
    wingArea,
    angleDeg,
    environment,
    altitude,
    velocity,
    lift,
    drag,
  } = out;

  const shapeString = "Joukowski Airfoil";
  const isImperial = state.units === "imperial";

  const lengthUnit = isImperial ? "ft" : "m";
  const areaUnit = isImperial ? "sq ft" : "sq m";
  const speedUnit = isImperial ? "mph" : "km/h";
  const forceUnit = isImperial ? "lbs" : "N";
  const densityUnit = isImperial ? "slug / cu ft" : "kg / cu m";
  const pressureUnit = isImperial ? "lb / sq in" : "kPa";
  const tempUnit = isImperial ? "F" : "C";

  return `
  ${shapeString}   on   ${environment}
  Camber = ${camberPct.toFixed(1)} % chord, Thickness = ${thicknessPct.toFixed(
    1
  )} % chord
  Chord = ${chord.toFixed(2)} ${lengthUnit}   Span = ${span.toFixed(
    2
  )} ${lengthUnit}
  Surface Area = ${wingArea.toFixed(2)} ${areaUnit}
  Angle of attack = ${angleDeg.toFixed(1)} degrees
  Altitude = ${altitude.toFixed(0)} ${lengthUnit}
  Speed = ${velocity.toFixed(1)} ${speedUnit}

  Lift = ${lift.toFixed(0)} ${forceUnit}
  Drag = ${drag.toFixed(0)} ${forceUnit}
  `.trim();
}

export function airfoilPointsLoopN({
  m,
  p,
  t,
  chord = 1,
  alphaDeg = 0,
  N = 81,
}) {
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const Nclamped = clamp(Math.round(N), 20, 200);

  // Split N points across surfaces; build a closed loop without duplicating LE.
  const nUpper = Math.ceil(Nclamped / 2); // includes TE and LE
  const nLower = Nclamped - nUpper + 1; // includes LE and TE (we'll drop LE duplicate)
  const nSegUpper = Math.max(1, nUpper - 1);
  const nSegLower = Math.max(1, nLower - 1);

  const buildSurface = (nSeg) => {
    const pts = [];
    for (let i = 0; i <= nSeg; i++) {
      const x = (chord * i) / nSeg;
      const xc = x / chord;

      const yt =
        5 *
        t *
        chord *
        (0.2969 * Math.sqrt(Math.max(xc, 1e-9)) -
          0.126 * xc -
          0.3516 * xc ** 2 +
          0.2843 * xc ** 3 -
          0.1015 * xc ** 4);

      let yc = 0;
      let dyc = 0;
      if (p > 0 && m !== 0) {
        if (xc < p) {
          yc = (m * chord * (2 * p * xc - xc * xc)) / (p * p);
          dyc = (2 * m * (p - xc)) / (p * p);
        } else {
          yc =
            (m * chord * (1 - 2 * p + 2 * p * xc - xc * xc)) /
            ((1 - p) * (1 - p));
          dyc = (2 * m * (p - xc)) / ((1 - p) * (1 - p));
        }
      }

      pts.push({ x, yc, yt, theta: Math.atan(dyc) });
    }
    return pts;
  };

  const upBase = buildSurface(nSegUpper);
  const loBase = buildSurface(nSegLower);

  // Rotate about quarter-chord to match your preview convention
  const a = (alphaDeg * Math.PI) / 180;
  const s = Math.sin(a),
    c = Math.cos(a);
  const pivotX = 0.25 * chord,
    pivotY = 0;
  const rot = (X, Y) => {
    const xr = X - pivotX,
      yr = Y - pivotY;
    return [xr * c - yr * s + pivotX, xr * s + yr * c + pivotY];
  };

  const upper = upBase.map(({ x, yc, yt, theta }) => {
    const xu = x - yt * Math.sin(theta);
    const yu = yc + yt * Math.cos(theta);
    return rot(xu, yu);
  });

  const lower = loBase.map(({ x, yc, yt, theta }) => {
    const xl = x + yt * Math.sin(theta);
    const yl = yc - yt * Math.cos(theta);
    return rot(xl, yl);
  });

  // Loop order: TE->LE on upper, then LE->TE on lower (skip duplicate LE)
  const loop = [...upper].reverse().concat(lower.slice(1));
  return loop.slice(0, Nclamped);
}

function pickAirfoilParamsFromState(state) {
  const chord = Number.isFinite(state?.chord) ? state.chord : 1;
  const alphaDeg = Number.isFinite(state?.alphaDeg)
    ? state.alphaDeg
    : Number.isFinite(state?.alpha)
      ? state.alpha
      : 0;

  // Support either fraction inputs (m,p,t) or percent inputs (camberPct, etc.)
  const m = Number.isFinite(state?.m)
    ? state.m
    : Number.isFinite(state?.camberPct)
      ? state.camberPct / 100
      : 0;

  const p = Number.isFinite(state?.p)
    ? state.p
    : Number.isFinite(state?.camberPosPct)
      ? state.camberPosPct / 100
      : 0;

  const t = Number.isFinite(state?.t)
    ? state.t
    : Number.isFinite(state?.thicknessPct)
      ? state.thicknessPct / 100
      : 0.12;

  const N = Number.isFinite(state?.numPoints)
    ? state.numPoints
    : Number.isFinite(state?.airfoilPointsN)
      ? state.airfoilPointsN
      : 81;

  return { m, p, t, chord, alphaDeg, N };
}

export function buildFoilSimCsvRows(out, state) {
  const rows = [];

  // ---- SUMMARY (text-like) ----
  const report = formatDataReport(out, state); // your existing text formatter
  rows.push(["FoilSim Data Report"]);
  rows.push(["Generated", new Date().toISOString()]);
  rows.push([""]); // blank

  // put the report as multi-line in a single cell (CSV supports quoted newlines)
  rows.push(["Report Text", report]);

  // ---- AUTO APPEND METRICS ----
  rows.push([""]); // blank
  rows.push(["Derived Metrics"]);
  rows.push(["CL", Number.isFinite(out?.cl) ? out.cl : ""]);
  rows.push(["CD", Number.isFinite(out?.cd) ? out.cd : ""]);
  rows.push(["Re", Number.isFinite(out?.reynolds) ? out.reynolds : ""]);
  rows.push([
    "L/D",
    Number.isFinite(out?.liftOverDrag) ? out.liftOverDrag : "",
  ]);

  // ---- Cp TABLE ----
  rows.push([""]); // blank
  rows.push(["Cp Table"]);
  rows.push(["Surface", "i", "X/C", "Y/C", "Cp", "Vratio"]);

  const xm = out?.xm;
  const ym = out?.ym;
  const plp = out?.plp; // Cp
  const plv = out?.plv; // Vratio

  // Guard (keep what you had)
  if (!xm || !ym || !plp) return rows;

  const shapeSelect = state.shapeSelect ?? 1;
  const mapfact = shapeSelect < 4 ? 4.0 : 2.0;

  const npt2 = 19;

  for (let k = 0; k <= 18; k++) {
    const i = npt2 - k;
    rows.push([
      "Upper",
      i,
      Number.isFinite(xm?.[0]?.[i]) ? xm[0][i] / mapfact : "",
      Number.isFinite(ym?.[0]?.[i]) ? ym[0][i] / mapfact : "",
      Number.isFinite(plp?.[i]) ? plp[i] : "",
      Number.isFinite(plv?.[i]) ? plv[i] : "",
    ]);
  }

  for (let k = 0; k <= 18; k++) {
    const i = npt2 + k;
    rows.push([
      "Lower",
      i,
      Number.isFinite(xm?.[0]?.[i]) ? xm[0][i] / mapfact : "",
      Number.isFinite(ym?.[0]?.[i]) ? ym[0][i] / mapfact : "",
      Number.isFinite(plp?.[i]) ? plp[i] : "",
      Number.isFinite(plv?.[i]) ? plv[i] : "",
    ]);
  }

  // ---- GEOMETRY POINTS (user-defined N: 20..200) ----
  rows.push([""]);
  rows.push(["Geometry Points (Airfoil Loop)"]);

  const { m, p, t, chord, alphaDeg, N } = pickAirfoilParamsFromState(state);
  const pts = airfoilPointsLoopN({ m, p, t, chord, alphaDeg, N });

  rows.push(["Requested N", N]);
  rows.push(["m (camber)", m, "p (camber pos)", p, "t (thickness)", t]);
  rows.push(["chord", chord, "alphaDeg", alphaDeg]);

  rows.push([""]);
  rows.push(["index", "x", "y", "x/c", "y/c"]);

  for (let i = 0; i < pts.length; i++) {
    const [x, y] = pts[i];
    rows.push([i + 1, x, y, x / chord, y / chord]);
  }

  return rows;
}
