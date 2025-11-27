// src/components/OutputPanel.jsx

export default function OutputPanel({ lift, drag, cl, cd, reynolds, ratio }) {
  return (
    <div className="output-panel">
      <label>Lift</label>
      <input value={lift} readOnly />
      <label>Drag</label>
      <input value={drag} readOnly />
      <label>CLift</label>
      <input value={cl} readOnly />
      <label>CDrag</label>
      <input value={cd} readOnly />
      <label>R#</label>
      <input value={reynolds} readOnly />
      <label>L/D</label>
      <input value={ratio} readOnly />
    </div>
  );
}
