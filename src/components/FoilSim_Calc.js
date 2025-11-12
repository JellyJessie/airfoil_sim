import { calculateLiftCoefficient } from "../utils/shapeCalc";

export const useLiftCalculator = (angle, camber, thickness) => {
  const liftCoefficient = calculateLiftCoefficient(angle, camber, thickness);
  return liftCoefficient;
};
