import React from "react";
import { useFoilSim } from "../store/FoilSimContext.jsx";

export default function PlotButtons({ visible = true }) {
  const {
    state: { plot },
    setPlot,
  } = useFoilSim();

  if (!visible) return null; // equivalent of style.visibility = "hidden"

  const btnStyle = {
    padding: "4px 8px",
    marginRight: "6px",
    borderRadius: 4,
    border: "1px solid #ccc",
    background: "#f8f8f8",
    cursor: "pointer",
  };

  const activeStyle = {
    ...btnStyle,
    background: "#007bff",
    color: "white",
    fontWeight: "bold",
  };

  return (
    <div style={{ marginTop: "8px", marginBottom: "8px" }}>
      <button
        type="button"
        style={plot === 8 ? activeStyle : btnStyle}
        onClick={() => setPlot(8)}
      >
        Speed
      </button>

      <button
        type="button"
        style={plot === 9 ? activeStyle : btnStyle}
        onClick={() => setPlot(9)}
      >
        Altitude
      </button>

      <button
        type="button"
        style={plot === 10 ? activeStyle : btnStyle}
        onClick={() => setPlot(10)}
      >
        Wing Area
      </button>

      <button
        type="button"
        style={plot === 11 ? activeStyle : btnStyle}
        onClick={() => setPlot(11)}
      >
        Density
      </button>
    </div>
  );
}
