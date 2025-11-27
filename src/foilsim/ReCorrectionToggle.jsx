import React from "react";
import { useFoilSim } from "./store.jsx";

export default function ReCorrectionToggle() {
  const { state, set } = useFoilSim();
  const reOn = state.reCorrection === true;

  const handleOn = () => set("reCorrection", true);
  const handleOff = () => set("reCorrection", false);

  return (
    <div style={{ marginTop: 12 }}>
      {/* Label (replaces reNumCorrection()) */}
      <div style={{ color: "blue", marginBottom: 4 }}>Re # Correction:</div>

      {/* Buttons (replaces reNumButtons()) */}
      <div style={{ display: "inline-flex", gap: 8 }}>
        <button
          type="button"
          onClick={handleOn}
          style={{
            padding: "4px 10px",
            borderRadius: 6,
            border: "1px solid #ccc",
            backgroundColor: reOn ? "yellow" : "white",
            cursor: "pointer",
          }}
        >
          Re On
        </button>

        <button
          type="button"
          onClick={handleOff}
          style={{
            padding: "4px 10px",
            borderRadius: 6,
            border: "1px solid #ccc",
            backgroundColor: !reOn ? "yellow" : "white",
            cursor: "pointer",
          }}
        >
          Re Off
        </button>
      </div>
    </div>
  );
}
