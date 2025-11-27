import React from "react";
import { AirfoilProvider, useAirfoil } from "../state/airfoilStore.jsx";

export default function AirfoilControls() {
  const { state, set, toggleUnits } = useAirfoil();
  const u = state.units;

  return (
    <div className="af-panel">
      <h2 className="af-title">Controls</h2>

      <div className="af-field">
        <label>Units</label>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={toggleUnits}>
            Switch to {u === "metric" ? "Imperial" : "Metric"}
          </button>
          <span style={{ alignSelf: "center" }}>Current: {u}</span>
        </div>
      </div>

      <h3>Geometry (NACA MPXX)</h3>
      <div className="af-grid2">
        <label>Chord ({u === "metric" ? "m" : "ft"})</label>
        <input
          type="number"
          step="0.01"
          value={state.chord}
          onChange={(e) => set("chord", parseFloat(e.target.value || "0"))}
        />

        <label>Thickness ratio (t)</label>
        <input
          type="number"
          step="0.005"
          value={state.t}
          onChange={(e) => set("t", parseFloat(e.target.value || "0"))}
        />

        <label>Max camber (m)</label>
        <input
          type="number"
          step="0.005"
          value={state.m}
          onChange={(e) => set("m", parseFloat(e.target.value || "0"))}
        />

        <label>Camber position (p)</label>
        <input
          type="number"
          step="0.05"
          value={state.p}
          onChange={(e) => set("p", parseFloat(e.target.value || "0"))}
        />

        <label>Angle of attack (°)</label>
        <input
          type="number"
          step="0.5"
          value={state.angleDeg}
          onChange={(e) => set("angleDeg", parseFloat(e.target.value || "0"))}
        />
      </div>

      <h3>Flow</h3>
      <div className="af-grid2">
        <label>Velocity V ({u === "metric" ? "m/s" : "ft/s"})</label>
        <input
          type="number"
          step="0.1"
          value={state.V}
          onChange={(e) => set("V", parseFloat(e.target.value || "0"))}
        />

        <label>Density ρ ({u === "metric" ? "kg/m³" : "slug/ft³"})</label>
        <input
          type="number"
          step="0.001"
          value={state.rho}
          onChange={(e) => set("rho", parseFloat(e.target.value || "0"))}
        />

        <label>Viscosity μ ({u === "metric" ? "Pa·s" : "lbf·s/ft²"})</label>
        <input
          type="number"
          step="1e-6"
          value={state.mu}
          onChange={(e) => set("mu", parseFloat(e.target.value || "0"))}
        />

        <label>Wing area S ({u === "metric" ? "m²" : "ft²"})</label>
        <input
          type="number"
          step="0.01"
          value={state.S}
          onChange={(e) => set("S", parseFloat(e.target.value || "0"))}
        />
      </div>
    </div>
  );
}
