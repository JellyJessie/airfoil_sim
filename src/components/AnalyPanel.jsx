// src/components/AnalysisPanel.jsx
import React from "react";
import { useFoilSim } from "../store/FoilSimContext";

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
      }}
    >
      {children}
    </button>
  );
}

export default function AnalysisPanel() {
  const {
    state: { liftAnalisis, ar, induced, reCorrection },
    dispatch,
  } = useFoilSim();

  return (
    <div
      style={{
        padding: "16px",
        fontFamily: "system-ui",
        border: "1px solid #ddd",
        borderRadius: 8,
        maxWidth: 520,
      }}
    >
      <h2 style={{ marginTop: 0 }}>Lift Analysis</h2>

      {/* Stall model / ideal flow */}
      <div style={{ marginBottom: 16 }}>
        <span style={{ fontWeight: "bold", marginRight: 8 }}>Model:</span>
        <ToggleButton
          active={liftAnalisis === 1}
          onClick={() => dispatch({ type: "SET_LIFT_ANALYSIS", mode: 1 })}
        >
          Stall Model
        </ToggleButton>
        <ToggleButton
          active={liftAnalisis === 2}
          onClick={() => dispatch({ type: "SET_LIFT_ANALYSIS", mode: 2 })}
        >
          Ideal Flow
        </ToggleButton>
      </div>

      {/* AR lift correction */}
      <div style={{ marginBottom: 16 }}>
        <span style={{ color: "blue", marginRight: 8 }}>
          AR Lift Correction:
        </span>
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
      </div>

      {/* Induced drag */}
      <div style={{ marginBottom: 16 }}>
        <span style={{ color: "blue", marginRight: 8 }}>Induced Drag:</span>
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
      </div>

      {/* Re # correction */}
      <div style={{ marginBottom: 16 }}>
        <span style={{ color: "blue", marginRight: 8 }}>Re # Correction:</span>
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
      </div>

      {/* You can add the other analysis controls here later:
          - dragOfBall / BallButtons
          - displayLabel / streamlinesButton / csv_Button / view_Buttons
          Just follow the same pattern: state in context, toggles here.
      */}
    </div>
  );
}
