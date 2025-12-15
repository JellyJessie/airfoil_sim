import { computeOutputs } from "./computeOutputs.js";
import { useFoilSim } from "../store/FoilSimContext.jsx";
import Plot from "react-plotly.js";
import { Shape, Airfoil } from "../components/shape.js"; // adjust path as needed
import {
  createAirfoilPlot,
  buildFoilSimPlot,
  buildVelocityProbePlot,
} from "../components/foilsimPlots.js";
import React, {
  createContext,
  useContext,
  useReducer,
  useMemo,
  useState,
  useEffect,
} from "react";
import GeometryPanel from "../components/GeometryPanel.jsx";
import GeometryProbeOverlay from "./GeometryProbeOverlay.jsx";

const Ctx = createContext(null);

export default function OutputsPanel() {
  const { state, set } = useFoilSim();
  const out = useMemo(() => computeOutputs(state), [state]);
  const { plot, dropdown1, dropdown2 } = state;

  const { getClPlot, getDrag } = createAirfoilPlot({
    angleDeg: state.alphaDeg,
    camberPct: state.m,
    thicknessPct: state.t,
    velocity: state.V,
    altitude: state.altitude,
    chord: state.chord,
    span: state.span,
    wingArea: state.S,
    environment: state.environmentSelect, // whatever your computeAirfoil expects
    options: {
      units: state.units, // "imperial" | "metric"
      aspectRatioCorrection: state.ar,
      inducedDrag: state.induced,
      reynoldsCorrection: state.reCorrection,
      liftMode: state.liftAnalisis, // 1=Stall, 2=Ideal
    },
  });

  const { data, layout } = buildFoilSimPlot({
    plot,
    lift: state.lift,
    drag: state.drag,
    units: state.units === "imperial" ? 1 : 2,
    shapeSelect: state.shapeSelect,
    environmentSelect: state.environmentSelect,
    dropdown1,
    dropdown2,
    angle: state.alphaDeg,
    camber: state.m, // camber % chord
    thickness: state.t, // thickness % chord
    velocity: state.V,
    altitude: state.altitude,
    chord: state.chord,
    span: state.span,
    area: state.S,
    radius: state.radius,
    xm: out.xm ?? [],
    plp: out.plp ?? [],
    plv: out.plv ?? [],
    q0: out.q0 ?? [],
    areaString: state.units === "imperial" ? "sq ft" : "sq m",
    liftRef: 0,
    dragRef: 0,
    clRef: 0,
    cdRef: 0,
    Shape, // still used for env plots (rho, p, etc)
    Airfoil, // NEW: used by all performance plots (4–7)
  });

  const { data: velData, layout: velLayout } = buildVelocityProbePlot({
    velocity: state.V,
    units: state.units === "imperial" ? 1 : 2,
  });

  const {
    shapeString,
    lift,
    drag,
    cL,
    cD,
    Re,
    L_over_D,
    envDisplay,
    lengthUnit,
    forceUnit,
  } = out;

  switch (state.outputButton) {
    case 1: // Gage
      return (
        <div>
          <div>CL: {out.cl?.toFixed?.(4)}</div>
          <div>CD: {out.cd?.toFixed?.(4)}</div>
          <div>Lift: {out.lift?.toFixed?.(2)}</div>
          <div>Drag: {out.drag?.toFixed?.(2)}</div>
          <div>Re: {out.reynolds?.toFixed?.(0)}</div>
        </div>
      );

    case 2: {
      const merged = {
        ...state,
        xm: out.xm ?? state.xm,
        ym: out.ym ?? state.ym,
        plp: out.plp ?? state.plp,
        plv: out.plv ?? state.plv,
      };

      return (
        <div style={{ display: "grid", gap: 12 }}>
          <GeometryProbeOverlay
            xm={merged.xm}
            ym={merged.ym}
            plp={merged.plp}
            plv={merged.plv}
            shapeSelect={merged.shapeSelect}
            mode="cp"
            ShapeClass={Shape}
            unitsCode={merged.units === "imperial" ? 1 : 2}
            environmentSelect={merged.environmentSelect}
            angleDeg={merged.alphaDeg}
            camber={merged.m}
            thickness={merged.t}
            velocity={merged.V}
            altitude={merged.altitude}
            chord={merged.chord}
            span={merged.span}
            wingArea={merged.S}
            q0={out.q0}
          />

          <GeometryPanel state={merged} />
        </div>
      );
    }

    case 3: // Data
      return <pre style={{ fontSize: 12 }}>{JSON.stringify(out, null, 2)}</pre>;

    case 4: // Plot
      return (
        <div>
          {/* You can render Plotly here using out.plots.clAlpha / cdAlpha / ldAlpha */}
          <div>Plot panel (wired)</div>
        </div>
      );

    default:
      return null;
  }

  return (
    <div className="af-panel">
      <h2 className="af-title">Results</h2>

      <div style={{ marginBottom: 8 }}>
        <strong>Shape:</strong> {shapeString || "—"}
      </div>

      <div style={{ display: "grid", gap: 4 }}>
        <label>
          Lift ({forceUnit}):{" "}
          <input
            type="text"
            readOnly
            value={Number.isFinite(lift) ? lift.toFixed(0) : ""}
            style={{ width: 120 }}
          />
        </label>

        <label>
          Drag ({forceUnit}):{" "}
          <input
            type="text"
            readOnly
            value={Number.isFinite(drag) ? drag.toFixed(0) : ""}
            style={{ width: 120 }}
          />
        </label>

        <label>
          C<sub>L</sub>:{" "}
          <input
            type="text"
            readOnly
            value={Number.isFinite(cL) ? cL.toFixed(2) : ""}
            style={{ width: 80 }}
          />
        </label>

        <label>
          C<sub>D</sub>:{" "}
          <input
            type="text"
            readOnly
            value={Number.isFinite(cD) ? cD.toFixed(3) : ""}
            style={{ width: 80 }}
          />
        </label>

        <label>
          Re:{" "}
          <input
            type="text"
            readOnly
            value={Number.isFinite(Re) ? Re.toFixed(0) : ""}
            style={{ width: 120 }}
          />
        </label>

        <label>
          L / D:{" "}
          <input
            type="text"
            readOnly
            value={Number.isFinite(L_over_D) ? L_over_D.toFixed(3) : ""}
            style={{ width: 80 }}
          />
        </label>
      </div>

      {envDisplay && (
        <>
          <hr style={{ margin: "12px 0" }} />
          <div style={{ fontWeight: "bold", marginBottom: 4 }}>Environment</div>
          <div style={{ display: "grid", gap: 4 }}>
            <label>
              Static p:{" "}
              <input
                type="text"
                readOnly
                value={envDisplay.staticPressure.toFixed(3)}
                style={{ width: 120 }}
              />
            </label>
            <label>
              ρ:{" "}
              <input
                type="text"
                readOnly
                value={envDisplay.density.toFixed(5)}
                style={{ width: 120 }}
              />
            </label>
            <label>
              q₀:{" "}
              <input
                type="text"
                readOnly
                value={envDisplay.dynPressure.toFixed(3)}
                style={{ width: 120 }}
              />
            </label>
            <label>
              Temp:{" "}
              <input
                type="text"
                readOnly
                value={envDisplay.temp.toFixed(0)}
                style={{ width: 80 }}
              />
            </label>
            <label>
              μ:{" "}
              <input
                type="text"
                readOnly
                value={envDisplay.viscosity.toExponential(3)}
                style={{ width: 140 }}
              />
            </label>
          </div>

          <Plot
            data={data}
            layout={{ ...layout, margin: { t: 40, l: 50, r: 10, b: 40 } }}
            config={{ displayModeBar: false, responsive: true }}
            style={{ width: "100%", height: "100%" }}
          />

          <Plot
            data={velData}
            layout={{ ...velLayout, margin: { t: 40, l: 10, r: 10, b: 10 } }}
            config={{ displayModeBar: false, responsive: true }}
            style={{ width: "100%", height: "100%" }}
          />
        </>
      )}
    </div>
  );
}
