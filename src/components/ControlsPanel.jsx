// src/components/ControlsPanel.jsx

export default function ControlsPanel({ onModeChange }) {
  return (
    <div className="box2">
      <label style={{ color: "red" }}>FoilSim JS</label>

      <div className="unitsdropdown">
        <button onClick={() => onModeChange("units")}>Units ▼</button>
      </div>

      <button onClick={() => onModeChange("flight")}>Flight</button>
      <button onClick={() => onModeChange("shape")}>Shape</button>
      <button onClick={() => onModeChange("analysis")}>Analysis</button>
      <button onClick={() => onModeChange("plot")}>Plot</button>
      <button onClick={() => onModeChange("size")}>Size</button>
    </div>
  );
}
