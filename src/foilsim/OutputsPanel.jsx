import React from "react";
import { useFoilSim } from "./store.jsx";
import { computeOutputs } from "./computeOutputs.js";

export default function OutputsPanel() {
  const { state, set } = useFoilSim();
  const outputs = computeOutputs(state);

  const {
    shapeString,
    lift,
    drag,
    cL,
    cD,
    Re,
    L_over_D,
    envDisplay,
    lengthUnit,
    forceUnit,
  } = outputs;

  return (
    <div className="af-panel">
      <h2 className="af-title">Results</h2>

      <div style={{ marginBottom: 8 }}>
        <strong>Shape:</strong> {shapeString || "—"}
      </div>

      <div style={{ display: "grid", gap: 4 }}>
        <label>
          Lift ({forceUnit}):{" "}
          <input
            type="text"
            readOnly
            value={Number.isFinite(lift) ? lift.toFixed(0) : ""}
            style={{ width: 120 }}
          />
        </label>

        <label>
          Drag ({forceUnit}):{" "}
          <input
            type="text"
            readOnly
            value={Number.isFinite(drag) ? drag.toFixed(0) : ""}
            style={{ width: 120 }}
          />
        </label>

        <label>
          C<sub>L</sub>:{" "}
          <input
            type="text"
            readOnly
            value={Number.isFinite(cL) ? cL.toFixed(2) : ""}
            style={{ width: 80 }}
          />
        </label>

        <label>
          C<sub>D</sub>:{" "}
          <input
            type="text"
            readOnly
            value={Number.isFinite(cD) ? cD.toFixed(3) : ""}
            style={{ width: 80 }}
          />
        </label>

        <label>
          Re:{" "}
          <input
            type="text"
            readOnly
            value={Number.isFinite(Re) ? Re.toFixed(0) : ""}
            style={{ width: 120 }}
          />
        </label>

        <label>
          L / D:{" "}
          <input
            type="text"
            readOnly
            value={Number.isFinite(L_over_D) ? L_over_D.toFixed(3) : ""}
            style={{ width: 80 }}
          />
        </label>
      </div>

      {envDisplay && (
        <>
          <hr style={{ margin: "12px 0" }} />
          <div style={{ fontWeight: "bold", marginBottom: 4 }}>Environment</div>
          <div style={{ display: "grid", gap: 4 }}>
            <label>
              Static p:{" "}
              <input
                type="text"
                readOnly
                value={envDisplay.staticPressure.toFixed(3)}
                style={{ width: 120 }}
              />
            </label>
            <label>
              ρ:{" "}
              <input
                type="text"
                readOnly
                value={envDisplay.density.toFixed(5)}
                style={{ width: 120 }}
              />
            </label>
            <label>
              q₀:{" "}
              <input
                type="text"
                readOnly
                value={envDisplay.dynPressure.toFixed(3)}
                style={{ width: 120 }}
              />
            </label>
            <label>
              Temp:{" "}
              <input
                type="text"
                readOnly
                value={envDisplay.temp.toFixed(0)}
                style={{ width: 80 }}
              />
            </label>
            <label>
              μ:{" "}
              <input
                type="text"
                readOnly
                value={envDisplay.viscosity.toExponential(3)}
                style={{ width: 140 }}
              />
            </label>
          </div>
        </>
      )}
    </div>
  );
}
