// src/store/FoilSimContext.jsx
import React, { createContext, useContext, useReducer, useMemo } from "react";
import { UnitSystem, Environment, Shape } from "../components/shape.js";
import { computeAirfoil } from "../components/foilSimCore.js";
import { computeOutputs } from "../foilsim/computeOutputs";

const FoilSimContext = createContext(null);

const initialState = {
  angleDeg: 5,
  camberPct: 0.02,
  thicknessPct: 12.5,
  velocity: 30,
  altitude: 0,
  chord: 1.0,
  span: 4.0,
  wingArea: 4.0,
  units: UnitSystem.METRIC,
  environment: Environment.EARTH,
  plot: 8, // 8 = Speed, 9 = Altitude, 10 = Wing Area, 11 = Density
  outputButton: 1, // 1=gauge, 2=geometry, 3=data, 4=plot (if you want)
  inputButton: 2, // if you still care about Shape/Flight/Analysis/etc
  selectClicked: 0,
  shapeSelect: 1, // 1=Joukowski, 2=Ellipse, 3=Plate, 4=Cylinder, 5=Ball etc.

  options: {
    aspectRatioCorrection: true,
    inducedDrag: true,
    reynoldsCorrection: true,
    liftMode: 1,
  },
  //Analysis options
  liftAnalisis: 1, // 1 = Stall model, 2 = Ideal flow
  ar: true, // AR Lift correction on/off
  induced: true, // Induced drag on/off
  reCorrection: true, // Reynolds number correction on/off

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

function foilSimReducer(state, action) {
  switch (action.type) {
    case "SET_INPUT": {
      const { key, value } = action;
      const numeric = typeof value === "number" ? value : Number(value);

      // base update
      let next = {
        ...state,
        [key]: numeric,
      };

      // Wingspan → area auto-update (rectangular wing)
      if (key === "chord" || key === "span") {
        const chord = key === "chord" ? numeric : next.chord;
        const span = key === "span" ? numeric : next.span;

        if (chord > 0 && span > 0) {
          next = {
            ...next,
            wingArea: chord * span,
          };
        }
      }

      return next;
    }

    case "SET_ENVIRONMENT":
      return { ...state, environment: action.environment };

    case "SET_UNITS":
      return { ...state, units: action.units };

    case "SET_PLOT":
      return { ...state, plot: action.plot };

    case "SET_INPUT_BUTTON":
      return { ...state, inputButton: action.value };

    case "SET_OUTPUT_BUTTON":
      return { ...state, outputButton: action.value };

    case "INCREMENT_SELECT_CLICKED":
      return { ...state, selectClicked: state.selectClicked + 1 };

    case "SET_SHAPE_SELECT":
      return { ...state, shapeSelect: action.value };

    case "SET_LIFT_ANALYSIS":
      return { ...state, liftAnalisis: action.mode }; // 1 or 2

    case "SET_AR":
      return { ...state, ar: action.value }; // true / false

    case "SET_INDUCED":
      return { ...state, induced: action.value }; // true / false

    case "SET_RE_CORRECTION":
      return { ...state, reCorrection: action.value }; // true / false

    case "RESET": {
      // Reset to initial defaults
      return { ...initialState };
    }

    case "IMPORT_STATE": {
      // Merge imported values, but keep shape of state stable
      const next = { ...state, ...(action.payload || {}) };

      // Optional: harden numeric fields (avoid NaN)
      const numKeys = [
        "angleDeg",
        "camberPct",
        "thicknessPct",
        "velocity",
        "altitude",
        "wingArea",
        "chord",
        "span",
        "radius",
        "spin",
      ];
      for (const k of numKeys) {
        if (k in next) next[k] = Number(next[k]) || 0;
      }

      return next;
    }

    default:
      return state;
  }
}

export function FoilSimProvider({ children }) {
  const [state, dispatch] = useReducer(foilSimReducer, initialState);

  const outputs = useMemo(() => computeOutputs(state), [state]);

  const setPlot = (plot) => dispatch({ type: "SET_PLOT", plot });
  const setInputButton = (value) =>
    dispatch({ type: "SET_INPUT_BUTTON", value });
  const setOutputButton = (value) =>
    dispatch({ type: "SET_OUTPUT_BUTTON", value });
  const incrementSelectClicked = () =>
    dispatch({ type: "INCREMENT_SELECT_CLICKED" });

  const setEnvironment = (environment) =>
    dispatch({ type: "SET_ENVIRONMENT", environment });

  const setUnits = (units) => dispatch({ type: "SET_UNITS", units });
  const shape = useMemo(
    () =>
      new Shape(
        state.angleDeg,
        state.camberPct,
        state.thicknessPct,
        state.velocity,
        state.altitude,
        state.chord,
        state.span,
        state.wingArea,
        {
          units: state.units,
          environment: state.environment,
        }
      ),
    [
      state.angleDeg,
      state.camberPct,
      state.thicknessPct,
      state.velocity,
      state.altitude,
      state.chord,
      state.span,
      state.wingArea,
      state.units,
      state.environment,
    ]
  );

  const derivedShape = useMemo(
    () => ({
      reynolds: shape.getReynolds(),
    }),
    [shape]
  );

  const derived = useMemo(() => computeAirfoil(state), [state]);

  /*    state,
    outputs,
    setInput,
    setEnvironment,
    setUnits,
    derivedShape,
    derived,
    shape,*/

  const value = {
    state,
    outputs, // ← NEW: full aero + geometry + environment
    shape, // optional: low-level Shape for experiments
    derivedShape, // optional: e.g. Reynolds from core Shape
    derived, // your computeAirfoil() results
    dispatch,
    setPlot,
    setInputButton,
    setOutputButton,
    incrementSelectClicked,
  };

  return (
    <FoilSimContext.Provider value={value}>{children}</FoilSimContext.Provider>
  );
}

export function useFoilSim() {
  const ctx = useContext(FoilSimContext);
  if (!ctx) {
    throw new Error("useFoilSim must be used inside <FoilSimProvider>");
  }
  return ctx;
}
