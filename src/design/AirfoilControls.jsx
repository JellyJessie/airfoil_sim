import React from "react";
import { AirfoilProvider, useAirfoil } from "../state/airfoilStore.jsx";

import React from "react";
import { useFoilSim } from "../foilsim/FoilSimContext"; // adjust path

export default function AirfoilControls() {
  const { state, setUnits, dispatch } = useFoilSim();
  const u = state.units; // "imperial" | "metric"

  const setNum = (key) => (e) => {
    const v = Number(e.target.value);
    dispatch({ type: "SET_INPUT", key, value: Number.isFinite(v) ? v : 0 });
  };

  return (
    <div className="af-panel">
      <h2 className="af-title">Controls</h2>

      <div className="af-field">
        <label>Units</label>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={() => setUnits(u === "metric" ? "imperial" : "metric")}
          >
            Switch to {u === "metric" ? "Imperial" : "Metric"}
          </button>
          <span>Current: {u}</span>
        </div>
      </div>

      <h3>Geometry</h3>
      <div className="af-grid2">
        <label>Chord ({u === "metric" ? "m" : "ft"})</label>
        <input
          type="number"
          step="0.01"
          value={state.chord}
          onChange={setNum("chord")}
        />

        <label>Thickness (% chord)</label>
        <input
          type="number"
          step="0.1"
          value={state.thicknessPct}
          onChange={setNum("thicknessPct")}
        />

        <label>Camber (% chord)</label>
        <input
          type="number"
          step="0.1"
          value={state.camberPct}
          onChange={setNum("camberPct")}
        />

        <label>Angle of attack (°)</label>
        <input
          type="number"
          step="0.5"
          value={state.angleDeg}
          onChange={setNum("angleDeg")}
        />
      </div>

      <h3>Flight</h3>
      <div className="af-grid2">
        <label>Velocity ({u === "metric" ? "km/h" : "mph"})</label>
        <input
          type="number"
          step="0.1"
          value={state.velocity}
          onChange={setNum("velocity")}
        />

        <label>Altitude ({u === "metric" ? "m" : "ft"})</label>
        <input
          type="number"
          step="1"
          value={state.altitude}
          onChange={setNum("altitude")}
        />

        <label>Wing area ({u === "metric" ? "sq m" : "sq ft"})</label>
        <input
          type="number"
          step="0.01"
          value={state.wingArea}
          onChange={setNum("wingArea")}
        />
      </div>
    </div>
  );
}
