import React from "react";
import { useFoilSim } from "../FoilSimContext.jsx";
import { PlotDisplayControls } from "./PlotDisplayControls.jsx";

export function PlotPanel() {
  const { state, dispatch } = useFoilSim();
  const { displayMode, viewMode } = state; // you define these in your reducer

  return (
    <div>
      <PlotDisplayControls
        display={displayMode}
        onChangeDisplay={(mode) => dispatch({ type: "SET_DISPLAY_MODE", mode })}
        view={viewMode}
        onChangeView={(mode) => dispatch({ type: "SET_VIEW_MODE", mode })}
        onExportCsv={() => dispatch({ type: "EXPORT_CSV" })}
      />

      {/* your actual plot canvas/Plotly/etc here */}
    </div>
  );
}

{
  /*export default function PlotPanel() {
  const { outputs } = useFoilSim();

  const clAlpha = outputs?.plots?.clAlpha;
  if (!clAlpha) return null;

  const { alphas, cls } = clAlpha;

  return (
    <div className="plot-panel">
      <h3>CL vs Angle of Attack</h3>
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
} */
}
