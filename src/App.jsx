// src/App.jsx
import React, { useState } from "react";
import { FoilSimProvider, useFoilSim } from "./store/FoilSimContext.jsx";
import { UnitSystem, Environment } from "./physics/shapeCore.js";

import DesignApp from "./design/DesignApp.jsx";
import Design3D from "./design/Design3D.jsx";
import QuickControls from "./components/QuickControls.jsx";
import { OutputTabs } from "./foilsim/OutputTabs.jsx";
import PlotButtons from "./components/PlotButtons.jsx";
import PlotControls from "./foilsim/PlotControls.jsx";
import AnalysisPanel from "./components/AnalysisPanel.jsx";
import PlotPanel from "./foilsim/PlotPanel.jsx";
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
 * Minimal FoilSim data panel:
 * - Units / environment selectors
 * - Velocity / chord / altitude inputs
 * - Reynolds number from derivedShape
 */
function FoilSimPanel() {
  const { state, derivedShape, dispatch } = useFoilSim();
  const { units, environment, velocity, chord, altitude } = state;
  const { outputButton, shapeSelect } = state;
  const reynolds = derivedShape?.reynolds ?? 0;

  const handleUnitsChange = (e) => {
    dispatch({ type: "SET_UNITS", units: e.target.value });
  };

  const handleEnvChange = (e) => {
    dispatch({ type: "SET_ENVIRONMENT", environment: e.target.value });
  };

  const handleInput = (key) => (e) => {
    const value = parseFloat(e.target.value || "0");
    dispatch({ type: "SET_INPUT", key: "span", value: e.target.value });
  };

  return (
    <div
      style={{
        marginTop: "16px",
        padding: "12px",
        border: "1px solid #ddd",
        borderRadius: 8,
        maxWidth: 420,
      }}
    >
      <h2 style={{ marginTop: 0 }}>Airfoil Sim Panel</h2>

      <section style={{ marginBottom: "0.75rem" }}>
        <label>
          Units:&nbsp;
          <select value={units} onChange={handleUnitsChange}>
            <option value={UnitSystem.IMPERIAL}>Imperial</option>
            <option value={UnitSystem.METRIC}>Metric</option>
          </select>
        </label>
        &nbsp;&nbsp;
        <label>
          Environment:&nbsp;
          <select value={environment} onChange={handleEnvChange}>
            <option value={Environment.EARTH}>Earth</option>
            <option value={Environment.MARS}>Mars</option>
            <option value={Environment.MERCURY}>Mercury</option>
            <option value={Environment.VENUS}>Venus</option>
          </select>
        </label>
      </section>

      <section style={{ marginBottom: "0.75rem" }}>
        <div>
          <label>
            Velocity:&nbsp;
            <input
              type="number"
              step="1"
              value={velocity}
              onChange={handleInput("velocity")}
            />
          </label>
        </div>
        <div>
          <label>
            Chord:&nbsp;
            <input
              type="number"
              step="0.1"
              value={chord}
              onChange={handleInput("chord")}
            />
          </label>
        </div>
        <div>
          <label>
            Altitude:&nbsp;
            <input
              type="number"
              step="100"
              value={altitude}
              onChange={handleInput("altitude")}
            />
          </label>
        </div>
      </section>

      <section>
        <strong>Reynolds number: </strong>
        {Number.isFinite(reynolds) ? reynolds.toExponential(3) : "—"}
      </section>

      <section style={{ marginTop: "1rem" }}>
        <h2>Plot selection</h2>
        <PlotButtons visible={true} />
      </section>

      {/*<PlotControls />
      <PlotPanel /> */}
      <section>
        <OutputTabs />

        {outputButton === 4 && (
          <>
            {
              <div style={{ marginTop: "0.5rem", fontWeight: 600 }}>
                Select Plot
              </div>
            }
            <div>Surface:</div>

            {/* always show surface choices */}
            {/* Pressure / Velocity / Drag could be similar to PlotControls row */}

            {shapeSelect <= 3 && (
              <>
                <PlotControls />{" "}
                {/* Speed / Altitude / Wing / Density row we wrote */}
                {/* Later: add Angle / Camber / Thickness row */}
              </>
            )}
          </>
        )}
      </section>
    </div>
  );
}

/**
 * Root app with tabs + FoilSim panel.
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
      {tab === "design" && <DesignApp />}
      {tab === "three" && <Design3D />}
      {tab === "quick" && <QuickControls />}
      {tab === "analysis" && <AnalysisPanel />}

      {/* Spacer */}
      <hr style={{ margin: "16px 0" }} />

      {/* Context-powered controls */}
      <AngleControl />
      <FoilSimPanel />
    </div>
  );
}

export default function App() {
  return (
    <FoilSimProvider>
      <AppInner />
    </FoilSimProvider>
  );
}
