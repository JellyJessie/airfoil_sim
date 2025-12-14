import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

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

function naca4({ m, p, t, c = 1, n = 200 }) {
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

  const upper = [],
    lower = [];
  for (let i = 0; i <= n; i++) {
    const theta = Math.atan(dyc[i] || 0);
    const xu = x[i] - yt[i] * Math.sin(theta);
    const yu = yc[i] + yt[i] * Math.cos(theta);
    const xl = x[i] + yt[i] * Math.sin(theta);
    const yl = yc[i] - yt[i] * Math.cos(theta);
    upper.push([xu, yu]);
    lower.push([xl, yl]);
  }
  return [...upper, ...lower.reverse()];
}

function buildWingGeometry({
  pts2d,
  span = 2,
  sections = 24,
  taper = 1,
  twistTipDeg = 0,
}) {
  const geom = new THREE.BufferGeometry();
  const halfSpan = span / 2;
  const secYs = new Array(sections)
    .fill(0)
    .map((_, i) => (i / (sections - 1)) * halfSpan);
  const verts = [],
    uvs = [],
    idx = [];
  const n = pts2d.length;
  const rootChord = 1.0;
  const pivotFrac = 0.25;

  const secPts = secYs.map((y, si) => {
    const frac = si / (sections - 1);
    const chord = rootChord * (1 - (1 - taper) * frac);
    const twist = deg2rad(twistTipDeg * frac);
    const pivot = [pivotFrac * chord, 0];
    return pts2d.map(([x, y2]) => {
      const xs = x * chord;
      const ys = y2 * chord;
      const [xr, yr] = twist !== 0 ? rotate([xs, ys], twist, pivot) : [xs, ys];
      return [xr, yr, y];
    });
  });

  secPts.forEach((sec, si) => {
    sec.forEach(([x, y, z]) => {
      verts.push(x, y, z);
      uvs.push(si / (sections - 1), 0);
    });
  });

  for (let si = 0; si < sections - 1; si++) {
    const baseA = si * n;
    const baseB = (si + 1) * n;
    for (let j = 0; j < n - 1; j++) {
      const a = baseA + j;
      const b = baseB + j;
      const c = baseB + j + 1;
      const d = baseA + j + 1;
      idx.push(a, b, c, a, c, d);
    }
  }

  geom.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(verts), 3)
  );
  geom.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(uvs), 2));
  geom.setIndex(idx);
  geom.computeVertexNormals();
  return geom;
}

export default function Design3D() {
  const mountRef = useRef(null);

  const [chord, setChord] = useState(1.0);
  const [t, setT] = useState(0.12);
  const [m, setM] = useState(0.02);
  const [p, setP] = useState(0.4);
  const [span, setSpan] = useState(2.0);
  const [taper, setTaper] = useState(1);
  const [twist, setTwist] = useState(0);
  //  const [taper, setTaper] = useState(0.6);
  //  const [twist, setTwist] = useState(5);

  const base2d = useMemo(() => naca4({ m, p, t, c: 1, n: 300 }), [m, p, t]);
  const scaled2d = useMemo(
    () => base2d.map(([x, y]) => [x * chord, y * chord]),
    [base2d, chord]
  );
  const geom = useMemo(
    () =>
      buildWingGeometry({
        pts2d: scaled2d,
        span,
        sections: 28,
        taper,
        twistTipDeg: twist,
      }),
    [scaled2d, span, taper, twist]
  );

  useEffect(() => {
    const mount = mountRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f7fb);
    const camera = new THREE.PerspectiveCamera(
      50,
      mount.clientWidth / mount.clientHeight,
      0.01,
      1000
    );
    camera.position.set(2.8, 1.3, 3.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    const grid = new THREE.GridHelper(10, 20, 0x999999, 0xdddddd);
    scene.add(grid);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
    scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(3, 5, 2);
    scene.add(dir);

    const material = new THREE.MeshStandardMaterial({
      color: 0x9db1ff,
      metalness: 0.1,
      roughness: 0.5,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geom, material);
    scene.add(mesh);

    const onResize = () => {
      const w = mount.clientWidth,
        h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const obs = new ResizeObserver(onResize);
    obs.observe(mount);

    let raf;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      controls.update();
      renderer.render(scene, camera);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      obs.disconnect();
      mount.removeChild(renderer.domElement);
      renderer.dispose();
      geom.dispose();
    };
  }, [geom]);

  return (
    <div className="af-panel" style={{ maxWidth: 1000 }}>
      <h2 className="af-title">3D View</h2>
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
          </div>
          <div className="af-field">
            <label>Max camber (m)</label>
            <input
              type="number"
              step="0.005"
              value={m}
              onChange={(e) => setM(parseFloat(e.target.value || "0"))}
            />
          </div>
          <div className="af-field">
            <label>Camber position (p)</label>
            <input
              type="number"
              step="0.05"
              value={p}
              onChange={(e) => setP(parseFloat(e.target.value || "0"))}
            />
          </div>
          <div className="af-field">
            <label>Span (m)</label>
            <input
              type="number"
              step="0.1"
              value={span}
              onChange={(e) => setSpan(parseFloat(e.target.value || "0"))}
            />
          </div>
          <p className="af-note">Orbit with mouse drag • Zoom with wheel</p>
        </div>
        <div
          ref={mountRef}
          style={{
            width: "100%",
            height: "520px",
            border: "1px solid #ddd",
            borderRadius: "12px",
            overflow: "hidden",
          }}
        />
      </div>
    </div>
  );
}

/*

          <div className="af-field">
            <label>Taper ratio</label>
            <input
              type="number"
              step="0.05"
              value={taper}
              onChange={(e) => setTaper(parseFloat(e.target.value || "0"))}
            />
          </div>
          <div className="af-field">
            <label>Tip twist (°)</label>
            <input
              type="number"
              step="0.5"
              value={twist}
              onChange={(e) => setTwist(parseFloat(e.target.value || "0"))}
            />
          </div>
*/
