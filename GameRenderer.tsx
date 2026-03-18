import React, { useState } from "react";

import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { Download } from "lucide-react";

import smallMatch from "./matches_example/match.json";
import bigMatch from "./matches_example/big_match.json";
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
        if (typeof raw === "boolean") {
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
  player1Name?: string;
  player2Name?: string;
  onDownloadMatchJson?: () => void;
  // This callback gives the parent the ability to push new dictionaries
  onRegisterUpdater?: (updater: (newDict: any) => void) => void;
}

export const GameRenderer = ({
  initialData,
  player1Name,
  player2Name,
  onDownloadMatchJson,
  onRegisterUpdater,
}: GameRendererProps) => {
  const canvasManager = React.useRef<CanvasManager | null>(null);
  const [frames, setFrames] = React.useState<GameRenderState[]>([]);
  const [currentTurn, setCurrentTurn] = React.useState(0);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [playbackSpeed, setPlaybackSpeed] = React.useState(1); // 1x
  // const [selectedMatch, setSelectedMatch] = React.useState<"small" | "big">("small");
  const [matchData, setMatchData] = useState<any | null>(initialData);

  // const matchData = selectedMatch === "big" ? bigMatch : smallMatch;

  React.useEffect(() => {
    const spriteCanvas = document.getElementById("sprite-canvas")! as HTMLCanvasElement;
    const backgroundCanvas = document.getElementById("background-canvas")! as HTMLCanvasElement;

    const mapInfo = buildMapInfoFromMatch(matchData);
    const cm = new CanvasManager(mapInfo, spriteCanvas, backgroundCanvas);
    canvasManager.current = cm;

    const allFrames = buildFramesFromMatch(matchData, mapInfo.width, mapInfo.height);
    setFrames(allFrames);
    setCurrentTurn(0);
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
    const clampedTurn = Math.max(0, Math.min(currentTurn, frames.length - 1));
    canvasManager.current.drawGameState(frames[clampedTurn]);
  }, [currentTurn, frames]);

  // auto-play effect
  React.useEffect(() => {
    if (!isPlaying || frames.length === 0) {
      return;
    }

    const intervalDuration = 500 / Math.max(playbackSpeed, 0.25); // base 500ms at 1x

    const interval = window.setInterval(() => {
      setCurrentTurn((prev) => {
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

  const maxTurn = frames.length > 0 ? frames.length - 1 : 0;
  const infoIndex = Math.max(0, Math.min(currentTurn, maxTurn));

  const p1Stamina = matchData.p1_stamina?.[infoIndex] ?? null;
  const p2Stamina = matchData.p2_stamina?.[infoIndex] ?? null;
  const p1MaxStamina = matchData.p1_max_stamina?.[infoIndex] ?? null;
  const p2MaxStamina = matchData.p2_max_stamina?.[infoIndex] ?? null;
  const p1Territory = matchData.p1_territory?.[infoIndex] ?? null;
  const p2Territory = matchData.p2_territory?.[infoIndex] ?? null;
  const p1TimeLeft = matchData.p1_time_left?.[infoIndex] ?? null;
  const p2TimeLeft = matchData.p2_time_left?.[infoIndex] ?? null;
  const currentPlayer = currentTurn % 2 === 0 ? 1 : 2;
  const winner = matchData.result ?? null;
  const gameEnd = currentTurn >= maxTurn;
  const reasonEnded = matchData.reason;
  return (
    <div className="app-root">
      <div className="controls">
        {/* <label style={{ marginRight: 12, fontSize: 13 }}>
          <span style={{ marginRight: 4 }}>Match:</span>
          <select
            value={selectedMatch}
            onChange={(e) =>
              setSelectedMatch(e.target.value === "big" ? "big" : "small")
            }
          >
            <option value="small">Small match</option>
            <option value="big">Big match</option>
          </select>
        </label> */}

        <button
          type="button"
          onClick={() =>
            setCurrentTurn((prev) => Math.max(0, Math.min(maxTurn, prev - 1)))
          }
          disabled={currentTurn <= 0}
        >
          {"<"}
        </button>
        <button
          type="button"
          onClick={() => {
            if (!isPlaying) {
              // if we're at the end, restart from the beginning
              if (currentTurn >= maxTurn && maxTurn > 0) {
                setCurrentTurn(0);
              }
              setIsPlaying(true);
            } else {
              setIsPlaying(false);
            }
          }}
          disabled={frames.length === 0}
        >
          {isPlaying ? "Pause" : "Play"}
        </button>
        <button
          type="button"
          onClick={() =>
            setCurrentTurn((prev) => Math.max(0, Math.min(maxTurn, prev + 1)))
          }
          disabled={currentTurn >= maxTurn}
        >
          {">"}
        </button>
        <span>Turn {currentTurn} / {maxTurn}</span>
        <input
          type="range"
          min={0}
          max={maxTurn}
          value={currentTurn}
          onChange={(e) => {
            setIsPlaying(false);
            setCurrentTurn(Number(e.target.value));
          }}
          style={{ marginLeft: 12, width: 220, accentColor: "#ffd700" }}
          disabled={frames.length === 0}
        />
        <label style={{ marginLeft: 12, fontSize: 13 }}>
          <span style={{ marginRight: 4 }}>Speed:</span>
          <select
            value={playbackSpeed}
            onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
          >
            <option value={0.5}>0.5x</option>
            <option value={1}>1x</option>
            <option value={2}>2x</option>
            <option value={4}>4x</option>
            <option value={8}>8x</option>
          </select>
        </label>
        {onDownloadMatchJson && (
          <button
            type="button"
            onClick={onDownloadMatchJson}
            title="Download complete match JSON"
            style={{
              marginLeft: 12,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Download size={14} />
            Download Match JSON
          </button>
        )}
      </div>

      <div className="info-panel">
        <div className={`player-info player-1 player-panel ${
          gameEnd
            ? winner === "PLAYER_1"
              ? "active"
              : "inactive"
            : currentPlayer === 1
            ? "active"
            : "inactive"
        }`}>
          <h3>
            {player1Name} (Blue)
            {gameEnd && winner === "PLAYER_1" && (
              <span className="winner-icon">👑</span>
            )}
          </h3>

          {gameEnd && winner === "PLAYER_1" && (
            <div className="win-reason">Win Reason: {reasonEnded.replace("_", " ")}</div>
          )}
          
          <div>Bid: {matchData.p1_bid}</div>
          {p1Stamina !== null && p1MaxStamina !== null && (
            <div>
              Stamina: {p1Stamina} / {p1MaxStamina}
            </div>
          )}
          {p1Territory !== null && <div>Territory: {p1Territory}</div>}
          {p1TimeLeft !== null && (
            <div>Time left: {p1TimeLeft.toFixed(3)}s</div>
          )}
        </div>
        <div className={`player-info player-2 player-panel ${
          gameEnd
            ? winner === "PLAYER_2"
              ? "active"
              : "inactive"
            : currentPlayer === 2
            ? "active"
            : "inactive"
        }`}>
          <h3>
            {player2Name} (Green)
            {gameEnd && winner === "PLAYER_2" && (
              <span className="winner-icon">👑</span>
            )}
          </h3>

          {gameEnd && winner === "PLAYER_2" && (
            <div className="win-reason">Win Reason: {reasonEnded.replace("_", " ")}</div>
          )}
          <div>Bid: {matchData.p2_bid}</div>
          {p2Stamina !== null && p2MaxStamina !== null && (
            <div>
              Stamina: {p2Stamina} / {p2MaxStamina}
            </div>
          )}
          {p2Territory !== null && <div>Territory: {p2Territory}</div>}
          {p2TimeLeft !== null && (
            <div>Time left: {p2TimeLeft.toFixed(3)}s</div>
          )}
        </div>
      </div>

      <TransformWrapper>
        <TransformComponent wrapperClass="pan-container">
          <div id="canvas-container" className="grid">
            <canvas id="background-canvas" className="col-start-1 row-start-1" />
            <canvas id="sprite-canvas" className="col-start-1 row-start-1" />
          </div>
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
};