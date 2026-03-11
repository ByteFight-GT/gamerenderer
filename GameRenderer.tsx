import React from "react";

import { TransformWrapper, TransformComponent, ReactZoomPanPinchProps } from "react-zoom-pan-pinch";
import { useVisualizer } from "./useVisualizer";
import { PX_PER_TILE } from "./spritesheet";

import type { MapData } from "../../common/types";
import _DEFAULT_MAP_DATA from './defaults/DEFAULT_MAP_DATA.json';
const DEFAULT_MAP_DATA = _DEFAULT_MAP_DATA as unknown as MapData;

type GameRendererProps = {
  shouldShowSpawnpoints?: boolean;
  disablePanning?: boolean;
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
  className="border-2 border-foreground backdrop-brightness-75" />
);

export const GameRenderer = (props: GameRendererProps) => {

  const {canvasManagerRef, _registerCanvases, _updateMouseSubscribers} = useVisualizer();

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

  const handleMouseEvent = React.useCallback((event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (!spriteCanvasRef.current) {
      setHoverElementPosition(null);
      return;
    }

    const clampedCenter = canvasManagerRef.current.clampClientCoordsToPlayableTile(event.clientX, event.clientY);
    if (!clampedCenter) { // oob! dont even update subscribers cuz theyll be confused
      setHoverElementPosition(null);
      return;
    }

    _updateMouseSubscribers(event);

    // internal hovering logic
    if (event.type === "mousemove") {
      setHoverElementPosition(prev => {
        if (clampedCenter.x !== prev?.x || clampedCenter.y !== prev?.y) {
          return clampedCenter; // changed, switch to new
        } else {
          return prev; // no change yay
        }
      });
    }
  }, []);


  return (
    <TransformWrapper 
    centerOnInit
    minScale={0.1} 
    maxScale={10}
    limitToBounds={false}
    doubleClick={{ disabled: true }}
    panning={{ disabled: props.disablePanning }}
    onZoom={ref => setCurrZoomScale(ref.state.scale)} 
    {...props.transformWrapperProps}>
      <TransformComponent {...props.transformComponentProps}>
        <div
        onMouseMove={handleMouseEvent}
        onMouseDown={handleMouseEvent}
        onMouseUp={handleMouseEvent}
        onClick={handleMouseEvent}
        onMouseEnter={handleMouseEvent}
        onMouseLeave={e => {
          handleMouseEvent(e);
          setHoverElementPosition(null);
        }}
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