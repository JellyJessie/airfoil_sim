// src/foilsim/FlowCanvas.jsx
import React, { useRef, useEffect, useMemo, useState } from "react";
import { useFoilSim } from "../store/FoilSimContext";

export default function FlowCanvas() {
  const canvasRef = useRef(null);
  const { outputs } = useFoilSim();
  const [zoom, setZoom] = useState(1.0);
  const [frame, setFrame] = useState(0);
  const [displayMode, setDisplayMode] = useState("streamlines");

  // 1. Extract Streamlines and BodyPoints
  const streamlines = useMemo(
    () => outputs?.streamlines ?? outputs?.flowField?.streamlines ?? [],
    [outputs]
  );

  const bodyPoints = useMemo(() => {
    if (outputs?.airfoilLoop && outputs.airfoilLoop.length > 0)
      return outputs.airfoilLoop;
    return [];
  }, [outputs]);

  // 2. Animation Logic
  useEffect(() => {
    if (!outputs || displayMode === "freeze") return;
    const velocity = outputs.velocity ?? 0;
    if (velocity <= 0) return;
    let delay = Math.max(
      10,
      Math.min(1000, 100 - Math.floor((0.227 * velocity) / 0.6818))
    );
    const id = setTimeout(() => setFrame((f) => f + 1), delay);
    return () => clearTimeout(id);
  }, [outputs, frame, displayMode]);

  // 3. Drawing Logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const { width, height } = canvas;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, width, height);

    if (!bodyPoints.length) return;

    // Helper to track boundaries
    let b = {
      minX: Infinity,
      maxX: -Infinity,
      minY: Infinity,
      maxY: -Infinity,
    };
    const addPoint = (p) => {
      if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return;
      if (p.x < b.minX) b.minX = p.x;
      if (p.x > b.maxX) b.maxX = p.x;
      if (p.y < b.minY) b.minY = p.y;
      if (p.y > b.maxY) b.maxY = p.y;
    };

    bodyPoints.forEach(addPoint);
    streamlines.forEach((line) => {
      if (line.length > 0) {
        addPoint(line[0]);
        addPoint(line[line.length - 1]);
      }
    });

    // Expand bounds for padding
    const minX = b.minX - 1.2;
    const maxX = b.maxX + 1.2;
    const minY = b.minY - 0.9;
    const maxY = b.maxY + 0.9;

    const spanX = maxX - minX || 1;
    const spanY = maxY - minY || 1;
    const scale = Math.min((width - 40) / spanX, (height - 40) / spanY);

    const mapPoint = (p) => ({
      x: width / 2 + (p.x - (minX + maxX) / 2) * scale * zoom,
      y: height / 2 - (p.y - (minY + maxY) / 2) * scale * zoom,
    });

    // Draw Airfoil
    ctx.strokeStyle = "cyan";
    ctx.lineWidth = 2;
    ctx.beginPath();
    bodyPoints.forEach((p, i) => {
      const mp = mapPoint(p);
      if (i === 0) ctx.moveTo(mp.x, mp.y);
      else ctx.lineTo(mp.x, mp.y);
    });
    ctx.closePath();
    ctx.stroke();

    // Draw Streamlines
    ctx.lineWidth = 1;
    ctx.strokeStyle =
      displayMode === "streamlines"
        ? "rgba(255, 255, 0, 0.7)"
        : "rgba(255, 255, 0, 0.2)";
    streamlines.forEach((line) => {
      ctx.beginPath();
      line.forEach((p, i) => {
        const mp = mapPoint(p);
        if (i === 0) ctx.moveTo(mp.x, mp.y);
        else ctx.lineTo(mp.x, mp.y);
      });
      ctx.stroke();
    });
  }, [bodyPoints, streamlines, frame, displayMode, zoom]);

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={() => setDisplayMode("streamlines")}>
          Streamlines
        </button>
        <button onClick={() => setDisplayMode("moving")}>Moving</button>
        <button onClick={() => setDisplayMode("freeze")}>Freeze</button>
        <input
          type="range"
          min="0.5"
          max="3"
          step="0.1"
          value={zoom}
          onChange={(e) => setZoom(parseFloat(e.target.value))}
        />
      </div>
      <canvas
        ref={canvasRef}
        width={520}
        height={360}
        style={{ background: "black", width: "100%" }}
      />
    </div>
  );
}
