// src/foilsim/FlowCanvas.jsx
import React, { useRef, useEffect, useMemo, useState } from "react";
import { useFoilSim } from "../store/FoilSimContext";

export default function FlowCanvas() {
  const canvasRef = useRef(null);
  const { outputs } = useFoilSim();

  const [zoom, setZoom] = useState(2.0);
  const [frame, setFrame] = useState(0);
  const [displayMode, setDisplayMode] = useState("moving"); // streamlines | moving | freeze

  // ----------------------------
  // Animation Driver
  // ----------------------------
  useEffect(() => {
    // Only update the frame (motion) if mode is 'moving'
    if (!outputs || displayMode !== "moving") return;

    const velocity = outputs.velocity ?? 0;
    if (velocity <= 0) return;

    let delay = 100 - Math.floor((0.227 * velocity) / 0.6818);
    delay = Math.max(10, Math.min(1000, delay));

    const id = setTimeout(() => setFrame((f) => f + 1), delay);
    return () => clearTimeout(id);
  }, [frame, displayMode, outputs?.velocity]);

  // ----------------------------
  // Data Extraction
  // ----------------------------
  const streamlines = useMemo(
    () => outputs?.streamlines ?? outputs?.flowField?.streamlines ?? [],
    [outputs]
  );

  const bodyPoints = useMemo(() => {
    // Prioritize the continuous loop skin to avoid the "middle line" artifact
    if (outputs?.airfoilLoop && outputs.airfoilLoop.length > 0) {
      return outputs.airfoilLoop;
    }
    // Fallback: Build from xm/ym arrays if necessary
    const xm = outputs?.xm?.[0] ?? [];
    const ym = outputs?.ym?.[0] ?? [];
    if (xm.length >= 37) {
      const pts = [];
      const npt2 = 19;
      for (let i = npt2; i >= 1; i--) pts.push({ x: xm[i], y: ym[i] });
      for (let i = npt2 + 1; i <= 36; i++) pts.push({ x: xm[i], y: ym[i] });
      return pts;
    }
    return [];
  }, [outputs]);

  // ----------------------------
  // Main Draw Effect
  // ----------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const { width, height } = canvas;

    // 1. Clear Background
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, width, height);

    if (!bodyPoints.length && !streamlines.length) {
      ctx.fillStyle = "#888";
      ctx.textAlign = "center";
      ctx.fillText("No flow data", width / 2, height / 2);
      return;
    }

    // 2. Coordinate Scaling & Bounds
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

    // Default bounds if calculation fails
    if (b.minX === Infinity) b = { minX: -2, maxX: 2, minY: -1, maxY: 1 };

    const spanX = b.maxX - b.minX || 1;
    const spanY = b.maxY - b.minY || 1;
    const scale = Math.min((width - 40) / spanX, (height - 40) / spanY) * zoom;

    const mapPoint = (p) => ({
      x: width / 2 + (p.x - (b.minX + b.maxX) / 2) * scale,
      y: height / 2 - (p.y - (b.minY + b.maxY) / 2) * scale,
    });

    // 3. Helper: Draw Polyline (Streamlines)
    const drawPolyline = (line) => {
      if (!line?.length) return;
      ctx.beginPath();
      line.forEach((p, i) => {
        const mp = mapPoint(p);
        if (i === 0) ctx.moveTo(mp.x, mp.y);
        else ctx.lineTo(mp.x, mp.y);
      });
      ctx.stroke();
    };

    // 4. Helper: Draw Moving Red Dashes
    const drawMovingDashes = (line) => {
      if (!line?.length) return;
      const pts = line.map(mapPoint);

      const speed = 2.0;
      const period = 30; // Increased period for longer dashes
      const offset = (frame * speed) % period;

      ctx.strokeStyle = "red";
      ctx.lineWidth = 2;

      // FIX: Dash size increased (from 5 to 12) for better visibility
      // [12, 18] means 12px dash and 18px gap
      ctx.setLineDash([12, 18]);

      // FIX: Using negative offset ensures the flow moves from Leading Edge to Trailing Edge
      ctx.lineDashOffset = -offset;

      ctx.beginPath();
      pts.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();

      ctx.setLineDash([]); // Reset dash state for other drawing operations
    };

    // 5. Execution: Draw Flow
    if (displayMode === "streamlines") {
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(255, 255, 0, 0.70)";
      for (const line of streamlines) drawPolyline(line);
    } else {
      // Mode: moving OR freeze
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(255, 255, 0, 0.30)"; // Faint base lines
      for (const line of streamlines) drawPolyline(line);

      // Draw red dashes for both moving and freeze
      // In freeze mode, the dashes stay still because 'frame' stops updating
      if (displayMode === "moving" || displayMode === "freeze") {
        for (const line of streamlines) drawMovingDashes(line);
      }
    }

    // 6. Execution: Draw Airfoil
    if (bodyPoints.length) {
      ctx.strokeStyle = "cyan";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      bodyPoints.forEach((p, i) => {
        const mp = mapPoint(p);
        if (i === 0) ctx.moveTo(mp.x, mp.y);
        else ctx.lineTo(mp.x, mp.y);
      });
      ctx.closePath();
      ctx.stroke();
    }
  }, [bodyPoints, streamlines, frame, displayMode, zoom]);

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          padding: "10px",
          background: "#222",
          borderRadius: "4px",
        }}
      >
        <button
          onClick={() => setDisplayMode("streamlines")}
          style={{ padding: "4px 12px" }}
        >
          Streamlines
        </button>
        <button
          onClick={() => setDisplayMode("moving")}
          style={{ padding: "4px 12px" }}
        >
          Moving
        </button>
        <button
          onClick={() => setDisplayMode("freeze")}
          style={{ padding: "4px 12px" }}
        >
          Freeze
        </button>
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: "white",
          }}
        >
          <span>Zoom:</span>
          <input
            type="range"
            min="0.5"
            max="4"
            step="0.1"
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
          />
          <span style={{ minWidth: "35px" }}>{zoom.toFixed(1)}x</span>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        width={520}
        height={360}
        style={{
          width: "100%",
          height: "auto",
          background: "black",
          border: "1px solid #444",
        }}
      />
    </div>
  );
}
