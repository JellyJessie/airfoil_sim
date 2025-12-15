function fmtFixed(v, n) {
  return Number.isFinite(v) ? v.toFixed(n) : "—";
}
function fmtInt(v) {
  return Number.isFinite(v) ? v.toFixed(0) : "—";
}

/**
 * xm/ym in legacy NASA code are often 2D like xm[0][i].
 * This helper supports BOTH:
 *  - 2D: arr[0][i]
 *  - 1D: arr[i]
 */
function getCoord(arr, i) {
  if (!arr) return undefined;
  if (Array.isArray(arr[0])) return arr[0]?.[i];
  return arr?.[i];
}

function GeometryPanel({ state }) {
  const npt2 = 19;

  // Legacy mapfact logic
  const mapfact = state.shapeSelect < 4 ? 4.0 : 2.0;

  const xm = state.xm ?? [];
  const ym = state.ym ?? []; // IMPORTANT: you need ym in state for geometry
  const plp = state.plp ?? [];
  const plv = state.plv ?? [];

  const upperIdx = Array.from({ length: 19 }, (_, k) => npt2 - k); // 19..1
  const lowerIdx = Array.from({ length: 19 }, (_, k) => npt2 + k); // 19..37

  const makeRows = (indices) =>
    indices.map((i) => {
      const x = getCoord(xm, i);
      const y = getCoord(ym, i);
      const p = plp[i];
      const v = plv[i];

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
export default GeometryPanel;
