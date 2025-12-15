import { computeAirfoil } from "../components/foilSimCore.js";
import { Environment, UnitSystem, Shape, Airfoil } from "./shape.js";

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

/**
 * React-friendly plot builder for FoilSim
 *
 * It does NOT touch the DOM or Plotly directly.
 * You pass in all values; it returns { data, layout }.
 */
export function buildFoilSimPlot(params) {
  const {
    // core selector
    plot, // 1..11 (same integer as original code)

    // lift/drag gauge inputs
    lift,
    drag,

    // config / state
    units, // 1 = imperial, 2 = metric   (instead of getUnits())
    shapeSelect,
    environmentSelect,

    // dropdown selects
    dropdown1, // "liftOption" | "clOption" | "dragVs" | "cdOption"
    dropdown2, // "liftVsOption" | "dragVsOption"

    // geometry + flight state
    angle,
    camber,
    thickness,
    velocity,
    altitude,
    chord,
    span,
    area,
    radius,

    // arrays coming from flow solution
    xm, // 2 x N array like original xm
    plp, // pressure array
    plv, // velocity array

    // refs / visible outputs (from your UI boxes)
    liftRef, // value from "liftBox"
    dragRef, // from "dragBox"
    clRef, // from "cLiftBox"
    cdRef, // from "cDragBox"

    // strings
    areaString, // "sq ft" or "sq m" from outside if you want

    // physics helpers
    Shape, // Shape class/ctor from core/shape.js
  } = params;

  const MAX_I = 20;
  const MAX_J = 40;

  const pltx = Array.from({ length: MAX_I }, () =>
    Array(MAX_J).fill(undefined)
  );
  const plty = Array.from({ length: MAX_I }, () =>
    Array(MAX_J).fill(undefined)
  );

  // --- unit strings / conversions ---
  let pconv;
  let lconv;
  let pressString;
  let velString;
  let forceString;
  let lenghtString;
  let areaStrLocal = areaString;

  if (units === 1) {
    pconv = 14.7;
    lconv = 1.0;
    pressString = "psi";
    velString = "mph";
    forceString = "lbf";
    lenghtString = "ft";
    if (!areaStrLocal) areaStrLocal = "sq ft";
  } else if (units === 2) {
    pconv = 101.3;
    lconv = 0.3048;
    pressString = "kPa";
    velString = "km/h";
    forceString = "N";
    lenghtString = "m";
    if (!areaStrLocal) areaStrLocal = "sq m";
  }

  const unitsEnum = units === 1 ? UnitSystem.IMPERIAL : UnitSystem.METRIC;

  const envEnum = (() => {
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
  })();

  const wingArea = area ?? (chord ?? 1) * (span ?? 1);
  const AirfoilClass = params.Airfoil || Airfoil || null;

  // Helper: sample Cl, Cd from the actual Airfoil physics core
  const sampleAirfoil = AirfoilClass
    ? ({ angleDeg, camberPercentLocal, thicknessPercentLocal }) => {
        const airfoil = new AirfoilClass({
          angleDeg,
          camberPercent:
            camberPercentLocal != null ? camberPercentLocal : camber,
          thicknessPercent:
            thicknessPercentLocal != null ? thicknessPercentLocal : thickness,
          velocity: velocity ?? 0,
          altitude: altitude ?? 0,
          chord: chord ?? 1,
          span: span ?? 1,
          wingArea,
          units: unitsEnum,
          environment: envEnum,
          // optionally later: aspectRatioCorrection, inducedDrag, reynoldsCorrection, liftMode
        });

        return {
          cl: airfoil.getLiftCoefficient(),
          cd: airfoil.getDragCoefficient(),
        };
      }
    : () => ({ cl: 0, cd: 0 });

  const npt2 = 19;
  let npt = npt2;

  let data = [];
  let layout = {};

  // ========== plot = 1: lift vs drag gauge ==========
  if (plot === 1) {
    data = [
      {
        x: ["Lift", "Drag"],
        y: [lift, drag],
        type: "bar",
      },
    ];

    layout = {
      title: "Lift and Drag",
      showlegend: false,
    };

    return { data, layout };
  }

  // ========== plot = 2: pressure variation ==========
  if (plot === 2) {
    let globalPressure;
    if (Shape) {
      const shape = new Shape({
        angleDeg: angle ?? 0,
        camberPercent: (camber ?? 0) * 100,
        thicknessPercent: (thickness ?? 0) * 100,
        velocity: velocity ?? 0,
        altitude: altitude ?? 0,
        chord: chord ?? 1,
        span: span ?? 1,
        wingArea,
        units: unitsEnum,
        environment: envEnum,
      });

      if (environmentSelect === 1) {
        globalPressure = shape.getPressureEarth();
      } else if (environmentSelect === 2) {
        globalPressure = shape.getPressureMars();
      } else if (environmentSelect === 3) {
        globalPressure = shape.getPressureMercury();
      } else if (environmentSelect === 4) {
        globalPressure = shape.getPressureVenus();
      }
    } else {
      // if caller wants, they can precompute and pass params.globalPressure
      globalPressure = params.globalPressure;
    }

    const isCylinderOrBall = shapeSelect >= 4;

    // upper surface
    const upper = makeXYFromXmRow({
      xm,
      xmRowIndex: 0,
      npt2,
      lconv,
      radius,
      isCylinderOrBall,
      plArray: plp,
      upperSurface: true,
    });
    const trace1 = {
      x: upper.x,
      y: upper.y,
      mode: "lines",
      type: "scatter",
      name: "Upper Surface",
    };

    // lower surface
    const lower = makeXYFromXmRow({
      xm,
      xmRowIndex: 1,
      npt2,
      lconv,
      radius,
      isCylinderOrBall,
      plArray: plp,
      upperSurface: false,
    });
    const trace2 = {
      x: lower.x,
      y: lower.y,
      mode: "lines",
      type: "scatter",
      name: "Lower Surface",
    };

    // free stream pressure
    const pConst = (globalPressure / 2116) * pconv;
    const trace3 = makeConstantYTraceFromXmRow({
      xm,
      xmRowIndex: 1,
      npt2,
      lconv,
      radius,
      isCylinderOrBall,
      constantY: pConst,
      name: "Pressure",
    });

    layout = {
      title: "Pressure Variation",
      showlegend: true,
      autosize: false,
      width: 380,
      height: 400,
      size: 30,
      xaxis: {
        title: {
          text: "x Coordinate",
          font: {
            family: "Courier New, monospace",
            size: 18,
            color: "black",
          },
        },
      },
      yaxis: {
        title: {
          text: "Press " + pressString,
          font: {
            family: "Courier New, monospace",
            size: 18,
            color: "black",
          },
        },
      },
    };

    data = [trace1, trace2, trace3];
    return { data, layout };
  }

  // ========== plot = 3: velocity variation ==========
  if (plot === 3) {
    const isCylinderOrBall = shapeSelect >= 4;

    const upper = makeXYFromXmRow({
      xm,
      xmRowIndex: 0,
      npt2,
      lconv,
      radius,
      isCylinderOrBall,
      plArray: plv,
      upperSurface: true,
    });
    const trace1 = {
      x: upper.x,
      y: upper.y,
      mode: "lines",
      type: "scatter",
      name: "Upper Surface",
    };

    const lower = makeXYFromXmRow({
      xm,
      xmRowIndex: 1,
      npt2,
      lconv,
      radius,
      isCylinderOrBall,
      plArray: plv,
      upperSurface: false,
    });
    const trace2 = {
      x: lower.x,
      y: lower.y,
      mode: "lines",
      type: "scatter",
      name: "Lower Surface",
    };

    const trace3 = makeConstantYTraceFromXmRow({
      xm,
      xmRowIndex: 1,
      npt2,
      lconv,
      radius,
      isCylinderOrBall,
      constantY: velocity,
      name: "Velocity",
    });

    layout = {
      title: "Velocity Variation",
      showlegend: true,
      autosize: false,
      width: 380,
      height: 400,
      xaxis: {
        title: {
          text: "x Coordinate",
          font: {
            family: "Courier New, monospace",
            size: 18,
            color: "black",
          },
        },
      },
      yaxis: {
        title: {
          text: "Vel " + velString,
          font: {
            family: "Courier New, monospace",
            size: 18,
            color: "black",
          },
        },
      },
    };

    data = [trace1, trace2, trace3];
    return { data, layout };
  }

  // ========== plot = 4: drag polar ==========
  if (plot === 4) {
    npt = 20;
    const del = 40.0 / npt;

    for (let ic = 1; ic <= npt; ic += 1) {
      const angl = -20.0 + (ic - 1) * del;
      const { cl, cd } = sampleAirfoil({
        angleDeg: angl,
        // use current camber/thickness percents
      });

      plty[0][ic] = 100 * cl;
      pltx[0][ic] = 100 * cd;
    }

    const cdref = cdRef;
    const clref = clRef;
    pltx[1][0] = cdref * 100;
    plty[1][0] = clref * 100;

    const trace1 = makeLineTraceFromPlt(pltx, plty, 0, npt, undefined);
    const trace2 = makeMarkerTraceFromPlt(pltx, plty, 1, 0, undefined);

    layout = {
      title: "Drag polar",
      showlegend: false,
      xaxis: {
        title: {
          text: "Cd x 100",
          font: {
            family: "Courier New, monospace",
            size: 18,
            color: "#7f7f7f",
          },
        },
      },
      yaxis: {
        title: {
          text: "Cl x 100 ",
          font: {
            family: "Courier New, monospace",
            size: 18,
            color: "#7f7f7f",
          },
        },
      },
    };

    data = [trace1, trace2];
    return { data, layout };
  }

  // =================================================================
  // From here on: plot 5–11 with dropdown1/dropdown2 logic
  // =================================================================

  // ---------- plot = 5: angle sweep ----------
  if (plot === 5) {
    npt = 21;
    const del = 40.0 / (npt - 1);
    let fconv;
    if (units === 1) fconv = 1.0;
    else if (units === 2) fconv = 4.448;

    // Lift vs Angle
    if (dropdown1 === "liftOption") {
      let lftref = liftRef;
      let clref = clRef || 0;

      for (let ic = 1; ic <= npt; ic += 1) {
        const angl = -20.0 + (ic - 1) * del;
        const { cl } = sampleAirfoil({
          angleDeg: angl,
        });

        if (clref === 0) {
          clref = 0.001;
          lftref = 0.001;
        }

        pltx[0][ic] = angl;
        // scale lift proportional to Cl ratio
        plty[0][ic] = (fconv * lftref * cl) / clref;
      }

      pltx[1][0] = angle;
      plty[1][0] = lftref * fconv;

      const trace1 = makeLineTraceFromPlt(pltx, plty, 0, npt);
      const trace2 = makeMarkerTraceFromPlt(pltx, plty, 1, 0);

      layout = makeLayout(
        "Lift Vs Angle",
        "Angle Degrees",
        "Lift " + forceString
      );
      data = [trace1, trace2];
      return { data, layout };
    }

    // Cl vs Angle
    if (dropdown1 === "clOption") {
      for (let ic = 1; ic <= npt; ic += 1) {
        const angl = -20.0 + (ic - 1) * del;
        const { cl } = sampleAirfoil({
          angleDeg: angl,
        });

        pltx[0][ic] = angl;
        plty[0][ic] = 100 * cl;
      }

      pltx[1][0] = angle;
      plty[1][0] = 100 * clRef;

      const trace1 = makeLineTraceFromPlt(pltx, plty, 0, npt);
      const trace2 = makeMarkerTraceFromPlt(pltx, plty, 1, 0);

      layout = makeLayout("Cl Vs Angle", "Angle Degrees", "Cl * 100");
      data = [trace1, trace2];
      return { data, layout };
    }

    // Drag vs Angle
    if (dropdown1 === "dragVs") {
      let lftref = liftRef;
      let clref = clRef || 0;
      let drgref = dragRef;
      const cdref = cdRef;

      for (let ic = 1; ic <= npt; ic += 1) {
        const angl = -20.0 + (ic - 1) * del;
        const { cl, cd } = sampleAirfoil({
          angleDeg: angl,
        });

        if (clref === 0) clref = 0.001;
        pltx[0][ic] = angl;
        plty[0][ic] = (fconv * drgref * cd) / cdref;
      }

      pltx[1][0] = angle;
      plty[1][0] = drgref * fconv;

      const trace1 = makeLineTraceFromPlt(pltx, plty, 0, npt);
      const trace2 = makeMarkerTraceFromPlt(pltx, plty, 1, 0);

      layout = makeLayout(
        "Drag Vs Angle",
        "Angle Degrees",
        "Drag " + forceString
      );
      data = [trace1, trace2];
      return { data, layout };
    }

    // Cd vs Angle
    if (dropdown1 === "cdOption") {
      const cdref = cdRef;

      for (let ic = 1; ic <= npt; ic += 1) {
        const angl = -20.0 + (ic - 1) * del;
        const { cd } = sampleAirfoil({
          angleDeg: angl,
        });

        pltx[0][ic] = angl;
        plty[0][ic] = 100 * cd;
      }

      pltx[1][0] = angle;
      plty[1][0] = 100 * cdref;

      const trace1 = makeLineTraceFromPlt(pltx, plty, 0, npt);
      const trace2 = makeMarkerTraceFromPlt(pltx, plty, 1, 0);

      layout = makeLayout("Cd Vs Angle", "Angle Degrees", "Cd * 100");
      data = [trace1, trace2];
      return { data, layout };
    }
  }
  // ---------- plot = 6: camber sweep ----------
  if (plot === 6) {
    npt = 21;
    const del = 2.0 / (npt - 1);
    let fconv;
    if (units === 1) fconv = 1.0;
    else if (units === 2) fconv = 4.448;

    // we treat camber axis as "% chord", using campl * 25
    // thickness stays fixed at current thickness%

    // Lift vs Camber
    if (dropdown1 === "liftOption") {
      let lftref = liftRef;
      let clref = clRef || 0;

      for (let ic = 1; ic <= npt; ic += 1) {
        const campl = -1.0 + (ic - 1) * del; // dimensionless slider
        const camberPercentLocal = campl * 25.0;

        const { cl } = sampleAirfoil({
          angleDeg: angle,
          camberPercentLocal,
        });

        if (clref === 0) {
          clref = 0.001;
          lftref = 0.001;
        }

        pltx[0][ic] = camberPercentLocal;
        plty[0][ic] = (fconv * lftref * cl) / clref;
      }

      pltx[1][0] = camber; // current camber percent
      plty[1][0] = lftref * fconv;

      const trace1 = makeLineTraceFromPlt(pltx, plty, 0, npt);
      const trace2 = makeMarkerTraceFromPlt(pltx, plty, 1, 0);

      layout = makeLayout(
        "Lift Vs Camber",
        "Camber % chord",
        "Lift " + forceString
      );
      data = [trace1, trace2];
      return { data, layout };
    }

    // Cl vs Camber
    if (dropdown1 === "clOption") {
      const clref = clRef;

      for (let ic = 1; ic <= npt; ic += 1) {
        const campl = -1.0 + (ic - 1) * del;
        const camberPercentLocal = campl * 25.0;

        const { cl } = sampleAirfoil({
          angleDeg: angle,
          camberPercentLocal,
        });

        pltx[0][ic] = camberPercentLocal;
        plty[0][ic] = 100 * cl;
      }

      pltx[1][0] = camber;
      plty[1][0] = 100 * clref;

      const trace1 = makeLineTraceFromPlt(pltx, plty, 0, npt);
      const trace2 = makeMarkerTraceFromPlt(pltx, plty, 1, 0);

      layout = makeLayout("Cl Vs Camber", "Camber % chord", "Cl * 100 ");
      data = [trace1, trace2];
      return { data, layout };
    }

    // Drag vs Camber
    if (dropdown1 === "dragVs") {
      let lftref = liftRef;
      let clref = clRef || 0;
      let drgref = dragRef;
      const cdref = cdRef;

      for (let ic = 1; ic <= npt; ic += 1) {
        const campl = -1.0 + (ic - 1) * del;
        const camberPercentLocal = campl * 25.0;

        const { cl, cd } = sampleAirfoil({
          angleDeg: angle,
          camberPercentLocal,
        });

        if (clref === 0) {
          clref = 0.001;
          lftref = 0.001;
        }

        pltx[0][ic] = camberPercentLocal;
        plty[0][ic] = (fconv * drgref * cd) / cdref;
      }

      pltx[1][0] = camber;
      plty[1][0] = drgref * fconv;
      // clamp ends like original
      plty[0][1] = plty[0][2] = plty[0][3];
      plty[0][npt] = plty[0][npt - 1] = plty[0][npt - 2];

      const trace1 = makeLineTraceFromPlt(pltx, plty, 0, npt);
      const trace2 = makeMarkerTraceFromPlt(pltx, plty, 1, 0);

      layout = makeLayout(
        "Drag Vs Camber",
        "Camber % chord",
        "Drag " + forceString
      );
      data = [trace1, trace2];
      return { data, layout };
    }

    // Cd vs Camber
    if (dropdown1 === "cdOption") {
      const cdref = cdRef;

      for (let ic = 1; ic <= npt; ic += 1) {
        const campl = -1.0 + (ic - 1) * del;
        const camberPercentLocal = campl * 25.0;

        const { cd } = sampleAirfoil({
          angleDeg: angle,
          camberPercentLocal,
        });

        pltx[0][ic] = camberPercentLocal;
        plty[0][ic] = 100 * cd;
      }

      pltx[1][0] = camber;
      plty[1][0] = 100 * cdref;
      plty[0][1] = plty[0][2] = plty[0][3];
      plty[0][npt] = plty[0][npt - 1] = plty[0][npt - 2];

      const trace1 = makeLineTraceFromPlt(pltx, plty, 0, npt);
      const trace2 = makeMarkerTraceFromPlt(pltx, plty, 1, 0);

      layout = makeLayout("Cd Vs Camber", "Camber % chord", "Cd * 100 ");
      data = [trace1, trace2];
      return { data, layout };
    }
  }

  // ---------- plot = 7: thickness sweep ----------
  if (plot === 7) {
    npt = 20;
    const del = 1.0 / npt;
    let fconv;
    if (units === 1) fconv = 1.0;
    else if (units === 2) fconv = 4.448;

    // camber stays fixed at current camber%
    const camberPercentBase = camber;

    // Lift vs Thickness
    if (dropdown1 === "liftOption") {
      let lftref = liftRef;
      let clref = clRef || 0;

      for (let ic = 1; ic <= npt; ic += 1) {
        const thkpl = 0.05 + (ic - 1) * del;
        const thicknessPercentLocal = thkpl * 25.0;

        const { cl } = sampleAirfoil({
          angleDeg: angle,
          camberPercentLocal: camberPercentBase,
          thicknessPercentLocal,
        });

        if (clref === 0) {
          clref = 0.001;
          lftref = 0.001;
        }

        pltx[0][ic] = thicknessPercentLocal;
        // original FoilSim made this flat; we stick with scaling off ref Cl:
        plty[0][ic] = (fconv * lftref * cl) / clref;
      }

      pltx[1][0] = thickness;
      plty[1][0] = lftref * fconv;

      const trace1 = makeLineTraceFromPlt(pltx, plty, 0, npt);
      const trace2 = makeMarkerTraceFromPlt(pltx, plty, 1, 0);

      layout = {
        ...makeLayout(
          "Lift Vs Thickness",
          "Thickness % chord",
          "Lift " + forceString
        ),
        xaxis: {
          ...makeLayout("", "", "").xaxis,
          range: [0.0, 20.0],
          title: {
            text: "Thickness % chord",
            font: {
              family: "Courier New, monospace",
              size: 18,
              color: "black",
            },
          },
        },
      };

      data = [trace1, trace2];
      return { data, layout };
    }

    // Cl vs Thickness
    if (dropdown1 === "clOption") {
      const clref = clRef;

      for (let ic = 1; ic <= npt; ic += 1) {
        const thkpl = 0.05 + (ic - 1) * del;
        const thicknessPercentLocal = thkpl * 25.0;

        const { cl } = sampleAirfoil({
          angleDeg: angle,
          camberPercentLocal: camberPercentBase,
          thicknessPercentLocal,
        });

        pltx[0][ic] = thicknessPercentLocal;
        plty[0][ic] = 100 * cl;
      }

      pltx[1][0] = thickness;
      plty[1][0] = 100 * clref;

      const trace1 = makeLineTraceFromPlt(pltx, plty, 0, npt);
      const trace2 = makeMarkerTraceFromPlt(pltx, plty, 1, 0);

      layout = {
        ...makeLayout("Cl Vs Thickness", "Thickness % chord", "Cl * 100 "),
        xaxis: {
          ...makeLayout("", "", "").xaxis,
          title: {
            text: "Thickness % chord",
            font: {
              family: "Courier New, monospace",
              size: 18,
              color: "black",
            },
          },
        },
        yaxis: {
          range: [-200.0, 200.0],
          title: {
            text: "Cl * 100 ",
            font: {
              family: "Courier New, monospace",
              size: 18,
              color: "black",
            },
          },
        },
      };

      data = [trace1, trace2];
      return { data, layout };
    }

    // Drag vs Thickness
    if (dropdown1 === "dragVs") {
      let drgref = dragRef;
      const cdref = cdRef;

      for (let ic = 1; ic <= npt; ic += 1) {
        const thkpl = 0.05 + (ic - 1) * del;
        const thicknessPercentLocal = thkpl * 25.0;

        const { cd } = sampleAirfoil({
          angleDeg: angle,
          camberPercentLocal: camberPercentBase,
          thicknessPercentLocal,
        });

        pltx[0][ic] = thicknessPercentLocal;
        plty[0][ic] = (fconv * drgref * cd) / cdref;
      }

      pltx[1][0] = thickness;
      plty[1][0] = drgref * fconv;
      const last = npt;
      plty[0][last] =
        plty[0][last - 1] =
        plty[0][last - 2] =
        plty[0][last - 3] =
          plty[0][last - 4];

      const trace1 = makeLineTraceFromPlt(pltx, plty, 0, npt);
      const trace2 = makeMarkerTraceFromPlt(pltx, plty, 1, 0);

      layout = {
        ...makeLayout(
          "Drag Vs Thickness",
          "Thickness % chord",
          "Drag " + forceString
        ),
        xaxis: {
          ...makeLayout("", "", "").xaxis,
          title: {
            text: "Thickness % chord",
            font: {
              family: "Courier New, monospace",
              size: 18,
              color: "black",
            },
          },
        },
        yaxis: {
          range: [0.0, 2500.0],
          title: {
            text: "Drag " + forceString,
            font: {
              family: "Courier New, monospace",
              size: 18,
              color: "black",
            },
          },
        },
      };

      data = [trace1, trace2];
      return { data, layout };
    }

    // Cd vs Thickness
    if (dropdown1 === "cdOption") {
      const cdref = cdRef;

      for (let ic = 1; ic <= npt; ic += 1) {
        const thkpl = 0.05 + (ic - 1) * del;
        const thicknessPercentLocal = thkpl * 25.0;

        const { cd } = sampleAirfoil({
          angleDeg: angle,
          camberPercentLocal: camberPercentBase,
          thicknessPercentLocal,
        });

        pltx[0][ic] = thicknessPercentLocal;
        plty[0][ic] = 100 * cd;
      }

      pltx[1][0] = thickness;
      plty[1][0] = 100 * cdref;
      const last = npt;
      plty[0][last] =
        plty[0][last - 1] =
        plty[0][last - 2] =
        plty[0][last - 3] =
          plty[0][last - 4];

      const trace1 = makeLineTraceFromPlt(pltx, plty, 0, npt);
      const trace2 = makeMarkerTraceFromPlt(pltx, plty, 1, 0);

      layout = {
        ...makeLayout("Cd Vs Thickness", "Thickness % chord", "Cd * 100 "),
        xaxis: {
          ...makeLayout("", "", "").xaxis,
          title: {
            text: "Thickness % chord",
            font: {
              family: "Courier New, monospace",
              size: 18,
              color: "black",
            },
          },
        },
        yaxis: {
          range: [0.0, 80.0],
          title: {
            text: "Cd * 100 ",
            font: {
              family: "Courier New, monospace",
              size: 18,
              color: "black",
            },
          },
        },
      };

      data = [trace1, trace2];
      return { data, layout };
    }
  }

  // ---------- plot = 8: speed sweep (Lift/Drag vs Speed) ----------
  if (plot === 8) {
    const nptLocal = 20;
    const vmax = 250;
    const del = vmax / nptLocal;
    let fconv;
    if (units === 1) fconv = 1.0;
    else if (units === 2) fconv = 4.448;

    // Lift vs Speed
    if (dropdown2 === "liftVsOption") {
      let lftref = liftRef || 0.001;

      for (let ic = 1; ic <= nptLocal; ic += 1) {
        const spd = (ic - 1) * del;
        pltx[0][ic] = spd;
        plty[0][ic] = (fconv * lftref * spd * spd) / (velocity * velocity);
      }

      pltx[1][0] = velocity;
      plty[1][0] = lftref * fconv;

      const trace1 = makeLineTraceFromPlt(pltx, plty, 0, nptLocal);
      const trace2 = makeMarkerTraceFromPlt(pltx, plty, 1, 0);

      layout = {
        title: "Lift Vs Speed",
        showlegend: false,
        xaxis: {
          range: [0.0, 250.0],
          title: {
            text: "Speed " + velString,
            font: {
              family: "Courier New, monospace",
              size: 18,
              color: "black",
            },
          },
        },
        yaxis: {
          title: {
            text: "Lift " + forceString,
            font: {
              family: "Courier New, monospace",
              size: 18,
              color: "black",
            },
          },
        },
      };

      data = [trace1, trace2];
      return { data, layout };
    }

    // Drag vs Speed
    if (dropdown2 === "dragVsOption") {
      const drgref = dragRef;
      for (let ic = 1; ic <= nptLocal; ic += 1) {
        const spd = (ic - 1) * del;
        pltx[0][ic] = spd;
        plty[0][ic] = (fconv * drgref * spd * spd) / (velocity * velocity);
      }

      pltx[1][0] = velocity;
      plty[1][0] = drgref * fconv;

      const trace1 = makeLineTraceFromPlt(pltx, plty, 0, nptLocal);
      const trace2 = makeMarkerTraceFromPlt(pltx, plty, 1, 0);

      layout = {
        autosize: true,
        title: "Drag Vs Speed",
        showlegend: false,
        xaxis: {
          range: [0.0, 250.0],
          title: {
            text: "Speed " + velString,
            font: {
              family: "Courier New, monospace",
              size: 18,
              color: "black",
            },
          },
        },
        yaxis: {
          title: {
            text: "Drag " + forceString,
            font: {
              family: "Courier New, monospace",
              size: 18,
              color: "black",
            },
          },
        },
      };

      data = [trace1, trace2];
      return { data, layout };
    }
  }

  // ---------- plot = 9: altitude sweep ----------
  if (plot === 9) {
    const nptLocal = 20;
    let fconv;
    let localLconv;
    if (units === 1) {
      fconv = 1.0;
      localLconv = 1.0;
    } else {
      fconv = 4.448;
      localLconv = 0.3048;
    }

    if (dropdown2 === "liftVsOption" || dropdown2 === "dragVsOption") {
      const shape = Shape
        ? new Shape({
            angleDeg: angle ?? 0,
            camberPercent: (camber ?? 0) * 100,
            thicknessPercent: (thickness ?? 0) * 100,
            velocity: velocity ?? 0,
            altitude: altitude ?? 0,
            chord: chord ?? 1,
            span: span ?? 1,
            wingArea,
            units: unitsEnum,
            environment: envEnum,
          })
        : null;

      const isLift = dropdown2 === "liftVsOption";
      const refVal = isLift ? liftRef || 0.001 : dragRef;
      let altmax = 49500;
      if (environmentSelect === 2) altmax = 15000;
      const del = altmax / nptLocal;

      for (let ic = 1; ic <= nptLocal; ic += 1) {
        const hpl = (ic - 1) * del;
        pltx[0][ic] = (localLconv * hpl) / 1000;

        let tpl = 518.6;
        let ppl = 2116;

        if (environmentSelect === 1) {
          if (hpl < 36152) {
            tpl = 518.6 - (3.56 * hpl) / 1000;
            ppl = 2116 * Math.pow(tpl / 518.6, 5.256);
          } else {
            tpl = 389.98;
            ppl = 2116 * 0.236 * Math.exp((36000 - hpl) / (53.35 * tpl));
          }

          plty[0][ic] =
            (fconv * refVal * ppl) /
            (tpl * 53.3 * 32.17) /
            (shape ? shape.getRhoEarth() : 1);
        } else if (environmentSelect === 2) {
          if (hpl <= 22960) {
            tpl = 434.02 - (0.548 * hpl) / 1000;
            ppl = 14.62 * Math.pow(2.71828, -0.00003 * hpl);
          } else {
            tpl = 449.36 - (1.217 * hpl) / 1000;
            ppl = 14.62 * Math.pow(2.71828, -0.00003 * hpl);
          }

          plty[0][ic] =
            (fconv * refVal * ppl) /
            (tpl * 1149) /
            (shape ? shape.getRhoMars() : 1);
        }
      }

      pltx[1][0] = altitude / 1000;
      plty[1][0] = refVal * fconv;

      const trace1 = makeLineTraceFromPlt(pltx, plty, 0, nptLocal);
      const trace2 = makeMarkerTraceFromPlt(pltx, plty, 1, 0);

      layout = {
        autosize: true,
        title: (isLift ? "Lift" : "Drag") + " Vs Altitude",
        showlegend: false,
        xaxis: {
          title: {
            text: "Altitude " + lenghtString,
            font: {
              family: "Courier New, monospace",
              size: 18,
              color: "black",
            },
          },
        },
        yaxis: {
          title: {
            text: (isLift ? "Lift " : "Drag ") + forceString,
            font: {
              family: "Courier New, monospace",
              size: 18,
              color: "black",
            },
          },
        },
      };

      data = [trace1, trace2];
      return { data, layout };
    }
  }

  // ---------- plot = 10: wing area sweep (Lift/Drag vs Wing Area) ----------
  if (plot === 10) {
    let fconv;
    if (units === 1) fconv = 1.0;
    else fconv = 4.448;

    // Lift vs Wing Area
    if (dropdown2 === "liftVsOption") {
      let lftref = liftRef || 0.001;

      pltx[0][1] = 0.0;
      plty[0][1] = 0.0;
      pltx[0][2] = 2000;
      plty[0][2] = (fconv * lftref * 2000) / area;
      pltx[1][0] = area;
      plty[1][0] = lftref * fconv;

      const trace1 = {
        x: [pltx[0][1], pltx[0][2]],
        y: [plty[0][1], plty[0][2]],
        mode: "lines",
        type: "scatter",
      };
      const trace2 = makeMarkerTraceFromPlt(pltx, plty, 1, 0);

      layout = {
        autosize: true,
        title: "Lift Vs Wing Span",
        showlegend: false,
        xaxis: {
          title: {
            text: "Wing Area " + areaStrLocal,
            font: {
              family: "Courier New, monospace",
              size: 18,
              color: "black",
            },
          },
        },
        yaxis: {
          title: {
            text: "Lift " + forceString,
            font: {
              family: "Courier New, monospace",
              size: 18,
              color: "black",
            },
          },
        },
      };

      data = [trace1, trace2];
      return { data, layout };
    }

    // Drag vs Wing Area
    if (dropdown2 === "dragVsOption") {
      const drgref = dragRef;

      pltx[0][1] = 0.0;
      plty[0][1] = 0.0;
      pltx[0][2] = 2000;
      plty[0][2] = (fconv * drgref * 2000) / area;
      pltx[1][0] = area;
      plty[1][0] = drgref * fconv;

      const trace1 = {
        x: [pltx[0][1], pltx[0][2]],
        y: [plty[0][1], plty[0][2]],
        mode: "lines",
        type: "scatter",
      };
      const trace2 = makeMarkerTraceFromPlt(pltx, plty, 1, 0);

      layout = {
        autosize: true,
        title: "Drag Vs Wing Span",
        showlegend: false,
        xaxis: {
          title: {
            text: "Wing Area " + areaStrLocal,
            font: {
              family: "Courier New, monospace",
              size: 18,
              color: "black",
            },
          },
        },
        yaxis: {
          title: {
            text: "Drag " + forceString,
            font: {
              family: "Courier New, monospace",
              size: 18,
              color: "black",
            },
          },
        },
      };

      data = [trace1, trace2];
      return { data, layout };
    }
  }

  // ---------- plot = 11: density sweep (Lift/Drag vs density) ----------
  if (plot === 11) {
    let fconv;
    let densityUnits = "slug / cu ft";

    const shape = Shape
      ? new Shape({
          angleDeg: angle ?? 0,
          camberPercent: (camber ?? 0) * 100,
          thicknessPercent: (thickness ?? 0) * 100,
          velocity: velocity ?? 0,
          altitude: altitude ?? 0,
          chord: chord ?? 1,
          span: span ?? 1,
          wingArea,
          units: unitsEnum,
          environment: envEnum,
        })
      : null;

    if (units === 1) {
      fconv = 1.0;
      densityUnits = "slug / cu ft";
    } else {
      fconv = 4.448;
      densityUnits = "g / cu m";
    }

    // Lift vs density
    if (dropdown2 === "liftVsOption") {
      let lftref = liftRef || 0.001;

      if (units === 1 && environmentSelect === 1) {
        pltx[0][1] = 0.0;
        plty[0][1] = 0.0;
        pltx[0][2] = 23.7;
        plty[0][2] =
          (fconv * lftref * 23.7) / ((shape ? shape.getRhoEarth() : 1) * 10000);
        pltx[1][0] = (shape ? shape.getRhoEarth() : 0) * 10000;
        plty[1][0] = lftref * fconv;
      } else if (units === 2 && environmentSelect === 1) {
        pltx[0][1] = 0.0;
        plty[0][1] = 0.0;
        pltx[0][2] = 1226;
        plty[0][2] =
          (fconv * lftref * 23.7) / ((shape ? shape.getRhoEarth() : 1) * 10000);
        pltx[1][0] = (shape ? shape.getRhoEarth() : 0) * 1000 * 515.4;
        plty[1][0] = lftref * fconv;
      } else if (units === 1 && environmentSelect === 2) {
        pltx[0][1] = 0.0;
        plty[0][1] = 0.0;
        pltx[0][2] = 2.93;
        plty[0][2] =
          (fconv * lftref * 2.93) / ((shape ? shape.getRhoMars() : 1) * 100000);
        pltx[1][0] = (shape ? shape.getRhoMars() : 0) * 100000;
        plty[1][0] = lftref * fconv;
      } else if (units === 2 && environmentSelect === 2) {
        pltx[0][1] = 0.0;
        plty[0][1] = 0.0;
        pltx[0][2] = 15.1;
        plty[0][2] =
          (fconv * lftref * 2.93) / ((shape ? shape.getRhoMars() : 1) * 100000);
        pltx[1][0] = (shape ? shape.getRhoMars() : 0) * 1000 * 515.4;
        plty[1][0] = lftref * fconv;
      }

      const trace1 = {
        x: [pltx[0][1], pltx[0][2], pltx[1][0]],
        y: [plty[0][1], plty[0][2], plty[1][0]],
        mode: "lines",
        type: "scatter",
      };
      const trace2 = makeMarkerTraceFromPlt(pltx, plty, 1, 0);

      layout = {
        autosize: true,
        title: "Lift Vs density",
        showlegend: false,
        xaxis: {
          title: {
            text: "Density " + densityUnits,
            font: {
              family: "Courier New, monospace",
              size: 18,
              color: "black",
            },
          },
        },
        yaxis: {
          title: {
            text: "Lift " + forceString,
            font: {
              family: "Courier New, monospace",
              size: 18,
              color: "black",
            },
          },
        },
      };

      data = [trace1, trace2];
      return { data, layout };
    }

    // Drag vs density
    if (dropdown2 === "dragVsOption") {
      const drgref = dragRef;

      if (units === 1 && environmentSelect === 1) {
        pltx[0][1] = 0.0;
        plty[0][1] = 0.0;
        pltx[0][2] = 23.7;
        plty[0][2] =
          (fconv * drgref * 23.7) / ((shape ? shape.getRhoEarth() : 1) * 10000);
        pltx[1][0] = (shape ? shape.getRhoEarth() : 0) * 10000;
        plty[1][0] = drgref * fconv;
      } else if (units === 2 && environmentSelect === 1) {
        pltx[0][1] = 0.0;
        plty[0][1] = 0.0;
        pltx[0][2] = 1226;
        plty[0][2] =
          (fconv * drgref * 23.7) / ((shape ? shape.getRhoEarth() : 1) * 10000);
        pltx[1][0] = (shape ? shape.getRhoEarth() : 0) * 1000 * 515.4;
        plty[1][0] = drgref * fconv;
      } else if (units === 1 && environmentSelect === 2) {
        pltx[0][1] = 0.0;
        plty[0][1] = 0.0;
        pltx[0][2] = 2.93;
        plty[0][2] =
          (fconv * drgref * 2.93) / ((shape ? shape.getRhoMars() : 1) * 100000);
        pltx[1][0] = (shape ? shape.getRhoMars() : 0) * 100000;
        plty[1][0] = drgref * fconv;
      } else if (units === 2 && environmentSelect === 2) {
        pltx[0][1] = 0.0;
        plty[0][1] = 0.0;
        pltx[0][2] = 15.1;
        plty[0][2] =
          (fconv * drgref * 2.93) / ((shape ? shape.getRhoMars() : 1) * 100000);
        pltx[1][0] = (shape ? shape.getRhoMars() : 0) * 1000 * 515.4;
        plty[1][0] = drgref * fconv;
      }

      const trace1 = {
        x: [pltx[0][1], pltx[0][2], pltx[1][0]],
        y: [plty[0][1], plty[0][2], plty[1][0]],
        mode: "lines",
        type: "scatter",
      };
      const trace2 = makeMarkerTraceFromPlt(pltx, plty, 1, 0);

      layout = {
        autosize: true,
        title: "Drag Vs density",
        showlegend: false,
        xaxis: {
          title: {
            text: "Density " + densityUnits,
            font: {
              family: "Courier New, monospace",
              size: 18,
              color: "black",
            },
          },
        },
        yaxis: {
          title: {
            text: "Drag " + forceString,
            font: {
              family: "Courier New, monospace",
              size: 18,
              color: "black",
            },
          },
        },
      };

      data = [trace1, trace2];
      return { data, layout };
    }
  }

  // fallback: nothing matched
  return { data: [], layout: {} };
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

export function selectFoilSimPlot(state) {
  if (!state) return { data: [], layout: {} };

  const unitsCode = state.units === "imperial" ? 1 : 2;
  const areaString = state.units === "imperial" ? "sq ft" : "sq m";

  const plot = state.plotMode ?? state.plot ?? 1; // whichever you actually use for 1..11 plot modes

  const dropdown1 = state.plotDropdown1 ?? state.dropdown1 ?? "liftOption";

  const dropdown2 = state.plotDropdown2 ?? state.dropdown2 ?? "liftVsOption";

  const flow = state.flow ?? {};
  const xm = flow.xm ?? state.xm ?? [];
  const plp = flow.plp ?? flow.pressure ?? state.plp ?? [];
  const plv = flow.plv ?? flow.velocity ?? state.plv ?? [];

  const clRef = state.cl ?? state.cL ?? 0;
  const cdRef = state.cd ?? state.cD ?? 0;

  return buildFoilSimPlot({
    // core selector
    plot,

    // gauge inputs (same as your state)
    lift: state.lift ?? 0,
    drag: state.drag ?? 0,

    // config / state
    units: unitsCode,
    shapeSelect: state.shapeSelect ?? 1,
    environmentSelect: state.environmentSelect ?? 1,

    // dropdowns
    dropdown1,
    dropdown2,

    // geometry + flight state
    angle: state.alphaDeg ?? 0,
    camber: state.m ?? 0.0,
    thickness: state.t ?? 0.12,
    velocity: state.V ?? 0,
    altitude: state.altitude ?? 0,
    chord: state.chord ?? 1.0,
    span: state.span ?? 1.0,
    area: state.S ?? 1.0,
    radius: state.radius ?? 1.0,

    // arrays from flow solver
    xm,
    plp,
    plv,

    // "current point" references for the marker
    liftRef: state.lift ?? 0,
    dragRef: state.drag ?? 0,
    clRef,
    cdRef,

    // units text
    areaString,

    // physics helpers / class
    getClPlot,
    getDrag,
    Shape,
  });
}
