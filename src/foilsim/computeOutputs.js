// src/foilsim/computeOutputs.js
//
// Clean, React-friendly computeOutputs()
// Fully wired to the new DOM-free physics core in foilPhysics.js

import {
  dynamicPressure,
  liftCoefficient,
  liftForce,
  dragForce,
  calculateLiftCoefficientJoukowski,
  calculateLiftForce,
  calculateDragCoefficient,
  calculateDragForce,
  calculateDrag,
  calculateReynolds,
  calculateClAlpha,
  calculateCdAlpha,
  calculateLdAlpha,
  densitySlugFt3,
  calculateQ0T,
  calculateQ0S,
} from "../physics/foilPhysics";

import {
  buildLiftDragBarData,
  calculateLiftToDrag,
} from "../physics/plotHelpers";
import { generateFlowField } from "../physics/flowField.js";
import { Environment, UnitSystem } from "../components/shape.js";

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function mapUnits(units) {
  if (units === UnitSystem.IMPERIAL || units === "imperial" || units === 1) {
    return UnitSystem.IMPERIAL;
  }
  return UnitSystem.METRIC;
}

function mapEnvironment(environmentSelect) {
  switch (environmentSelect) {
    case 2:
      return Environment.MARS;
    case 3:
      return Environment.MERCURY;
    case 4:
      return Environment.VENUS;
    case 1:
    default:
      return Environment.EARTH;
  }
}

function mapShape(shapeSelect) {
  switch (shapeSelect) {
    case 1:
      return "airfoil";
    case 2:
      return "ellipse";
    case 3:
      return "plate";
    case 4:
      return "cylinder";
    case 5:
      return "ball";
    default:
      return "airfoil";
  }
}

// -----------------------------------------------------------------------------
// MAIN COMPUTE FUNCTION
// -----------------------------------------------------------------------------

