// src/graphics/sketchAirfoil.js

// This is *not* tied to the DOM. It takes a p5 instance and your geometry.
// React component like <AirfoilSketchCanvas /> will create the p5 instance and call drawAirfoilSketch.

export function drawAirfoilSketch(p5, geom) {
  const { x, yUpper, yLower } = geom;

  p5.push();
  p5.translate(50, p5.height / 2); // Just an example transform

  // scale geometrically to fit canvas
  const scale = 300 / Math.max(...x, 1e-6);
  p5.scale(scale, -scale);

  p5.stroke(0);
  p5.noFill();

  p5.beginShape();
  for (let i = 0; i < x.length; i++) {
    p5.vertex(x[i], yUpper[i]);
  }
  for (let i = x.length - 1; i >= 0; i--) {
    p5.vertex(x[i], yLower[i]);
  }
  p5.endShape(p5.CLOSE);

  p5.pop();
}
