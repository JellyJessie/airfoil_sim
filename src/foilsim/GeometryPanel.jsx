// src/foilsim/GeometryPanel.jsx
import React from "react";
import { useFoilSim } from "../store/FoilSimContext";

export default function GeometryPanel() {
  const { outputs } = useFoilSim();

  if (!outputs) return null;

  const {
    angleDeg,
    camberPct,
    thicknessPct,
    chord,
    span,
    wingArea,
    shapeType,
  } = outputs;

  const aspectRatio = chord && wingArea ? (span * span) / wingArea : 0;

  return (
    <div className="geometry-panel">
      <h3>Geometry</h3>
      <ul>
        <li>Shape: {shapeType}</li>
        <li>Angle of attack: {angleDeg.toFixed(2)}°</li>
        <li>Camber: {camberPct.toFixed(2)} %</li>
        <li>Thickness: {thicknessPct.toFixed(2)} %</li>
        <li>Chord: {chord.toFixed(3)}</li>
        <li>Span: {span.toFixed(3)}</li>
        <li>Area: {wingArea.toFixed(3)}</li>
        <li>Aspect ratio: {aspectRatio.toFixed(2)}</li>
      </ul>
    </div>
  );
}
