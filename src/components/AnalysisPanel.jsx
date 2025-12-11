// src/components/AnalysisPanel.jsx
import React from "react";
import { useFoilSim } from "../store/FoilSimContext";

// Reusable toggle button
function ToggleButton({ active, children, ...props }) {
  return (
    <button
      {...props}
      style={{
        padding: "4px 10px",
        marginLeft: 8,
        marginRight: 4,
        borderRadius: 4,
        border: "1px solid #ccc",
        backgroundColor: active ? "yellow" : "white",
        cursor: "pointer",
        minWidth: 70,
      }}
    >
      {children}
    </button>
  );
}

// Small numeric badge for real-time values
function ValueBadge({ label, value }) {
  return (
    <span
      style={{
        marginLeft: 8,
        padding: "2px 8px",
        fontSize: 12,
        borderRadius: 6,
        background: "#f2f2f2",
        border: "1px solid #ccc",
        fontFamily: "monospace",
      }}
    >
      {label}: {value}
    </span>
  );
}

export default function AnalysisPanel() {
  const {
    state: { liftAnalisis, ar, induced, reCorrection },
    outputs, // ✅ this comes from computeOutputs via context
    dispatch,
  } = useFoilSim();

  // ✅ Safely read real-time physics outputs
  const cl = outputs?.cl?.toFixed(4) ?? "--";
  const cd = outputs?.cd?.toFixed(5) ?? "--";
  const ld = outputs?.liftOverDrag?.toFixed(3) ?? "--";
  const reynolds = outputs?.reynolds ? outputs.reynolds.toExponential(3) : "--";
  const optimalLD = outputs?.optimalLD?.toFixed(2) ?? "--";
  const optimalAlpha = outputs?.optimalAlpha?.toFixed(1) ?? "--";
  const stallAlpha = outputs?.stallAlpha?.toFixed(1) ?? "--";
  const isStalled = outputs?.isStalled ?? false;

  const cd0 = outputs?.cd0 ?? null;
  const cdi = outputs?.cdi ?? null;

  const cdTotal = cd0 !== null && cdi !== null ? cd0 + cdi : null;

  const cd0Pct = cdTotal && cdTotal > 0 ? (cd0 / cdTotal) * 100 : 0;
  const cdiPct = cdTotal && cdTotal > 0 ? (cdi / cdTotal) * 100 : 0;

  const cd0Label = cd0 !== null ? cd0.toFixed(5) : "--";
  const cdiLabel = cdi !== null ? cdi.toFixed(5) : "--";

  return (
    <div className="af-panel">
      <h2 className="af-title">Lift & Drag Analysis</h2>

      {/* ================= MODEL ================= */}
      <div style={{ marginBottom: 16 }}>
        <span style={{ fontWeight: "bold", marginRight: 8 }}>Model:</span>

        <ToggleButton
          active={liftAnalisis === 1}
          onClick={() => dispatch({ type: "SET_LIFT_ANALYSIS", mode: 1 })}
        >
          Stall
        </ToggleButton>

        <ToggleButton
          active={liftAnalisis === 2}
          onClick={() => dispatch({ type: "SET_LIFT_ANALYSIS", mode: 2 })}
        >
          Ideal
        </ToggleButton>

        <ValueBadge label="Cl" value={cl} />
      </div>

      {/* ================= ASPECT RATIO ================= */}
      <div style={{ marginBottom: 16 }}>
        <span style={{ marginRight: 8 }}>AR Lift Correction:</span>

        <ToggleButton
          active={ar === true}
          onClick={() => dispatch({ type: "SET_AR", value: true })}
        >
          AR On
        </ToggleButton>

        <ToggleButton
          active={ar === false}
          onClick={() => dispatch({ type: "SET_AR", value: false })}
        >
          AR Off
        </ToggleButton>

        <ValueBadge label="AR" value={ar ? "On" : "Off"} />
      </div>

      {/* ================= INDUCED DRAG ================= */}
      <div style={{ marginBottom: 16 }}>
        <span style={{ marginRight: 8 }}>Induced Drag:</span>

        <ToggleButton
          active={induced === true}
          onClick={() => dispatch({ type: "SET_INDUCED", value: true })}
        >
          ID On
        </ToggleButton>

        <ToggleButton
          active={induced === false}
          onClick={() => dispatch({ type: "SET_INDUCED", value: false })}
        >
          ID Off
        </ToggleButton>

        <ValueBadge label="Cd" value={cd} />
      </div>

      {/* ================= REYNOLDS CORRECTION ================= */}
      <div style={{ marginBottom: 16 }}>
        <span style={{ marginRight: 8 }}>Re # Correction:</span>

        <ToggleButton
          active={reCorrection === true}
          onClick={() => dispatch({ type: "SET_RE_CORRECTION", value: true })}
        >
          Re On
        </ToggleButton>

        <ToggleButton
          active={reCorrection === false}
          onClick={() => dispatch({ type: "SET_RE_CORRECTION", value: false })}
        >
          Re Off
        </ToggleButton>

        <ValueBadge label="Re" value={reynolds} />
      </div>

      {/* ================= L/D RATIO ================= */}
      <div style={{ marginTop: 20 }}>
        <span style={{ fontWeight: "bold" }}>Performance:</span>
        <ValueBadge label="L/D" value={ld} />
      </div>

      {/* ================= DRAG BREAKDOWN ================= */}
      <div style={{ marginTop: 20 }}>
        <h3 style={{ marginBottom: 8 }}>Drag Breakdown</h3>

        {/* Numeric badges */}
        <ValueBadge label="Cd₀ (parasitic)" value={cd0Label} />
        <ValueBadge label="Cdi (induced)" value={cdiLabel} />

        {/* Bar visualization */}
        <div
          style={{
            marginTop: 10,
            width: "100%",
            height: 18,
            borderRadius: 9,
            overflow: "hidden",
            border: "1px solid #ccc",
            display: "flex",
            background: "#f9f9f9",
          }}
        >
          {/* Cd0 segment */}
          <div
            style={{
              width: `${cd0Pct}%`,
              background: "#cce5ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              whiteSpace: "nowrap",
            }}
          >
            {cdTotal ? `${cd0Pct.toFixed(0)}% Cd₀` : ""}
          </div>

          {/* Cdi segment */}
          <div
            style={{
              width: `${cdiPct}%`,
              background: "#ffd6cc",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              whiteSpace: "nowrap",
            }}
          >
            {cdTotal ? `${cdiPct.toFixed(0)}% Cdi` : ""}
          </div>
        </div>

        <div style={{ marginTop: 6, fontSize: 11, color: "#555" }}>
          Total Cd = {cd}
        </div>
      </div>

      {/* ================= PERFORMANCE STATUS ================= */}
      <div
        style={{ marginTop: 24, paddingTop: 12, borderTop: "1px solid #ccc" }}
      >
        <h3 style={{ marginBottom: 8 }}>Performance Status</h3>

        <ValueBadge label="Optimal L/D" value={optimalLD} />
        <ValueBadge label="Optimal α" value={`${optimalAlpha}°`} />

        {stallAlpha && <ValueBadge label="Stall α" value={`${stallAlpha}°`} />}

        <span
          style={{
            marginLeft: 12,
            padding: "4px 12px",
            fontWeight: "bold",
            color: isStalled ? "white" : "#333",
            background: isStalled ? "red" : "#d4f7d4",
            borderRadius: 6,
            animation: isStalled ? "blink 1s infinite" : "none",
          }}
        >
          {isStalled ? "⚠ STALL" : "✅ Stable"}
        </span>
      </div>
    </div>
  );
}
