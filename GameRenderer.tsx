import React from "react";

import { TransformWrapper, TransformComponent, ReactZoomPanPinchProps } from "react-zoom-pan-pinch";
import { useVisualizer } from "./useVisualizer";

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

  const {_registerCanvases, _updateClickSubscribers} = useVisualizer();

  const spriteCanvasRef = React.useRef<HTMLCanvasElement>(null);
  const backgroundCanvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    _registerCanvases(spriteCanvasRef.current!, backgroundCanvasRef.current!);
  }, []);

  return (
    <TransformWrapper centerOnInit limitToBounds={false} minScale={0.1} {...props.transformWrapperProps}>
      <TransformComponent {...props.transformComponentProps}>
        <div onClick={_updateClickSubscribers} className="grid">
          <canvas ref={backgroundCanvasRef} className="col-start-1 row-start-1"/>
          <canvas ref={spriteCanvasRef} className="col-start-1 row-start-1" />
        </div>
      </TransformComponent>
    </TransformWrapper>
  );
};