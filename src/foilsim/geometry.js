export function deg2rad(d) {
  return (d * Math.PI) / 180;
}
export function rotate([x, y], a, pivot = [0, 0]) {
  const s = Math.sin(a),
    c = Math.cos(a);
  const xr = x - pivot[0],
    yr = y - pivot[1];
  return [xr * c - yr * s + pivot[0], xr * s + yr * c + pivot[1]];
}

export function naca4({ m, p, t, c = 1, n = 200, alpha = 0 }) {
  const x = Array.from({ length: n + 1 }, (_, i) => (c * i) / n);
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
    return xc < p
      ? (m * c * (2 * p * xc - xc * xc)) / (p * p)
      : (m * c * (1 - 2 * p + 2 * p * xc - xc * xc)) / ((1 - p) * (1 - p));
  });
  const dyc = x.map((xi) => {
    const xc = xi / c;
    if (p <= 0) return 0;
    return xc < p
      ? (2 * m * (p - xc)) / (p * p)
      : (2 * m * (p - xc)) / ((1 - p) * (1 - p));
  });

  const a = deg2rad(alpha);
  const pivot = [0.25 * c, 0];
  const upper = [],
    lower = [];
  for (let i = 0; i <= n; i++) {
    const th = Math.atan(dyc[i] || 0);
    const xu = x[i] - yt[i] * Math.sin(th);
    const yu = yc[i] + yt[i] * Math.cos(th);
    const xl = x[i] + yt[i] * Math.sin(th);
    const yl = yc[i] - yt[i] * Math.cos(th);
    upper.push(rotate([xu, yu], a, pivot));
    lower.push(rotate([xl, yl], a, pivot));
  }
  return [...upper, ...lower.reverse()];
}

export function asPath(pts) {
  if (!pts.length) return "";
  const [x0, y0] = pts[0];
  let d = `M ${x0} ${-y0}`;
  for (let i = 1; i < pts.length; i++) {
    const [x, y] = pts[i];
    d += ` L ${x} ${-y}`;
  }
  return d + " Z";
}
