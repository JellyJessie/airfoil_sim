export const calculateLiftCoefficient = (angle, camber, thickness) => {
  const convdr = Math.PI / 180;
  const rval = thickness / 25;
  const ycval = camber / 50;
  const beta = Math.asin(ycval / rval) / convdr;
  const gamval = 2.0 * rval * Math.sin((angle + beta) * convdr);
  return gamval * 4.0 * Math.PI;
};
