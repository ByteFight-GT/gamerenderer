import React from "react";

import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

import testMapData from './testMapData.json';
import { CanvasManager } from "./CanvasManager";

export function GameRenderer() {

  const canvasManager = React.useRef<CanvasManager | null>(null);

  React.useEffect(() => {
    if (canvasManager.current) {
      return;
    }

    const spriteCanvas = document.getElementById("sprite-canvas")! as HTMLCanvasElement;
    const backgroundCanvas = document.getElementById("background-canvas")! as HTMLCanvasElement;

    canvasManager.current = new CanvasManager(
      testMapData,
      spriteCanvas,
      backgroundCanvas
    );

    canvasManager.current.spritesheet.onload = () => {
      canvasManager?.current?.blitMap();
    };
  }, []);

  return (
    <TransformWrapper>
      <TransformComponent wrapperClass="pan-container">
        <div id="canvas-container">
          <canvas id="background-canvas"></canvas>
          <canvas id="sprite-canvas"></canvas>
        </div>
      </TransformComponent>
    </TransformWrapper>
  );
};