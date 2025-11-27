// It just uses your existing Airfoil / Ellipse / Plate / Cylinder / Ball classes.

export function computeOutputs(state) {
  const {
    shapeSelect,
    environmentSelect,
    units, // 1 = imperial, 2 = metric (you can map from "metric"/"imperial")
    angle,
    camber,
    thickness,
    velocity,
    altitude,
    chord,
    span,
    area,
    radius,
    spin,
    aspr,
  } = state;

  // --- Instantiate shapes using your existing classes ---
  const airfoil = new Airfoil(
    angle,
    camber,
    thickness,
    velocity,
    altitude,
    chord,
    span,
    area
  );
  const ellipse = new Ellipse(
    angle,
    camber,
    thickness,
    velocity,
    altitude,
    chord,
    span,
    area
  );
  const plate = new Plate(
    angle,
    camber,
    thickness,
    velocity,
    altitude,
    chord,
    span,
    area
  );
  const cylinder = new Cylinder(
    0.0,
    0.0,
    thickness,
    velocity,
    altitude,
    5.0,
    span,
    100.0,
    radius,
    spin
  );
  const ball = new Ball(
    0.0,
    0.0,
    thickness,
    velocity,
    altitude,
    5.0,
    radius,
    100.0,
    radius,
    spin
  );

  // Helper to describe environment properties for each medium
  function envFromAirfoil(env) {
    switch (env) {
      case "earth":
        return {
          p: airfoil.getPressureEarth(),
          rho: airfoil.getRhoEarth(),
          q0: airfoil.getQ0Earth(),
          T: airfoil.getTempEarth(),
          mu: airfoil.getViscosEarth(),
        };
      case "mars":
        return {
          p: airfoil.getPressureMars(),
          rho: airfoil.getRhoMars(),
          q0: airfoil.getQ0Mars(),
          T: airfoil.getTempMars(),
          mu: airfoil.getViscosMars(),
        };
      case "mercury":
        return {
          p: airfoil.getPressureMercury(),
          rho: airfoil.getRhoMercury(),
          q0: airfoil.getQ0Mercury(),
          T: airfoil.getMercuryTemp(),
          mu: airfoil.getViscosMercury(),
        };
      case "venus":
        return {
          p: airfoil.getPressureVenus(),
          rho: airfoil.getRhoVenus(),
          q0: airfoil.getQ0Venus(),
          T: airfoil.getTempVenus(),
          mu: airfoil.getViscosVenus(),
        };
      default:
        return null;
    }
  }

  // Map environmentSelect → medium string
  let envMedium = "earth";
  if (environmentSelect === 2) envMedium = "mars";
  else if (environmentSelect === 3) envMedium = "mercury";
  else if (environmentSelect === 4) envMedium = "venus";

  // Base result object
  let result = {
    shapeString: "",
    // main aero outputs
    lift: 0,
    drag: 0,
    cL: 0,
    cD: 0,
    Re: 0,
    L_over_D: 0,
    // environment outputs (base, before unit conversions)
    env: {
      medium: envMedium, // "earth"/"mars"/"mercury"/"venus"
      p: 0,
      rho: 0,
      q0: 0,
      T: 0,
      mu: 0,
    },
    // some UI-related things you might want
    lengthUnit: units === 1 ? "ft" : "m",
    forceUnit: units === 1 ? "lb" : "N",
  };

  // --- Example: shapeSelect == 1 (Joukowski airfoil) ---
  if (shapeSelect === 1) {
    result.shapeString = "Joukowski Airfoil";
    result.lift = airfoil.getLift();
    result.drag = airfoil.getDrag();
    result.cL = airfoil.getLiftCoefficient();
    result.cD = airfoil.getDragCoefficient();
    result.Re = airfoil.getReynolds();
    result.L_over_D = airfoil.getLiftOverDrag();

    const envBase = envFromAirfoil(envMedium);
    if (envBase) {
      result.env = envBase;
    }

    // You can also precompute some of the converted values if you like.
    // For example, for imperial units and Earth:
    if (units === 1 && envMedium === "earth") {
      result.envDisplay = {
        // pressure in psi
        staticPressure: envBase.p / 144.0,
        density: envBase.rho,
        dynPressure: envBase.q0,
        temp: envBase.T - 460.0, // Rankine -> °F approx
        viscosity: envBase.mu,
      };
    } else if (units === 2 && envMedium === "earth") {
      // Metric Earth example
      result.envDisplay = {
        staticPressure: ((101.3 / 14.7) * envBase.p) / 144.0,
        density: envBase.rho * 515.4,
        dynPressure: ((101.3 / 14.7) * envBase.q0) / 144.0,
        temp: (envBase.T * 5.0) / 9.0 - 273.1,
        viscosity: envBase.mu * 47.87,
      };
    }
    // You can follow the same mapping logic for Mars/mercury/Venus
  }

  // --- TODO: extend to shapeSelect 2, 3, 4, 5 (ellipse, plate, cylinder, ball) ---
  // For each, copy the pattern above but use the ellipse/plate/cylinder/ball
  // methods instead of Airfoil's.

  return result;
}
