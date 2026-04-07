import React from "react";

import { useVisualizer } from "./useVisualizer";

const DEFAULT_WRAPPER_STYLE = {
  position: "relative", 
  display: "grid"
} as const;
const CANVAS_STYLE = {
  gridColumnStart: 1, 
  gridRowStart: 1, 
  imageRendering: "pixelated",
} as const;

type GameRendererProps = {
  wrapperProps?: React.HTMLAttributes<HTMLDivElement>;
  canvasProps?: React.CanvasHTMLAttributes<HTMLCanvasElement>;
};

export const GameRenderer = ({ wrapperProps, canvasProps }: GameRendererProps) => {
  const { _registerCanvases } = useVisualizer();

  const spriteCanvasRef = React.useRef<HTMLCanvasElement>(null);
  const backgroundCanvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    _registerCanvases(spriteCanvasRef.current!, backgroundCanvasRef.current!);
  }, [_registerCanvases]);

  const { style: wrapperStyle, ...wrapperRest } = wrapperProps ?? {};
  const { style: canvasStyle, ...canvasRest } = canvasProps ?? {};

  const mergedWrapperStyle = { ...DEFAULT_WRAPPER_STYLE, ...wrapperStyle };
  const mergedCanvasStyle = { ...CANVAS_STYLE, ...canvasStyle };

  return (
    <div style={{ ...mergedWrapperStyle }} {...wrapperRest}>
      <canvas {...canvasRest} ref={backgroundCanvasRef} style={mergedCanvasStyle} />
      <canvas {...canvasRest} ref={spriteCanvasRef} style={mergedCanvasStyle} />
    </div>
  );
};