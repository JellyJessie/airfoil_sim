import React from "react";
import { useFoilSim } from "./store.jsx";

export default function InducedDragToggle() {
  const { state, set } = useFoilSim();
  const inducedOn = state.induced === true;

  const handleOn = () => set("induced", true);
  const handleOff = () => set("induced", false);

  return (
    <div style={{ marginTop: 12 }}>
      {/* Label (replaces inducedDragLabel()) */}
      <div style={{ color: "blue", marginBottom: 4 }}>Induced Drag:</div>

      {/* Buttons (replaces inducedButtons()) */}
      <div style={{ display: "inline-flex", gap: 8 }}>
        <button
          type="button"
          onClick={handleOn}
          style={{
            padding: "4px 10px",
            borderRadius: 6,
            border: "1px solid #ccc",
            backgroundColor: inducedOn ? "yellow" : "white",
            cursor: "pointer",
          }}
        >
          ID On
        </button>

        <button
          type="button"
          onClick={handleOff}
          style={{
            padding: "4px 10px",
            borderRadius: 6,
            border: "1px solid #ccc",
            backgroundColor: !inducedOn ? "yellow" : "white",
            cursor: "pointer",
          }}
        >
          ID Off
        </button>
      </div>
    </div>
  );
}
