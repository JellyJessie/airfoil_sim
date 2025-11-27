// src/store/FoilSimContext.jsx
import React, { createContext, useContext, useReducer, useMemo } from "react";
import { Shape, UnitSystem, Environment } from "../physics/shapeCore";
import { computeAirfoil } from "../core/foilSimCore";

const FoilSimContext = createContext(null);

const initialState = {
  angleDeg: 5,
  camberPct: 0,
  thicknessPct: 12.5,
  velocity: 30,
  altitude: 0,
  chord: 1.0,
  span: 4.0,
  wingArea: 4.0,
  units: UnitSystem.METRIC,
  environment: Environment.EARTH,
  options: {
    aspectRatioCorrection: true,
    inducedDrag: true,
    reynoldsCorrection: true,
    liftMode: 1,
  },
};

function foilSimReducer(state, action) {
  switch (action.type) {
    case "SET_INPUT": {
      const { key, value } = action;
      return {
        ...state,
        [key]: typeof value === "number" ? value : Number(value),
      };
    }
    case "SET_ENVIRONMENT":
      return { ...state, environment: action.environment };
    case "SET_UNITS":
      return { ...state, units: action.units };
    default:
      return state;
  }
}

// very simple physics stub so UI works
function computeOutputs(state) {
  const { angleDeg, velocity, chord, span, wingArea, environment, units } =
    state;

  // Pick a density based on environment (very rough constants)
  let rho;
  switch (environment) {
    case Environment.MARS:
      rho = 0.02;
      break;
    case Environment.MERCURY:
      rho = 1000;
      break;
    case Environment.VENUS:
      rho = 65;
      break;
    case Environment.EARTH:
    default:
      rho = 1.225;
      break;
  }

  // Velocity in m/s (very rough conversion)
  let V = velocity;
  if (units === UnitSystem.IMPERIAL) {
    // assume ft/s -> m/s
    V = velocity * 0.3048;
  }

  // Thin airfoil approx: CL ≈ 2π α (radians)
  const alphaRad = (angleDeg * Math.PI) / 180;
  let cl = 2 * Math.PI * alphaRad;

  // Simple stall clamp
  if (angleDeg > 15 || angleDeg < -15) {
    cl *= 0.5;
  }

  const aspectRatio = (span * span) / wingArea;
  const e = 0.9;
  const cd0 = 0.01 + 0.002 * (state.thicknessPct / 12.5 - 1);
  const cdInduced = (cl * cl) / (Math.PI * aspectRatio * e);
  const cd = cd0 + cdInduced;

  const q = 0.5 * rho * V * V; // dynamic pressure
  const lift = q * wingArea * cl;
  const drag = q * wingArea * cd;

  const liftOverDrag = drag === 0 || !isFinite(drag) ? 0 : lift / drag;

  // Reynolds number ~ rho V c / mu
  const mu = 1.8e-5; // air, rough; mercury/venus/mars won't be accurate
  const reynolds = (rho * V * chord) / mu;

  return {
    lift,
    drag,
    cl,
    cd,
    reynolds,
    liftOverDrag,
  };
}

export function FoilSimProvider({ children }) {
  const [state, dispatch] = useReducer(foilSimReducer, initialState);

  const outputs = useMemo(() => computeOutputs(state), [state]);

  const setInput = (key, value) => dispatch({ type: "SET_INPUT", key, value });

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
    derived,
    dispatch,
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
