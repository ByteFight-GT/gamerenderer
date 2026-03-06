import { PX_PER_TILE, Sprite, SPRITE_FILES } from "./spritesheet";
import { GameRenderState, MapData } from "./types";

import _DEFAULT_MAP_DATA from "./defaults/DEFAULT_MAP_DATA.json";
const DEFAULT_MAP_DATA = _DEFAULT_MAP_DATA as unknown as MapData;

/**
 * Handler for rendering game things onto a canvas element.
 */
export class CanvasManager {
  public spriteCanvas?: HTMLCanvasElement;
  public backgroundCanvas?: HTMLCanvasElement;
  public spriteCtx?: CanvasRenderingContext2D;
  public backgroundCtx?: CanvasRenderingContext2D;

  private spriteImages: Partial<Record<Sprite, HTMLImageElement>> = {};

  public mapData: MapData;

  constructor(
    mapData?: MapData,
    spriteCanvas?: HTMLCanvasElement,
    backgroundCanvas?: HTMLCanvasElement,
  ) {
    this.mapData = mapData ?? DEFAULT_MAP_DATA;

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
          const value = paint[r][c];
          if (value === 0) continue;

          const magnitude = Math.min(3, Math.abs(value));

          let sprite: Sprite;

          if (value > 0) {
						// blue player
						if (magnitude === 1) sprite = Sprite.BLUE_TILE_1;
						else if (magnitude === 2) sprite = Sprite.BLUE_TILE_2;
						else sprite = Sprite.BLUE_TILE_3;
					} else {
						// green player
						if (magnitude === 1) sprite = Sprite.GREEN_TILE_1;
						else if (magnitude === 2) sprite = Sprite.GREEN_TILE_2;
						else sprite = Sprite.GREEN_TILE_3;
					}

          this.blitSpriteOnTile(sprite, r, c);
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

    // draw players last so they are on top
    this.blitSpriteOnTile(Sprite.PLAYER_BLUE, p1Loc[0], p1Loc[1]);
    this.blitSpriteOnTile(Sprite.PLAYER_GREEN, p2Loc[0], p2Loc[1]);
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
  }

  reset(newMapData: MapData) {
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
