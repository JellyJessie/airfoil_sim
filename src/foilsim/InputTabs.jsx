import React from "react";
import { useFoilSim } from "../store/FoilSimContext";

// 1 = Shape, 2 = Flight, 3 = Analysis, 4 = Size, 5 = Select
const INPUT_MODES = [
  { id: 1, label: "Shape" },
  { id: 2, label: "Flight" },
  { id: 3, label: "Analysis" },
  { id: 4, label: "Size" },
  { id: 5, label: "Select" },
];

// 1 = Gage, 2 = Geometry, 3 = Data, 4 = Plot
const OUTPUT_MODES = [
  { id: 1, key: "gage", label: "Gage" },
  { id: 2, key: "geometry", label: "Geometry" },
  { id: 3, key: "data", label: "Data" },
  { id: 4, key: "plot", label: "Plot" },
];

// Named export – this is what Layout.jsx imports with { InputTabs }
export default function InputTabs({ onModeChange }) {
  const { state, set } = useFoilSim();
  const current = state.inputButton ?? 2;

  const handleClick = (id) => {
    set("inputButton", id);
    if (onModeChange) onModeChange(id);
  };

  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
      {INPUT_MODES.map((m) => (
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
