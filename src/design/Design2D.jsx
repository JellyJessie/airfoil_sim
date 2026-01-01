import React, { useMemo } from "react";
import { AirfoilProvider, useAirfoil } from "../state/airfoilStore.jsx";

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
  const cmds = [`M ${x0} ${-y0}`];
  for (let i = 1; i < pts.length; i++) {
    const [x, y] = pts[i];
    cmds.push(`L ${x} ${-y}`);
  }
  cmds.push("Z");
  return cmds.join(" ");
}

export default function Design2D() {
  const { state } = useAirfoil();
  const { chord, t, m, p, angleDeg, thicknessPct, camberPct, camberPosPct } =
    state;

  const tFrac = typeof t === "number" ? t : (thicknessPct ?? 12) / 100;
  const mFrac = typeof m === "number" ? m : (camberPct ?? 2) / 100;
  const pFrac = typeof p === "number" ? p : (camberPosPct ?? 40) / 100;

  const pts = useMemo(
    () =>
      naca4({
        m: mFrac,
        p: pFrac,
        t: tFrac,
        c: chord,
        n: 300,
        alpha: angleDeg,
      }),
    [mFrac, pFrac, tFrac, chord, angleDeg]
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

  return (
    <div className="af-panel" style={{ maxWidth: 1000 }}>
      <h2 className="af-title">Airfoil (2D)</h2>
      <svg
        viewBox={`${bbox.minx - 0.1} ${-(bbox.maxy + 0.1)} ${bbox.w + 0.2} ${bbox.h + 0.2}`}
        width="100%"
        height="520"
      >
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
        />
        <line
          x1={pFrac * chord}
          y1={-(bbox.maxy + 0.1)}
          x2={pFrac * chord}
          y2={-(bbox.miny - 0.1)}
        />
      </svg>
    </div>
  );
}
