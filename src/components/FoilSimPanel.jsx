import React, { useMemo, useRef } from "react";
import { useFoilSim } from "../store/FoilSimContext.jsx";
import { computeOutputs } from "../foilsim/computeOutputs.js"; // adjust path if different
import Design3D from "../design/Design3D.jsx"; // we’ll patch it to accept props
import AnalysisPanel from "./AnalysisPanel.jsx";
import FlowCanvas from "./FlowCanvas.jsx";
import OutputTabs from "../foilsim/OutputTabs.jsx";

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

  const a = deg2rad(alpha);
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
  const { state, dispatch } = useFoilSim();
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
    <div style={{ padding: 16, maxWidth: 1100 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}
      >
        <h2 style={{ margin: 0 }}>Airfoil Design & Simulation</h2>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
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
          gridTemplateColumns: "360px 1fr",
          gap: 16,
          marginTop: 12,
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
              Chord (m)
              <input
                type="number"
                step="0.01"
                value={chord}
                onChange={(e) =>
                  dispatch({
                    type: "SET_INPUT",
                    key: "chord",
                    value: Number(e.target.value),
                  })
                }
                style={{ width: "100%" }}
              />
            </label>

            <label>
              Span (m)
              <input
                type="number"
                step="0.1"
                value={span}
                onChange={(e) =>
                  dispatch({
                    type: "SET_INPUT",
                    key: "span",
                    value: Number(e.target.value),
                  })
                }
                style={{ width: "100%" }}
              />
            </label>

            <label>
              Thickness (%) {/* maps to t = thicknessPct / 100 */}
              <input
                type="number"
                step="0.5"
                value={thicknessPct}
                onChange={(e) =>
                  dispatch({
                    type: "SET_INPUT",
                    key: "thicknessPct",
                    value: Number(e.target.value),
                  })
                }
                style={{ width: "100%" }}
              />
            </label>

            <label>
              Camber (%) {/* maps to m = camberPct / 100 */}
              <input
                type="number"
                step="0.5"
                value={camberPct}
                onChange={(e) =>
                  dispatch({
                    type: "SET_INPUT",
                    key: "camberPct",
                    value: Number(e.target.value),
                  })
                }
                style={{ width: "100%" }}
              />
            </label>

            <label>
              Camber position (p)
              <input
                type="number"
                step="0.05"
                value={p}
                onChange={(e) =>
                  dispatch({
                    type: "SET_INPUT",
                    key: "camberPos",
                    value: Number(e.target.value),
                  })
                }
                style={{ width: "100%" }}
              />
            </label>
          </div>

          {/* flight box */}
          <div
            style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}
          >
            <h3 style={{ margin: "10px 0 0" }}>Flight</h3>
            <AngleControl />
            <label>
              Angle of attack (°)
              <input
                type="number"
                step="0.5"
                value={angleDeg}
                onChange={(e) =>
                  dispatch({
                    type: "SET_INPUT",
                    key: "angleDeg",
                    value: Number(e.target.value),
                  })
                }
                style={{ width: "100%" }}
              />
            </label>

            <label>
              Velocity
              <input
                type="number"
                step="1"
                value={velocity}
                onChange={(e) =>
                  dispatch({
                    type: "SET_INPUT",
                    key: "velocity",
                    value: Number(e.target.value),
                  })
                }
                style={{ width: "100%" }}
              />
            </label>

            <label>
              Altitude (ft)
              <input
                type="number"
                step="100"
                value={altitude}
                onChange={(e) =>
                  dispatch({
                    type: "SET_INPUT",
                    key: "altitude",
                    value: Number(e.target.value),
                  })
                }
                style={{ width: "100%" }}
              />
            </label>

            <label>
              Wing area
              <input
                type="number"
                step="0.1"
                value={wingArea}
                onChange={(e) =>
                  dispatch({
                    type: "SET_INPUT",
                    key: "wingArea",
                    value: Number(e.target.value),
                  })
                }
                style={{ width: "100%" }}
              />
            </label>
          </div>
          {/* results box */}
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
          </div>
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
                stroke="rgba(255,0,0,0.4)"
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
              {/* Right side: NASA-style Gage/Geometry/Data/Plot outputs */}
              <div className="foilsim-right">
                <div style={{ position: "relative", zIndex: 5000 }}>
                  <OutputTabs />
                </div>
              </div>
              <FlowCanvas />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
