import React, { useMemo } from "react";
import Plot from "react-plotly.js";

import { useFoilSim } from "../store/FoilSimContext.jsx";
import { computeOutputs } from "./computeOutputs.js";

import { Shape, Airfoil } from "../components/shape.js";
import { buildVelocityProbePlot } from "../components/foilsimPlots.js";

import GeometryPanel from "../components/GeometryPanel.jsx";
import GeometryProbeOverlay from "./GeometryProbeOverlay.jsx";
import makeDataString from "../components/makeDataString.jsx";

// ---- helpers ----
function pickSeries(obj, candidates, fallback = []) {
  for (const k of candidates) {
    const v = obj?.[k];
    if (Array.isArray(v)) return v;
  }
  return fallback;
}

function InfoStrip({ label, x, y }) {
  const n = Math.min(x?.length ?? 0, y?.length ?? 0);
  const first = n ? x[0] : null;
  const last = n ? x[n - 1] : null;
  return (
    <div
      style={{
        fontSize: 12,
        color: "#bbb",
        background: "#111",
        border: "1px solid #333",
        borderRadius: 6,
        padding: "6px 8px",
      }}
    >
      <b style={{ color: "#eee" }}>{label}</b>{" "}
      {n ? (
        <>
          n={n}, α[0]={Number(first).toFixed?.(2)}, α[last]=
          {Number(last).toFixed?.(2)}
        </>
      ) : (
        <>no data</>
      )}
    </div>
  );
}

function makeLinePlot({ title, xTitle, yTitle, x, y, infoLabel }) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <InfoStrip label={infoLabel} x={x} y={y} />
      <Plot
        data={[
          {
            type: "scatter",
            mode: "lines+markers",
            x,
            y,
          },
        ]}
        layout={{
          title,
          xaxis: { title: xTitle },
          yaxis: { title: yTitle },
          margin: { t: 50, l: 60, r: 20, b: 50 },
        }}
        config={{ responsive: true, displayModeBar: false }}
        style={{ width: "100%", height: 320 }}
      />
    </div>
  );
}

function PlotTab({ out }) {
  const clAlpha = out?.plots?.clAlpha;
  const cdAlpha = out?.plots?.cdAlpha;
  const ldAlpha = out?.plots?.ldAlpha;

  // robust key support (in case your physics helpers name arrays differently)
  const alphasCL = pickSeries(clAlpha, ["alphas", "alpha", "x"], []);
  const cls = pickSeries(clAlpha, ["cls", "cl", "y"], []);

  const alphasCD = pickSeries(cdAlpha, ["alphas", "alpha", "x"], []);
  const cds = pickSeries(cdAlpha, ["cds", "cd", "y"], []);

  const alphasLD = pickSeries(ldAlpha, ["alphas", "alpha", "x"], []);
  const lds = pickSeries(ldAlpha, ["lds", "ld", "y"], []);

  if (!alphasCL.length || !alphasCD.length || !alphasLD.length) {
    return (
      <div style={{ color: "#888", padding: 12 }}>
        No plot data yet. (Check that computeOutputs returns
        out.plots.clAlpha/cdAlpha/ldAlpha.)
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {makeLinePlot({
        title: "CL vs α",
        xTitle: "α (deg)",
        yTitle: "CL",
        x: alphasCL,
        y: cls,
        infoLabel: `alphasCL (from out.plots.clAlpha)`,
      })}

      {makeLinePlot({
        title: "CD vs α",
        xTitle: "α (deg)",
        yTitle: "CD",
        x: alphasCD,
        y: cds,
        infoLabel: `alphasCD (from out.plots.cdAlpha)`,
      })}

      {makeLinePlot({
        title: "L/D vs α",
        xTitle: "α (deg)",
        yTitle: "L/D",
        x: alphasLD,
        y: lds,
        infoLabel: `alphasLD (from out.plots.ldAlpha)`,
      })}
    </div>
  );
}

export default function OutputsPanel() {
  const { state } = useFoilSim();
  const out = useMemo(() => computeOutputs(state), [state]);

  // velocity probe plot (simple helper)
  const { data: velData, layout: velLayout } = useMemo(() => {
    return buildVelocityProbePlot({
      velocity: state.V,
      units: state.units === "imperial" ? 1 : 2,
    });
  }, [state.V, state.units]);

  // --- Panels ---
  switch (state.outputButton) {
    case 1: // Gage
      return (
        <div style={{ display: "grid", gap: 6 }}>
          <div>CL: {Number.isFinite(out.cl) ? out.cl.toFixed(4) : "—"}</div>
          <div>CD: {Number.isFinite(out.cd) ? out.cd.toFixed(4) : "—"}</div>
          <div>
            Lift: {Number.isFinite(out.lift) ? out.lift.toFixed(2) : "—"}
          </div>
          <div>
            Drag: {Number.isFinite(out.drag) ? out.drag.toFixed(2) : "—"}
          </div>
          <div>
            Re: {Number.isFinite(out.reynolds) ? out.reynolds.toFixed(0) : "—"}
          </div>
          {Number.isFinite(out.cd0) || Number.isFinite(out.cdi) ? (
            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.9 }}>
              <div>
                CD0: {Number.isFinite(out.cd0) ? out.cd0.toFixed(4) : "—"}
              </div>
              <div>
                CDi: {Number.isFinite(out.cdi) ? out.cdi.toFixed(4) : "—"}
              </div>
            </div>
          ) : null}
        </div>
      );

    case 2: {
      // Geometry (use computeOutputs arrays if available)
      const merged = {
        ...state,
        xm: out.xm ?? state.xm,
        ym: out.ym ?? state.ym,
        plp: out.plp ?? state.plp,
        plv: out.plv ?? state.plv,
      };

      return (
        <div style={{ display: "grid", gap: 12 }}>
          <GeometryProbeOverlay
            xm={merged.xm}
            ym={merged.ym}
            plp={merged.plp}
            plv={merged.plv}
            shapeSelect={merged.shapeSelect}
            mode="cp"
            ShapeClass={Shape}
            unitsCode={merged.units === "imperial" ? 1 : 2}
            environmentSelect={merged.environmentSelect}
            angleDeg={merged.alphaDeg}
            camber={merged.m}
            thickness={merged.t}
            velocity={merged.V}
            altitude={merged.altitude}
            chord={merged.chord}
            span={merged.span}
            wingArea={merged.S}
            q0={out.q0}
          />

          <GeometryPanel state={merged} />
        </div>
      );
    }

    case 3: // Data
      return (
        <div
          style={{
            whiteSpace: "pre-wrap",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: 12,
          }}
        >
          {makeDataString(state, out)}
        </div>
      );

    case 4: // Plot
      return <PlotTab out={out} />;

    default:
      return null;
  }
}

/*
        <div style={{ display: "grid", gap: 12 }}>
          <Plot
            data={data}
            layout={{ ...layout, margin: { t: 40, l: 50, r: 10, b: 40 } }}
            config={{ displayModeBar: false, responsive: true }}
            style={{ width: "100%", height: 420 }}
          />

          <Plot
            data={velData}
            layout={{ ...velLayout, margin: { t: 40, l: 50, r: 10, b: 40 } }}
            config={{ displayModeBar: false, responsive: true }}
            style={{ width: "100%", height: 260 }}
          />
        </div>*/
