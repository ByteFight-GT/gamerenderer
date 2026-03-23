import { PX_PER_TILE, Sprite, SPRITE_FILES } from "./spritesheet";
import type { GameRenderState, MapDataOptionalSpawnpts, MapLoc } from "./types";
import { oob } from "./utils";

import _DEFAULT_MAP_DATA from "./defaults/DEFAULT_MAP_DATA.json";
const DEFAULT_MAP_DATA = _DEFAULT_MAP_DATA as unknown as MapDataOptionalSpawnpts;

/**
 * Handler for rendering game things onto a canvas element.
 */
export class CanvasManager {
  public spriteCanvas?: HTMLCanvasElement;
  public backgroundCanvas?: HTMLCanvasElement;
  public spriteCtx?: CanvasRenderingContext2D;
  public backgroundCtx?: CanvasRenderingContext2D;

  private spriteImages: Partial<Record<Sprite, HTMLImageElement>> = {};

  public mapData: MapDataOptionalSpawnpts;

  /** whether spawnpoints will be rendered. During games probably not, but for the mapbuilder they should */
  public shouldShowSpawnpoints = false;
  set shouldShowSpawnPoints(value: boolean) {
    this.shouldShowSpawnpoints = value;
    if (this.backgroundCanvas) {
      this.blitMap(); // update immediately on change
    }
  }

  constructor(
    mapData?: MapDataOptionalSpawnpts,
    spriteCanvas?: HTMLCanvasElement,
    backgroundCanvas?: HTMLCanvasElement,
    shouldShowSpawnpoints: boolean = false,
  ) {
    this.mapData = structuredClone(mapData ?? DEFAULT_MAP_DATA);
    this.shouldShowSpawnpoints = shouldShowSpawnpoints;

    if (spriteCanvas && backgroundCanvas) {
      this.registerCanvases(spriteCanvas, backgroundCanvas);
    }
  }

  /**
   * Registers canvas elements and 2D contexts.
   * Throws if either canvas or context is unavailable.
   */
  registerCanvases(
    spriteCanvas: HTMLCanvasElement,
    backgroundCanvas: HTMLCanvasElement,
  ) {
    const spriteCtx = spriteCanvas.getContext("2d");
    const backgroundCtx = backgroundCanvas.getContext("2d");

    if (!spriteCtx || !backgroundCtx) {
      throw new Error("Unable to get 2D canvas contexts. Please report this!");
    }

    this.spriteCanvas = spriteCanvas;
    this.backgroundCanvas = backgroundCanvas;
    this.spriteCtx = spriteCtx;
    this.backgroundCtx = backgroundCtx;

    this.preloadAssets();
    this.updateCanvasSize();
  }

  /** returns [r, c] from CLIENT COORDS (pixels from top-left of VIEWPORT) */
  getRCFromClientCoords(clientX: number, clientY: number): MapLoc {
    this.ensureCanvasReady();

    const rect = this.spriteCanvas.getBoundingClientRect();

    // converted cr -> uv: [0-1] where 0,0=topleft, 1,1=bottomright
    // IMPORTANT! spriteCanvas.width/height is FAKE NEWS here, since react-zoom-pan-pinch
    // uses some css transform or something that the canvas itself doesnt know about.
    // so we use rect instead. THANK YOU FOR YOUR ATTENTION TO THIS MATTER. -President Donald J Trump
    const u = (clientX - rect.left) / rect.width;
    const v = (clientY - rect.top) / rect.height;

    // using num of tiles in mapdata to calc, cuz the actual canvas can be zoom-pan-pinched

    const c = Math.floor(u * this.mapData.size[1]);
    const r = Math.floor(v * (this.mapData.size[0]+1)); // [!!] +1 for that decorative row at the bottom

    return [r, c];
  }

  /** returns [r, c] from canvas pixel coords (pixels from top-left of CANVAS) */
  getRCFromCanvasCoords(canvasX: number, canvasY: number): MapLoc {
    this.ensureCanvasReady();

    const c = Math.floor(canvasX / PX_PER_TILE);
    const r = Math.floor(canvasY / PX_PER_TILE);

    return [r, c];
  }

