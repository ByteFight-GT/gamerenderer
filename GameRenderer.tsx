import React, { useEffect, useRef } from "react";

import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

// import smallMatch from "./matches_example/match.json";
// import bigMatch from "./matches_example/big_match.json";
import { useState } from "react";
import { CanvasManager } from "./CanvasManager";
import { GameRenderState, MapInfo, Symmetry, MapLoc } from "./types";

function buildMapInfoFromMatch(match: any): MapInfo {
  const hillMapping: number[][] = match.hill_mapping ?? [];
  const walls: boolean[][] = match.walls ?? [];

  const height = hillMapping.length || walls.length;
  const width = hillMapping[0]?.length || walls[0]?.length || 0;

  const hillCenters: MapLoc[] = [];
  for (let y = 0; y < hillMapping.length; y++) {
    for (let x = 0; x < hillMapping[y].length; x++) {
      if (hillMapping[y][x] !== 0) {
        hillCenters.push({ x, y });
      }
    }
  }

  const wallLocs: MapLoc[] = [];
  for (let y = 0; y < walls.length; y++) {
    for (let x = 0; x < walls[y].length; x++) {
      if (walls[y][x]) {
        wallLocs.push({ x, y });
      }
    }
  }

  const p2Start = Array.isArray(match.p2_loc?.[0]) ? match.p2_loc[0] : [0, 0];
  const spawnpointGreen: MapLoc = { x: p2Start[1], y: p2Start[0] };

  return {
    width,
    height,
    hillCenters,
    wallLocs,
    spawnpointGreen,
    symmetry: Symmetry.X,
    healthPowerupSpawns: [],
    staminaPowerupSpawns: [],
  };
}

function buildFramesFromMatch(match: any, width: number, height: number): GameRenderState[] {
  const frames: GameRenderState[] = [];

  const paint: number[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => 0)
  );

  const beacons: ("P1" | "P2" | null)[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => null)
  );

  const powerups: { hasHealth: boolean; hasStamina: boolean }[][] = Array.from(
    { length: height },
    () =>
      Array.from({ length: width }, () => ({
        hasHealth: false,
        hasStamina: false,
      }))
  );

  const totalSteps = Math.min(
    (match.turn_count ?? 0) + 1,
    match.p1_loc?.length ?? 0,
    match.p2_loc?.length ?? 0,
    match.paint_updates?.length ?? 0,
    match.beacon_updates?.length ?? Number.MAX_SAFE_INTEGER,
    match.powerup_updates?.length ?? Number.MAX_SAFE_INTEGER
  );

  for (let i = 0; i < totalSteps; i++) {
    // paint
    const paintUpdates = match.paint_updates?.[i] as Record<string, number> | undefined;
    if (paintUpdates) {
      for (const key of Object.keys(paintUpdates)) {
        const flatIndex = Number(key);
        if (Number.isNaN(flatIndex)) continue;
        const value = paintUpdates[key];
        const y = Math.floor(flatIndex / width);
        const x = flatIndex % width;
        if (y >= 0 && y < height && x >= 0 && x < width) {
          paint[y][x] = value;
        }
      }
    }

    // beacons
    const beaconUpdates = match.beacon_updates?.[i] as Record<string, unknown> | undefined;
    if (beaconUpdates) {
      const parity = match.parity_playing?.[i] as number | undefined;
      const currentPlayer: "P1" | "P2" | null =
        parity === 1 ? "P1" : parity === -1 ? "P2" : null;

      for (const [key, raw] of Object.entries(beaconUpdates)) {
        const flatIndex = Number(key);
        if (Number.isNaN(flatIndex)) continue;
        const y = Math.floor(flatIndex / width);
        const x = flatIndex % width;
        if (y < 0 || y >= height || x < 0 || x >= width) continue;

        if (typeof raw === "boolean") {
          beacons[y][x] = raw && currentPlayer ? currentPlayer : null;
        } else if (typeof raw === "number") {
          if (raw === 0) {
            beacons[y][x] = null;
          } else if (currentPlayer) {
            beacons[y][x] = currentPlayer;
          }
        }
      }
    }

    // powerups (none in current example, but wired generically)
    const powerupUpdates = match.powerup_updates?.[i] as
      | Record<string, unknown>
      | undefined;
    if (powerupUpdates) {
      for (const [key, raw] of Object.entries(powerupUpdates)) {
        const flatIndex = Number(key);
        if (Number.isNaN(flatIndex)) continue;
        const y = Math.floor(flatIndex / width);
        const x = flatIndex % width;
        if (y < 0 || y >= height || x < 0 || x >= width) continue;

        const cell = powerups[y][x];

        if (typeof raw === "string") {
          const v = raw.toLowerCase();
          cell.hasHealth = v.includes("health") || v.includes("hp");
          cell.hasStamina = v.includes("stamina") || v.includes("stam");
        } else if (typeof raw === "number") {
          if (raw === 0) {
            cell.hasHealth = false;
            cell.hasStamina = false;
          } else if (raw > 0) {
            cell.hasStamina = true;
          } else {
            cell.hasHealth = true;
          }
        } else if (typeof raw === "boolean") {
          if (raw) {
            cell.hasStamina = true;
          } else {
            cell.hasHealth = false;
            cell.hasStamina = false;
          }
        }
      }
    }

    const p1Raw = match.p1_loc?.[i] ?? [0, 0];
    const p2Raw = match.p2_loc?.[i] ?? [0, 0];

    frames.push({
      p1Loc: { x: p1Raw[1], y: p1Raw[0] },
      p2Loc: { x: p2Raw[1], y: p2Raw[0] },
      paint: paint.map((row: number[]) => [...row]),
      beacons: beacons.map((row) => [...row]),
      powerups: powerups.map((row) => row.map((cell) => ({ ...cell }))),
    });
  }

  return frames;
}

