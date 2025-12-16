import React from "react";
import { useFoilSim } from "../store/FoilSimContext";

const OUTPUT_MODES = [
  { id: 1, key: "gauges ", label: "gauges " },
  { id: 2, key: "geometry", label: "Geometry" },
  { id: 3, key: "data", label: "Data" },
  { id: 4, key: "plot", label: "Plot" },
];

export function OutputTabs() {
  const {
    state: { outputButton },
    dispatch,
  } = useFoilSim();

  // OutputTabs.jsx
  const setOutput = (value) => {
    dispatch({
      type: "SET_OUTPUT_BUTTON",
      value, // ✅ use "value" consistently
    });
  };

  const handleClick = (id) => {
    setOutput(id); // ✅ correct
  };

  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
      {OUTPUT_MODES.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => handleClick(m.id)}
          style={{
            zIndex: 9999,
            pointerEvents: "auto",
            position: "relative",
            padding: "4px 10px",
            borderRadius: 6,
            border: "1px solid #ccc",
            backgroundColor: outputButton === m.id ? "yellow" : "white",
            cursor: "pointer",
          }}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
export default OutputTabs;
