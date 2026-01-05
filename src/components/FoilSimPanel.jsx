import React, { useMemo, useRef } from "react";
import { useFoilSim } from "../store/FoilSimContext.jsx";
import { computeOutputs } from "../foilsim/computeOutputs";
import Design3D from "../design/Design3D.jsx";
import FlowCanvas from "./FlowCanvas.jsx";
import OutputsPanel from "../foilsim/OutputsPanel.jsx";
import { calculateReynolds } from "../physics/foilPhysics.js";
import logo from "../assets/logo.png";

// ---------------- NACA 4 helpers (from your DesignApp) ----------------
function deg2rad(d) {
  return (d * Math.PI) / 180;
}

function rotate([x, y], a, pivot = [0, 0]) {
  const [px, py] = pivot;
  const dx = x - px;
  const dy = y - py;
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  return [px + dx * ca - dy * sa, py + dx * sa + dy * ca];
}

function naca4({ m, p, t, c = 1, n = 200, alpha = 0 }) {
  // x distribution (cosine spacing)
  const x = Array.from({ length: n + 1 }, (_, i) => {
    const beta = (Math.PI * i) / n;
    return (c / 2) * (1 - Math.cos(beta));
  });

  // thickness distribution (classic NACA)
  const yt = x.map((xi) => {
    const xc = xi / c;
    return (
      5 *
      t *
      c *
      (0.2969 * Math.sqrt(xc) -
        0.126 * xc -
        0.3516 * xc * xc +
        0.2843 * xc * xc * xc -
        0.1015 * xc * xc * xc * xc)
    );
  });

  // camber line
  const yc = x.map((xi) => {
    const xc = xi / c;
    if (p <= 0) return 0;
    if (xc < p) return ((m * c) / (p * p)) * (2 * p * xc - xc * xc);
    return ((m * c) / ((1 - p) * (1 - p))) * (1 - 2 * p + 2 * p * xc - xc * xc);
  });

  // slope of camber line dyc/dx
  const dyc = x.map((xi) => {
    const xc = xi / c;
    if (p <= 0) return 0;
    if (xc < p) return (2 * m * (p - xc)) / (p * p);
    return (2 * m * (p - xc)) / ((1 - p) * (1 - p));
  });

  const a = deg2rad(-alpha);
  const pivot = [0.25 * c, 0];

  const upper = [];
  const lower = [];

  for (let i = 0; i <= n; i++) {
    const theta = Math.atan(dyc[i] || 0);
    const xu = x[i] - yt[i] * Math.sin(theta);
    const yu = yc[i] + yt[i] * Math.cos(theta);
    const xl = x[i] + yt[i] * Math.sin(theta);
    const yl = yc[i] - yt[i] * Math.cos(theta);

    upper.push(rotate([xu, yu], a, pivot));
    lower.push(rotate([xl, yl], a, pivot));
  }

  return [...upper, ...lower.reverse()];
}

function asPath(pts) {
  if (!pts.length) return "";
  const [x0, y0] = pts[0];
  const cmds = [`M ${x0.toFixed(4)} ${(-y0).toFixed(4)}`];
  for (let i = 1; i < pts.length; i++) {
    const [x, y] = pts[i];
    cmds.push(`L ${x.toFixed(4)} ${(-y).toFixed(4)}`);
  }
  cmds.push("Z");
  return cmds.join(" ");
}

