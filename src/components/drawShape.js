import React, { useRef, useEffect } from "react";

const Canvas = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    // Draw shapes here...
    ctx.fillStyle = "blue";
    ctx.fillRect(10, 10, 100, 100);
  }, []);

  return <canvas ref={canvasRef} width={400} height={400}></canvas>;
};

export default Canvas;
