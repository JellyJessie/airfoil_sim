import React from "react";
import { useFoilSim } from "../store/FoilSimContext";

export default function Controls() {
  const { state, set, toggleUnits } = useFoilSim();
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

      <h3>Geometry</h3>
      <div className="af-grid2">
        <label>Chord ({u === "metric" ? "m" : "ft"})</label>
        <input
          type="number"
          step="0.01"
          value={state.chord}
          onChange={(e) => set("chord", +e.target.value || 0)}
        />

        <label>t (thickness ratio)</label>
        <input
          type="number"
          step="0.005"
          value={state.t}
          onChange={(e) => set("t", +e.target.value || 0)}
        />

        <label>m (max camber)</label>
        <input
          type="number"
          step="0.005"
          value={state.m}
          onChange={(e) => set("m", +e.target.value || 0)}
        />

        <label>p (camber position)</label>
        <input
          type="number"
          step="0.05"
          value={state.p}
          onChange={(e) => set("p", +e.target.value || 0)}
        />

        <label>Angle of attack (°)</label>
        <input
          type="number"
          step="0.5"
          value={state.angleDeg}
          onChange={(e) => set("angleDeg", +e.target.value || 0)}
        />
      </div>

      <h3>Flow</h3>
      <div className="af-grid2">
        <label>Velocity V ({u === "metric" ? "m/s" : "ft/s"})</label>
        <input
          type="number"
          step="0.1"
          value={state.V}
          onChange={(e) => set("V", +e.target.value || 0)}
        />

        <label>Density ρ ({u === "metric" ? "kg/m³" : "slug/ft³"})</label>
        <input
          type="number"
          step="0.001"
          value={state.rho}
          onChange={(e) => set("rho", +e.target.value || 0)}
        />

        <label>Viscosity μ ({u === "metric" ? "Pa·s" : "lbf·s/ft²"})</label>
        <input
          type="number"
          step="1e-6"
          value={state.mu}
          onChange={(e) => set("mu", +e.target.value || 0)}
        />

        <label>Wing area S ({u === "metric" ? "m²" : "ft²"})</label>
        <input
          type="number"
          step="0.01"
          value={state.S}
          onChange={(e) => set("S", +e.target.value || 0)}
        />
      </div>
    </div>
  );
}
