// GeometryProbeOverlay.jsx
import React from "react";
import Plot from "react-plotly.js";

function getVal(arr, row, i) {
  return Array.isArray(arr?.[row]) ? arr[row][i] : null;
}

export default function GeometryProbeOverlay({
  xm,
  ym,
  plp,
  plv,
  shapeSelect,

  // NEW (for Cp)
  mode = "pressure", // "pressure" | "velocity" | "cp"
  ShapeClass, // pass Shape from your imports
  unitsCode, // 1=imperial, 2=metric  (same convention as plots)
  environmentSelect, // 1..4
  angleDeg,
  camber,
  thickness,
  velocity,
  altitude,
  chord,
  span,
  wingArea,
  q0, // from computeOutputs().q0  (treated as psf)
}) {
  const npt2 = 19;
  const mapfact = shapeSelect < 4 ? 4.0 : 2.0;

  // Same conversion you already use in Pressure Variation:
  // pressure_display = pressure_psf * (pconv / 2116) :contentReference[oaicite:2]{index=2}
  const pconv = unitsCode === 1 ? 14.7 : 101.3;
  const psfToDisplay = pconv / 2116.0;

  // Compute p∞ (in display units) using Shape pressure APIs (like plot 2) :contentReference[oaicite:3]{index=3}
  let pInfDisplay = null;
  if (ShapeClass) {
    const shape = new ShapeClass({
      angleDeg: angleDeg ?? 0,
      camberPercent: (camber ?? 0) * 100,
      thicknessPercent: (thickness ?? 0) * 100,
      velocity: velocity ?? 0,
      altitude: altitude ?? 0,
      chord: chord ?? 1,
      span: span ?? 1,
      wingArea: wingArea ?? 1,
      units: unitsCode === 1 ? 1 : 2, // your Shape expects UnitSystem enum, but this is usually fine if you pass the real enum in caller
      environment: environmentSelect ?? 1,
    });

    let pInfPsf = null;
    if (environmentSelect === 1) pInfPsf = shape.getPressureEarth?.();
    else if (environmentSelect === 2) pInfPsf = shape.getPressureMars?.();
    else if (environmentSelect === 3) pInfPsf = shape.getPressureMercury?.();
    else if (environmentSelect === 4) pInfPsf = shape.getPressureVenus?.();

    if (Number.isFinite(pInfPsf)) pInfDisplay = pInfPsf * psfToDisplay;
  }

  // Compute q∞ in display units (q0 is returned by computeOutputs) :contentReference[oaicite:4]{index=4}
  const qInfDisplay = Number.isFinite(q0) ? q0 * psfToDisplay : null;

  const upperIdx = Array.from({ length: 19 }, (_, k) => npt2 - k + 1);
  const lowerIdx = Array.from({ length: 19 }, (_, k) => npt2 + k - 1);

  function buildTrace(indices, row, name, symbol) {
    const x = [];
    const y = [];
    const color = [];
    const text = [];

    for (const i of indices) {
      const xi = getVal(xm, row, i);
      const yi = getVal(ym, row, i);
      if (!Number.isFinite(xi) || !Number.isFinite(yi)) continue;

      const xOverC = xi / mapfact;
      const yOverC = yi / mapfact;

      x.push(xOverC);
      y.push(yOverC);

      const p = plp?.[i];
      const v = plv?.[i];

      let cval = null;
      if (mode === "velocity") cval = v;
      else if (mode === "pressure") cval = p;
      else if (mode === "cp") {
        if (
          Number.isFinite(p) &&
          Number.isFinite(pInfDisplay) &&
          Number.isFinite(qInfDisplay) &&
          qInfDisplay !== 0
        ) {
          cval = (p - pInfDisplay) / qInfDisplay;
        } else {
          cval = null;
        }
      }

      color.push(cval);

      text.push(
        `Probe ${i}<br>` +
          `x/c=${xOverC.toFixed(3)}<br>` +
          `y/c=${yOverC.toFixed(3)}<br>` +
          `P=${Number.isFinite(p) ? p.toFixed(3) : "—"}<br>` +
          `V=${Number.isFinite(v) ? v.toFixed(0) : "—"}<br>` +
          (mode === "cp"
            ? `Cp=${Number.isFinite(cval) ? cval.toFixed(3) : "—"}`
            : "")
      );
    }

    return {
      name,
      type: "scatter",
      mode: "markers",
      x,
      y,
      text,
      hoverinfo: "text",
      marker: {
        size: 9,
        symbol,
        color,
        colorbar: {
          title: mode === "cp" ? "Cp" : mode === "velocity" ? "V" : "P",
        },
      },
    };
  }

  // Outline
  const outlineX = [];
  const outlineY = [];
  [...upperIdx, ...lowerIdx.slice(1)].forEach((i, k) => {
    const row = k < upperIdx.length ? 0 : 1;
    const xi = getVal(xm, row, i);
    const yi = getVal(ym, row, i);
    if (!Number.isFinite(xi) || !Number.isFinite(yi)) return;
    outlineX.push(xi / mapfact);
    outlineY.push(yi / mapfact);
  });

  const outline = {
    name: "Airfoil",
    type: "scatter",
    mode: "lines",
    x: outlineX,
    y: outlineY,
    hoverinfo: "skip",
  };

  const upperTrace = buildTrace(upperIdx, 0, "Upper probes", "circle");
  const lowerTrace = buildTrace(lowerIdx, 1, "Lower probes", "diamond");

  return (
    <Plot
      data={[outline, upperTrace, lowerTrace]}
      layout={{
        title:
          mode === "cp"
            ? "Geometry + Cp Probes"
            : mode === "velocity"
              ? "Geometry + Velocity Probes"
              : "Geometry + Pressure Probes",
        xaxis: { title: "x / c" },
        yaxis: { title: "y / c", scaleanchor: "x", scaleratio: 1 },
        margin: { t: 50, l: 60, r: 30, b: 50 },
        legend: { orientation: "h" },
      }}
      config={{ responsive: true }}
      style={{ width: "100%", height: 420 }}
    />
  );
}
