// src/foilsim/FlowCanvas.jsx
import React, { useRef, useEffect, useMemo, useState } from "react";
import { useFoilSim } from "../store/FoilSimContext";

// Build a closed airfoil loop from FoilSim-style arrays xm/ym (index 0 unused).
// nptc=37 => indices 1..36 valid, npt2=19.
function buildAirfoilLoopFromXmYm(xm, ym, nptc = 37) {
  const npt2 = Math.floor(nptc / 2) + 1; // 19
  const pts = [];

  // Upper surface: LE -> TE (19 → 1)
  for (let i = npt2; i >= 1; i--) {
    const x = xm[i];
    const y = ym[i];
    if (Number.isFinite(x) && Number.isFinite(y)) {
      pts.push({ x, y });
    }
  }

  // Lower surface: TE -> LE (20 → 36)
  // IMPORTANT: start at npt2 + 1 (20), NOT 19
  for (let i = npt2 + 1; i <= nptc - 1; i++) {
    const x = xm[i];
    const y = ym[i];
    if (Number.isFinite(x) && Number.isFinite(y)) {
      pts.push({ x, y });
    }
  }

  return pts;
}
function buildClosedLoopFromXmYm(xm, ym, nptc = 37) {
  const npt2 = Math.floor(nptc / 2) + 1; // 19

  const upper = [];
  for (let i = npt2; i >= 1; i--) upper.push({ x: xm[i], y: ym[i] }); // 19..1

  const lower = [];
  for (let i = npt2 + 1; i <= nptc; i++) lower.push({ x: xm[i], y: ym[i] }); // 20..37

  // upper already ends at TE; lower starts right after TE -> no duplicate
  return [...upper, ...lower];
}

