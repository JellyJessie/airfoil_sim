// src/core/foilSimCore.js
import { UnitSystem, Environment, Airfoil } from "./shape.js";

function mapUnits(units) {
  if (units === UnitSystem.IMPERIAL || units === "imperial" || units === 1) {
    return UnitSystem.IMPERIAL;
  }
  return UnitSystem.METRIC;
}

function mapEnvironment(environmentSelect) {
  switch (environmentSelect) {
    case 2:
      return Environment.MARS;
    case 3:
      return Environment.MERCURY;
    case 4:
      return Environment.VENUS;
    case 1:
    default:
      return Environment.EARTH;
  }
}

function mapShape(shapeSelect) {
  switch (shapeSelect) {
    case 1:
      return "airfoil";
    case 2:
      return "ellipse";
    case 3:
      return "plate";
    case 4:
      return "cylinder";
    case 5:
      return "ball";
    default:
      return "airfoil";
  }
}

export function normalizeInputs(state) {
  const unitsRaw = state.units;
  const unitSystem = mapUnits(unitsRaw);

  const environmentSelect = state.environmentSelect ?? state.environment ?? 1;
  const environment = mapEnvironment(environmentSelect);

  const shapeSelect = state.shapeSelect ?? 1;
  const shapeType = mapShape(shapeSelect);

  // Angle: state.alphaDeg (new) or state.angleDeg (old)
  const angleDeg = Number(state.angleDeg ?? state.alphaDeg ?? 0);

  // Camber/thickness: state.m/state.t are usually fractions (0.02, 0.12).
  // If camberPct/thicknessPct exist, assume they are already percent.
  const camberPct = Number(
    state.camberPct ?? (Number.isFinite(state.m) ? state.m * 100 : 0)
  );
  const thicknessPct = Number(
    state.thicknessPct ?? (Number.isFinite(state.t) ? state.t * 100 : 0)
  );

  // Speed: state.V (new) or state.velocity (old)
  const velocity = Number(state.velocity ?? state.V ?? 0);

  const altitude = Number(state.altitude ?? 0);
  const chord = Number(state.chord ?? 1);
  const span = Number(state.span ?? 1);

  // Area: state.S (new) or state.wingArea (old)
  const wingArea = Number(state.wingArea ?? state.S ?? 0);

  const radius = Number(state.radius ?? 0);
  const spin = Number(state.spin ?? 0);

  // Options (defaults match your store snippet)
  const induced = state.induced ?? true;
  const reCorrection = state.reCorrection ?? true;
  const efficiency = Number(state.efficiency ?? 0.85);

  return {
    unitSystem,
    environmentSelect,
    environment,
    shapeSelect,
    shapeType,
    angleDeg,
    camberPct,
    thicknessPct,
    velocity,
    altitude,
    chord,
    span,
    wingArea,
    radius,
    spin,
    induced,
    reCorrection,
    efficiency,
  };
}

// Minimal wrapper around the core Airfoil model
export function computeAirfoil(state) {
  const {
    angleDeg,
    camberPct,
    thicknessPct,
    velocity,
    altitude,
    chord,
    span,
    wingArea,
    environment,
    options,
  } = normalizeInputs(state);

  const {
    aspectRatioCorrection = true, // ar
    inducedDrag = true, // induced
    reynoldsCorrection = true, // reCorrection
    liftMode = 1, // liftAnalisis (1=Stall, 2=Ideal)
    units = "metric",
  } = options ?? {};

  const airfoil = new Airfoil(
    angleDeg,
    camberPct,
    thicknessPct,
    velocity,
    altitude,
    chord,
    span,
    wingArea,
    {
      units,
      environment,
      aspectRatioCorrection,
      inducedDrag,
      reynoldsCorrection,
      liftMode,
    }
  );

  return {
    lift: airfoil.getLift(),
    drag: airfoil.getDrag(),
    cl: airfoil.getLiftCoefficient(),
    cd: airfoil.getDragCoefficient(),
    ld: airfoil.getLiftOverDrag(),
    reynolds: airfoil.getReynolds(),
  };
}

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
