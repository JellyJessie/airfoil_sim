// src/foilsim/PlotButtons.jsx
import React from "react";
import { useFoilSim } from "../store/FoilSimContext";

export default function PlotButtons() {
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
