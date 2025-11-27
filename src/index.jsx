import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles/panel.css";

const root = document.getElementById("root");
createRoot(root).render(<App />);

/*
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
*/
