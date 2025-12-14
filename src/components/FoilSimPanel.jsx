import React, { useMemo, useState } from "react";
import { computeOutputs } from "../foilsim/computeOutputs.js"; // <-- adjust path

export default function FoilSimPanel() {
  // --- INPUT STATE (React) ---
  const [angleDeg, setAngleDeg] = useState(4);
  const [camberPct, setCamberPct] = useState(0);
  const [thicknessPct, setThicknessPct] = useState(12);
  const [velocity, setVelocity] = useState(100);
  const [altitude, setAltitude] = useState(0);

  // geometry
  const [chord, setChord] = useState(5);
  const [span, setSpan] = useState(20);
  const [wingArea, setWingArea] = useState(100); // or chord*span if you prefer

  // selections (match computeOutputs fields)
  const [units, setUnits] = useState("imperial"); // computeOutputs mapUnits supports "imperial"/"metric" :contentReference[oaicite:2]{index=2}
  const [environment, setEnvironment] = useState(1); // 1 Earth, 2 Mars, 3 Mercury, 4 Venus :contentReference[oaicite:3]{index=3}
  const [shapeSelect, setShapeSelect] = useState(1); // 1 airfoil, 2 ellipse... :contentReference[oaicite:4]{index=4}

  // aero toggles used inside computeOutputs
  const [liftAnalisis, setLiftAnalisis] = useState(1); // 1 stall, 2 ideal :contentReference[oaicite:5]{index=5}
  const [ar, setAr] = useState(true);
  const [induced, setInduced] = useState(true);
  const [reCorrection, setReCorrection] = useState(true);

  // rotation placeholders (computeOutputs reads them)
  const [radius, setRadius] = useState(0);
  const [spin, setSpin] = useState(0);

  // --- Build the exact "state" object computeOutputs expects ---
  const simState = useMemo(
    () => ({
      angleDeg,
      camberPct,
      thicknessPct,
      velocity,
      altitude,
      chord,
      span,
      wingArea,

      units,
      environment, // IMPORTANT: computeOutputs expects this key name :contentReference[oaicite:6]{index=6}
      shapeSelect,

      liftAnalisis,
      ar,

      induced,
      reCorrection,

      radius,
      spin,
    }),
    [
      angleDeg,
      camberPct,
      thicknessPct,
      velocity,
      altitude,
      chord,
      span,
      wingArea,
      units,
      environment,
      shapeSelect,
      liftAnalisis,
      ar,
      induced,
      reCorrection,
      radius,
      spin,
    ]
  );

  // --- RUN ENGINE ---
  const results = useMemo(() => computeOutputs(simState), [simState]);

  // computeOutputs returns liftOverDrag (NOT ldRatio) :contentReference[oaicite:7]{index=7}
  const { cl, cd, reynolds, lift, drag, liftOverDrag } = results;

  return (
    <div style={{ padding: "1.5rem", maxWidth: 720, fontFamily: "sans-serif" }}>
      <h2 style={{ marginBottom: "1rem" }}>Airfoil Physics Simulator</h2>

      {/* INPUTS */}
      <div
        style={{
          display: "grid",
          gap: "0.75rem",
          gridTemplateColumns: "1fr 1fr",
        }}
      >
        <label>
          Angle of Attack (°)
          <input
            type="number"
            value={angleDeg}
            onChange={(e) => setAngleDeg(Number(e.target.value))}
            style={{ width: "100%" }}
          />
        </label>

        <label>
          Camber (%)
          <input
            type="number"
            value={camberPct}
            onChange={(e) => setCamberPct(Number(e.target.value))}
            style={{ width: "100%" }}
          />
        </label>

        <label>
          Thickness (%)
          <input
            type="number"
            value={thicknessPct}
            onChange={(e) => setThicknessPct(Number(e.target.value))}
            style={{ width: "100%" }}
          />
        </label>

        <label>
          Velocity
          <input
            type="number"
            value={velocity}
            onChange={(e) => setVelocity(Number(e.target.value))}
            style={{ width: "100%" }}
          />
        </label>

        <label>
          Altitude (ft)
          <input
            type="number"
            value={altitude}
            onChange={(e) => setAltitude(Number(e.target.value))}
            style={{ width: "100%" }}
          />
        </label>

        <label>
          Wing Area
          <input
            type="number"
            value={wingArea}
            onChange={(e) => setWingArea(Number(e.target.value))}
            style={{ width: "100%" }}
          />
        </label>

        <label>
          Chord
          <input
            type="number"
            value={chord}
            onChange={(e) => setChord(Number(e.target.value))}
            style={{ width: "100%" }}
          />
        </label>

        <label>
          Span
          <input
            type="number"
            value={span}
            onChange={(e) => setSpan(Number(e.target.value))}
            style={{ width: "100%" }}
          />
        </label>

        <label>
          Units
          <select
            value={units}
            onChange={(e) => setUnits(e.target.value)}
            style={{ width: "100%" }}
          >
            <option value="imperial">Imperial</option>
            <option value="metric">Metric</option>
          </select>
        </label>

        <label>
          Environment
          <select
            value={environment}
            onChange={(e) => setEnvironment(Number(e.target.value))}
            style={{ width: "100%" }}
          >
            <option value={1}>Earth</option>
            <option value={2}>Mars</option>
            <option value={3}>Mercury</option>
            <option value={4}>Venus</option>
          </select>
        </label>

        <label>
          Shape
          <select
            value={shapeSelect}
            onChange={(e) => setShapeSelect(Number(e.target.value))}
            style={{ width: "100%" }}
          >
            <option value={1}>Airfoil</option>
            <option value={2}>Ellipse</option>
            <option value={3}>Plate</option>
            <option value={4}>Cylinder</option>
            <option value={5}>Ball</option>
          </select>
        </label>

        <label>
          Lift model
          <select
            value={liftAnalisis}
            onChange={(e) => setLiftAnalisis(Number(e.target.value))}
            style={{ width: "100%" }}
          >
            <option value={1}>Stall</option>
            <option value={2}>Ideal</option>
          </select>
        </label>

        <label>
          Aspect Ratio Correction (ar)
          <input
            type="checkbox"
            checked={ar}
            onChange={(e) => setAr(e.target.checked)}
            style={{ marginLeft: 8 }}
          />
        </label>

        <label>
          Induced Drag
          <input
            type="checkbox"
            checked={induced}
            onChange={(e) => setInduced(e.target.checked)}
            style={{ marginLeft: 8 }}
          />
        </label>

        <label>
          Reynolds Correction
          <input
            type="checkbox"
            checked={reCorrection}
            onChange={(e) => setReCorrection(e.target.checked)}
            style={{ marginLeft: 8 }}
          />
        </label>
      </div>

      {/* OUTPUTS */}
      <div style={{ fontSize: 15 }}>
        <strong>Results</strong>

        <p>
          <strong>Reynolds:</strong>{" "}
          {Number.isFinite(reynolds) ? reynolds.toFixed(0) : "—"}
        </p>

        <p>
          <strong>CL:</strong> {Number.isFinite(cl) ? cl.toFixed(4) : "—"}
        </p>

        <p>
          <strong>CD:</strong> {Number.isFinite(cd) ? cd.toFixed(4) : "—"}
        </p>

        <p>
          <strong>Lift:</strong> {Number.isFinite(lift) ? lift.toFixed(2) : "—"}
        </p>

        <p>
          <strong>Drag:</strong> {Number.isFinite(drag) ? drag.toFixed(2) : "—"}
        </p>

        <p>
          <strong>L/D:</strong>{" "}
          {Number.isFinite(liftOverDrag) ? liftOverDrag.toFixed(2) : "—"}
        </p>
      </div>
    </div>
  );
}