  /**
   * Resolves mouse coords to a playable tile and returns that tile's center in local canvas pixels.
   * Returns null when the cursor is outside the playable board (including the decorative bottom row).
   */
  clampClientCoordsToPlayableTile(clientX: number, clientY: number): { x: number; y: number } | null {
    this.ensureCanvasReady();
    
    const rc = this.getRCFromClientCoords(clientX, clientY);

    // reject decorative row and out-of-bounds indices
    if (oob(rc, this.mapData.size)) {
      return null;
    }

    return {
      x: (rc[1] + 0.5) * PX_PER_TILE,
      y: (rc[0] + 0.5) * PX_PER_TILE,
    };
  }

  /** throws an error if any of the canvas things are unavailable */
  private ensureCanvasReady(): asserts this is {
    spriteCanvas: HTMLCanvasElement;
    backgroundCanvas: HTMLCanvasElement;
    spriteCtx: CanvasRenderingContext2D;
    backgroundCtx: CanvasRenderingContext2D;
  } {
    if (
      !this.spriteCanvas ||
      !this.backgroundCanvas ||
      !this.spriteCtx ||
      !this.backgroundCtx
    ) {
      throw new Error(
        "Canvas elements/contexts are not registered. Try visiting the [Game] page.",
      );
    }
  }

  drawGameState(state: GameRenderState) {
    this.ensureCanvasReady();
    this.clearSpriteCanvas();

    const { paint, beacons, powerups, p1Loc, p2Loc } = state;

    // draw paint as colored overlays
    if (paint) {
      for (let r = 0; r < this.mapData.size[0]; r++) {
        for (let c = 0; c < this.mapData.size[1]; c++) {

          let sprite: Sprite | null = null;
          switch (paint[r][c]) {
            case 1: sprite = Sprite.BLUE_TILE_1; break;
            case 2: sprite = Sprite.BLUE_TILE_2; break;
            case 3: sprite = Sprite.BLUE_TILE_3; break;
            case 4: sprite = Sprite.BLUE_TILE_4; break;
            case -1: sprite = Sprite.GREEN_TILE_1; break;
            case -2: sprite = Sprite.GREEN_TILE_2; break;
            case -3: sprite = Sprite.GREEN_TILE_3; break;
            case -4: sprite = Sprite.GREEN_TILE_4; break;
          }

          if (sprite) {
            this.blitSpriteOnTile(sprite, r, c);
          }
        }
      }
    }

    // draw beacons on top of paint
    if (beacons) {
      for (let r = 0; r < this.mapData.size[0]; r++) {
        for (let c = 0; c < this.mapData.size[1]; c++) {
          const owner = beacons[r][c];
          if (!owner) continue;

          if (owner === "P1") {
            this.blitSpriteOnTile(Sprite.BEACON_BLUE, r, c);
          } else {
            this.blitSpriteOnTile(Sprite.BEACON_GREEN, r, c);
          }
        }
      }
    }

    // draw powerups
    if (powerups) {
      for (let r = 0; r < this.mapData.size[0]; r++) {
        for (let c = 0; c < this.mapData.size[1]; c++) {
          const cell = powerups[r][c];
          if (!cell) continue;

          if (cell.hasHealth) {
            this.blitSpriteOnTile(
              Sprite.POWERUP_HEALTH,
              r,
              c,

            );
          }

          if (cell.hasStamina) {
            this.blitSpriteOnTile(
              Sprite.POWERUP_STAMINA,
              r,
              c,
            );
          }
        }
      }
    }

		// draw HILL_BORDER where all the hills are
		// these dont mask the actual paint, but they do help
		// show where the hills actually are
		for (const hillId in this.mapData.hillLocs) {
			for (const [r, c] of this.mapData.hillLocs[hillId]) {
				this.blitSpriteOnTile(Sprite.HILL_BORDER, r, c);
			}
		}

    // draw players last so they are on top
    if (p1Loc) {
      this.blitSpriteOnTile(Sprite.PLAYER_BLUE, p1Loc[0], p1Loc[1]);
    }
    if (p2Loc) {
      this.blitSpriteOnTile(Sprite.PLAYER_GREEN, p2Loc[0], p2Loc[1]);
    }
  }

