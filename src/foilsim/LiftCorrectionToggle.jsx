import React from "react";
import { useFoilSim } from "./store.jsx";

export default function LiftCorrectionToggle() {
  const { state, set } = useFoilSim();
  const arOn = state.ar === true;

  const handleOn = () => set("ar", true);
  const handleOff = () => set("ar", false);

  return (
    <div style={{ marginTop: 8 }}>
      {/* Label (replaces liftCorrection()) */}
      <div
        style={{
          color: "blue",
          marginBottom: 4,
        }}
      >
        AR Lift Correction:
      </div>

      {/* Buttons (replaces liftCorrectionButtons()) */}
      <div style={{ display: "inline-flex", gap: 8 }}>
        <button
          type="button"
          onClick={handleOn}
          style={{
            padding: "4px 10px",
            borderRadius: 6,
            border: "1px solid #ccc",
            backgroundColor: arOn ? "yellow" : "white",
            cursor: "pointer",
          }}
        >
          AR On
        </button>

        <button
          type="button"
          onClick={handleOff}
          style={{
            padding: "4px 10px",
            borderRadius: 6,
            border: "1px solid #ccc",
            backgroundColor: !arOn ? "yellow" : "white",
            cursor: "pointer",
          }}
        >
          AR Off
        </button>
      </div>
    </div>
  );
}
