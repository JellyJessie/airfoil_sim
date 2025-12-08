// src/foilsim/Layout.jsx
import React from "react";
import InputTabs from "./InputTabs.jsx";
import FlightPanel from "./FlightPanel.jsx";
import SizePanel from "./SizePanel.jsx";
import AnalyPanel from "./AnalyPanel.jsx";
import OutputsPanel from "./OutputsPanel.jsx";
import { useFoilSim } from "../store/FoilSimContext.jsx";

export default function Layout() {
  const { state } = useFoilSim();
  // 1 = Size, 2 = Flight, 3 = Analysis (adjust to your convention)
  const mode = state.inputButton ?? 2;

  let inputPanel = null;
  if (mode === 1) {
    inputPanel = <SizePanel />;
  } else if (mode === 2) {
    inputPanel = <FlightPanel />;
  } else {
    inputPanel = <AnalyPanel />;
  }

  return (
    <div className="af-panel">
      {/* Tabs at the top */}
      <InputTabs />

      {/* Input panel (size/flight/analysis) */}
      <div style={{ marginTop: 12 }}>{inputPanel}</div>

      {/* Outputs at the bottom */}
      <div style={{ marginTop: 16 }}>
        <OutputsPanel />
      </div>
    </div>
  );
}