  /**
   * preloads assets for the game (sprites, map textures, etc.).
   */
  preloadAssets() {
    this.ensureCanvasReady();

    this.spriteCtx.imageSmoothingEnabled = false;
    this.backgroundCtx.imageSmoothingEnabled = false;

    const entries = Object.entries(SPRITE_FILES) as [string, string][];
    let loaded = 0;

    for (const [key, src] of entries) {
      const sprite = Number(key) as Sprite;
      const img = new Image();

      img.onload = () => {
        this.spriteImages[sprite] = img;
        loaded++;

        if (loaded === entries.length) {
          this.blitMap(); // draw once when everything is ready
        }
      };

      img.src = src;
    }
  }

  blitSpriteOnTile(
    name: Sprite,
    tileR: number,
    tileC: number,
    dr: number = 0,
    dc: number = 0,
  ) {
    this.ensureCanvasReady();

    const img = this.spriteImages[name];
    if (!img) {
      console.warn(`Tried to blit sprite ${Sprite[name]} but it was not loaded yet.`);
      return;
    }

    this.spriteCtx.drawImage(
      img,
      tileC * PX_PER_TILE + dc,
      tileR * PX_PER_TILE + dr,
      PX_PER_TILE,
      PX_PER_TILE,
    );
  }

  blitMap() {
    this.ensureCanvasReady();
    this.updateCanvasSize();

    const blitMapFeature = (
      featureName: Sprite,
      tileR: number,
      tileC: number,
    ) => {
      const img = this.spriteImages[featureName];
      if (!img) {
        return;
      }

      this.backgroundCtx.drawImage(
        img,
        tileC * PX_PER_TILE,
        tileR * PX_PER_TILE,
        PX_PER_TILE,
        PX_PER_TILE,
      );
    };

    for (let r = this.mapData.size[0]; --r >= 0; ) {
      for (let c = this.mapData.size[1]; --c >= 0; ) {
        if (c % 2 === r % 2) {
          blitMapFeature(Sprite.TILE_LIGHT, r, c);
        } else {
          blitMapFeature(Sprite.TILE_DARK, r, c);
        }
      }
    }

    const decoR = this.mapData.size[0];
    for (let c = 0; c < this.mapData.size[1]; c++) {
      blitMapFeature(Sprite.FLOATING_PIECE_BOTTOM, decoR, c);
    }

    for (const [r, c] of this.mapData.wallLocs) {
      blitMapFeature(Sprite.WALL, r, c);
    }

    for (const hillId in this.mapData.hillLocs) {
      for (const [r, c] of this.mapData.hillLocs[hillId]) {
        blitMapFeature(Sprite.HILL_LIGHT, r, c);
      }
    }

    // draw any spawnpoints as tiles if shouldShowSpawnpoints is true
    if (this.shouldShowSpawnpoints) {
      if (this.mapData.spawnpointBlue) {
        blitMapFeature(Sprite.BLUE_SPAWN, ...this.mapData.spawnpointBlue);
      }
      if (this.mapData.spawnpointGreen) {
        blitMapFeature(Sprite.GREEN_SPAWN, ...this.mapData.spawnpointGreen);
      }
    }
  }

  reset(newMapData: MapDataOptionalSpawnpts) {
    this.ensureCanvasReady();
    this.mapData = newMapData;
    this.clearSpriteCanvas();
    this.blitMap();
  }

  clearSpriteCanvas() {
    this.ensureCanvasReady();

    this.spriteCtx.clearRect(
      0,
      0,
      this.spriteCanvas.width,
      this.spriteCanvas.height,
    );
  }

  blitTestSprites() {}

  /**
   * Update the canvas elements' sizes based on map size
   */
  updateCanvasSize() {
    this.ensureCanvasReady();

    this.spriteCanvas.width = PX_PER_TILE * this.mapData.size[1];
    this.backgroundCanvas.width = PX_PER_TILE * this.mapData.size[1];

    // add one extra decorative row below the map
    this.spriteCanvas.height = PX_PER_TILE * (this.mapData.size[0] + 1);
    this.backgroundCanvas.height = PX_PER_TILE * (this.mapData.size[0] + 1);
  }
}
