import { calculateLiftCoefficient } from "../physics/shapeCore.js";

export const useLiftCalculator = (angle, camber, thickness) => {
  const liftCoefficient = calculateLiftCoefficient(angle, camber, thickness);
  return liftCoefficient;
};
