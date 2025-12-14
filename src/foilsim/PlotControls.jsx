// src/foilsim/PlotControls.jsx
import React from "react";
import { useFoilSim } from "../store/FoilSimContext";
/**
 * Props:
 *  - display: 1 | 2 | 3  (1=streamlines, 2=moving, 3=freeze)
 *  - onChangeDisplay(mode)
 *  - view: 1 | 2 (1=2D, 2=3D)
 *  - onChangeView(mode)
 *  - onExportCsv()  // calls your generate_CSV replacement
 */

export default function PlotControls() {
  const {
    state: { plot },
    dispatch,
  } = useFoilSim();

  const setPlot = (plotId) => {
    dispatch({ type: "SET_PLOT", plot: plotId });
  };

  const btnStyle = (id) => ({
    padding: "4px 10px",
    marginRight: "8px",
    borderRadius: 4,
    border: "1px solid #ccc",
    backgroundColor: plot === id ? "#ffd700" : "#f5f5f5",
    cursor: "pointer",
    fontSize: "0.85rem",
  });

  return (
    <div style={{ marginTop: "0.75rem" }}>
      <div style={{ marginBottom: "4px", fontWeight: 600 }}>
        X-axis variable
      </div>
      <div>
        <button style={btnStyle(8)} onClick={() => setPlot(8)}>
          Speed
        </button>
        <button style={btnStyle(9)} onClick={() => setPlot(9)}>
          Altitude
        </button>
        <button style={btnStyle(10)} onClick={() => setPlot(10)}>
          Wing Area
        </button>
        <button style={btnStyle(11)} onClick={() => setPlot(11)}>
          Density
        </button>
      </div>
    </div>
  );
}
