// src/foilsim/AnalysisPanel.jsx
import React from "react";
import LiftAnalysisToggle from "./LiftAnalysisToggle.jsx";
import LiftCorrectionToggle from "./LiftCorrectionToggle.jsx";
import InducedDragToggle from "./InducedDragToggle.jsx";
import ReCorrectionToggle from "./ReCorrectionToggle.jsx";

export default function AnalysisPanel() {
  return (
    <div className="af-panel">
      <h2 className="af-title">Lift & Drag Analysis</h2>
      <LiftAnalysisToggle />
      <LiftCorrectionToggle />
      <InducedDragToggle />
      <ReCorrectionToggle />
    </div>
  );
}