interface GameRendererProps {
  initialData?: any | null;
  currentTurn: number;
  setCurrentTurn: React.Dispatch<React.SetStateAction<number>>;
  // This callback gives the parent the ability to push new dictionaries
  onRegisterUpdater?: (updater: (newDict: any) => void) => void;
}

export const GameRenderer = (props: GameRendererProps) => {
  const canvasManager = useRef<CanvasManager | null>(null);
  const [matchData, setMatchData] = useState<any | null>(props.initialData);
  const [frames, setFrames] = useState<GameRenderState[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // --- Data Management ---

  // Update internal matchData when the parent provides a new dictionary (Local Client Mode)
  const addMatchUpdate = (newDict: any) => {
    setMatchData((prev: any) => {
      if (!prev) return newDict;

      // Merge arrays to support streaming history
      const merge = (key: string) => [...(prev[key] || []), ...(newDict[key] || [])];

      return {
        ...prev,
        ...newDict,
        turn_count: newDict.turn_count ?? prev.turn_count,
        p1_loc: merge("p1_loc"),
        p2_loc: merge("p2_loc"),
        paint_updates: merge("paint_updates"),
        beacon_updates: merge("beacon_updates"),
        p1_stamina: merge("p1_stamina"),
        p2_stamina: merge("p2_stamina"),
        p1_territory: merge("p1_territory"),
        p2_territory: merge("p2_territory"),
      };
    });
  };

  // Give the update function to the parent component on mount
  useEffect(() => {
    if (props.onRegisterUpdater) {
      props.onRegisterUpdater(addMatchUpdate);
    }
  }, [props.onRegisterUpdater]);

  // Update frames whenever matchData changes
  useEffect(() => {
    if (!matchData) return;

    const mapInfo = buildMapInfoFromMatch(matchData);
    
    // Initialize CanvasManager if it doesn't exist
    if (!canvasManager.current) {
      const spriteCanvas = document.getElementById("sprite-canvas") as HTMLCanvasElement;
      const bgCanvas = document.getElementById("background-canvas") as HTMLCanvasElement;
      canvasManager.current = new CanvasManager(mapInfo, spriteCanvas, bgCanvas);
    }

    const allFrames = buildFramesFromMatch(matchData, mapInfo.width, mapInfo.height);
    setFrames(allFrames);

    // If we were at the end of a live stream, auto-advance
    if (isPlaying && props.currentTurn >= allFrames.length - 2) {
      props.setCurrentTurn && props.setCurrentTurn(allFrames.length - 1);
    }
  }, [matchData]);

  // --- Rendering Loop ---
  useEffect(() => {
    if (!canvasManager.current || frames.length === 0) return;
    const clampedTurn = Math.max(0, Math.min(props.currentTurn, frames.length - 1));
    canvasManager.current.drawGameState(frames[clampedTurn]);
  }, [props.currentTurn, frames]);


  React.useEffect(() => {
    const spriteCanvas = document.getElementById("sprite-canvas")! as HTMLCanvasElement;
    const backgroundCanvas = document.getElementById("background-canvas")! as HTMLCanvasElement;

    const mapInfo = buildMapInfoFromMatch(matchData);
    const cm = new CanvasManager(mapInfo, spriteCanvas, backgroundCanvas);
    canvasManager.current = cm;

    const allFrames = buildFramesFromMatch(matchData, mapInfo.width, mapInfo.height);
    setFrames(allFrames);
    props.setCurrentTurn && props.setCurrentTurn(0);
    setIsPlaying(false);

    // draw first frame (static map will be drawn automatically
    // once all tile images are loaded inside CanvasManager.preloadAssets)
    if (allFrames.length > 0) {
      cm.drawGameState(allFrames[0]);
    }

    return () => {
      canvasManager.current = null;
    };
  }, [matchData]);

  React.useEffect(() => {
    if (!canvasManager.current || frames.length === 0) {
      return;
    }
    const clampedTurn = Math.max(0, Math.min(props.currentTurn, frames.length - 1));
    canvasManager.current.drawGameState(frames[clampedTurn]);
  }, [props.currentTurn, frames]);

  // auto-play effect
  React.useEffect(() => {
    if (!isPlaying || frames.length === 0) {
      return;
    }

    const intervalDuration = 500 / Math.max(playbackSpeed, 0.25); // base 500ms at 1x

    const interval = window.setInterval(() => {
      props.setCurrentTurn?.((prev) => {
        if (frames.length === 0) {
          return prev;
        }
        const max = frames.length - 1;
        if (prev >= max) {
          // reached the end, stop playing
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, intervalDuration);

    return () => {
      window.clearInterval(interval);
    };
  }, [isPlaying, frames, playbackSpeed]);

  return (
    <TransformWrapper limitToBounds={false} minScale={0.1}>
      <TransformComponent contentClass="pan-content" wrapperClass="pan-container">
        <div id="canvas-container">
          <canvas id="background-canvas"></canvas>
          <canvas id="sprite-canvas"></canvas>
        </div>
      </TransformComponent>
    </TransformWrapper>
  );
};