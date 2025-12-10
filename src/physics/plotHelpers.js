// -----------------------------------------------------------------------------
// L/D Ratio (replaces calculateLDRatio)
// -----------------------------------------------------------------------------

export function calculateLiftToDrag(lift, drag) {
  if (!drag || !isFinite(drag)) return 0;
  return lift / drag;
}

// -----------------------------------------------------------------------------
// Plot Data Generator (replaces plotGraph + calculate)
// -----------------------------------------------------------------------------

export function buildLiftDragBarData(lift, drag) {
  return [
    {
      x: ["Lift", "Drag"],
      y: [lift, drag],
      type: "bar",
    },
  ];
}
