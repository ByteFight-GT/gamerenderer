import React from "react";

import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { useGame } from "./useGame";

export const GameRenderer = () => {

  const { registerCanvases } = useGame();

  const spriteCanvasRef = React.useRef<HTMLCanvasElement>(null);
  const backgroundCanvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    registerCanvases(spriteCanvasRef.current!, backgroundCanvasRef.current!);
  }, []);

  return (
    <TransformWrapper limitToBounds={false} minScale={0.1}>
      <TransformComponent contentClass="pan-content" wrapperClass="pan-container">
        <div id="canvas-container">
          <canvas ref={backgroundCanvasRef} id="background-canvas" />
          <canvas ref={spriteCanvasRef} id="sprite-canvas" />
        </div>
      </TransformComponent>
    </TransformWrapper>
  );
};