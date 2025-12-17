// src/foilsim/ResultsPanel.jsx
import React from "react";
import { useFoilSim } from "../store/FoilSimContext";

export default function ResultsPanel() {
  const { state } = useFoilSim();
  const {
    shapeSelect,
    lift,
    drag,
    cLift,
    cDrag,
    liftOverDrag,
    density,
    pressOut,
    tempOut,
    viscOut,
  } = state;

  return (
    <div className="af-panel">
      <h2 className="af-title">
        <strong>{shapeSelect}</strong>
      </h2>
      <p>Lift: {lift ?? 0}</p>
      <p>Drag: {drag ?? 0}</p>
      <p>CL: {cLift ?? 0}</p>
      <p>CD: {cDrag ?? 0}</p>
      <p>L/D: {liftOverDrag ?? 0}</p>
      <p>Density: {density ?? 0}</p>
      <p>Dynamic Pressure: {pressOut ?? 0}</p>
      <p>Temperature: {tempOut ?? 0}</p>
      <p>Viscosity: {viscOut ?? 0}</p>
    </div>
  );
}
