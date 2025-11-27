// src/foilsim/FlightPanel.jsx
import React from "react";
import { useFoilSim } from "./store.jsx";

const ENV_OPTIONS = [
  { id: 1, label: "Earth – Average Day" },
  { id: 2, label: "Mars – Avg Day" },
  { id: 3, label: "mercury – Const Dens" },
  { id: 4, label: "Venus – Surface" },
];

export default function FlightPanel() {
  const { state, set } = useFoilSim();
  const { units, environmentSelect, V, altitude } = state;

  const isMetric = units === "metric";
  const speedLabel = isMetric ? "Speed (km/h)" : "Speed (mph)";
  const altitudeLabel =
    environmentSelect === 3
      ? isMetric
        ? "Depth (m)"
        : "Depth (ft)"
      : isMetric
        ? "Altitude (m)"
        : "Altitude (ft)";
  const dynPressLabel = isMetric ? "Dyn Press (kPa)" : "Dyn Press (lb/ft²)";
  const densLabel = isMetric ? "Dens (kg/m³)" : "Dens (slug/ft³)";
  const pressureLabel = isMetric ? "Press (kPa)" : "Press (lb/in²)";

  // Velocity slider ranges (roughly matching your FoilSim code)
  const vMax = isMetric ? 396.0 : 250.0;
  const altMax = isMetric ? 15087.6 : 49500.0;

  const handleEnvChange = (e) => {
    set("environmentSelect", Number(e.target.value));
  };

  return (
    <div className="af-panel">
      <h2 className="af-title">Flight Test</h2>
      {/* Environment dropdown */}
      <div style={{ marginBottom: 12 }}>
        <label>
          Environment:{" "}
          <select
            value={environmentSelect}
            onChange={handleEnvChange}
            style={{ marginLeft: 8 }}
          >
            {ENV_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {/* Speed */}
      <div style={{ marginBottom: 12 }}>
        <label>
          {speedLabel}:{" "}
          <input
            type="number"
            value={V}
            min={0}
            max={vMax}
            step="1"
            onChange={(e) => set("V", Number(e.target.value) || 0)}
            style={{ width: 90, marginLeft: 8 }}
          />
        </label>
        <input
          type="range"
          min={0}
          max={vMax}
          step="1"
          value={V}
          onChange={(e) => set("V", Number(e.target.value))}
          style={{ width: "100%", marginTop: 4 }}
        />
      </div>
      {/* Altitude / Depth */}
      <div style={{ marginBottom: 12 }}>
        <label>
          {altitudeLabel}:{" "}
          <input
            type="number"
            value={altitude}
            min={0}
            max={altMax}
            step="100"
            onChange={(e) => set("altitude", Number(e.target.value) || 0)}
            style={{ width: 90, marginLeft: 8 }}
          />
        </label>
        <input
          type="range"
          min={0}
          max={altMax}
          step="100"
          value={altitude}
          onChange={(e) => set("altitude", Number(e.target.value))}
          style={{ width: "100%", marginTop: 4 }}
        />
      </div>
      {/* “Labels” that used to be separate DOM calls */}
      <div style={{ marginTop: 8 }}>
        <div>{pressureLabel}</div>
        <div>{densLabel}</div>
        <div>{dynPressLabel}</div>
      </div>
    </div>
  );
}
