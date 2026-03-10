import React from "react";

import { TransformWrapper, TransformComponent, ReactZoomPanPinchProps } from "react-zoom-pan-pinch";
import { useVisualizer } from "./useVisualizer";
import { PX_PER_TILE } from "./spritesheet";

type GameRendererProps = {
  shouldShowSpawnpoints?: boolean;
  hoverElementRenderer?: () => React.ReactNode;
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

/** scale at which to switch to pixelated rendering so pixel art looks better up close */
const PIXELATED_RENDER_THRESHOLD = 2;

const GamerendererDefaultHoverElement = () => (
  <div 
  style={{width: PX_PER_TILE, height: PX_PER_TILE}} 
  className="border-2 border-foreground" />
);

export const GameRenderer = (props: GameRendererProps) => {

  const {canvasManagerRef, _registerCanvases, _updateClickSubscribers} = useVisualizer();

  const spriteCanvasRef = React.useRef<HTMLCanvasElement>(null);
  const backgroundCanvasRef = React.useRef<HTMLCanvasElement>(null);

  const [hoverElementPos, setHoverElementPosition] = React.useState<{ x: number; y: number } | null>(null);
  const [currZoomScale, setCurrZoomScale] = React.useState(1);

  React.useEffect(() => {
    _registerCanvases(spriteCanvasRef.current!, backgroundCanvasRef.current!);
    if (props.shouldShowSpawnpoints !== undefined) {
      canvasManagerRef.current.shouldShowSpawnPoints = props.shouldShowSpawnpoints;
    }
  }, []);

  const handleMouseMove = React.useCallback((event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (!spriteCanvasRef.current) {
      setHoverElementPosition(null);
      return;
    }

    const clampedCenter = canvasManagerRef.current.clampClientCoordsToPlayableTile(event.clientX, event.clientY);
    if (!clampedCenter) { 
      // off the playable board
      setHoverElementPosition(null);
      return;
    }

    setHoverElementPosition(prev => {
      // only rerender if changed cell
      if (clampedCenter.x !== prev?.x || clampedCenter.y !== prev?.y) {
        return clampedCenter;
      }
      return prev;
    });
  }, []);

  const handleMouseLeave = React.useCallback(() => {
    setHoverElementPosition(null);
  }, [setHoverElementPosition]);


  return (
    <TransformWrapper 
    centerOnInit 
    minScale={0.1} 
    limitToBounds={false} 
    onZoom={ref => setCurrZoomScale(ref.state.scale)} 
    {...props.transformWrapperProps}>
      <TransformComponent {...props.transformComponentProps}>
        <div
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={_updateClickSubscribers} 
        className="relative grid">

          {hoverElementPos && (
            <div
            className="absolute left-0 top-0 pointer-events-none z-10"
            style={{transform: `
              translate(-50%, -50%)
              translate(${hoverElementPos.x}px, ${hoverElementPos.y}px)
            `}}>
              {props.hoverElementRenderer?
                props.hoverElementRenderer()
              :
                <GamerendererDefaultHoverElement />
              }
            </div>
          )}

          <canvas 
          ref={backgroundCanvasRef} 
          style={{
            imageRendering: currZoomScale >= PIXELATED_RENDER_THRESHOLD? "pixelated" : "auto"
          }} 
          className="col-start-1 row-start-1" />

          <canvas 
          ref={spriteCanvasRef} 
          style={{
            imageRendering: currZoomScale >= PIXELATED_RENDER_THRESHOLD? "pixelated" : "auto"
          }}
          className="col-start-1 row-start-1" />
        </div>
      </TransformComponent>
    </TransformWrapper>
  );
};