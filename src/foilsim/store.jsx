import React, { createContext, useContext, useReducer } from "react";

const Ctx = createContext(null);

const initial = {
  units: "metric", // "imperial" or "metric"
  chord: 1.0,
  t: 0.12,
  m: 0.02,
  p: 0.4,
  angleDeg: 4,
  V: 30,
  rho: 1.225,
  mu: 1.81e-5,
  S: 0.5,
  altitude: 0,
  inputButton: 2, // 1=Shape,2=Flight,3=Analysis,4=Size,5=Select
  outputButton: 1, // 1=Gage,2=Geometry,3=Data,4=Plot
  liftAnalisis: 1, // 1 = Stall, 2 = Ideal
  ar: true, // true = AR On, false = AR Off  ← NEW
  induced: true, // Induced drag correction on/off  ← NEW
  reCorrection: true, // Reynolds number correction on/off ← NEW

  // geometry & flow
  angle: 4,
  camber: 0,
  thickness: 12, // or normalized, depends on your original code
  velocity: 100,
  span: 20,
  area: 100,
  shapeSelect: 1, // 1=Joukowski, 2=Ellipse, 3=Plate, 4=Cylinder, 5=Ball
  environmentSelect: 1, // 1 Earth, 2 Mars, 3 Mercury, 4 Venus

  // outputs
  shapeString: "Joukowski Airfoil",
  density: 0.00237,
  globalLift: 0,
  globalDrag: 0,
  globalPressure: 0,

  // result boxes
  lift: 0,
  cLift: 0,
  reynolds: 0,
  drag: 0,
  cDrag: 0,
  liftOverDrag: 0,
  pressOut: 0,
  tempOut: 0,
  viscOut: 0,
};

function reducer(state, action) {
  switch (action.type) {
    case "set":
      return { ...state, [action.key]: action.value };
    case "setMany":
      return { ...state, ...action.values };
    case "toggleUnits":
      return {
        ...state,
        units: state.units === "metric" ? "imperial" : "metric",
      };
    default:
      return state;
  }
}

export function FoilSimProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initial);

  const api = {
    state,
    set: (key, value) => dispatch({ type: "set", key, value }),
    setMany: (values) => dispatch({ type: "setMany", values }),
    toggleUnits: () => dispatch({ type: "toggleUnits" }),
  };

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useFoilSim() {
  return useContext(Ctx);
}
