import type { BeaconOwner, GamePGN, GamePGNDiff, GameRenderState, MapDataOptionalSpawnpts, PowerupCellState } from "../../common/types";
import { make2DArray, oob } from "./utils";

import _EMPTY_GAME_PGN from "./defaults/EMPTY_GAME_PGN.json";
const EMPTY_GAME_PGN = _EMPTY_GAME_PGN as unknown as GamePGN;
import _DEFAULT_MAP_DATA from "./defaults/DEFAULT_MAP_DATA.json";
const DEFAULT_MAP_DATA = _DEFAULT_MAP_DATA as unknown as MapDataOptionalSpawnpts;

/**
 * Owns the state of the game and handles any live-update logic (for livestreamed games)
 */
export class GamestateManager {

  /** 
   * Caches render-ready representations of the board (game pgn itself is just diffs). 
   * The element at index [i] is the game frame AFTER turn i takes place. Turn 0 is always the NONE turn.
   * CONTRACT: should always be contiguous from 0 to the current furthest computed turn.
   * ^ follow or else fired. THANK YOU FOR YOUR ATTENTION TO THIS MATTER. -President DOnald J Trump
   */
  computedGameFrames: GameRenderState[] = [];

  /**
   * highest frame in the game that has been computed (stored in computedGameFrames and ready to render).
   * only making this to avoid off-by-ones (computedGameFrames.length = 1 actually means 0 is the highest frame)
   */
  get highestComputedTurn(): number {
    return this.computedGameFrames.length - 1;
  }

  /** map that the game is being played on. */
  mapData: MapDataOptionalSpawnpts;

  /**
   * All the game data we have (can be partial in the case of livestreaming or can be full if we have it all)
   */
  gamePGN: GamePGN;


  constructor(initMapData?: MapDataOptionalSpawnpts, initPGN?: GamePGN) {
    this.gamePGN = structuredClone(initPGN ?? EMPTY_GAME_PGN);
    this.mapData = structuredClone(initMapData ?? DEFAULT_MAP_DATA);

    // can already initialize first frame since 0th turn is always NONE
    this.computedGameFrames[0] = GamestateManager.getInitialGameFrame(this.mapData);
  }

  /** 
   * fetch the frame at the specified frame. Frame i = state of the game AFTER turn i. 
   * If jumping (e.g. only turns 1-50 have been computed, but we jump to round 1300),
   * then this will calculate and cache every frame in between before returning. 
   */
  getGameFrame(frame: number): GameRenderState {
    if (this.highestComputedTurn < frame) {
      // need to compute
      this.computeGameUpTo(frame);
    }
    return this.computedGameFrames[frame];
  }

  updateGamePGN(diff: GamePGNDiff): void {
    this.gamePGN.p1_time_left.push(diff.p1_time_left);
    this.gamePGN.p2_time_left.push(diff.p2_time_left);

    this.gamePGN.p1_loc.push(diff.p1_loc);
    this.gamePGN.p2_loc.push(diff.p2_loc);

    this.gamePGN.p1_stamina.push(diff.p1_stamina);
    this.gamePGN.p2_stamina.push(diff.p2_stamina);

    this.gamePGN.p1_max_stamina.push(diff.p1_max_stamina);
    this.gamePGN.p2_max_stamina.push(diff.p2_max_stamina);

    this.gamePGN.p1_territory.push(diff.p1_territory);
    this.gamePGN.p2_territory.push(diff.p2_territory);

    this.gamePGN.parity_playing.push(diff.parity_playing);

    this.gamePGN.paint_updates.push(diff.paint_updates);
    this.gamePGN.beacon_updates.push(diff.beacon_updates);
    this.gamePGN.powerup_updates.push(diff.powerup_updates);

    this.gamePGN.actions.push(diff.actions);

    this.gamePGN.turn_count++;
  }

  /** Reset the internal state. should be used once when starting to render a new game */
  reset(newMapData: MapDataOptionalSpawnpts, newInitPGN: GamePGN) {
    this.mapData = structuredClone(newMapData);
    this.gamePGN = structuredClone(newInitPGN);
    this.computedGameFrames.length = 0; // clear cache
    this.computedGameFrames[0] = GamestateManager.getInitialGameFrame(this.mapData);
  }

  /** get the initial empty board based on map data */
  static getInitialGameFrame(mapData: MapDataOptionalSpawnpts): GameRenderState {
    return {
      p1Loc: mapData.spawnpointBlue,
      p2Loc: mapData.spawnpointGreen,
      paint: make2DArray<number>(mapData.size[1], mapData.size[0], 0),
      beacons: make2DArray<BeaconOwner>(mapData.size[1], mapData.size[0], null),
      powerups: make2DArray<PowerupCellState>(mapData.size[1], mapData.size[0], { hasHealth: false, hasStamina: false }),
    }
  }

  /** populates computedGameFrames up to and including `frame`. Doesnt recompute already stored ones. */
  private computeGameUpTo(frame: number): void {
    const mapR = this.mapData.size[0];
    const mapC = this.mapData.size[1];

    let prevState = structuredClone(this.computedGameFrames[this.highestComputedTurn]);

    for (let calcTurn = this.highestComputedTurn+1; calcTurn <= frame; calcTurn++) {
      // paint
      const paintUpdates = this.gamePGN.paint_updates[calcTurn];
      if (paintUpdates) {
        for (const key of Object.keys(paintUpdates)) {
          const flatIndex = Number(key);
          if (Number.isNaN(flatIndex)) continue;
          const value = paintUpdates[key as `${number}`];
          const r = Math.floor(flatIndex / mapC);
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
          const r = Math.floor(flatIndex / mapC);
          const c = flatIndex % mapC;
          if (oob([r, c], this.mapData.size)) continue;

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
          const r = Math.floor(flatIndex / mapC);
          const c = flatIndex % mapC;
          if (oob([r, c], this.mapData.size)) continue;

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