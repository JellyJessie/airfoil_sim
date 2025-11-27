// src/plots/foilPlots.js

// Assume Plotly has been installed via npm and imported in your component.
// This file just provides helper functions.

export function buildClAlphaTrace(alphaArray, clArray) {
  return [
    {
      x: alphaArray,
      y: clArray,
      mode: "lines",
      name: "C_L vs α",
    },
  ];
}

export function buildLayout({ title = "Lift Curve" } = {}) {
  return {
    title,
    xaxis: { title: "Angle of attack (deg)" },
    yaxis: { title: "Lift coefficient C_L" },
  };
}

export function buildPlotData(alphaArray, clArray, title) {
  const data = buildClAlphaTrace(alphaArray, clArray);
  const layout = buildLayout({ title });
  return { data, layout };
}

export function renderPlot(elementId, alphaArray, clArray, title) {
  const plotData = buildPlotData(alphaArray, clArray, title);
  Plotly.newPlot(elementId, plotData.data, plotData.layout);
}
