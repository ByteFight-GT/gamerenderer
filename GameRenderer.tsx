import React from "react";

import { TransformWrapper, TransformComponent, ReactZoomPanPinchProps } from "react-zoom-pan-pinch";
import { useGame } from "./useGame";

type GameRendererProps = {
  transformWrapperProps?: ReactZoomPanPinchProps;
  transformComponentProps?: {
    contentClass?: string;
    wrapperClass?: string;
    wrapperStyle?: React.CSSProperties;
    contentStyle?: React.CSSProperties;
    wrapperProps?: React.HTMLAttributes<HTMLDivElement>;
    contentProps?: React.HTMLAttributes<HTMLDivElement>;
  }
}

export const GameRenderer = (props: GameRendererProps) => {

  const { registerCanvases } = useGame();

  const spriteCanvasRef = React.useRef<HTMLCanvasElement>(null);
  const backgroundCanvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    registerCanvases(spriteCanvasRef.current!, backgroundCanvasRef.current!);
  }, []);

  return (
    <TransformWrapper limitToBounds={false} minScale={0.1} {...props.transformWrapperProps}>
      <TransformComponent {...props.transformComponentProps}>
        <div id="canvas-container">
          <canvas ref={backgroundCanvasRef} id="background-canvas" />
          <canvas ref={spriteCanvasRef} id="sprite-canvas" />
        </div>
      </TransformComponent>
    </TransformWrapper>
  );
};