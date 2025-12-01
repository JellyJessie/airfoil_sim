import React from "react";
import { useFoilSim } from "../store/FoilSimContext";

const SHAPES = [
  { id: 1, label: "airfoil" },
  { id: 2, label: "ellipse" },
  { id: 3, label: "plate" },
  { id: 4, label: "cylinder" },
  { id: 5, label: "ball" },
];

export default function ShapeSelect() {
  const { state, dispatch } = useFoilSim();

  const setShape = (id) => {
    dispatch({ type: "SET_SHAPE_SELECT", value: id });
  };

  const current = SHAPES.find((s) => s.id === state.shapeSelect);

  return (
    <div style={{ marginBottom: "1rem" }}>
      <label style={{ marginRight: 8 }}>Airfoil Shape:</label>

      {/* CURRENT SELECTED SHAPE BUTTON */}
      <select
        value={state.shapeSelect}
        onChange={(e) => setShape(Number(e.target.value))}
        style={{
          padding: "6px 10px",
          fontSize: "1rem",
          borderRadius: 6,
        }}
      >
        {SHAPES.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  );
}
