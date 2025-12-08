import React, { useMemo } from "react";
import { useFoilSim } from "../store/FoilSimContext";

function getSizeRanges(units, environmentSelect) {
  const isMetric = units === "metric";

  // Defaults (from original FoilSim logic)
  if (environmentSelect === 3) {
    // mercury case overrides
    return {
      chordMin: 0.1,
      chordMax: isMetric ? 5.05 : 5.05,
      spanMin: 0.1,
      spanMax: isMetric ? 20.0 : 20.0,
      areaMin: 0.01,
      areaMax: 50.05,
    };
  }

  if (!isMetric) {
    // Imperial
    return {
      chordMin: 0.1,
      chordMax: 19.9,
      spanMin: 5.0,
      spanMax: 123.85,
      areaMin: 0.01,
      areaMax: 2475.01,
    };
  }

  // Metric
  return {
    chordMin: 0.1,
    chordMax: 6.06,
    spanMin: 5.0,
    spanMax: 37.79,
    areaMin: 0.01,
    areaMax: 229.93,
  };
}

export default function SizePanel() {
  const { state, set } = useFoilSim();
  const { chord, span, area, units, environmentSelect, shapeSelect } = state;

  const isMetric = units === "metric";
  const ranges = useMemo(
    () => getSizeRanges(units, environmentSelect),
    [units, environmentSelect]
  );

  const chordLabel = isMetric ? "Chord (m)" : "Chord (ft)";
  const spanLabel = isMetric ? "Span (m)" : "Span (ft)";
  const areaLabel = isMetric ? "Area (m²)" : "Area (ft²)";

  const aspectRatio = useMemo(() => {
    if (area <= 0) return "";
    const ar = (span * span) / area;
    return ar.toFixed(2);
  }, [span, area]);

  // If shapeSelect is 4 or 5 (cylinder/ball) we show a note instead
  if (shapeSelect === 4) {
    return (
      <div className="af-panel">
        <h2 className="af-title">Wing / Body Size</h2>
        <p>This mode is handled by the cylinder configuration.</p>
      </div>
    );
  }
  if (shapeSelect === 5) {
    return (
      <div className="af-panel">
        <h2 className="af-title">Wing / Body Size</h2>
        <p>This mode is handled by the ball configuration.</p>
      </div>
    );
  }

  return (
    <div className="af-panel">
      <h2 className="af-title">Wing Size</h2>
      {/* Chord */}
      <div style={{ marginBottom: 12 }}>
        <label>
          {chordLabel}:{" "}
          <input
            type="number"
            value={chord}
            min={ranges.chordMin}
            max={ranges.chordMax}
            step="0.1"
            onChange={(e) => set("chord", Number(e.target.value) || 0)}
            style={{ width: 80, marginLeft: 8 }}
          />
        </label>
        <input
          type="range"
          min={ranges.chordMin}
          max={ranges.chordMax}
          step="0.1"
          value={Math.min(Math.max(chord, ranges.chordMin), ranges.chordMax)}
          onChange={(e) => set("chord", Number(e.target.value))}
          style={{ width: "100%", marginTop: 4 }}
        />
      </div>
      {/*  Span */}
      <div style={{ marginBottom: 12 }}>
        <label>
          {spanLabel}:{" "}
          <input
            type="number"
            value={span}
            min={ranges.spanMin}
            max={ranges.spanMax}
            step="0.1"
            onChange={(e) => set("span", Number(e.target.value) || 0)}
            style={{ width: 80, marginLeft: 8 }}
          />
        </label>
        <input
          type="range"
          min={ranges.spanMin}
          max={ranges.spanMax}
          step="0.1"
          value={Math.min(Math.max(span, ranges.spanMin), ranges.spanMax)}
          onChange={(e) => set("span", Number(e.target.value))}
          style={{ width: "100%", marginTop: 4 }}
        />
      </div>
      {/* Area */}
      <div style={{ marginBottom: 12 }}>
        <label>
          {areaLabel}:{" "}
          <input
            type="number"
            value={area}
            min={ranges.areaMin}
            max={ranges.areaMax}
            step="0.01"
            onChange={(e) => set("area", Number(e.target.value) || 0)}
            style={{ width: 80, marginLeft: 8 }}
          />
        </label>
        <input
          type="range"
          min={ranges.areaMin}
          max={ranges.areaMax}
          step="0.01"
          value={Math.min(Math.max(area, ranges.areaMin), ranges.areaMax)}
          onChange={(e) => set("area", Number(e.target.value))}
          style={{ width: "100%", marginTop: 4 }}
        />
      </div>
      {/* Aspect ratio display */}
      <div>
        <b>Aspect Ratio:</b> {aspectRatio || "—"}
      </div>
    </div>
  );
}
