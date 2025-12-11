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
export function PlotDisplayControls({
  display,
  onChangeDisplay,
  view,
  onChangeView,
  onExportCsv,
}) {
  const isStreamlines = display === 1;
  const isMoving = display === 2;
  const isFreeze = display === 3;

  const is2D = view === 1;
  const is3D = view === 2;

  const buttonBase = "px-3 py-1 mx-1 text-sm border rounded cursor-pointer"; // Tailwind-ish; tweak or replace with your own

  return (
    <div
      className="plot-display-controls"
      style={{
        position: "relative",
        padding: "8px 12px",
        fontSize: "14px",
      }}
    >
      {/* Display label + modes */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: "8px",
          gap: "8px",
        }}
      >
        <span style={{ color: "blue", fontWeight: 600 }}>Display</span>

        <button
          type="button"
          className={buttonBase}
          style={{
            backgroundColor: isStreamlines ? "yellow" : "",
          }}
          onClick={() => onChangeDisplay(1)}
        >
          Streamlines
        </button>

        <button
          type="button"
          className={buttonBase}
          style={{
            backgroundColor: isMoving ? "yellow" : "",
          }}
          onClick={() => onChangeDisplay(2)}
        >
          Moving
        </button>

        <button
          type="button"
          className={buttonBase}
          style={{
            backgroundColor: isFreeze ? "yellow" : "",
          }}
          onClick={() => onChangeDisplay(3)}
        >
          Freeze
        </button>
      </div>

      {/* CSV + view modes */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <button type="button" className={buttonBase} onClick={onExportCsv}>
          CSV
        </button>

        <button
          type="button"
          className={buttonBase}
          style={{
            backgroundColor: is2D ? "yellow" : "",
          }}
          onClick={() => onChangeView(1)}
        >
          2D view
        </button>

        <button
          type="button"
          className={buttonBase}
          style={{
            backgroundColor: is3D ? "yellow" : "",
          }}
          onClick={() => onChangeView(2)}
        >
          3D view
        </button>
      </div>
    </div>
  );
}

export default function SAWDPlotControls() {
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
