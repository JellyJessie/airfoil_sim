import React, { useMemo } from "react";
import { metrics, cpDistribution } from "./aero";
import { useFoilSim } from "../store/FoilSimContext";

// If you prefer Plotly, install react-plotly.js. Here we keep a simple table to stay dependency-light.
export default function Plots() {
  const { state } = useFoilSim();
  const m = useMemo(() => metrics(state), [state]);
  const cp = useMemo(() => cpDistribution(state, 41), [state]);

  return (
    <div className="af-panel">
      <h2 className="af-title">Metrics & Cp (preview)</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <div>
            <b>q</b>: {m.q.toFixed(3)} {state.units === "metric" ? "Pa" : "psf"}
          </div>
          <div>
            <b>Re</b>: {m.Re.toExponential(3)}
          </div>
          <div>
            <b>Cl</b>: {m.Cl.toFixed(4)}
          </div>
          <div>
            <b>Lift</b>: {m.Lift.toFixed(3)}{" "}
            {state.units === "metric" ? "N" : "lbf"}
          </div>
        </div>
        <div
          style={{
            maxHeight: 180,
            overflow: "auto",
            border: "1px solid #eee",
            borderRadius: 8,
            padding: 8,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 6 }}>
            Cp sample (x, Cp_upper, Cp_lower)
          </div>
          {cp.x.map((xi, i) => (
            <div
              key={i}
              style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }}
            >
              <span>{xi.toFixed(3)}</span>
              <span>{cp.cpU[i].toFixed(3)}</span>
              <span>{cp.cpL[i].toFixed(3)}</span>
            </div>
          ))}
        </div>
      </div>
      {/* TODO: swap table with a chart (react-plotly.js) after formulas are in place */}
    </div>
  );
}
