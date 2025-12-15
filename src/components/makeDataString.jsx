export default function makeDataString(state, out) {
  const units = state.units === "imperial" ? 1 : 2;

  const lengthUnit = units === 1 ? " ft" : " m";
  const forceUnit = units === 1 ? " lbs" : " N";
  const velocityUnits = units === 1 ? " mph" : " km/h";
  const areaUnits = units === 1 ? " sq ft" : " sq m";
  const densityUnits = units === 1 ? " slug / cu ft" : " kg / cu m";
  const tempUnits = units === 1 ? " F" : " C";
  const pressureUnit = units === 1 ? " lb/ sq in" : " kPa";

  // Prefer values you already compute in computeOutputs:
  const env = out.envDisplay; // if you have it
  const envName =
    state.environmentSelect === 1
      ? "Standard Earth Atmosphere"
      : state.environmentSelect === 2
        ? "Martian Atmosphere"
        : state.environmentSelect === 3
          ? "Under mercury"
          : "Venus Surface";

  const shapeName = out.shapeString ?? "—";

  const lines = [];

  if (state.shapeSelect < 4) {
    lines.push(shapeName);
    lines.push(`Camber = ${state.m} % chord, Thickness = ${state.t} % chord`);
    lines.push(
      `Chord = ${state.chord}${lengthUnit}  Span = ${state.span}${lengthUnit}`
    );
    lines.push(
      `Surface Area = ${Number(state.S).toFixed?.(2) ?? state.S}${areaUnits}`
    );
  } else {
    lines.push(shapeName);
    lines.push(
      `Spin = ${state.spin ?? "—"} rpm, Radius = ${state.radius ?? "—"}${lengthUnit}`
    );
    lines.push(`Span = ${state.span}${lengthUnit}`);
  }

  lines.push(`Angle of attack = ${state.alphaDeg} degrees`);
  lines.push(envName);
  lines.push(`Altitude = ${state.altitude}${lengthUnit}`);

  // If you don’t have envDisplay yet, at least show q0:
  if (env) {
    lines.push(`Density = ${env.density.toPrecision(4)} ${densityUnits}`);
    lines.push(`Pressure = ${env.staticPressure.toFixed(3)} ${pressureUnit}`);
    lines.push(`Temperature = ${env.temperature.toFixed(0)} ${tempUnits}`);
  }

  lines.push(`Speed = ${state.V} ${velocityUnits}`);
  lines.push(`Lift = ${Number(out.lift).toFixed?.(0) ?? "—"} ${forceUnit}`);
  lines.push(`Drag = ${Number(out.drag).toFixed?.(0) ?? "—"} ${forceUnit}`);

  return lines.join("\n");
}
