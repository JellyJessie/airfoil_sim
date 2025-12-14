// src/App.jsx
import React, { useState } from "react";
import { FoilSimProvider, useFoilSim } from "./store/FoilSimContext.jsx";

import DesignApp from "./design/DesignApp.jsx";
import Design3D from "./design/Design3D.jsx";
import QuickControls from "./components/QuickControls.jsx";
import { OutputTabs } from "./foilsim/OutputTabs.jsx";
import PlotButtons from "./components/PlotButtons.jsx";
import PlotControls from "./foilsim/PlotControls.jsx";
import AnalysisPanel from "./components/AnalysisPanel.jsx";
import InputTabs from "./foilsim/InputTabs.jsx";
import FlowCanvas from "./components/FlowCanvas.jsx";
import { Environment, UnitSystem } from "./components/shape.js";
import FoilSimPanel from "./components/FoilSimPanel.jsx";

/**
 * Simple angle-of-attack slider using FoilSim context
 */
function AngleControl() {
  const {
    state: { angleDeg },
    dispatch,
  } = useFoilSim();

  const handleChange = (e) => {
    const value = Number(e.target.value);
    dispatch({ type: "SET_INPUT", key: "angleDeg", value });
  };

  return (
    <div style={{ marginBottom: "1rem" }}>
      <label>
        Angle of attack (deg): <strong>{angleDeg.toFixed(1)}</strong>
      </label>
      <br />
      <input
        type="range"
        min={-20}
        max={20}
        step={0.5}
        value={angleDeg}
        onChange={handleChange}
      />
    </div>
  );
}

/**
 * Root app
 * This is the ONLY default export. No createRoot or mount() here.
 */
function AppInner() {
  const [tab, setTab] = useState("design");

  return (
    <div style={{ padding: "16px", fontFamily: "system-ui" }}>
      {/* TABS AT THE TOP */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button onClick={() => setTab("design")}>Airfoil Design (NACA)</button>
        <button onClick={() => setTab("three")}>3D View</button>
        <button onClick={() => setTab("quick")}>Quick Controls</button>
        <button onClick={() => setTab("analysis")}>Analysis</button>
      </div>

      {/* TAB CONTENT */}
      {tab === "quick" && <QuickControls />}
      {tab === "analysis" && <AnalysisPanel />}

      {/* Spacer */}
      <hr style={{ margin: "16px 0" }} />

      {/* Context-powered controls */}

      <FoilSimPanel />
    </div>
  );
}

export default function App() {
  return (
    <FoilSimProvider>
      <div className="app foilsim-layout">
        {/* Left side: controls */}
        <AppInner />
        <div className="foilsim-left">
          <h2>FoilSim</h2>
          <InputTabs />
        </div>

        <FlowCanvas />

        {/* Right side: NASA-style Gage/Geometry/Data/Plot outputs */}
        <div className="foilsim-right">
          <div style={{ position: "relative", zIndex: 5000 }}>
            <OutputTabs />
          </div>
        </div>
      </div>
    </FoilSimProvider>
  );
}
