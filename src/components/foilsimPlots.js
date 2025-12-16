import { computeAirfoil } from "../components/foilSimCore.js";

// ---------- helpers for Plotly traces ----------

function makeLineTraceFromPlt(pltx, plty, rowIndex, npt, name) {
  const x = [];
  const y = [];
  // original code always used indices 1..19 (i < npt)
  for (let i = 1; i < npt; i += 1) {
    x.push(pltx[rowIndex][i]);
    y.push(plty[rowIndex][i]);
  }
  const trace = {
    x,
    y,
    mode: "lines",
    type: "scatter",
  };
  if (name) trace.name = name;
  return trace;
}

function makeMarkerTraceFromPlt(pltx, plty, rowIndex, idx = 0, name) {
  const trace = {
    x: [pltx[rowIndex][idx]],
    y: [plty[rowIndex][idx]],
    mode: "markers",
    type: "scatter",
  };
  if (name) trace.name = name;
  return trace;
}

function makeLayout(title, xTitle, yTitle) {
  return {
    title,
    showlegend: false,
    xaxis: {
      title: {
        text: xTitle,
        font: {
          family: "Courier New, monospace",
          size: 18,
          color: "black",
        },
      },
    },
    yaxis: {
      title: {
        text: yTitle,
        font: {
          family: "Courier New, monospace",
          size: 18,
          color: "black",
        },
      },
    },
  };
}

function makeXYFromXmRow({
  xm,
  xmRowIndex,
  npt2,
  lconv,
  radius,
  isCylinderOrBall,
  plArray,
  upperSurface = true,
}) {
  const count = 19;
  const x = [];
  const y = [];

  for (let k = 0; k < count; k += 1) {
    const idx = upperSurface ? npt2 - k + 1 : npt2 + k - 1;
    const xmVal = xm[xmRowIndex][idx];

    const xVal = isCylinderOrBall
      ? 100 * (xmVal / ((2.0 * radius) / lconv) + 0.5)
      : 100 * (xmVal / 4.0 + 0.5);

    x.push(xVal);
    y.push(plArray[idx]);
  }

  return { x, y };
}

function makeConstantYTraceFromXmRow({
  xm,
  xmRowIndex,
  npt2,
  lconv,
  radius,
  isCylinderOrBall,
  constantY,
  name,
}) {
  const count = 19;
  const x = [];
  const y = [];

  for (let k = 0; k < count; k += 1) {
    const idx = npt2 + k - 1;
    const xmVal = xm[xmRowIndex][idx];

    const xVal = isCylinderOrBall
      ? 100 * (xmVal / ((2.0 * radius) / lconv) + 0.5)
      : 100 * (xmVal / 4.0 + 0.5);

    x.push(xVal);
    y.push(constantY);
  }

  return {
    x,
    y,
    mode: "lines",
    type: "scatter",
    name,
  };
}

// foilsimVelocityProbe.js (or inside your plots module)
export function buildVelocityProbePlot({ velocity = 0, units = 1 }) {
  // units: 1 = imperial, 2 = metric
  const velUnits = units === 1 ? " mph" : " km/h";

  // Clamp to gauge range [0, 250]
  const vDisplay = typeof velocity === "number" ? velocity : 0;
  const vClamped = Math.max(0, Math.min(vDisplay, 250));

  // Map 0–250 speed to 0–180 degrees (semi-circle)
  // 0 -> 180°, 250 -> 0°
  const degrees = 180 - (vClamped / 250) * 180;
  const rad = 0.5;
  const radians = (degrees * Math.PI) / 180;
  const x = rad * Math.cos(radians);
  const y = rad * Math.sin(radians);

  const path = `M -.0 -0.025 L .0 0.025 L ${x} ${y} Z`;

  const data = [
    {
      type: "scatter",
      x: [0],
      y: [0],
      marker: { size: 10, color: "850000" },
      showlegend: false,
      name: "speed",
      text: vDisplay,
      hoverinfo: "text+name",
    },
    {
      values: [50 / 6, 50 / 6, 50 / 6, 50 / 6, 50 / 6, 50 / 6, 50 / 6, 50 / 6],
      rotation: 90,
      text: [
        "181-230",
        "131-180",
        "91-130",
        "51-90",
        "0-50",
        "",
        String(vDisplay) + velUnits,
        "230-250",
      ],
      textinfo: "text",
      textposition: "inside",
      marker: {
        colors: [
          "rgba(14, 127, 0, .5)",
          "rgba(110, 154, 22, .5)",
          "rgba(170, 202, 42, .5)",
          "rgba(202, 209, 95, .5)",
          "rgba(210, 206, 145, .5)",
          "rgba(232, 226, 202, .5)",
          "rgba(0,0,0,0)",
          "rgba(15, 128, 0, 0.55)",
        ],
      },
      hoverinfo: "label",
      hole: 0.5,
      type: "pie",
      showlegend: false,
    },
  ];

  const layout = {
    shapes: [
      {
        type: "path",
        path,
        fillcolor: "850000",
        line: {
          color: "850000",
        },
      },
    ],
    title: "<b>Velocity</b> <br>",
    height: 400,
    width: 400,
    xaxis: {
      zeroline: false,
      showticklabels: false,
      showgrid: false,
      range: [-1, 1],
    },
    yaxis: {
      zeroline: false,
      showticklabels: false,
      showgrid: false,
      range: [-1, 1],
    },
  };

  return { data, layout };
}

/**
 * Build getClPlot/getDrag functions that the plotting code expects,
 * using computeAirfoil(state) as the single physics source of truth.
 *
 * baseState is your “current” airfoil state – usually derived from the FoilSim context.
 */
export function createAirfoilPlot(baseState) {
  // Normalize some naming differences: your context might use alphaDeg, m, t, etc.
  const base = {
    ...baseState,
    angleDeg: baseState.angleDeg ?? baseState.alphaDeg ?? 0,
    camberPct: baseState.camberPct ?? baseState.m ?? 0,
    thicknessPct: baseState.thicknessPct ?? baseState.t ?? 0,
  };

  function withOverrides(overrides) {
    return {
      ...base,
      ...overrides,
      options: {
        ...(base.options || {}),
        ...(overrides.options || {}),
      },
    };
  }

  /**
   * Replacement for legacy getClPlot(camb, thic, angl):
   *  - camb, thic are the *normalized* values used in the old NASA code (camber/25, thickness/25).
   *  - angl is in degrees.
   */
  function getClPlot(camParam, thkParam, angleDeg) {
    const stateForSample = withOverrides({
      angleDeg,
      camberPct: camParam * 25.0, // convert back to % chord
      thicknessPct: thkParam * 25.0, // convert back to % chord
    });

    const { cl } = computeAirfoil(stateForSample);
    return cl;
  }

  /**
   * Replacement for legacy getDrag(cldin):
   * here we ignore cldin and just ask computeAirfoil for Cd at the sample parameters.
   */
  function getDrag(camParam, thkParam, angleDeg) {
    const stateForSample = withOverrides({
      angleDeg,
      camberPct: camParam * 25.0,
      thicknessPct: thkParam * 25.0,
    });

    const { cd } = computeAirfoil(stateForSample);
    return cd;
  }

  return { getClPlot, getDrag };
}
