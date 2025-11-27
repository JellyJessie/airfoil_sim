// src/foilsim/OutputTabs.jsx
import React from "react";
import { useFoilSim } from "./store.jsx";

const OUTPUT_MODES = [
  { id: 1, key: "gage", label: "Gage" },
  { id: 2, key: "geometry", label: "Geometry" },
  { id: 3, key: "data", label: "Data" },
  { id: 4, key: "plot", label: "Plot" },
];

export function OutputTabs({ onModeChange }) {
  const { state, set } = useFoilSim();
  const current = state.outputButton ?? 1;

  const handleClick = (id) => {
    set("outputButton", id);
    if (onModeChange) onModeChange(id);
  };

  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
      {OUTPUT_MODES.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => handleClick(m.id)}
          style={{
            padding: "4px 10px",
            borderRadius: 6,
            border: "1px solid #ccc",
            backgroundColor: current === m.id ? "yellow" : "white",
            cursor: "pointer",
          }}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
