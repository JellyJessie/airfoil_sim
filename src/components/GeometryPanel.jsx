// src/foilsim/GeometryPanel.jsx
import React from "react";
import { useFoilSim } from "../store/FoilSimContext";

function fmtFixed(v, n) {
  return Number.isFinite(v) ? v.toFixed(n) : "—";
}
function fmtInt(v) {
  return Number.isFinite(v) ? v.toFixed(0) : "—";
}

/**
 * Supports BOTH:
 *  - 2D arrays: arr[0][i]
 *  - 1D arrays: arr[i]
 */
function getCoord(arr, i) {
  if (!arr) return undefined;
  if (Array.isArray(arr[0])) return arr[0]?.[i];
  return arr?.[i];
}

export default function GeometryPanel() {
  const { state, outputs } = useFoilSim();

  // If computeOutputs hasn’t produced these yet, show a friendly hint
  const xm = outputs?.xm ?? [];
  const ym = outputs?.ym ?? [];
  const plp = outputs?.plp ?? []; // pressure (or Cp/converted P depending on computeOutputs)
  const plv = outputs?.plv ?? []; // velocity (or V/V∞ depending on computeOutputs)

  // Legacy FoilSim indexing constants
  const nptc = 37;
  const npt2 = Math.floor(nptc / 2) + 1; // 19

  // Legacy mapfact logic (FoilSim uses different scaling for cylinder/ball)
  const mapfact = (state?.shapeSelect ?? 1) < 4 ? 4.0 : 2.0;

  // Indices that avoid “connecting” across the trailing edge.
  // (This also helps avoid the visual “straight line through the airfoil” problem.)
  // const upperIdx = Array.from({ length: 19 }, (_, k) => npt2 - k + 1); // 20..2
  // const lowerIdx = Array.from({ length: 19 }, (_, k) => npt2 + k - 1); // 18..36
  const upperIdx = Array.from({ length: 19 }, (_, k) => 19 + k); // 19, 20...37
  const lowerIdx = Array.from({ length: 19 }, (_, k) => 19 - k); // 19, 18...1
  const makeRows = (indices) =>
    indices.map((i) => {
      const x = getCoord(xm, i);
      const y = getCoord(ym, i);
      const p = plp?.[i];
      const v = plv?.[i];

      return {
        i,
        xOverC: Number.isFinite(x) ? x / mapfact : undefined,
        yOverC: Number.isFinite(y) ? y / mapfact : undefined,
        p,
        v,
      };
    });

  const upperRows = makeRows(upperIdx);
  const lowerRows = makeRows(lowerIdx);

  const hasPV =
    upperRows.some((r) => Number.isFinite(r.p) || Number.isFinite(r.v)) ||
    lowerRows.some((r) => Number.isFinite(r.p) || Number.isFinite(r.v));

  if (!xm?.length || !ym?.length) {
    return (
      <div style={{ padding: 12, color: "#888" }}>
        No geometry data yet. Make sure computeOutputs returns outputs.xm /
        outputs.ym.
      </div>
    );
  }

  if (!hasPV) {
    return (
      <div style={{ padding: 12, color: "#888" }}>
        Geometry loaded, but P/V are missing.
        <br />
        Make sure computeOutputs returns outputs.plp and outputs.plv (arrays
        indexed 1..37).
      </div>
    );
  }

  return (
    <div style={{ padding: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Upper Surface</div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left" }}>X/C</th>
            <th style={{ textAlign: "left" }}>Y/C</th>
            <th style={{ textAlign: "left" }}>P</th>
            <th style={{ textAlign: "left" }}>V</th>
          </tr>
        </thead>
        <tbody>
          {upperRows.map((r) => (
            <tr key={`u-${r.i}`}>
              <td>{fmtFixed(r.xOverC, 3)}</td>
              <td>{fmtFixed(r.yOverC, 3)}</td>
              <td>{fmtFixed(r.p, 3)}</td>
              <td>{fmtInt(r.v)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ height: 16 }} />

      <div style={{ fontWeight: 700, marginBottom: 8 }}>Lower Surface</div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left" }}>X/C</th>
            <th style={{ textAlign: "left" }}>Y/C</th>
            <th style={{ textAlign: "left" }}>P</th>
            <th style={{ textAlign: "left" }}>V</th>
          </tr>
        </thead>
        <tbody>
          {lowerRows.map((r) => (
            <tr key={`l-${r.i}`}>
              <td>{fmtFixed(r.xOverC, 3)}</td>
              <td>{fmtFixed(r.yOverC, 3)}</td>
              <td>{fmtFixed(r.p, 3)}</td>
              <td>{fmtInt(r.v)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
