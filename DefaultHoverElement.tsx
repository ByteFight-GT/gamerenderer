import { PX_PER_TILE } from "./spritesheet";
import { MapLoc } from "./types";
import { useVisualizer } from "./useVisualizer";

export function DefaultHoverElement(props: {mapLoc: MapLoc}) {
  
  const {canvasManagerRef} = useVisualizer();

  let hoveringHill: number | null = null;
  // HELP
  for (const hillId in canvasManagerRef.current.mapData.hillLocs) {
    for (const loc of canvasManagerRef.current.mapData.hillLocs[hillId]) {
      if (loc[0] === props.mapLoc[0] && loc[1] === props.mapLoc[1]) {
        hoveringHill = parseInt(hillId);
        break;
      }
    }
  }

  return (
    <div 
    style={{width: PX_PER_TILE, height: PX_PER_TILE}} 
    className="relative border-2 border-foreground backdrop-brightness-90">
      <div className="absolute  bottom-[120%] left-1/2 -translate-x-1/2 px-1 text-center text-nowrap text-xs bg-secondary/50">
        <span>{props.mapLoc[0]}, {props.mapLoc[1]}</span>
        {hoveringHill !== null && <span className="font-bold"><br />Hill {hoveringHill}</span>}
      </div>
    </div>
  );
}