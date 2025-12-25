// src/foilsim/FlowCanvas.jsx
import React, { useRef, useEffect, useMemo, useState } from "react";
import { useFoilSim } from "../store/FoilSimContext";

function rotatePoint(p, deg) {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { x: p.x * c - p.y * s, y: p.x * s + p.y * c };
}

function rotatePolyline(points, deg) {
  return points.map((p) => rotatePoint(p, deg));
}

export default function FlowCanvas() {
  const canvasRef = useRef(null);
  const { outputs } = useFoilSim();

  const [frame, setFrame] = useState(0);
  const [displayMode, setDisplayMode] = useState("streamlines");
  // "streamlines" | "moving" | "freeze"

  // ----------------------------
  // Animation driver (like old timer/redraw)
  // ----------------------------
  useEffect(() => {
    if (!outputs) return;
    if (displayMode === "freeze") return;

    const velocity = outputs.velocity ?? 0;
    if (velocity <= 0) return;

    // legacy-ish: timer = 100 - int((0.227 * velocity) / 0.6818)
    let delay = 100 - Math.floor((0.227 * velocity) / 0.6818);
    if (!Number.isFinite(delay)) return;
    delay = Math.max(10, Math.min(1000, delay));

    const id = setTimeout(() => setFrame((f) => f + 1), delay);
    return () => clearTimeout(id);
  }, [outputs?.velocity, frame, displayMode, outputs]);

  // ----------------------------
  // Pull flow data
  // ----------------------------
  const flowField = outputs?.flowField;
  const alphaDeg = outputs?.angleDeg ?? outputs?.alphaDeg ?? 0;

  // Visualization model:
  // - Streamlines are drawn unrotated (fixed flow direction)
  // - Airfoil rotates with AoA
  const streamlines = flowField?.streamlines ?? [];
  // Prefer NASA-style airfoil surface geometry from computeOutputs (much cleaner)
  const xm = outputs?.xm?.[0] ?? []; // one row is fine for drawing outline
  const ym = outputs?.ym?.[0] ?? [];

  let bodyPoints = [];
  if (xm.length && ym.length && xm.length === ym.length) {
    bodyPoints = xm.map((x, i) => ({ x, y: ym[i] }));
  } else {
    const bodyPoints0 = flowField?.bodyPoints ?? [];
    bodyPoints = alphaDeg ? rotatePolyline(bodyPoints0, alphaDeg) : bodyPoints0;
  }
  /*
  const prebodyPoints = (outputs?.airfoilLoop || []).filter(
    (p) => Number.isFinite(p.x) && Number.isFinite(p.y)
  );
  const bodyPoints = alphaDeg
    ? rotatePolyline(prebodyPoints, alphaDeg)
    : prebodyPoints;
  */
  // Compute bounds for scaling
  let minX = -2.0, // Hardcode or center on the airfoil
    maxX = 2.0,
    minY = -1.5,
    maxY = 1.5;

  // If you want it to be dynamic but tight:
  if (bodyPoints.length > 0) {
    const bMinX = Math.min(...bodyPoints.map((p) => p.x));
    const bMaxX = Math.max(...bodyPoints.map((p) => p.x));
    // Add a small margin around the airfoil instead of using all streamlines
    minX = bMinX - 1.0;
    maxX = bMaxX + 1.0;
    minY = -1.0;
    maxY = 1.0;
  }
  // ----------------------------
  // Draw effect
  // ----------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear and background
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, width, height);

    if (!bodyPoints.length && !streamlines.length) {
      ctx.fillStyle = "#888";
      ctx.font = "14px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("No flow data", width / 2, height / 2);
      return;
    }

    // Compute bounds for scaling
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    const allPoints = [
      ...bodyPoints,
      ...bodyPoints,
      ...bodyPoints, // triple-weight airfoil in bounds
      ...streamlines.flat().filter(Boolean),
    ];

    for (const p of allPoints) {
      if (!p) continue;
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }

    if (!Number.isFinite(minX) || !Number.isFinite(maxX)) return;

    const padding = 20;
    const spanX = maxX - minX || 1;
    const spanY = maxY - minY || 1;

    const scaleX = (width - 2 * padding) / spanX;
    const scaleY = (height - 2 * padding) / spanY;
    const scale = Math.min(scaleX, scaleY);

    const cx = width / 2;
    const cy = height / 2;

    const mapPoint = (p) => ({
      x: cx + (p.x - (minX + maxX) / 2) * scale,
      y: cy - (p.y - (minY + maxY) / 2) * scale,
    });

    // ---- helpers ----
    const drawPolyline = (line) => {
      if (!line?.length) return;
      ctx.beginPath();
      for (let i = 0; i < line.length; i++) {
        const mp = mapPoint(line[i]);
        if (i === 0) ctx.moveTo(mp.x, mp.y);
        else ctx.lineTo(mp.x, mp.y);
      }
      ctx.stroke();
    };

    // Classic FoilSim-style moving dashes along a streamline polyline (fast)
    const drawMovingDashes = (line) => {
      if (!line?.length) return;

      // ---- tune these ----
      const sampleStep = 3; // fewer points = faster
      const dashLen = 6; // px
      const gapLen = 10; // px
      const speed = 2.0; // px/frame
      // --------------------

      // Map streamline to screen once (so dash lengths are in pixels)
      const pts = [];
      for (let i = 0; i < line.length; i += sampleStep) {
        pts.push(mapPoint(line[i]));
      }
      if (pts.length < 2) return;

      // Cumulative arc length
      const s = [0];
      let total = 0;
      for (let i = 1; i < pts.length; i++) {
        total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
        s.push(total);
      }
      if (total <= 1e-6) return;

      const period = dashLen + gapLen;
      const offset = (-frame * speed) % period;

      ctx.strokeStyle = "red";
      ctx.lineWidth = 2; // was 2
      ctx.lineCap = "round";

      for (let start = -offset; start < total; start += period) {
        const end = start + dashLen;
        if (end <= 0) continue;
        if (start >= total) break;

        const a0 = Math.max(0, start);
        const a1 = Math.min(total, end);

        ctx.beginPath();
        let started = false;

        for (let i = 1; i < pts.length; i++) {
          const s0 = s[i - 1];
          const s1 = s[i];
          if (s1 < a0) continue;
          if (s0 > a1) break;

          // enter
          if (!started) {
            const t = (a0 - s0) / (s1 - s0 || 1);
            const x = pts[i - 1].x + t * (pts[i].x - pts[i - 1].x);
            const y = pts[i - 1].y + t * (pts[i].y - pts[i - 1].y);
            ctx.moveTo(x, y);
            started = true;
          }

          // exit
          if (s1 >= a1) {
            const t = (a1 - s0) / (s1 - s0 || 1);
            const x = pts[i - 1].x + t * (pts[i].x - pts[i - 1].x);
            const y = pts[i - 1].y + t * (pts[i].y - pts[i - 1].y);
            ctx.lineTo(x, y);
            break;
          } else {
            ctx.lineTo(pts[i].x, pts[i].y);
          }
        }

        if (started) ctx.stroke();
      }
    };

    // ----------------------------
    // Draw streamlines / dashes
    // ----------------------------
    if (displayMode === "streamlines") {
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(255, 255, 0, 0.7)";
      for (const line of streamlines) drawPolyline(line);
    } else {
      // moving or freeze: faint base lines + moving dashes
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(255, 255, 0, 0.35)";
      for (const line of streamlines) drawPolyline(line);

      for (const line of streamlines) drawMovingDashes(line);
    }

    // ----------------------------
    // Draw airfoil/body
    // ----------------------------
    if (bodyPoints.length) {
      ctx.strokeStyle = "cyan";
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < bodyPoints.length; i++) {
        const mp = mapPoint(bodyPoints[i]);
        if (i === 0) ctx.moveTo(mp.x, mp.y);
        else ctx.lineTo(mp.x, mp.y);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }, [bodyPoints, streamlines, frame, displayMode]);

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={() => setDisplayMode("streamlines")}>
          Streamlines
        </button>
        <button onClick={() => setDisplayMode("moving")}>Moving</button>
        <button onClick={() => setDisplayMode("freeze")}>Freeze</button>

        <span style={{ opacity: 0.8, alignSelf: "center" }}>
          Mode: <strong>{displayMode}</strong>
        </span>
      </div>

      <canvas
        ref={canvasRef}
        width={320}
        height={240}
        style={{
          width: "100%",
          maxWidth: 400,
          border: "1px solid #444",
          background: "black",
        }}
      />
    </div>
  );
}
