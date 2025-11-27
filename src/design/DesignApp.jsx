import React, { useMemo, useState } from "react";
import { useFoilSim } from "../store/FoilSimContext"; // <– ADD THIS

function deg2rad(d) {
  return (d * Math.PI) / 180;
}
function rotate([x, y], a, pivot = [0, 0]) {
  const s = Math.sin(a),
    c = Math.cos(a);
  const xr = x - pivot[0],
    yr = y - pivot[1];
  return [xr * c - yr * s + pivot[0], xr * s + yr * c + pivot[1]];
}

function naca4({ m, p, t, c = 1, n = 200, alpha = 0 }) {
  const x = new Array(n + 1).fill(0).map((_, i) => (c * i) / n);
  const yt = x.map((xi) => {
    const xc = xi / c;
    return (
      5 *
      t *
      c *
      (0.2969 * Math.sqrt(Math.max(xc, 1e-9)) -
        0.126 * xc -
        0.3516 * xc ** 2 +
        0.2843 * xc ** 3 -
        0.1015 * xc ** 4)
    );
  });
  const yc = x.map((xi) => {
    const xc = xi / c;
    if (p <= 0) {
      return 0;
    }
    if (xc < p) {
      return (m * c * (2 * p * xc - xc * xc)) / (p * p);
    }
    return (m * c * (1 - 2 * p + 2 * p * xc - xc * xc)) / ((1 - p) * (1 - p));
  });
  const dyc = x.map((xi) => {
    const xc = xi / c;
    if (p <= 0) {
      return 0;
    }
    if (xc < p) {
      return (2 * m * (p - xc)) / (p * p);
    }
    return (2 * m * (p - xc)) / ((1 - p) * (1 - p));
  });

  const a = deg2rad(alpha);
  const pivot = [0.25 * c, 0];
  const upper = [],
    lower = [];
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

export default function DesignApp() {
  // ⬇️ NEW: pull angleDeg from the FoilSim context
  const {
    state: { angleDeg },
    dispatch,
  } = useFoilSim();

  const [chord, setChord] = useState(1.0);
  const [t, setT] = useState(0.12);
  const [m, setM] = useState(0.02);
  const [p, setP] = useState(0.4);
  // const [alpha, setAlpha] = useState(4);
  // just treat angleDeg as the design angle:
  const alpha = angleDeg;

  const pts = useMemo(
    () => naca4({ m, p, t, c: chord, n: 300, alpha }),
    [m, p, t, chord, alpha]
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

  function exportJSON() {
    const payload = { chord, t, m, p, alpha, points: pts };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "design_naca4.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function reset() {
    setM(0.02);
    setP(0.4);
    setT(0.12);
    setChord(1.0);
    // also reset angle in the global state if you like: setAlpha(4);
    dispatch({ type: "SET_INPUT", key: "angleDeg", value: 4 });
  }

  return (
    <div className="af-panel" style={{ maxWidth: 1000 }}>
      <h2 className="af-title">Airfoil Design (NACA MPXX)</h2>
      <div
        style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 16 }}
      >
        <div>
          <div className="af-field">
            <label>Chord (m)</label>
            <input
              type="number"
              step="0.01"
              value={chord}
              onChange={(e) => setChord(parseFloat(e.target.value || "0"))}
            />
          </div>
          <div className="af-field">
            <label>Thickness ratio (t)</label>
            <input
              type="number"
              step="0.005"
              value={t}
              onChange={(e) => setT(parseFloat(e.target.value || "0"))}
            />
            <small>e.g., 0.12 for 12%</small>
          </div>
          <div className="af-field">
            <label>Max camber (m)</label>
            <input
              type="number"
              step="0.005"
              value={m}
              onChange={(e) => setM(parseFloat(e.target.value || "0"))}
            />
            <small>e.g., 0.02 for 2%</small>
          </div>
          <div className="af-field">
            <label>Camber position (p)</label>
            <input
              type="number"
              step="0.05"
              value={p}
              onChange={(e) => setP(parseFloat(e.target.value || "0"))}
            />
            <small>0..1 (e.g., 0.4 puts max camber at 40% chord)</small>
          </div>
          <div className="af-field">
            <label>Angle of attack (°)</label>
            <input
              type="number"
              step="0.5"
              value={alpha}
              onChange={(e) => setAlpha(parseFloat(e.target.value || "0"))}
            />
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button onClick={reset}>Reset</button>
            <button onClick={exportJSON}>Export JSON</button>
          </div>
        </div>
        <div>
          <svg
            viewBox={`${bbox.minx - 0.1} ${-(bbox.maxy + 0.1)} ${bbox.w + 0.2} ${bbox.h + 0.2}`}
            width="100%"
            height="460"
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
              fill="rgba(0,0,0,0.05)"
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
        </div>
      </div>
    </div>
  );
}
