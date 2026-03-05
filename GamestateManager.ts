import { BeaconOwner, GamePGN, GameRenderState, MapData, MapLoc, PowerupCellState, Symmetry } from "./types";
import { applySymmetry, make2DArray, mergeArrayField, mergeArrays, oob } from "./utils";

import _EMPTY_GAME_PGN from "./defaults/EMPTY_GAME_PGN.json";
const EMPTY_GAME_PGN = _EMPTY_GAME_PGN as GamePGN;
import _DEFAULT_MAP_DATA from "./defaults/DEFAULT_MAP_DATA.json";
const DEFAULT_MAP_DATA = _DEFAULT_MAP_DATA as MapData;

/**
 * Owns the state of the game and handles any live-update logic (for livestreamed games)
 */
export class GamestateManager {

  /** 
   * Caches render-ready representations of the board (game pgn itself is just diffs). 
   * The element at index [i] is the game frame AFTER turn i takes place.
   * Note that as of writing this, turn 0 is always NONE so frame at index 0 will be the initial state.
   * CONTRACT: should always be contiguous from 0 to the current furthest computed turn.
   * ^ follow or else fired. THANK YOU FOR YOUR ATTENTION TO THIS MATTER. -President DOnald J Trump
   */
  computedGameFrames: GameRenderState[] = [];

  /**
   * highest turn in the game that has been computed (stored in computedGameFrames and ready to render).
   * only making this to avoid off-by-ones (computedGameFrames.length = 1 actually means 0 is the highest turn)
   */
  get highestComputedTurn(): number {
    return this.computedGameFrames.length - 1;
  }

  /** map that the game is being played on. */
  mapData: MapData;

  /**
   * All the game data we have (can be partial in the case of livestreaming or can be full if we have it all)
   */
  gamePGN: GamePGN;


  constructor(initMapData?: MapData, initPGN?: GamePGN) {
    this.gamePGN = initPGN ?? EMPTY_GAME_PGN;
    this.mapData = initMapData ?? DEFAULT_MAP_DATA;

    // can already initialize first frame since 0th turn is always NONE
    this.computedGameFrames[0] = GamestateManager.getInitialGameFrame(this.mapData);
  }

  /** 
   * fetch the frame at the specified turn. 
   * If jumping (e.g. only turns 1-50 have been computed, but we jump to round 1300),
   * then this will calculate and cache every frame in between before returning. 
   */
  getGameFrame(turn: number): GameRenderState {
    if (this.highestComputedTurn < turn) {
      // need to compute
      this.computeGameUpTo(turn);
    }
    return this.computedGameFrames[turn];
  }

  updateGamePGN(newPGN: Partial<GamePGN>): void {
    if (!this.gamePGN) {
      this.gamePGN = newPGN as GamePGN;
      return;
    }

    const KEYS_TO_ARRAYMERGE = [
      "p1_loc",
      "p2_loc",
      "paint_updates",
      "beacon_updates",
      "powerup_updates",
      "p1_stamina",
      "p2_stamina",
      "p1_territory",
      "p2_territory"
    ] as (keyof GamePGN)[];

    // Merge arrays to support streaming history
    this.gamePGN = {
      ...this.gamePGN,
      ...newPGN,
      turn_count: newPGN.turn_count ?? this.gamePGN.turn_count,
    };

    for (const key of KEYS_TO_ARRAYMERGE) {
      mergeArrayField(key, this.gamePGN, newPGN);
    }
  }

  /** Reset the internal state. should be used once when starting to render a new game */
  reset(newMapData: MapData, newInitPGN: GamePGN) {
    this.mapData = newMapData;
    this.gamePGN = newInitPGN;
    this.computedGameFrames.length = 0; // clear cache
    this.computedGameFrames[0] = GamestateManager.getInitialGameFrame(this.mapData);
  }

  /** get the initial empty board based on map data */
  static getInitialGameFrame(mapData: MapData): GameRenderState {
    return {
      p1Loc: mapData.spawnpointGreen,
      p2Loc: applySymmetry(mapData.spawnpointGreen, mapData.symmetry, mapData.size.c, mapData.size.r),
      paint: make2DArray<number>(mapData.size.c, mapData.size.r, 0),
      beacons: make2DArray<BeaconOwner>(mapData.size.c, mapData.size.r, null),
      powerups: make2DArray<PowerupCellState>(mapData.size.c, mapData.size.r, { hasHealth: false, hasStamina: false }),
    }
  }

  /** populates computedGameFrames up to and including `turn`. Doesnt recompute already stored ones. */
  private computeGameUpTo(turn: number): void {
    const mapR = this.mapData.size.r;
    const mapC = this.mapData.size.c;

    let prevState = this.computedGameFrames[this.highestComputedTurn];

    for (let calcTurn = this.highestComputedTurn+1; calcTurn <= turn; calcTurn++) {

      // paint
      const paintUpdates = this.gamePGN.paint_updates[calcTurn];
      if (paintUpdates) {
        for (const key of Object.keys(paintUpdates)) {
          const flatIndex = Number(key);
          if (Number.isNaN(flatIndex)) continue;
          const value = paintUpdates[key as `${number}`];
          const r = Math.floor(flatIndex / mapR);
          const c = flatIndex % mapC;
          if (r >= 0 && r < mapR && c >= 0 && c < mapC) {
            prevState.paint[r][c] = value;
          }
        }
      }

      // beacons
      const beaconUpdates = this.gamePGN.beacon_updates[calcTurn];
      if (beaconUpdates) {
        const parity = this.gamePGN.parity_playing[calcTurn] as number | undefined;
        const currentPlayer: "P1" | "P2" | null =
          parity === 1 ? "P1" : parity === -1 ? "P2" : null;

        for (const [key, raw] of Object.entries(beaconUpdates)) {
          const flatIndex = Number(key);
          if (Number.isNaN(flatIndex)) continue;
          const r = Math.floor(flatIndex / mapR);
          const c = flatIndex % mapC;
          if (oob({ r, c }, this.mapData.size)) continue;

          if (typeof raw === "boolean") {
            prevState.beacons[r][c] = raw && currentPlayer ? currentPlayer : null;
          } else if (typeof raw === "number") {
            if (raw === 0) {
              prevState.beacons[r][c] = null;
            } else if (currentPlayer) {
              prevState.beacons[r][c] = currentPlayer;
            }
          }
        }
      }

      // powerups (none in current example, but wired generically)
      const powerupUpdates = this.gamePGN.powerup_updates[calcTurn];
      if (powerupUpdates) {
        for (const [key, raw] of Object.entries(powerupUpdates)) {
          const flatIndex = Number(key);
          if (Number.isNaN(flatIndex)) continue;
          const r = Math.floor(flatIndex / mapR);
          const c = flatIndex % mapC;
          if (oob({ r, c }, this.mapData.size)) continue;

          // as of now, no health powerups
          prevState.powerups[r][c].hasStamina = raw;
        }
      }

      this.computedGameFrames.push({
        p1Loc: this.gamePGN.p1_loc[calcTurn],
        p2Loc: this.gamePGN.p2_loc[calcTurn],
        paint: structuredClone(prevState.paint),
        beacons: structuredClone(prevState.beacons),
        powerups: structuredClone(prevState.powerups),
      });
    }
  }
}