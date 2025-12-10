// src/components/AnalysisPanel.jsx
import React from "react";
import { useFoilSim } from "../store/FoilSimContext";

// Reusable toggle button
function ToggleButton({ active, children, ...props }) {
  return (
    <button
      {...props}
      style={{
        padding: "4px 10px",
        marginLeft: 8,
        marginRight: 4,
        borderRadius: 4,
        border: "1px solid #ccc",
        backgroundColor: active ? "yellow" : "white",
        cursor: "pointer",
        minWidth: 70,
      }}
    >
      {children}
    </button>
  );
}

// Small numeric badge for real-time values
function ValueBadge({ label, value }) {
  return (
    <span
      style={{
        marginLeft: 8,
        padding: "2px 8px",
        fontSize: 12,
        borderRadius: 6,
        background: "#f2f2f2",
        border: "1px solid #ccc",
        fontFamily: "monospace",
      }}
    >
      {label}: {value}
    </span>
  );
}

export default function AnalysisPanel() {
  const {
    state: { liftAnalisis, ar, induced, reCorrection },
    outputs, // ✅ this comes from computeOutputs via context
    dispatch,
  } = useFoilSim();

  // ✅ Safely read real-time physics outputs
  const cl = outputs?.cl?.toFixed(4) ?? "--";
  const cd = outputs?.cd?.toFixed(5) ?? "--";
  const ld = outputs?.liftOverDrag?.toFixed(3) ?? "--";
  const reynolds = outputs?.reynolds ? outputs.reynolds.toExponential(3) : "--";

  return (
    <div className="af-panel">
      <h2 className="af-title">Lift & Drag Analysis</h2>

      {/* ================= MODEL ================= */}
      <div style={{ marginBottom: 16 }}>
        <span style={{ fontWeight: "bold", marginRight: 8 }}>Model:</span>

        <ToggleButton
          active={liftAnalisis === 1}
          onClick={() => dispatch({ type: "SET_LIFT_ANALYSIS", mode: 1 })}
        >
          Stall
        </ToggleButton>

        <ToggleButton
          active={liftAnalisis === 2}
          onClick={() => dispatch({ type: "SET_LIFT_ANALYSIS", mode: 2 })}
        >
          Ideal
        </ToggleButton>

        <ValueBadge label="Cl" value={cl} />
      </div>

      {/* ================= ASPECT RATIO ================= */}
      <div style={{ marginBottom: 16 }}>
        <span style={{ marginRight: 8 }}>AR Lift Correction:</span>

        <ToggleButton
          active={ar === true}
          onClick={() => dispatch({ type: "SET_AR", value: true })}
        >
          AR On
        </ToggleButton>

        <ToggleButton
          active={ar === false}
          onClick={() => dispatch({ type: "SET_AR", value: false })}
        >
          AR Off
        </ToggleButton>

        <ValueBadge label="AR" value={ar ? "On" : "Off"} />
      </div>

      {/* ================= INDUCED DRAG ================= */}
      <div style={{ marginBottom: 16 }}>
        <span style={{ marginRight: 8 }}>Induced Drag:</span>

        <ToggleButton
          active={induced === true}
          onClick={() => dispatch({ type: "SET_INDUCED", value: true })}
        >
          ID On
        </ToggleButton>

        <ToggleButton
          active={induced === false}
          onClick={() => dispatch({ type: "SET_INDUCED", value: false })}
        >
          ID Off
        </ToggleButton>

        <ValueBadge label="Cd" value={cd} />
      </div>

      {/* ================= REYNOLDS CORRECTION ================= */}
      <div style={{ marginBottom: 16 }}>
        <span style={{ marginRight: 8 }}>Re # Correction:</span>

        <ToggleButton
          active={reCorrection === true}
          onClick={() => dispatch({ type: "SET_RE_CORRECTION", value: true })}
        >
          Re On
        </ToggleButton>

        <ToggleButton
          active={reCorrection === false}
          onClick={() => dispatch({ type: "SET_RE_CORRECTION", value: false })}
        >
          Re Off
        </ToggleButton>

        <ValueBadge label="Re" value={reynolds} />
      </div>

      {/* ================= L/D RATIO ================= */}
      <div style={{ marginTop: 20 }}>
        <span style={{ fontWeight: "bold" }}>Performance:</span>
        <ValueBadge label="L/D" value={ld} />
      </div>
    </div>
  );
}
