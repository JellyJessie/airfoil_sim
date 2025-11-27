// example: src/store/airfoilStore.js
import { ENVIRONMENT, UNITS } from "../core/constants";
import { computeAirfoilAero } from "../core/airfoil";

export function computeOutputs(state) {
  return computeAirfoilAero(
    {
      angleDeg: state.angleDeg,
      camberPercent: state.camber,
      thicknessPercent: state.t,
      velocity: state.V,
      altitude: state.altitude,
      chord: state.chord,
      span: state.span,
      wingArea: state.S,
      units: state.units === "metric" ? UNITS.METRIC : UNITS.ENGLISH,
      environment:
        state.environmentSelect === 1
          ? ENVIRONMENT.EARTH
          : state.environmentSelect === 2
            ? ENVIRONMENT.MARS
            : state.environmentSelect === 3
              ? ENVIRONMENT.mercury
              : ENVIRONMENT.VENUS,
    },
    {
      aspectRatioCorrection: state.ar,
      inducedDrag: state.induced,
      reynoldsCorrection: state.reCorrection,
      liftMode: state.liftAnalisis === 2 ? "ideal" : "stall",
    }
  );
}
