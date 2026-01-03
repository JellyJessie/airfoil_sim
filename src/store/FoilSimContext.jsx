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
  altitude: 100,
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
  airfoilPointsN: 81, // user-controlled, 20..200
  camberPosPct: 40, // (optional, if you’re adding camber position globally too)

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
  console.log("REDUCER ACTION:", action);
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
    case "SET_AIRFOIL_POINTS_N": {
      const n = Math.max(20, Math.min(200, Math.round(action.value)));
      return { ...state, airfoilPointsN: n };
    }

    case "SET_CAMBER_POS_PCT": {
      const p = Math.max(0, Math.min(100, Number(action.value)));
      return { ...state, camberPosPct: p };
    }

    case "SET_UNITS": {
      const nextUnits = action.units; // "imperial" | "metric"
      const prevUnits = state.units ?? "imperial";
      if (nextUnits === prevUnits) return state;

      const mph_to_kmh = (v) => v * 1.60934;
      const kmh_to_mph = (v) => v / 1.60934;

      const ft_to_m = (x) => x * 0.3048;
      const m_to_ft = (x) => x / 0.3048;

      const sqft_to_sqm = (a) => a * 0.092903;
      const sqm_to_sqft = (a) => a / 0.092903;

      const toMetric = prevUnits === "imperial" && nextUnits === "metric";
      const toImperial = prevUnits === "metric" && nextUnits === "imperial";

      const velocity = Number(state.velocity ?? 0);
      const altitude = Number(state.altitude ?? 0);
      const chord = Number(state.chord ?? 1);
      const span = Number(state.span ?? 1);
      const wingArea = Number(state.wingArea ?? chord * span);

      const velocity2 = toMetric
        ? mph_to_kmh(velocity)
        : toImperial
          ? kmh_to_mph(velocity)
          : velocity;

      const altitude2 = toMetric
        ? ft_to_m(altitude)
        : toImperial
          ? m_to_ft(altitude)
          : altitude;

      const chord2 = toMetric
        ? ft_to_m(chord)
        : toImperial
          ? m_to_ft(chord)
          : chord;

      const span2 = toMetric
        ? ft_to_m(span)
        : toImperial
          ? m_to_ft(span)
          : span;

      const wingArea2 = toMetric
        ? sqft_to_sqm(wingArea)
        : toImperial
          ? sqm_to_sqft(wingArea)
          : wingArea;

      return {
        ...state,
        units: nextUnits,
        velocity: velocity2,
        altitude: altitude2,
        chord: chord2,
        span: span2,
        wingArea: wingArea2,
      };
    }

    case "SET_PLOT":
      return { ...state, plot: action.plot };

    case "SET_INPUT_BUTTON":
      return { ...state, inputButton: action.value };

    case "SET_OUTPUT_BUTTON": {
      const next = { ...state, outputButton: action.value };
      if (action.value === 4) {
        next.plot = next.plot ?? 2; // pick your default plot id
      }
      return next;
    }

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
  const setAirfoilPointsN = (value) =>
    dispatch({ type: "SET_AIRFOIL_POINTS_N", value });
  const setCamberPosPct = (value) =>
    dispatch({ type: "SET_CAMBER_POS_PCT", value });
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
    setUnits,
    shape, // optional: low-level Shape for experiments
    derivedShape, // optional: e.g. Reynolds from core Shape
    derived, // your computeAirfoil() results
    dispatch,
    setPlot,
    setInputButton,
    setOutputButton,
    incrementSelectClicked,
    setAirfoilPointsN,
    setCamberPosPct,
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
