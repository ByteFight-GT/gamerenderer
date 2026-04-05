import React from "react";

import { useVisualizer } from "./useVisualizer";

const CANVAS_STYLE = {
  gridColumnStart: 1, 
  gridRowStart: 1, 
  height: "100%", 
  width: "100%",
  imageRendering: "pixelated",
} as const;

export const GameRenderer = (props: React.HTMLAttributes<HTMLDivElement>) => {
  const {canvasManagerRef, _registerCanvases} = useVisualizer();

  const spriteCanvasRef = React.useRef<HTMLCanvasElement>(null);
  const backgroundCanvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    _registerCanvases(spriteCanvasRef.current!, backgroundCanvasRef.current!);
  }, [_registerCanvases, canvasManagerRef]);

  const { style, ...rest } = props;
  return (
    <div style={{ position: "relative", display: "grid", ...style }} {...rest}>
      <canvas ref={backgroundCanvasRef} style={CANVAS_STYLE} />
      <canvas ref={spriteCanvasRef} style={CANVAS_STYLE} />
    </div>
  );
};