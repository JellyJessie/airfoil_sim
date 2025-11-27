import React from "react";
import { useFoilSim } from "./store.jsx";

export default function LiftAnalysisToggle() {
  const { state, set } = useFoilSim();
  const value = state.liftAnalisis; // 1 or 2

  const setStallModel = () => set("liftAnalisis", 1);
  const setIdealFlow = () => set("liftAnalisis", 2);

  const stallSelected = value === 1;
  const idealSelected = value === 2;

  return (
    <div
      style={{
        display: "inline-flex",
        gap: 8,
        alignItems: "center",
        padding: "8px 0",
      }}
    >
      <span style={{ marginRight: 8 }}>Lift Analysis:</span>

      <button
        type="button"
        onClick={setStallModel}
        style={{
          padding: "4px 10px",
          borderRadius: 6,
          border: "1px solid #ccc",
          backgroundColor: stallSelected ? "yellow" : "white",
          cursor: "pointer",
        }}
      >
        Stall Model
      </button>

      <button
        type="button"
        onClick={setIdealFlow}
        style={{
          padding: "4px 10px",
          borderRadius: 6,
          border: "1px solid #ccc",
          backgroundColor: idealSelected ? "yellow" : "white",
          cursor: "pointer",
        }}
      >
        Ideal Flow
      </button>
    </div>
  );
}
