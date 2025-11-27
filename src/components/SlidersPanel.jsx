// src/components/SlidersPanel.jsx

export default function SlidersPanel({ angle, setAngle }) {
  return (
    <div className="slidecontainer">
      <label>Angle (deg)</label>
      <span>{angle}</span>
      <input
        type="range"
        min="-20"
        max="20"
        step="0.1"
        value={angle}
        onChange={(e) => setAngle(parseFloat(e.target.value))}
      />
    </div>
  );
}