export default function FlowCanvas() {
  const canvasRef = useRef(null);
  const { outputs } = useFoilSim();

  const [frame, setFrame] = useState(0);
  const [displayMode, setDisplayMode] = useState("streamlines"); // streamlines | moving | freeze

  // ----------------------------
  // Animation driver
  // ----------------------------
  useEffect(() => {
    if (!outputs) return;
    if (displayMode === "freeze") return;

    const velocity = outputs.velocity ?? 0;
    if (velocity <= 0) return;

    let delay = 100 - Math.floor((0.227 * velocity) / 0.6818);
    if (!Number.isFinite(delay)) return;
    delay = Math.max(10, Math.min(1000, delay));

    const id = setTimeout(() => setFrame((f) => f + 1), delay);
    return () => clearTimeout(id);
  }, [outputs, outputs?.velocity, frame, displayMode]);

  // ----------------------------
  // Pull flow + geometry
  // ----------------------------
  const streamlines = outputs?.flowField?.streamlines ?? [];

  // Prefer FoilSim xm/ym if present
  const xm0 = outputs?.xm?.[0] ?? [];
  const ym0 = outputs?.ym?.[0] ?? [];
  const bodyPoints = useMemo(() => {
    if (xm0.length >= 37 && ym0.length >= 37) {
      return buildClosedLoopFromXmYm(xm0, ym0, 37);
    }
    // fallback if you also provide packed loop elsewhere
    const loop = outputs?.airfoilLoop ?? outputs?.flowField?.bodyPoints ?? [];
    return (loop || []).filter(
      (p) => p && Number.isFinite(p.x) && Number.isFinite(p.y)
    );
  }, [xm0, ym0, outputs]);

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

    // background
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

    // ---- bounds: focus on airfoil, then include enough streamline margin ----
    // This avoids “streamlines too wide” making the airfoil tiny.
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;

    const addPoint = (p) => {
      if (!p) return;
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return;
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    };

    // 1) airfoil bounds first (tight)
    bodyPoints.forEach(addPoint);

    // 2) expand bounds a bit (so airfoil not clipped)
    if (Number.isFinite(minX) && Number.isFinite(maxX)) {
      const padX = 1.2; // tune: bigger => more space around airfoil
      const padY = 0.9;
      minX -= padX;
      maxX += padX;
      minY -= padY;
      maxY += padY;
    }

    // 3) optionally include streamlines, but cap their influence
    // (sample a few points so they don't dominate the scale)
    for (const line of streamlines) {
      if (!line?.length) continue;
      const step = Math.max(1, Math.floor(line.length / 12)); // ~12 samples
      for (let i = 0; i < line.length; i += step) addPoint(line[i]);
    }

    if (!Number.isFinite(minX) || !Number.isFinite(maxX)) return;

    const paddingPx = 18;
    const spanX = maxX - minX || 1;
    const spanY = maxY - minY || 1;

    const scaleX = (width - 2 * paddingPx) / spanX;
    const scaleY = (height - 2 * paddingPx) / spanY;
    const scale = Math.min(scaleX, scaleY);

    const cx = width / 2;
    const cy = height / 2;
    const mx = (minX + maxX) / 2;
    const my = (minY + maxY) / 2;

    const mapPoint = (p) => ({
      x: cx + (p.x - mx) * scale,
      y: cy - (p.y - my) * scale,
    });

    const drawPolyline = (line) => {
      if (!line?.length) return;
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < line.length; i++) {
        const p = line[i];
        if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
        const mp = mapPoint(p);
        if (!started) {
          ctx.moveTo(mp.x, mp.y);
          started = true;
        } else {
          ctx.lineTo(mp.x, mp.y);
        }
      }
      if (started) ctx.stroke();
    };

    // Moving dashes along streamline
    const drawMovingDashes = (line) => {
      if (!line?.length) return;

      const sampleStep = 3;
      const dashLen = 7;
      const gapLen = 10;
      const speed = 2.0;

      const pts = [];
      for (let i = 0; i < line.length; i += sampleStep) {
        const p = line[i];
        if (p && Number.isFinite(p.x) && Number.isFinite(p.y))
          pts.push(mapPoint(p));
      }
      if (pts.length < 2) return;

      const s = [0];
      let total = 0;
      for (let i = 1; i < pts.length; i++) {
        total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
        s.push(total);
      }
      if (total <= 1e-6) return;

      const period = dashLen + gapLen;

      // If your direction is “opposite”, flip the sign here:
      const offset = (+frame * speed) % period;

      ctx.strokeStyle = "red";
      ctx.lineWidth = 2;
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

          if (!started) {
            const t = (a0 - s0) / (s1 - s0 || 1);
            const x = pts[i - 1].x + t * (pts[i].x - pts[i - 1].x);
            const y = pts[i - 1].y + t * (pts[i].y - pts[i - 1].y);
            ctx.moveTo(x, y);
            started = true;
          }

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
    // Draw streamlines
    // ----------------------------
    if (displayMode === "streamlines") {
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(255, 255, 0, 0.70)";
      for (const line of streamlines) drawPolyline(line);
    } else {
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(255, 255, 0, 0.30)";
      for (const line of streamlines) drawPolyline(line);

      if (displayMode === "moving") {
        for (const line of streamlines) drawMovingDashes(line);
      }
      // freeze: just the faint base lines
    }

    // ----------------------------
    // Draw airfoil outline (no midline)
    // ----------------------------
    if (bodyPoints.length) {
      ctx.strokeStyle = "cyan";
      ctx.lineWidth = 2;
      ctx.beginPath();
      const p0 = mapPoint(bodyPoints[0]);
      ctx.moveTo(p0.x, p0.y);
      for (let i = 1; i < bodyPoints.length; i++) {
        const mp = mapPoint(bodyPoints[i]);
        ctx.lineTo(mp.x, mp.y);
      }
      ctx.closePath(); // closes at LE cleanly; no extra “chord line” segment
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
        width={520}
        height={360}
        style={{
          width: "100%",
          maxWidth: 820,
          border: "1px solid #444",
          background: "black",
        }}
      />
    </div>
  );
}
