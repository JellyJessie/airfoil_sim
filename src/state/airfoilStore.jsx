import React, { createContext, useContext, useMemo, useReducer } from "react";

const AirfoilCtx = createContext(null);

const initial = {
  units: "metric", // "metric" | "imperial"
  // Geometry (NACA 4-digit)
  chord: 1.0, // m or ft
  t: 0.12, // thickness ratio
  m: 0.02, // max camber
  p: 0.4, // position of max camber (0..1)
  angleDeg: 4, // AoA (deg)
  // Flow conditions
  rho: 1.225, // kg/m^3 or slug/ft^3
  mu: 1.81e-5, // Pa·s or lbf·s/ft^2
  V: 30, // m/s or ft/s
  // Wing area (for lift)
  S: 0.5, // m^2 or ft^2
};

function reducer(state, action) {
  switch (action.type) {
    case "set":
      return { ...state, [action.key]: action.value };
    case "toggleUnits": {
      // Convert core scalars between metric/imperial
      if (state.units === "metric") {
        // to imperial
        const m2ft = 3.28084;
        const mps2fps = 3.28084;
        const kgm3_to_slugft3 = 0.00194032; // 1.225 kg/m^3 -> 0.00237 slug/ft^3 approx
        const Pa_s_to_lbf_s_ft2 = 0.020885434233; // 1 Pa·s = 0.020885... lbf·s/ft^2
        const m2_to_ft2 = 10.7639;

        return {
          ...state,
          units: "imperial",
          chord: state.chord * m2ft,
          V: state.V * mps2fps,
          rho: state.rho * kgm3_to_slugft3,
          mu: state.mu * Pa_s_to_lbf_s_ft2,
          S: state.S * m2_to_ft2,
        };
      } else {
        // to metric
        const ft2m = 0.3048;
        const fps2mps = 0.3048;
        const slugft3_to_kgm3 = 515.378819; // 1 slug/ft^3 = 515.3788 kg/m^3
        const lbf_s_ft2_to_Pa_s = 47.88025898; // 1 lbf·s/ft^2 ≈ 47.88026 Pa·s
        const ft2_to_m2 = 0.092903;

        return {
          ...state,
          units: "metric",
          chord: state.chord * ft2m,
          V: state.V * fps2mps,
          rho: state.rho * slugft3_to_kgm3,
          mu: state.mu * lbf_s_ft2_to_Pa_s,
          S: state.S * ft2_to_m2,
        };
      }
    }
    default:
      return state;
  }
}

export function AirfoilProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initial);
  const api = useMemo(
    () => ({
      state,
      set: (key, value) => dispatch({ type: "set", key, value }),
      toggleUnits: () => dispatch({ type: "toggleUnits" }),
    }),
    [state]
  );

  return <AirfoilCtx.Provider value={api}>{children}</AirfoilCtx.Provider>;
}

export function useAirfoil() {
  const ctx = useContext(AirfoilCtx);
  if (!ctx) throw new Error("useAirfoil must be used inside AirfoilProvider");
  return ctx;
}
