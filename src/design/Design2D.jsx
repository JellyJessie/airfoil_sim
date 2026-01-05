import React, { useMemo, useState } from "react";
import { useAirfoil, AirfoilProvider } from "../store/FoilSimContext.jsx";

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

/**
 * Generate upper/lower surface points for a NACA-4 style airfoil with camber.
 * n = number of segments along chord => (n+1) points per surface.
 */
function naca4Surfaces({ m, p, t, c = 1, n = 200, alpha = 0 }) {
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
    if (p <= 0) return 0;
    if (xc < p) return (m * c * (2 * p * xc - xc * xc)) / (p * p);
    return (m * c * (1 - 2 * p + 2 * p * xc - xc * xc)) / ((1 - p) * (1 - p));
  });

  const dyc = x.map((xi) => {
    const xc = xi / c;
    if (p <= 0) return 0;
    if (xc < p) return (2 * m * (p - xc)) / (p * p);
    return (2 * m * (p - xc)) / ((1 - p) * (1 - p));
  });

  const a = deg2rad(-alpha);
  const pivot = [0.25 * c, 0];
  console.log(
    "Design2D LOADED",
    new Date().toISOString(),
    "angleDeg =",
    state.angleDeg
  );
  alert("✅ Design2D module loaded");

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
  return { upper, lower };
}

/**
 * Build a single closed loop of exactly `totalPoints` points.
 * Ordering: TE -> LE along upper, then LE -> TE along lower (no LE duplicate).
 *
 * If totalPoints is even, we generate one extra point and drop the last point
 * to match the requested count.
 */
function naca4LoopPoints({ m, p, t, c = 1, alpha = 0, totalPoints = 81 }) {
  const N = Math.max(20, Math.min(200, Math.round(totalPoints)));
  const nSeg = Math.floor(N / 2); // produces (2*nSeg+1) points (odd), or N+1 if N is even
  const { upper, lower } = naca4Surfaces({ m, p, t, c, n: nSeg, alpha });

  const upperTEtoLE = [...upper].reverse(); // TE -> LE
  const lowerLEtoTE = lower.slice(1); // skip LE to avoid duplication

  let pts = [...upperTEtoLE, ...lowerLEtoTE]; // length = 2*nSeg + 1
  if (pts.length > N) pts = pts.slice(0, N);
  return pts;
}

function asPath(points) {
  if (!points || points.length < 2) return "";
  const cmds = [];
  cmds.push(`M ${points[0][0]} ${-points[0][1]}`);
  for (let i = 1; i < points.length; i++) {
    cmds.push(`L ${points[i][0]} ${-points[i][1]}`);
  }
  cmds.push("Z");
  return cmds.join(" ");
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function Design2D() {
  const { state } = useAirfoil();
  const { chord, t, m, p, angleDeg, thicknessPct, camberPct, camberPosPct } =
    state;

  const tFrac = typeof t === "number" ? t : (thicknessPct ?? 12) / 100;
  const mFrac = typeof m === "number" ? m : (camberPct ?? 2) / 100;
  const pFrac = typeof p === "number" ? p : (camberPosPct ?? 40) / 100;

  const [numPoints, setNumPoints] = useState(81);

  const pts = useMemo(
    () =>
      naca4LoopPoints({
        m: mFrac,
        p: pFrac,
        t: tFrac,
        c: chord,
        alpha: angleDeg,
        totalPoints: numPoints,
      }),
    [mFrac, pFrac, tFrac, chord, angleDeg, numPoints]
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

  const viewPad = 0.15 * Math.max(bbox.w || 1, bbox.h || 1);
  const viewBox = `${bbox.minx - viewPad} ${-(bbox.maxy + viewPad)} ${bbox.w + 2 * viewPad} ${
    bbox.h + 2 * viewPad
  }`;

  const exportCSV = () => {
    const csv = pts.map(([x, y], i) => `${i + 1},${x},${y}`).join("\n");
    downloadText(`airfoil_${pts.length}pts.csv`, "i,x,y\n" + csv);
  };

  const exportJSON = () => {
    const obj = {
      count: pts.length,
      params: { chord, m: mFrac, p: pFrac, t: tFrac, alphaDeg: angleDeg },
      points: pts.map(([x, y]) => ({ x, y })),
    };
    downloadText(`airfoil_${pts.length}pts.json`, JSON.stringify(obj, null, 2));
  };

  return (
    <div className="af-panel">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 8,
        }}
      >
        <div style={{ fontWeight: 600 }}>2D Airfoil Preview</div>

        <label
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          Points:
          <input
            type="number"
            min={20}
            max={200}
            value={numPoints}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (!Number.isFinite(v)) return;
              setNumPoints(Math.max(20, Math.min(200, Math.round(v))));
            }}
            style={{ width: 90 }}
          />
        </label>

        <button onClick={exportCSV}>Export CSV</button>
        <button onClick={exportJSON}>Export JSON</button>
      </div>

      <div className="af-2d-stage" style={{ background: "#fff" }}>
        <svg
          viewBox={viewBox}
          width="100%"
          height="260"
          style={{ display: "block" }}
        >
          {/* outline */}
          <path
            d={path}
            fill="none"
            stroke="black"
            strokeWidth={0.01 * Math.max(bbox.w, 1)}
          />

          {/* quarter-chord reference */}
          <line
            x1={0.25 * chord}
            y1={-(bbox.maxy + viewPad)}
            x2={0.25 * chord}
            y2={-(bbox.miny - viewPad)}
            stroke="rgba(255,0,0,0.35)"
            strokeWidth={0.005 * Math.max(bbox.w, 1)}
          />

          {/* camber-position reference */}
          <line
            x1={pFrac * chord}
            y1={-(bbox.maxy + viewPad)}
            x2={pFrac * chord}
            y2={-(bbox.miny - viewPad)}
            stroke="rgba(0,128,0,0.45)"
            strokeWidth={0.005 * Math.max(bbox.w, 1)}
          />
        </svg>
      </div>
    </div>
  );
}

export function Design2DWithProvider(props) {
  return (
    <AirfoilProvider>
      <Design2D {...props} />
    </AirfoilProvider>
  );
}
