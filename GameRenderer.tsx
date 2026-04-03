import React from "react";

import { TransformWrapper, TransformComponent, ReactZoomPanPinchProps } from "react-zoom-pan-pinch";
import { useVisualizer } from "./useVisualizer";
import { MapLoc } from "./types";
import { DefaultHoverElement } from "./DefaultHoverElement";
import { PX_PER_TILE } from "./spritesheet";

export type GameRendererProps = {
  shouldShowSpawnpoints?: boolean;
  disablePanning?: boolean;
  hoverElementRenderer?: React.ComponentType<{mapLoc: MapLoc}>;
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

export type GameRendererHoverElementProps = {
  mapLoc: MapLoc;
}

/** scale at which to switch to pixelated rendering so pixel art looks better up close */
const PIXELATED_RENDER_THRESHOLD = 2;

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
  }, [_registerCanvases, canvasManagerRef, props.shouldShowSpawnpoints]);

  const handleMouseEvent = React.useCallback((event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (!spriteCanvasRef.current) {
      setHoverElementPosition(null);
      return;
    }

    _updateMouseSubscribers(event);

    // internal hovering logic. if not mouseleave then there WILL be a center
    if (event.type === "mousemove") {
      const clampedCenter = canvasManagerRef.current.clampClientCoordsToPlayableTile(event.clientX, event.clientY);
      setHoverElementPosition(prev => {
        if (clampedCenter?.x !== prev?.x || clampedCenter?.y !== prev?.y) {
          return clampedCenter; // changed, switch to new
        } else {
          return prev; // no change yay
        }
      });
    }
  }, [_updateMouseSubscribers, canvasManagerRef]);


  const {contentStyle, ...transformComponentRest} = props.transformComponentProps || {};
  return (
    <TransformWrapper 
    centerOnInit
    minScale={0.1} 
    maxScale={10}
    doubleClick={{ disabled: true }}
    panning={{ disabled: props.disablePanning }}
    onZoom={ref => setCurrZoomScale(ref.state.scale)} 
    {...props.transformWrapperProps}>
      <TransformComponent
      contentStyle={{
        padding: `${PX_PER_TILE * 10}px`,
        ...contentStyle
      }}
      {...transformComponentRest}>
        <div
        onMouseDown={handleMouseEvent}
        onMouseUp={handleMouseEvent}
        onClick={handleMouseEvent}
        onMouseMove={handleMouseEvent}
        onMouseOver={handleMouseEvent}
        onMouseOut={handleMouseEvent}
        onMouseEnter={handleMouseEvent}
        onMouseLeave={e => {
          handleMouseEvent(e);
          setHoverElementPosition(null);
        }}
        className="relative grid">

          {hoverElementPos && (() => {
            const HoverComponent = props.hoverElementRenderer ?? DefaultHoverElement;
            const hoverElementRC = canvasManagerRef.current.getRCFromCanvasCoords(hoverElementPos.x, hoverElementPos.y);
            return (
              <div
              className="absolute left-0 top-0 pointer-events-none z-10"
              style={{transform: `
                translate(-50%, -50%)
                translate(${hoverElementPos.x}px, ${hoverElementPos.y}px)
              `}}>
                <HoverComponent mapLoc={hoverElementRC} />
              </div>
            );
            })()
          }

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