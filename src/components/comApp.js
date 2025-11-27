import React, { useState } from "react";
import "./styles/FoilSimStudent.css";
import Button from "./components/Button";
import Canvas from "./components/Canvas";
import FoilPlot from "./components/FoilPlot";
import { calculateLiftCoefficient } from "./physics/shapeCore.js";

function comApp() {
  const [lift, setLift] = useState(0);
  const [plotData, setPlotData] = useState({ x: [], y: [] });

  const handleCalculate = () => {
    const angle = 5; // Example input
    const camber = 2;
    const thickness = 0.1;
    const liftCoefficient = calculateLiftCoefficient(angle, camber, thickness);
    setLift(liftCoefficient);
    setPlotData({
      x: [1, 2, 3],
      y: [liftCoefficient, liftCoefficient * 2, liftCoefficient * 3],
    });
  };

  return (
    <div className="App">
      <h1>FoilSim Student</h1>
      <Button label="Calculate Lift" onClick={handleCalculate} />
      <p>Lift Coefficient: {lift}</p>
      <Canvas />
      <FoilPlot data={plotData} />
    </div>
  );
}

export default comApp;
