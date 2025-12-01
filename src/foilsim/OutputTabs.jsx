import React from "react";
import { useFoilSim } from "../store/FoilSimContext";

export function OutputTabs() {
  const {
    state: { outputButton },
    dispatch,
  } = useFoilSim();

  const setOutput = (value) =>
    dispatch({
      type: value === 4 ? "SELECT_PLOT_PANEL" : "SET_OUTPUT_BUTTON",
      outputButton: value,
    });

  const styleFor = (id) => ({
    padding: "4px 10px",
    marginRight: "6px",
    borderRadius: 4,
    border: "1px solid #ccc",
    backgroundColor: outputButton === id ? "yellow" : "#f5f5f5",
    cursor: "pointer",
  });

  return (
    <div style={{ marginBottom: "0.5rem" }}>
      <button style={styleFor(1)} onClick={() => setOutput(1)}>
        Gauge
      </button>
      <button style={styleFor(2)} onClick={() => setOutput(2)}>
        Geometry
      </button>
      <button style={styleFor(3)} onClick={() => setOutput(3)}>
        Data
      </button>
      <button style={styleFor(4)} onClick={() => setOutput(4)}>
        Plot
      </button>
    </div>
  );
}
