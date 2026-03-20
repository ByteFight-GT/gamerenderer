import React, { useState, useEffect, useRef } from "react";
import { CanvasManager } from "./CanvasManager";
import { GameRenderState, MapInfo, Symmetry, MapLoc } from "./types";

/* ---------------- SAFE STAT ---------------- */
function getSafeStat(arr: any[] | undefined, index: number) {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  return arr[Math.min(index, arr.length - 1)] ?? null;
}

/* ---------------- MAP ---------------- */
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

  const totalSteps = match.actions.length;

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

    // powerups
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


/* ---------------- COMPONENT ---------------- */
export const GameRenderer = ({ initialData, player1Name, player2Name }: any) => {
  const canvasManager = useRef<CanvasManager | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [frames, setFrames] = useState<GameRenderState[]>([]);
  const [currentTurn, setCurrentTurn] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [matchData, setMatchData] = useState(initialData);
  const [scale, setScale] = useState(1);

  /* INIT */
  useEffect(() => {
    if (!matchData) return;

    const spriteCanvas = document.getElementById("sprite-canvas") as HTMLCanvasElement;
    const backgroundCanvas = document.getElementById("background-canvas") as HTMLCanvasElement;

    const mapInfo = buildMapInfoFromMatch(matchData);
    const cm = new CanvasManager(mapInfo, spriteCanvas, backgroundCanvas);
    canvasManager.current = cm;

    const allFrames = buildFramesFromMatch(matchData, mapInfo.width, mapInfo.height);
    setFrames(allFrames);
    setCurrentTurn(0);
    setIsPlaying(false);

    if (allFrames.length > 0) {
      cm.drawGameState(allFrames[0]);
    }
  }, [matchData]);

  /* DRAW */
  useEffect(() => {
    if (!canvasManager.current || frames.length === 0) return;
    canvasManager.current.drawGameState(frames[currentTurn]);
  }, [currentTurn, frames]);

  /* PLAY */
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentTurn((prev) => {
        if (prev >= frames.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 500 / playbackSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, frames]);

  /* AUTO SCALE */
  useEffect(() => {
    function updateScale() {
      const container = containerRef.current;
      const canvas = document.getElementById("background-canvas") as HTMLCanvasElement;
      if (!container || !canvas) return;

      const scaleX = container.clientWidth / canvas.width;
      const scaleY = container.clientHeight / canvas.height;

      setScale(Math.min(scaleX, scaleY, 1));
    }

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [frames]);

  const maxTurn = frames.length - 1;
  const idx = Math.max(0, Math.min(currentTurn, maxTurn));

  const p1Stamina = getSafeStat(matchData.p1_stamina, idx);
  const p2Stamina = getSafeStat(matchData.p2_stamina, idx);
  const p1Territory = getSafeStat(matchData.p1_territory, idx);
  const p2Territory = getSafeStat(matchData.p2_territory, idx);
  const p1TimeLeft = getSafeStat(matchData.p1_time_left, idx);
  const p2TimeLeft = getSafeStat(matchData.p2_time_left, idx);
  const p1Bid = matchData.p1_bid;
  const p2Bid = matchData.p2_bid;

  const speedOptions = [1, 2, 4, 8];
  const winner = matchData.result;
  const reason = matchData.reason;

  return (
    <div style={{
      height: "100vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      background: "#111",
      fontFamily: "'Cascadia Mono', monospace",
      color: "#fff"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>

        {/* LEFT PANEL */}
        <div style={{
          minWidth: 260,
          minHeight: 340,
          boxSizing: "border-box",
          borderRadius: 12,
          padding: 16,
          textAlign: "center",
          background: "#1e1e1e",
          border: currentTurn % 2 === 0 ? "2px solid #FFD700" : "none",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-around"
        }}>
          <h3 style={{
            margin: 0,
            fontWeight: "bold",
            fontSize: 20,
            background: currentTurn % 2 === 0 ? "#fff" : "transparent",
            color: currentTurn % 2 === 0 ? "#1e1e1e" : "#fff",
            borderRadius: 4,
            padding: "4px 6px"
          }}>{player1Name || "Player 1"}</h3>
          <div>
            <div style={{ fontSize: 36, fontWeight: "bold", color: "#fff" }}>{p1Bid ?? 0}</div>
            <div style={{ fontSize: 14, color: "#ccc" }}>Bid</div>
          </div>
          <div>
            <div style={{ fontSize: 36, fontWeight: "bold", color: "#fff" }}>{p1Stamina ?? "-"}</div>
            <div style={{ fontSize: 14, color: "#ccc" }}>Stamina</div>
          </div>
          <div>
            <div style={{ fontSize: 36, fontWeight: "bold", color: "#fff" }}>{p1Territory ?? "-"}</div>
            <div style={{ fontSize: 14, color: "#ccc" }}>Territory</div>
          </div>
          <div>
            <div style={{ fontSize: 36, fontWeight: "bold", color: "#fff" }}>{p1TimeLeft ? p1TimeLeft.toFixed(2) : "-"}</div>
            <div style={{ fontSize: 14, color: "#ccc" }}>Time Left</div>
          </div>
        </div>

        {/* CENTER COLUMN */}
        <div ref={containerRef} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, position: "relative" }}>
          {/* GAME CANVAS + WINNER BANNER */}
          <div style={{ position: "relative", display: "grid" }}>
            {/* Added currentTurn === maxTurn condition here */}
            {winner && currentTurn === maxTurn && (
              <div style={{
                position: "absolute",
                top: -40,
                left: "50%",
                transform: "translateX(-50%)",
                background: "#1e1e1e",
                padding: "6px 12px",
                borderRadius: 6,
                textAlign: "center",
                zIndex: 10
              }}>
                <div style={{ color: "#FFD700", fontWeight: "bold", fontSize: 16 }}>
                  Winner: {winner}
                </div>
                <div style={{ color: "#ccc", fontSize: 14 }}>
                  Reason: {reason}
                </div>
              </div>
            )}
            <div style={{ transform: `scale(${scale})`, transformOrigin: "top center", display: "grid" }}>
              <canvas id="background-canvas" style={{ gridArea: "1 / 1" }} />
              <canvas id="sprite-canvas" style={{ gridArea: "1 / 1" }} />
            </div>
          </div>

          {/* CONTROLS */}
          <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "center", flexWrap: "wrap" }}>
            <button style={{ borderRadius: 8, padding: "6px 14px", background: "#222", color: "#fff", border: "none", cursor: "pointer" }}
              onClick={() => setCurrentTurn(Math.max(currentTurn - 1, 0))}>{"<"}</button>

            <button style={{ borderRadius: 8, padding: "6px 14px", background: "#FFD700", color: "#111", border: "none", cursor: "pointer" }}
              onClick={() => setIsPlaying(prev => !prev)}>{isPlaying ? "Pause" : "Play"}</button>

            <button style={{ borderRadius: 8, padding: "6px 14px", background: "#222", color: "#fff", border: "none", cursor: "pointer" }}
              onClick={() => setCurrentTurn(Math.min(currentTurn + 1, maxTurn))}>{">"}</button>

            {/* Slider */}
            <input type="range" min={0} max={maxTurn} value={currentTurn}
              onChange={(e) => setCurrentTurn(Number(e.target.value))}
              style={{
                width: 220,
                background: "transparent",
                border: "1px solid #444",
                WebkitAppearance: "none",
                height: 6,
                borderRadius: 2,
              }}
            />
            <style>{`
              input[type=range]::-webkit-slider-thumb {
                -webkit-appearance: none;
                height: 24px;
                width: 8px;
                background: #FFD700;
                cursor: pointer;
                border-radius: 4px;
              }
              input[type=range]::-moz-range-thumb {
                height: 24px;
                width: 8px;
                background: #FFD700;
                cursor: pointer;
                border-radius: 4px;
              }
            `}</style>

            {/* Speed Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
              {[0.5, 1, 4, 8].map(s => (
                <div key={s} style={{
                  padding: "6px 0",
                  textAlign: "center",
                  cursor: "pointer",
                  color: playbackSpeed === s ? "#FFD700" : "#fff",
                  fontWeight: playbackSpeed === s ? "bold" : "normal",
                  borderRadius: 4,
                  background: playbackSpeed === s ? "#222" : "transparent"
                }} onClick={() => setPlaybackSpeed(s)}>
                  {s}x
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div style={{
          minWidth: 260,
          minHeight: 340,
          boxSizing: "border-box",
          borderRadius: 12,
          padding: 16,
          textAlign: "center",
          background: "#1e1e1e",
          border: currentTurn % 2 === 1 ? "2px solid #FFD700" : "none",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-around"
        }}>
          <h3 style={{
            margin: 0,
            fontWeight: "bold",
            fontSize: 20,
            background: currentTurn % 2 === 1 ? "#fff" : "transparent",
            color: currentTurn % 2 === 1 ? "#1e1e1e" : "#fff",
            borderRadius: 4,
            padding: "4px 6px"
          }}>{player2Name || "Player 2"}</h3>
          <div>
            <div style={{ fontSize: 36, fontWeight: "bold", color: "#fff" }}>{p2Bid ?? 0}</div>
            <div style={{ fontSize: 14, color: "#ccc" }}>Bid</div>
          </div>
          <div>
            <div style={{ fontSize: 36, fontWeight: "bold", color: "#fff" }}>{p2Stamina ?? "-"}</div>
            <div style={{ fontSize: 14, color: "#ccc" }}>Stamina</div>
          </div>
          <div>
            <div style={{ fontSize: 36, fontWeight: "bold", color: "#fff" }}>{p2Territory ?? "-"}</div>
            <div style={{ fontSize: 14, color: "#ccc" }}>Territory</div>
          </div>
          <div>
            <div style={{ fontSize: 36, fontWeight: "bold", color: "#fff" }}>{p2TimeLeft ? p2TimeLeft.toFixed(2) : "-"}</div>
            <div style={{ fontSize: 14, color: "#ccc" }}>Time Left</div>
          </div>
        </div>

      </div>
    </div>
  );
};