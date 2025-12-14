// src/foilsim/PlotButtons.jsx
import React from "react";
import { useFoilSim } from "../store/FoilSimContext";
import { PlotDisplayControls } from "./PlotDisplayControls.jsx";

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

export default function PlotButtons() {
  const { state, dispatch } = useFoilSim();
  const { displayMode, viewMode } = state; // you define these in your reducer

  const {
    state: { plot, shapeSelect, selectClicked },
    setPlot,
    setInputButton,
    setOutputButton,
    incrementSelectClicked,
  } = useFoilSim();

  // This function is the React equivalent of selectPlotButton()
  const handleSelectPlotClick = () => {
    // outputButton = 5; plot = 2; inputButton = 5;
    setOutputButton(5);
    setPlot(2);
    setInputButton(5);
    incrementSelectClicked();
  };

  // In the old code:
  // - shapeSelect <= 3 => show all surface + param buttons
  // - shapeSelect >= 4 => hide angle/camber/thickness/speed/alt/wing/density
  const isBodyShape = shapeSelect <= 3;
  const hasBeenOpenedOnce = selectClicked >= 1;

  return (
    <div
      style={{
        border: "1px solid #ccc",
        borderRadius: 8,
        padding: "0.75rem",
        marginTop: "1rem",
      }}
    >
      <div style={{ marginBottom: "0.5rem", display: "flex", gap: 8 }}>
        <button onClick={handleSelectPlotClick}>Select Plot Panel</button>

        {hasBeenOpenedOnce && (
          <span style={{ color: "blue", fontWeight: 600 }}>
            SelectPlot · Surface
          </span>
        )}
      </div>
      <PlotDisplayControls
        display={displayMode}
        onChangeDisplay={(mode) => dispatch({ type: "SET_DISPLAY_MODE", mode })}
        view={viewMode}
        onChangeView={(mode) => dispatch({ type: "SET_VIEW_MODE", mode })}
        onExportCsv={() => dispatch({ type: "EXPORT_CSV" })}
      />

      {/* Surface buttons (Pressure / Velocity / Drag) */}
      {hasBeenOpenedOnce && (
        <>
          <div style={{ marginBottom: "0.5rem" }}>
            <strong>Surface plots:</strong>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <PlotButton
              label="Pressure"
              active={plot === 2}
              onClick={() => setPlot(2)}
            />
            <PlotButton
              label="Velocity"
              active={plot === 3}
              onClick={() => setPlot(3)}
            />
            <PlotButton
              label="Drag"
              active={plot === 4}
              onClick={() => setPlot(4)}
            />
          </div>

          {/* Parameter plots (only for airfoil/ellipse/plate) */}
          {isBodyShape && (
            <>
              <div style={{ marginTop: "0.75rem", marginBottom: "0.5rem" }}>
                <strong>Parameter plots:</strong>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <PlotButton
                  label="Angle"
                  active={plot === 5}
                  onClick={() => setPlot(5)}
                />
                <PlotButton
                  label="Camber"
                  active={plot === 6}
                  onClick={() => setPlot(6)}
                />
                <PlotButton
                  label="Thickness"
                  active={plot === 7}
                  onClick={() => setPlot(7)}
                />
                <PlotButton
                  label="Speed"
                  active={plot === 8}
                  onClick={() => setPlot(8)}
                />
                <PlotButton
                  label="Altitude"
                  active={plot === 9}
                  onClick={() => setPlot(9)}
                />
                <PlotButton
                  label="Wing Area"
                  active={plot === 10}
                  onClick={() => setPlot(10)}
                />
                <PlotButton
                  label="Density"
                  active={plot === 11}
                  onClick={() => setPlot(11)}
                />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function PlotButton({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "4px 10px",
        borderRadius: 4,
        border: active ? "2px solid #1976d2" : "1px solid #ccc",
        backgroundColor: active ? "#e3f2fd" : "white",
        cursor: "pointer",
        fontSize: "0.85rem",
      }}
    >
      {label}
    </button>
  );
}
