// src/design/Design3D.jsx
import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

// ---- helpers (unchanged from your file) ----
const deg2rad = (d) => (d * Math.PI) / 180;

function rotate([x, y], ang, [cx, cy]) {
  const s = Math.sin(ang);
  const c = Math.cos(ang);
  const dx = x - cx;
  const dy = y - cy;
  return [cx + dx * c - dy * s, cy + dx * s + dy * c];
}

function naca4({ m, p, t, c = 1, n = 200 }) {
  const x = new Array(n + 1).fill(0).map((_, i) => {
    const beta = (Math.PI * i) / n;
    return (c / 2) * (1 - Math.cos(beta));
  });

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

  const yc = x.map((xi) => {
    const xc = xi / c;
    if (p <= 0) return 0;
    if (xc < p) return ((m * (2 * p * xc - xc * xc)) / (p * p)) * c;
    return ((m * (1 - 2 * p + 2 * p * xc - xc * xc)) / ((1 - p) * (1 - p))) * c;
  });

  const dyc = x.map((xi) => {
    const xc = xi / c;
    if (p <= 0) return 0;
    if (xc < p) return (2 * m * (p - xc)) / (p * p);
    return (2 * m * (p - xc)) / ((1 - p) * (1 - p));
  });

  const upper = [];
  const lower = [];
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
  rootChord = 1,

  sections = 24,
  taper = 1,
  twistTipDeg = 0,
}) {
  const geom = new THREE.BufferGeometry();
  const halfSpan = span / 2;

  const secYs = new Array(sections)
    .fill(0)
    .map((_, i) => (i / (sections - 1)) * halfSpan);

  const verts = [];
  const uvs = [];
  const idx = [];

  const n = pts2d.length;
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

// ------------------------------------------------------------------

export default function Design3D({
  angleDeg = 0,

  // Geometry inputs (accept either fraction inputs OR % inputs)
  chord = 1.0,
  span = 2.0,
  taper = 1,
  twist = 0,

  // If you already pass these as fractions (0.12 = 12%), they still work.
  t,
  m,
  p,

  // New, UI-friendly percent inputs (optional):
  thicknessPct = 12.0, // e.g. 12.0 => 12%
  camberPct = 2.0, // e.g. 2.0  => 2% max camber
  camberPosPct = 40.0, // e.g. 40.0 => max camber at 40% chord

  height = 520,
}) {
  const mountRef = useRef(null);

  // Normalize inputs:
  // - t/m/p are the classic NACA4 fractions (t=0.12, m=0.02, p=0.4)
  // - thicknessPct/camberPct/camberPosPct are % inputs (12, 2, 40)
  const tFrac = typeof t === "number" ? t : (thicknessPct ?? 12) / 100;
  const mFrac = typeof m === "number" ? m : (camberPct ?? 2) / 100;
  const pFrac = typeof p === "number" ? p : (camberPosPct ?? 40) / 100;

  // ✅ NEW: store latest AoA without recreating the scene
  const angleRef = useRef(angleDeg);
  useEffect(() => {
    angleRef.current = angleDeg;
  }, [angleDeg]);

  const base2d = useMemo(
    () => naca4({ m: mFrac, p: pFrac, t: tFrac, c: 1, n: 300 }),
    [mFrac, pFrac, tFrac]
  );

  const geom = useMemo(
    () =>
      buildWingGeometry({
        pts2d: base2d,
        rootChord: chord,
        span,
        sections: 28,
        taper,
        twistTipDeg: twist,
      }),
    // Rebuild 3D wing only when underlying 2D section or sizing params change
    [base2d, chord, span, taper, twist]
  );

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f7fb);

    const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 1000);
    camera.position.set(2.8, 1.3, 3.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    // Make canvas NOT affect layout (prevents ResizeObserver feedback loops)
    const canvas = renderer.domElement;
    canvas.style.position = "absolute";
    canvas.style.inset = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";

    // Ensure the mount is the sizing box
    mount.style.position = "relative";

    const controls = new OrbitControls(camera, canvas);
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

    const resize = () => {
      const { width, height } = mount.getBoundingClientRect();
      if (!width || !height) return;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      // CRITICAL: updateStyle=false so canvas style doesn't change => no loop
      renderer.setSize(width, height, false);
    };

    const obs = new ResizeObserver(resize);

    // Attach only after DOM is ready
    mount.appendChild(canvas);
    resize();
    obs.observe(mount);

    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);

      // ✅ NEW: AoA “pitch” in XY plane = rotate about Z axis
      // Use + or - depending on your sign convention
      mesh.rotation.z = deg2rad(angleRef.current);

      controls.update();
      renderer.render(scene, camera);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      obs.disconnect();
      controls.dispose();
      scene.remove(mesh);
      material.dispose();
      renderer.dispose();
      geom.dispose();
      if (canvas.parentNode === mount) mount.removeChild(canvas);
    };
  }, [geom]);

  // ✅ graph-only output (no title, no inputs)
  return (
    <div
      ref={mountRef}
      style={{
        width: "100%",
        height: `${height}px`,
        border: "1px solid #ddd",
        borderRadius: "12px",
        overflow: "hidden",
      }}
    />
  );
}
