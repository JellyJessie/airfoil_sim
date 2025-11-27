import { useEffect } from "react";
import { useFoilSim } from "./store.jsx";
import { computeOutputs } from "./computeOutputs.js";

export function useSimulationOutputs() {
  const { state, setMany } = useFoilSim();

  useEffect(() => {
    const outputs = computeOutputs(state);
    // You can either push them into the FoilSim store, or keep them local.
    // If your store has a setMany helper:
    setMany(outputs);
  }, [
    state.angle,
    state.camber,
    state.thickness,
    state.velocity,
    state.altitude,
    state.chord,
    state.span,
    state.area,
    state.shapeSelect,
    state.environmentSelect,
    state.units,
  ]);
}
