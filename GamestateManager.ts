import type { GamePGN, GameFrame } from "./types";
import { make2DArray, oob } from "./utils";

/**
 * Owns the state of the game and handles any live-update logic (for livestreamed games)
 */
export class GamestateManager {

  computedGameFrames: GameFrame[] = [];

  /**
   * All the game data we have. no livestreaming for this game, so should always
   * be either full, or null (when no game is loaded on the visualizer)
   */
  gamePGN: GamePGN | null;


  constructor(initPGN: GamePGN | null) {
    this.gamePGN = structuredClone(initPGN);

    // can already initialize first frame
    if (initPGN) {
      this.computedGameFrames[0] = GamestateManager.getInitialGameFrame(initPGN);
    }
  }

  /** 
   * fetch the frame at the specified frame. Frame i = state of the game BEFORE turn i.
   * If no gamePGN (=null), always returns null (signifies empty board)
   */
  getGameFrame(frame: number): GameFrame | null {
    if (this.gamePGN === null) {
      return null;
    }

    if (this.computedGameFrames.length <= frame) {
      // need to compute
      this.computeGameUpTo(frame);
    }
    return this.computedGameFrames[frame];
  }

  /** Reset the internal state. should be used once when starting to render a new game */
  reset(newInitPGN: GamePGN | null) {
    this.gamePGN = structuredClone(newInitPGN);
    this.computedGameFrames.length = 0; // clear cache
    if (newInitPGN !== null) {
      this.computedGameFrames.push(GamestateManager.getInitialGameFrame(newInitPGN));
    }
  }

  /** get the initial empty board based on map data */
  static getInitialGameFrame(initPGN: GamePGN): GameFrame {
    return {
      redLoc: initPGN.a_pos[0],
      yellowLoc: initPGN.b_pos[0],
      ratLoc: initPGN.rat_position_history[0],

      wasRatCaught: initPGN.rat_caught[0],

      aPoints: initPGN.a_points[0],
      bPoints: initPGN.b_points[0],
      aTurnsLeft: initPGN.a_turns_left[0],
      bTurnsLeft: initPGN.b_turns_left[0],
      aTimeLeft: initPGN.a_time_left[0],
      bTimeLeft: initPGN.b_time_left[0],

      carpetedTiles: [], // these r player caused, so should start off empty
      gluedTiles: [], // these r player caused, so should start off empty start off empty
    } satisfies GameFrame;
  }

  /**
   * populates computedGameFrames up to and including `frame`. Doesnt recompute already stored ones.
   * Reqiures frame be valid (in range 0..=turn_count).
   */
  private computeGameUpTo(frame: number): void {
    if (this.gamePGN === null) {
      console.warn(`[GamestateManager.computeGameUpTo] asked to compute frame ${frame} but no gamePGN loaded`);
      return;
    }
    if (this.computedGameFrames.length === 0) {
      this.computedGameFrames.push(GamestateManager.getInitialGameFrame(this.gamePGN));
    }

    for (let calcFrame = this.computedGameFrames.length; calcFrame <= frame; calcFrame++) {
      let prevGluedTiles = structuredClone(this.computedGameFrames.at(-1)?.gluedTiles ?? []);
      let prevCarpetedTiles = structuredClone(this.computedGameFrames.at(-1)?.carpetedTiles ?? []);

      // update glued tiles map.
      // if left_behind is "prime" for THIS frame, glue action was taken prev. frame and should be visible NOW!
      const leftBehind = this.gamePGN.left_behind[calcFrame];
      if (leftBehind === "prime") {
        if (frame % 2 === 1) {
          // a just moved. use their previous position (-2) as glue pos
          // this is safe since calcFrame should always be >=1.
          prevGluedTiles.push(this.gamePGN.a_pos[calcFrame-1]);
        } else {
          // otherwise use b
          prevGluedTiles.push(this.gamePGN.b_pos[calcFrame-1]);
        }
      }
      
      prevCarpetedTiles.push(...this.gamePGN.new_carpets[calcFrame]);

      this.computedGameFrames[calcFrame] = {
        redLoc: this.gamePGN.a_pos[calcFrame],
        yellowLoc: this.gamePGN.b_pos[calcFrame],
        ratLoc: this.gamePGN.rat_position_history[calcFrame],

        wasRatCaught: this.gamePGN.rat_caught[calcFrame],

        aPoints: this.gamePGN.a_points[calcFrame],
        bPoints: this.gamePGN.b_points[calcFrame],
        aTurnsLeft: this.gamePGN.a_turns_left[calcFrame],
        bTurnsLeft: this.gamePGN.b_turns_left[calcFrame],
        aTimeLeft: this.gamePGN.a_time_left[calcFrame],
        bTimeLeft: this.gamePGN.b_time_left[calcFrame],

        carpetedTiles: prevCarpetedTiles,
        gluedTiles: prevGluedTiles,
      } satisfies GameFrame;
    }
  }
}
