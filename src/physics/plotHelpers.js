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
  rows.push([
    "Surface",
    "i",
    "X/C",
    "Y/C",
    "Cp",
    "Vratio", // Vlocal/V∞ if you’re using plv as ratio
  ]);

  const xm = out?.xm;
  const ym = out?.ym;
  const plp = out?.plp; // Cp
  const plv = out?.plv; // Vratio

  // Guard
  if (!xm || !ym || !plp) return rows;

  // Legacy-like normalization (matches your GeometryPanel style)
  // NASA used mapfact=4 for airfoil/ellipse/plate; 2 for cylinder/ball
  const shapeSelect = state.shapeSelect ?? 1;
  const mapfact = shapeSelect < 4 ? 4.0 : 2.0;

  // Legacy indices: nptc=37, npt2=19
  const nptc = 37;
  const npt2 = 19;

  // Upper surface rows: (npt2 - 0) ... (npt2 - 18)
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

  // Lower surface rows: (npt2 + 0) ... (npt2 + 18)
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

  return rows;
}
