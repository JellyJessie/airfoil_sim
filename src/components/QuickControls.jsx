import React from "react";

function safeCall(name) {
  const fn = window?.[name];
  if (typeof fn === "function") {
    try {
      fn();
    } catch (e) {
      console.error("Call failed:", name, e);
    }
  } else {
    console.warn("Missing global:", name);
  }
}

export default function QuickControls() {
  return (
    <div className="af-panel">
      <h2 className="af-title">Quick Controls</h2>
      <div className="af-grid">
        <button onClick={() => safeCall("reset")}>Reset</button>
        <button onClick={() => safeCall("flightButton")}>Flight</button>
        <button onClick={() => safeCall("shapeButton")}>Shape</button>
        <button onClick={() => safeCall("dataButton")}>Data</button>
        <button onClick={() => safeCall("plotButton")}>Plot</button>
      </div>
      <p className="af-note">Calls your existing global functions.</p>
    </div>
  );
}
