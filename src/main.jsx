import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import DesignApp from "./design/DesignApp.jsx";
import QuickControls from "./components/QuickControls.jsx";
import "./styles/panel.css";

function App() {
  const [tab, setTab] = useState("design");
  return (
    <div style={{ padding: "16px" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button onClick={() => setTab("design")}>
          Airfoil Design (NACA 4-digit)
        </button>
        <button onClick={() => setTab("quick")}>Quick Controls</button>
      </div>
      {tab === "design" && <DesignApp />}
      {tab === "quick" && <QuickControls />}
    </div>
  );
}

function mount() {
  const host = document.getElementById("react-root");
  if (!host) return console.warn("react-root not found");
  createRoot(host).render(<App />);
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mount);
} else {
  mount();
}