export function computeOutputs(state) {
  const {
    // geometry / inputs
    angleDeg,
    camberPct,
    thicknessPct,
    velocity,
    altitude,
    chord,
    span,
    wingArea,

    // discrete selections
    units,
    environment: environmentSelect,
    shapeSelect,

    // aero options
    liftAnalisis, // 1 = stall model, 2 = ideal
    ar,

    // rotating body (future extension)
    radius,
    spin,
  } = state;

  // --- normalize selections --------------------------------------------------

  const unitSystem = mapUnits(units);
  const environment = mapEnvironment(environmentSelect);
  const shapeType = mapShape(shapeSelect);

  // --- flow properties -------------------------------------------------------

  const q = dynamicPressure(velocity, altitude); // q = 0.5 rho V^2
  const vconv = 0.6818;
  const densityTrop = densitySlugFt3(altitude);
  const densityStrat = densityTrop * 0.9;

  const q0T = calculateQ0T(velocity, vconv, altitude, densityTrop);
  const q0S = calculateQ0S(velocity, vconv, altitude, densityStrat);

  const reynolds = calculateReynolds({
    velocity,
    altitude,
    chord,
    densityTrop,
    densityStrat,
  });

  // Lift coefficient (thin airfoil + stall model)
  const cl = liftCoefficient(angleDeg, camberPct);
  const getCl = (alphaDeg, camberPct, thicknessPct) =>
    liftCoefficient(alphaDeg, camberPct, thicknessPct);

  const getCd = (
    alphaDeg,
    camberPct,
    thicknessPct,
    { reynolds, aspectRatio, efficiency }
  ) =>
    calculateDragCoefficient({
      camberDeg: camberPct,
      thicknessPct,
      alphaDeg,
      reynolds,
      cl: getCl(alphaDeg, camberPct, thicknessPct),
      aspectRatio,
      efficiency,
    });

  const aspectRatio = wingArea > 0 ? (span * span) / wingArea : 0;

  // --- CL–alpha plot  ---------------------------------------------------
  const clAlpha = calculateClAlpha({
    camberPct,
    thicknessPct,
    velocity,
    alphaMin: -10,
    alphaMax: 20,
    step: 1,
    getCl: (alphaDeg, camberPct) => liftCoefficient(alphaDeg, camberPct),
  });
  // Build Cd(α) and L/D(α)
  const cdAlpha = calculateCdAlpha({
    camberPct,
    thicknessPct,
    velocity,
    reynolds,
    aspectRatio,
    getCd,
  });

  const ldAlpha = calculateLdAlpha({
    camberPct,
    thicknessPct,
    velocity,
    reynolds,
    aspectRatio,
    getCl,
    getCd,
  });

  // Drag coefficient
  const cd = calculateDragCoefficient({
    camberDeg: camberPct,
    thicknessPct,
    alphaDeg: angleDeg,
    reynolds,
    cl,
    aspectRatio,
  });

  // Forces
  const lift = calculateLiftForce(
    velocity,
    altitude,
    wingArea,
    vconv,
    q0T,
    q0S,
    cl
  );

  const drag = calculateDragForce(
    velocity,
    altitude,
    wingArea,
    vconv,
    q0T,
    q0S,
    cd
  );

  const liftOverDrag = drag !== 0 ? lift / drag : 0;
  const barData = buildLiftDragBarData(lift, drag);
  const ld = calculateLiftToDrag(lift, drag);
  // ================= FLOW FIELD SAFETY DEFAULTS =================

  // These prevent genFlowField crashes if shape system not wired yet
  const xcval = 0; // center x
  const ycval = 0; // center y
  const rval = 1; // cylinder radius
  const gamval = 0; // circulation

  const flowField = generateFlowField({
    alphaDeg: angleDeg,
    xcval,
    ycval,
    rval,
    gamval,
  });

  // --- build probe arrays for plots + geometry ----------------------------------
  // foilsimPlots expects:
  //   xm: 2 x N array (upper/lower rows)
  //   plp: pressure probe array indexed 0..36 (we keep length 40 for safety)
  //   plv: velocity probe array indexed 0..36
  // and uses idx = npt2 - k + 1 (upper) or npt2 + k - 1 (lower). :contentReference[oaicite:3]{index=3}

  const nptc = 37; // same as flowField default nPoints
  const MAX_J = 40; // safe size (legacy style)
  const convdr = Math.PI / 180;

  // 1) geometry arrays as 2 x MAX_J (upper/lower rows)
  const xm = [Array(MAX_J).fill(0), Array(MAX_J).fill(0)];
  const ym = [Array(MAX_J).fill(0), Array(MAX_J).fill(0)];

  if (flowField?.bodyPoints?.length) {
    const n = Math.min(nptc, flowField.bodyPoints.length);
    for (let i = 0; i < n; i++) {
      const p = flowField.bodyPoints[i];
      xm[0][i] = p.x;
      ym[0][i] = p.y;
      xm[1][i] = p.x;
      ym[1][i] = p.y;
    }
  }

  // 2) probe arrays (pressure/velocity)
  const plv = Array(MAX_J).fill(0);
  const plp = Array(MAX_J).fill(0);
  // baseline p∞ in display units (psi/kPa)
  const pconv = unitSystem === UnitSystem.IMPERIAL ? 14.7 : 101.3;
  const pInfDisplay = pconv;

  // dynamic pressure q∞ in display units (assumes q is psf)
  const qInfDisplay = (q / 2116.0) * pconv;

  // circulation proxy
  const alphaRad = angleDeg * convdr;
  const Gamma = 4.0 * Math.PI * velocity * rval * Math.sin(alphaRad);

  for (let idx = 0; idx < nptc; idx++) {
    const thetaDeg = (idx * 360.0) / (nptc - 1);
    const thetaRad = thetaDeg * convdr;

    const vTheta =
      -2.0 * velocity * Math.sin(thetaRad - alphaRad) +
      Gamma / (2.0 * Math.PI * rval);

    const vLocal = Math.abs(vTheta);
    plv[idx] = vLocal;

    const cp =
      velocity !== 0 ? 1.0 - (vLocal * vLocal) / (velocity * velocity) : 0;

    plp[idx] = pInfDisplay + cp * qInfDisplay;
  }
  // --- structured output for panels -----------------------------------------
  // ================= PERFORMANCE ANALYSIS =================
  // --- drag breakdown: Cd0 (parasitic) + Cdi (induced) -----------------------
  const { induced, reCorrection } = state; // make sure these exist in state

  // Baseline parasitic drag (same as in your faithful model)
  let cd0 = 0.01 + 0.002 * (thicknessPct / 12.0) + 0.0001 * Math.abs(camberPct);

  // Optional Reynolds correction
  if (reCorrection && reynolds > 0) {
    cd0 *= Math.pow(50000 / reynolds, 0.11);
  }

  // Induced drag term
  let cdi = 0;
  if (induced) {
    const efficiency = 0.85;
    cdi = (cl * cl) / (Math.PI * aspectRatio * efficiency);
  }

  // (optional) If you want, you can also recompute cd_total = cd0 + cdi
  // and compare to your existing `cd` for debugging.

  let optimalLD = 0;
  let optimalAlpha = 0;
  let stallAlpha = null;

  // Detect stall by dCl/dα turning negative
  for (let i = 1; i < clAlpha.alphas.length; i++) {
    const alphaPrev = clAlpha.alphas[i - 1];
    const alpha = clAlpha.alphas[i];

    const dCl = clAlpha.cls[i] - clAlpha.cls[i - 1];

    // Stall detection (first slope drop)
    if (stallAlpha === null && dCl < 0) {
      stallAlpha = alphaPrev;
    }
  }

  // build L/D(α)
  for (let i = 0; i < clAlpha.alphas.length; i++) {
    const cl_i = clAlpha.cls[i];

    const cd_i = calculateDragCoefficient({
      camberDeg: camberPct,
      thicknessPct,
      alphaDeg: clAlpha.alphas[i],
      reynolds,
      cl: cl_i,
      aspectRatio,
    });

    // build Cd(α)
    const cdAlpha = calculateCdAlpha({
      camberPct,
      thicknessPct,
      velocity,
      alphaMin: clAlpha.alphas[0],
      alphaMax: clAlpha.alphas[clAlpha.alphas.length - 1],
      step: clAlpha.alphas[1] - clAlpha.alphas[0],
      reynolds,
      aspectRatio,
      getCd: (alphaDeg, camberPct, thicknessPct, { reynolds, aspectRatio }) => {
        const cl = liftCoefficient(alphaDeg, camberPct);
        return calculateDragCoefficient({
          camberDeg: camberPct,
          thicknessPct,
          alphaDeg,
          reynolds,
          cl,
          aspectRatio,
        });
      },
    });

    // build L/D(α)
    const ldAlpha = calculateLdAlpha({
      camberPct,
      thicknessPct,
      velocity,
      alphaMin: clAlpha.alphas[0],
      alphaMax: clAlpha.alphas[clAlpha.alphas.length - 1],
      step: clAlpha.alphas[1] - clAlpha.alphas[0],
      reynolds,
      aspectRatio,
      getCl: (alphaDeg, camberPct) => liftCoefficient(alphaDeg, camberPct),
      getCd: (alphaDeg, camberPct, thicknessPct, { reynolds, aspectRatio }) => {
        const cl = liftCoefficient(alphaDeg, camberPct);
        return calculateDragCoefficient({
          camberDeg: camberPct,
          thicknessPct,
          alphaDeg,
          reynolds,
          cl,
          aspectRatio,
        });
      },
    });

    const ld_i = ldAlpha.lds[i];

    if (ld_i > optimalLD) {
      optimalLD = ld_i;
      optimalAlpha = ldAlpha.alphas[i];
    }
  }

  // Current stall state
  const isStalled = stallAlpha !== null && angleDeg >= stallAlpha;

  return {
    // geometry arrays (USED by GeometryPanel + probe overlay)
    xm,
    ym,
    plp,
    plv,

    // ✅ dynamic pressure for Cp (q∞)
    q0: q,

    // optional debug
    flowField,

    // geometry panel
    shapeType,
    angleDeg,
    camberPct,
    thicknessPct,
    chord,
    span,
    wingArea,
    aspectRatio,

    // aero gage panel
    cl,
    cd,
    lift,
    drag,
    reynolds,
    liftOverDrag,

    // drag breakdown
    cd0,
    cdi,

    // environment
    velocity,
    altitude,

    // plot panel
    plots: {
      clAlpha,
      cdAlpha,
      ldAlpha,
    },

    rotation: {
      radius,
      spin,
    },

    units: unitSystem,
    environment,
  };
}
/*
export function plotGraph({ lift, drag }, plotRef) {
  if (!plotRef?.current) return;

  const data = [
    {
      x: ["Lift", "Drag"],
      y: [lift, drag],
      type: "bar",
    },
  ];

  Plotly.newPlot(plotRef.current, data);
}

*/
