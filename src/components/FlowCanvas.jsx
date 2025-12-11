// src/foilsim/FlowCanvas.jsx
import React, { useRef, useEffect, useState } from "react";
import { useFoilSim } from "../store/FoilSimContext";

// Timer function used to call the redraw function
// Redraw is dependant on the velocity input
function timer() {
  var timer = 100 - int((0.227 * velocity) / 0.6818);
  var myVar = setTimeout(redraw, timer);
}

// Helper: draw a polygon (replacement for old p5 polygon())
function drawPolygon(ctx, x, y, radius, npoints) {
  const TWO_PI = Math.PI * 2;
  const angleStep = TWO_PI / npoints;

  ctx.beginPath();
  for (let a = 0; a <= TWO_PI + 1e-6; a += angleStep) {
    const sx = x + Math.cos(a) * radius;
    const sy = y + Math.sin(a) * radius;
    if (a === 0) {
      ctx.moveTo(sx, sy);
    } else {
      ctx.lineTo(sx, sy);
    }
  }
  ctx.closePath();
  ctx.stroke();
}

export default function FlowCanvas() {
  const canvasRef = useRef(null);
  const { outputs } = useFoilSim(); // adjust if your context shape is different

  // 🕒 frame counter used like "redraw" driver
  const [frame, setFrame] = useState(0);

  // 🕒 React-ified version of the old timer()
  useEffect(() => {
    if (!outputs) return;

    const velocity = outputs.velocity ?? 0; // mph-equivalent, like legacy
    if (velocity <= 0) return; // no animation if no flow

    // legacy: timer = 100 - int((0.227 * velocity) / 0.6818);
    let delay = 100 - Math.floor((0.227 * velocity) / 0.6818);

    // keep it sane
    if (!Number.isFinite(delay)) return;
    if (delay < 10) delay = 10;
    if (delay > 1000) delay = 1000;

    const id = setTimeout(() => {
      setFrame((f) => f + 1); // triggers a redraw via the draw effect
    }, delay);

    return () => clearTimeout(id);
  }, [outputs?.velocity, frame]); // depend on velocity + frame (like chained timer)

  // Drawing effect – runs on outputs change AND each "frame"
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // clear
    ctx.clearRect(0, 0, width, height);

    const flowField = outputs?.flowField;
    const bodyPoints = flowField?.bodyPoints ?? [];
    const streamlines = flowField?.streamlines ?? [];

    if (!bodyPoints.length && !streamlines.length) {
      // "No flow data" label
      ctx.fillStyle = "#888";
      ctx.font = "14px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("No flow data", width / 2, height / 2);
      return;
    }

    // ---------- compute bounds & scale ----------
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;

    const allPoints = [...bodyPoints, ...streamlines.flat()];

    allPoints.forEach((p) => {
      if (!p) return;
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    });

    if (!isFinite(minX) || !isFinite(maxX)) return;

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

    // ---------- draw background ----------
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, width, height);

    // ---------- draw streamlines ----------
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(255, 255, 0, 0.7)";

    streamlines.forEach((line) => {
      if (!line.length) return;
      ctx.beginPath();
      line.forEach((p, idx) => {
        const mp = mapPoint(p);
        if (idx === 0) ctx.moveTo(mp.x, mp.y);
        else ctx.lineTo(mp.x, mp.y);
      });
      ctx.stroke();
    });

    // ---------- draw airfoil/body ----------
    if (bodyPoints.length) {
      ctx.strokeStyle = "cyan";
      ctx.lineWidth = 2;
      ctx.beginPath();
      bodyPoints.forEach((p, idx) => {
        const mp = mapPoint(p);
        if (idx === 0) ctx.moveTo(mp.x, mp.y);
        else ctx.lineTo(mp.x, mp.y);
      });
      ctx.closePath();
      ctx.stroke();
    }

    // Optional: draw something using drawPolygon()
    // const centerMapped = mapPoint({ x: 0, y: 0 });
    // ctx.strokeStyle = "red";
    // drawPolygon(ctx, centerMapped.x, centerMapped.y, 5, 20);
  }, [outputs, frame]); // 🕒 depend on frame so timer drives new draws

  return (
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
  );
}
