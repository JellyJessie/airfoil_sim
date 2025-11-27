import { useState } from "react";
import { computeFoilAerodynamics } from "../foilsim/foilsimCore";

export default function FoilSimPanel() {
  // --- INPUT STATE (React) ---
  const [angleDeg, setAngleDeg] = useState(4);
  const [camberPercent, setCamberPercent] = useState(0);
  const [thicknessPercent, setThicknessPercent] = useState(12);
  const [velocity, setVelocity] = useState(100);
  const [altitude, setAltitude] = useState(0);
  const [wingArea, setWingArea] = useState(5);

  // --- RUN NASA PHYSICS ENGINE ---
  const results = computeFoilAerodynamics({
    angleDeg,
    camberPercent,
    thicknessPercent,
    velocity,
    altitude,
    wingArea,
    chord: 5, // default matches NASA app
    aspectRatio: 4,
  });

  const { cl, cd, reynolds, lift, drag, ldRatio } = results;

  return (
    <div style={{ padding: "1.5rem", maxWidth: 600, fontFamily: "sans-serif" }}>
      <h2 style={{ marginBottom: "1rem" }}>FoilSim React Demo</h2>

      {/* INPUTS */}
      <div style={{ display: "grid", gap: "0.75rem" }}>
        <label>
          Angle of Attack (°):{" "}
          <input
            type="number"
            value={angleDeg}
            onChange={(e) => setAngleDeg(parseFloat(e.target.value))}
          />
        </label>

        <label>
          Camber (%):{" "}
          <input
            type="number"
            value={camberPercent}
            onChange={(e) => setCamberPercent(parseFloat(e.target.value))}
          />
        </label>

        <label>
          Thickness (%):{" "}
          <input
            type="number"
            value={thicknessPercent}
            onChange={(e) => setThicknessPercent(parseFloat(e.target.value))}
          />
        </label>

        <label>
          Velocity:{" "}
          <input
            type="number"
            value={velocity}
            onChange={(e) => setVelocity(parseFloat(e.target.value))}
          />
        </label>

        <label>
          Altitude (ft):{" "}
          <input
            type="number"
            value={altitude}
            onChange={(e) => setAltitude(parseFloat(e.target.value))}
          />
        </label>

        <label>
          Wing Area:{" "}
          <input
            type="number"
            value={wingArea}
            onChange={(e) => setWingArea(parseFloat(e.target.value))}
          />
        </label>
      </div>

      {/* OUTPUTS */}
      <div style={{ marginTop: "1.5rem" }}>
        <h3>Results</h3>

        <p>
          <strong>Reynolds Number:</strong> {reynolds.toFixed(0)}
        </p>
        <p>
          <strong>CL:</strong> {cl.toFixed(4)}
        </p>
        <p>
          <strong>CD:</strong> {cd.toFixed(4)}
        </p>
        <p>
          <strong>Lift:</strong> {lift.toFixed(2)}
        </p>
        <p>
          <strong>Drag:</strong> {drag.toFixed(2)}
        </p>
        <p>
          <strong>L/D:</strong> {ldRatio.toFixed(2)}
        </p>
      </div>
    </div>
  );
}
