// src/foilsim/PlotPanel.jsx
import React from "react";
import { useFoilSim } from "../store/FoilSimContext";

export default function PlotPanel() {
  const { outputs } = useFoilSim();

  const clAlpha = outputs?.plots?.clAlpha;
  if (!clAlpha) return null;

  const { alphas, cls } = clAlpha;

  return (
    <div className="plot-panel">
      <h3>CL vs Angle of Attack</h3>

      {/* Super simple textual plot – you can replace with a chart library later */}
      <table>
        <thead>
          <tr>
            <th>α (deg)</th>
            <th>CL</th>
          </tr>
        </thead>
        <tbody>
          {alphas.map((a, i) => (
            <tr key={a}>
              <td>{a}</td>
              <td>{cls[i].toFixed(3)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