// ---------------- JSON helpers ----------------
function downloadJSON(filename, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function AngleControl() {
  const {
    state: { angleDeg },
    dispatch,
  } = useFoilSim();

  const handleChange = (e) => {
    const value = Number(e.target.value);
    dispatch({ type: "SET_INPUT", key: "angleDeg", value });
  };

  return (
    <div style={{ marginBottom: "1rem" }}>
      <label>
        Angle of attack (deg): <strong>{angleDeg.toFixed(1)}</strong>
      </label>
      <br />
      <input
        type="range"
        min={-20}
        max={20}
        step={0.5}
        value={angleDeg}
        onChange={handleChange}
      />
    </div>
  );
}

export default function FoilSimPanel() {
  const { state, setUnits, dispatch } = useFoilSim();
  const fileInputRef = useRef(null);

  // ---- SINGLE UI SOURCE (Design + Flight) ----
  const angleDeg = state.angleDeg ?? 4;
  const chord = state.chord ?? 1.0;
  const span = state.span ?? 2.0;

  // We’ll treat camber/thickness in FoilSim state as “percent”
  // but NACA wants ratios: m=0.02, t=0.12
  const camberPct = state.camberPct ?? 0; // e.g. 2 means 2%
  const thicknessPct = state.thicknessPct ?? 12; // e.g. 12 means 12%

  // NACA params derived from percent
  const m = camberPct / 100;
  const t = thicknessPct / 100;
  const p = state.camberPos ?? 0.4;

  const velocity = state.velocity ?? 100;
  const altitude = state.altitude ?? 0;
  const wingArea = state.wingArea ?? 5;

  const handleNumericInput = (key, value) => {
    // Convert to number, but handle the empty string case to allow clearing the field
    const numValue = value === "" ? 0 : Number(value);
    dispatch({
      type: "SET_INPUT",
      key: key,
      value: numValue,
    });
  };

  // keep wingArea consistent if user edits chord/span:
  // (optional) you can auto-set wingArea = chord * span or something, but I’ll keep it user-controlled.

  const results = useMemo(() => {
    try {
      return computeOutputs({
        ...state,
        angleDeg,
        camberPct,
        thicknessPct,
        velocity,
        altitude,
        chord,
        span,
        wingArea,
      });
    } catch (e) {
      return { __error: String(e?.message || e) };
    }
  }, [
    state,
    angleDeg,
    camberPct,
    thicknessPct,
    velocity,
    altitude,
    chord,
    span,
    wingArea,
  ]);

  // ---- 2D preview ----
  const pts = useMemo(
    () => naca4({ m, p, t, c: chord, n: 300, alpha: angleDeg }),
    [m, p, t, chord, angleDeg]
  );

  const path = useMemo(() => asPath(pts), [pts]);

  const bbox = useMemo(() => {
    let minx = Infinity,
      maxx = -Infinity,
      miny = Infinity,
      maxy = -Infinity;
    pts.forEach(([x, y]) => {
      minx = Math.min(minx, x);
      maxx = Math.max(maxx, x);
      miny = Math.min(miny, y);
      maxy = Math.max(maxy, y);
    });
    return { minx, maxx, miny, maxy, w: maxx - minx, h: maxy - miny };
  }, [pts]);

  // ---- actions ----
  const resetAll = () => {
    dispatch({ type: "SET_INPUT", key: "angleDeg", value: 4 });
    dispatch({ type: "SET_INPUT", key: "chord", value: 1.0 });
    dispatch({ type: "SET_INPUT", key: "span", value: 2.0 });
    dispatch({ type: "SET_INPUT", key: "camberPct", value: 0.02 });
    dispatch({ type: "SET_INPUT", key: "thicknessPct", value: 12 });
    dispatch({ type: "SET_INPUT", key: "camberPos", value: 0.4 });
    dispatch({ type: "SET_INPUT", key: "velocity", value: 100 });
    dispatch({ type: "SET_INPUT", key: "altitude", value: 0 });
    dispatch({ type: "SET_INPUT", key: "wingArea", value: 5 });
  };

  const exportJSON = () => {
    downloadJSON("foilsim_design_and_flight.json", {
      angleDeg,
      chord,
      span,
      camberPct,
      thicknessPct,
      camberPos: p,
      velocity,
      altitude,
      wingArea,
      // keep full state too (handy for debugging):
      state,
    });
  };

  const importJSON = async (file) => {
    const txt = await file.text();
    const obj = JSON.parse(txt);

    // accept either top-level fields OR nested "state"
    const src = obj.state ?? obj;

    const setIfNum = (key, v) => {
      const n = Number(v);
      if (Number.isFinite(n)) dispatch({ type: "SET_INPUT", key, value: n });
    };

    setIfNum("angleDeg", src.angleDeg);
    setIfNum("chord", src.chord);
    setIfNum("span", src.span);
    setIfNum("camberPct", src.camberPct ?? src.camberPercent);
    setIfNum("thicknessPct", src.thicknessPct ?? src.thicknessPercent);
    setIfNum("camberPos", src.camberPos ?? src.p);
    setIfNum("velocity", src.velocity);
    setIfNum("altitude", src.altitude);
    setIfNum("wingArea", src.wingArea);
  };

  const getUnitLabel = (unitType) => {
    const isMetric = state.units === "metric";
    switch (unitType) {
      case "length":
        return isMetric ? "m" : "ft";
      case "velocity":
        return isMetric ? "m/s" : "ft/s";
      case "area":
        return isMetric ? "m²" : "ft²";
      case "density":
        return isMetric ? "kg/m³" : "slug/ft³";
      case "viscosity":
        return isMetric ? "Pa·s" : "lbf·s/ft²";
      default:
        return "";
    }
  };

  const onPickImport = () => fileInputRef.current?.click();

  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    importJSON(file).finally(() => {
      e.target.value = "";
    });
  };

  const err = results?.__error;

  return (
    <div
      style={{
        padding: 16,
        width: "100%",
        maxWidth: 1500, // was 1100
        margin: "0 auto", // keeps it centered
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* --- ADD YOUR LOGO HERE --- */}
          <img
            src={logo}
            alt="Logo"
            style={{ width: "80px", height: "80px", objectFit: "contain" }}
          />

          <h2 style={{ margin: 0 }}>Airfoil Design & Simulation</h2>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={() =>
              setUnits(state.units === "metric" ? "imperial" : "metric")
            }
          >
            Current: <strong>{state.units}</strong>, Switch to{" "}
            {state.units === "metric" ? "imperial" : "metric"}
          </button>

          <button onClick={resetAll} title="Reset">
            ↺ Reset
          </button>

          <button onClick={exportJSON} title="Export JSON">
            ⬇ Export JSON
          </button>

          <button onClick={onPickImport} title="Import JSON">
            ⬆ Import JSON
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            style={{ display: "none" }}
            onChange={onFileChange}
          />
        </div>
      </div>

      <div
        style={{
          display: "grid",
          // ✅ 2) Make left column wider + keep both columns balanced
          gridTemplateColumns: "minmax(420px, 1fr) minmax(520px, 1fr)", // was "360px 1fr"
          gap: 16,
          marginTop: 12,
          alignItems: "start",
        }}
      >
        {/* LEFT: unified controls */}
        <div style={{ display: "grid", gap: 16 }}>
          <div
            style={{
              border: "1px solid #ddd",
              borderRadius: 12,
              padding: 12,
              display: "grid",
              gap: 10,
            }}
          >
            <h3 style={{ margin: "6px 0 0" }}>Design</h3>
            <label>
              Chord ({getUnitLabel("length")})
              <input
                type="number"
                step="0.01"
                /* FIX: If chord is 0, show an empty string. 
       This prevents "0" from staying in front when you type.
    */
                value={chord === 0 ? "" : chord}
                onChange={(e) =>
                  dispatch({
                    type: "SET_INPUT",
                    key: "chord",
                    value: e.target.value === "" ? 0 : Number(e.target.value),
                  })
                }
                style={{ width: "100%" }}
              />
            </label>

            <label>
              Span ({getUnitLabel("length")})
              <input
                type="number"
                step="0.1"
                /* FIX: Same logic for Span */
                value={span === 0 ? "" : span}
                onChange={(e) =>
                  dispatch({
                    type: "SET_INPUT",
                    key: "span",
                    value: e.target.value === "" ? 0 : Number(e.target.value),
                  })
                }
                style={{ width: "100%" }}
              />
            </label>
            <label>
              Thickness (%)
              <input
                type="number"
                step="0.1"
                // If thicknessPct is 0, show an empty string so the user can type "0.9" without a leading 0
                value={thicknessPct === 0 ? "" : thicknessPct}
                onChange={(e) => {
                  const val =
                    e.target.value === "" ? 0 : Number(e.target.value);
                  dispatch({
                    type: "SET_INPUT",
                    key: "thicknessPct",
                    value: val,
                  });
                }}
                style={{ width: "100%" }}
              />
            </label>
            {/* --- Camber (%) --- */}
            <label>
              Camber (%)
              <input
                type="number"
                step="0.1"
                value={camberPct === 0 ? "" : camberPct}
                onChange={(e) => {
                  const val =
                    e.target.value === "" ? 0 : Number(e.target.value);
                  dispatch({ type: "SET_INPUT", key: "camberPct", value: val });
                }}
                style={{ width: "100%" }}
              />
            </label>
            {/* --- Camber position (p) --- */}
            <label>
              Camber position (p between 0 and 1)
              <input
                type="number"
                step="0.05"
                value={p === 0 ? "" : p}
                onChange={(e) => {
                  const val =
                    e.target.value === "" ? 0 : Number(e.target.value);
                  dispatch({ type: "SET_INPUT", key: "camberPos", value: val });
                }}
                style={{ width: "100%" }}
              />
            </label>
            {/* --- Reynolds Number Result --- */}
            <div
              style={{
                marginTop: "15px",
                padding: "10px",
                backgroundColor: "#f0f7ff",
                borderRadius: "8px",
                border: "1px solid #b8daff",
              }}
            >
              <div
                style={{
                  fontSize: "0.85rem",
                  color: "#495057",
                  fontWeight: "bold",
                  marginBottom: "4px",
                }}
              >
                Reynolds Number (Re)
              </div>
              <div
                style={{
                  fontSize: "1.1rem",
                  color: "#004085",
                  fontFamily: "monospace",
                  fontWeight: "600",
                }}
              >
                {(() => {
                  // Calling your specific function from computeOutputs
                  const re = calculateReynolds({
                    velocity,
                    altitude,
                    chord,
                    densityTrop: 1.225,
                    densityStrat: 0.3639,
                  });

                  return re > 0 ? re.toExponential(3) : "0.000e+0";
                })()}
              </div>
            </div>
          </div>

          {/* flight box */}
          <div
            style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}
          >
            <h3 style={{ margin: "10px 0 0" }}>Flight</h3>
            <AngleControl />
            {/*  <FlightPanel />; */}
            <label>
              Angle of attack (°)
              <input
                type="number"
                step="0.5"
                /* If the value is 0, we show "", allowing you to type "0.9" cleanly */
                value={angleDeg === 0 ? "" : angleDeg}
                onChange={(e) =>
                  dispatch({
                    type: "SET_INPUT",
                    key: "angleDeg",
                    /* If the user clears the box, we send 0 to the state */
                    value: e.target.value === "" ? 0 : Number(e.target.value),
                  })
                }
                style={{ width: "100%" }}
              />
            </label>

            <label>
              Velocity ({getUnitLabel("velocity")})
              <input
                type="number"
                step="1"
                value={velocity === 0 ? "" : velocity}
                onChange={(e) =>
                  dispatch({
                    type: "SET_INPUT",
                    key: "velocity",
                    value: e.target.value === "" ? 0 : Number(e.target.value),
                  })
                }
                style={{ width: "100%" }}
              />
            </label>

            <label>
              Altitude ({getUnitLabel("length")})
              <input
                type="number"
                step="100"
                value={altitude === 0 ? "" : altitude}
                onChange={(e) =>
                  dispatch({
                    type: "SET_INPUT",
                    key: "altitude",
                    value: e.target.value === "" ? 0 : Number(e.target.value),
                  })
                }
                style={{ width: "100%" }}
              />
            </label>

            <label>
              Wing area ({getUnitLabel("area")})
              <input
                type="number"
                step="0.1"
                value={wingArea === 0 ? "" : wingArea}
                onChange={(e) =>
                  dispatch({
                    type: "SET_INPUT",
                    key: "wingArea",
                    value: e.target.value === "" ? 0 : Number(e.target.value),
                  })
                }
                style={{ width: "100%" }}
              />
            </label>
          </div>

          <div className="foilsim-right">
            <div style={{ position: "relative", zIndex: 5000 }}>
              <OutputsPanel /> {/* ✅ now the buttons visibly do something */}
            </div>
          </div>
          {/* results box 
          <div
            style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}
          >
            <h3 style={{ marginTop: 0 }}>Results</h3>

            {err ? (
              <pre style={{ whiteSpace: "pre-wrap", color: "crimson" }}>
                {err}
              </pre>
            ) : (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 10,
                  }}
                >
                  <div>
                    <strong>Re</strong>:{" "}
                    {Number(results.reynolds ?? 0).toFixed(0)}
                  </div>
                  <div>
                    <strong>CL</strong>: {Number(results.cl ?? 0).toFixed(4)}
                  </div>
                  <div>
                    <strong>CD</strong>: {Number(results.cd ?? 0).toFixed(4)}
                  </div>
                  <div>
                    <strong>L/D</strong>:{" "}
                    {Number(results.liftOverDrag ?? 0).toFixed(2)}
                  </div>
                  <div>
                    <strong>Lift</strong>:{" "}
                    {Number(results.lift ?? 0).toFixed(2)}
                  </div>
                  <div>
                    <strong>Drag</strong>:{" "}
                    {Number(results.drag ?? 0).toFixed(2)}
                  </div>
                </div>
              </>
            )}
          </div>

          <div
            style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}
          >
            <AnalysisPanel />
          </div>*/}
        </div>

        {/* RIGHT: 2D preview + 3D view underneath */}
        <div style={{ display: "grid", gap: 16 }}>
          <div
            style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}
          >
            <h3 style={{ marginTop: 0 }}>2D Preview</h3>
            <svg
              viewBox={`${bbox.minx - 0.1} ${-(bbox.maxy + 0.1)} ${bbox.w + 0.2} ${bbox.h + 0.2}`}
              width="100%"
              height="320"
            >
              <defs>
                <pattern
                  id="grid"
                  width="0.1"
                  height="0.1"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 0 0 L 0 0.1 M 0 0 L 0.1 0"
                    stroke="rgba(0,0,0,0.08)"
                    strokeWidth="0.002"
                  />
                </pattern>
              </defs>
              <rect
                x={bbox.minx - 0.1}
                y={-(bbox.maxy + 0.1)}
                width={bbox.w + 0.2}
                height={bbox.h + 0.2}
                fill="url(#grid)"
              />
              <path
                d={path}
                fill="rgba(0,0,0,0.04)"
                stroke="black"
                strokeWidth="0.002"
              />
              <line
                x1={0.25 * chord}
                y1={-(bbox.maxy + 0.1)}
                x2={0.25 * chord}
                y2={-(bbox.miny - 0.1)}
              />
            </svg>
            <div
              style={{
                border: "1px solid #ddd",
                borderRadius: 12,
                padding: 12,
              }}
            >
              <div style={{ marginTop: 12 }}>
                <h3 style={{ marginTop: 0 }}>3D Preview</h3>
                <Design3D
                  angleDeg={angleDeg}
                  chord={chord}
                  t={t}
                  m={m}
                  p={p}
                  span={span}
                  alphaDeg={angleDeg}
                />
              </div>

              <p style={{ margin: "8px 0 0", opacity: 0.75 }}>
                Orbit with mouse drag • Zoom with wheel
              </p>
            </div>

            <div
              style={{
                border: "1px solid #ddd",
                borderRadius: 12,
                padding: 12,
              }}
            >
              <FlowCanvas />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
