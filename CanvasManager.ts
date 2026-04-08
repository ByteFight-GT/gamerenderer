import { PX_PER_TILE, Sprite, SPRITE_FILES } from "./spritesheet";
import type { GameFrame, MapLoc } from "./types";

const MAP_SIZE_R = 8;
const MAP_SIZE_C = 8;

/**
 * Handler for rendering game things onto a canvas element.
 */
export class CanvasManager {
  public spriteCanvas?: HTMLCanvasElement;
  public backgroundCanvas?: HTMLCanvasElement;
  public spriteCtx?: CanvasRenderingContext2D;
  public backgroundCtx?: CanvasRenderingContext2D;

  public spriteImages: Partial<Record<Sprite, HTMLImageElement>> = {};

  /** temporarily exists if assets are being preloaded. If null then feel free to do whatever */
  public preloadPromise: Promise<void> | null = null;

  constructor(
    spriteCanvas?: HTMLCanvasElement,
    backgroundCanvas?: HTMLCanvasElement,
  ) {
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

    this.updateCanvasSize();
    this.preloadAssets();
    this.blitMap(); // initial blank map
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
        "Canvas elements/contexts are not registered! Try refreshing or visiting a page that renders the board.",
      );
    }
  }

  /** 
   * if assets are still being loaded, schedule the action to run after loading.
   * otherwise just runs the action immediately.
   */
  private runOrScheduleDraw(action: () => void) {
    if (this.preloadPromise) {
      this.preloadPromise.then(action);
    } else {
      action();
    }
  }

  /** if given null, the board is just empty (used e.g. before any game is loaded) */
  drawGameFrame(frame: GameFrame | null) {
    this.ensureCanvasReady();
    this.clearSpriteCanvas();

    if (!frame) {
      return; // cleared, thats all we need to do
    }

    // draw glued and carpeted tiles
    frame.gluedTiles.forEach(tile => this.blitSpriteOnTile(Sprite.GLUE, tile));
    frame.carpetedTiles.forEach(tile => this.blitSpriteOnTile(Sprite.TILE_CARPET, tile));
    
    // drawing rat.
    // if either player caught the rat on this frame, then draw it as caught.
    // note: consecutive chunks of rat_pos_history are identical since it only moves once per 2 ply
    const ratSprite = frame.wasRatCaught? Sprite.RAT_CAUGHT : Sprite.RAT;
    this.blitSpriteOnTile(ratSprite, frame.ratLoc);

    // draw players
    this.blitSpriteOnTile(Sprite.WORKER_RED, frame.redLoc);
    this.blitSpriteOnTile(Sprite.WORKER_YELLOW, frame.yellowLoc);
  }

  /**
   * preloads assets for the game (sprites, map textures, etc.).
   */
  preloadAssets() {
    if (!this.spriteCtx) {
      throw new Error("Sprite canvas context is not registered!");
    }
    if (!this.backgroundCtx) {
      throw new Error("Background canvas context is not registered!");
    }

    this.spriteCtx.imageSmoothingEnabled = false;
    this.backgroundCtx.imageSmoothingEnabled = false;

    const entries = Object.entries(SPRITE_FILES) as [string, string][];

    this.preloadPromise = new Promise<void>((resolve, reject) => {
      let nLoaded = 0;
      entries.forEach(([key, src]) => {
        const sprite = Number(key) as Sprite;
        const img = new Image();
        img.onload = () => {
          this.spriteImages[sprite] = img;
          nLoaded += 1;
          console.log(`[CanvasManager] loaded sprite ${Sprite[sprite]} from ${src} (${nLoaded}/${entries.length})`);
          if (nLoaded === entries.length) {
            resolve();
          }
        };
        img.onerror = err => {
          reject(new Error(`[CanvasManager] Failed to load image for sprite ${Sprite[sprite]} from ${src}:`, {
            cause: err,
          }));
        };
        img.src = src;
      });
    });
    console.log('[CanvasManager] started preloading assets!');
    this.preloadPromise.then(() => {
      console.log('[CanvasManager] finished preloading assets!');
    }).catch(err => {
      console.error(err);
    });
  }

  blitSpriteOnTile(
    name: Sprite,
    loc: MapLoc,
    dr: number = 0,
    dc: number = 0,
  ) {
    this.ensureCanvasReady();
    this.runOrScheduleDraw(() => this.spriteCtx.drawImage(
      this.spriteImages[name]!,
      loc[1] * PX_PER_TILE + dc,
      loc[0] * PX_PER_TILE + dr,
      PX_PER_TILE,
      PX_PER_TILE,
    ));
  }

  blitMap(blockedTiles: MapLoc[] = []) {
    this.ensureCanvasReady();
    this.updateCanvasSize();

    this.runOrScheduleDraw(() => {
      this.backgroundCtx.drawImage(
        this.spriteImages[Sprite.BOARD]!,
        0,
        0,
        this.backgroundCanvas.width,
        this.backgroundCanvas.height
      );
      blockedTiles.forEach(tile => {
        this.backgroundCtx.drawImage(
          this.spriteImages[Sprite.TILE_BLOCKED]!,
          tile[1] * PX_PER_TILE,
          tile[0] * PX_PER_TILE,
          PX_PER_TILE,
          PX_PER_TILE,
        )
      });
    });
  }

  reset(newBlockedTiles: MapLoc[]) {
    this.ensureCanvasReady();
    this.clearSpriteCanvas();
    this.blitMap(newBlockedTiles);
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

  /**
   * Update the canvas elements' sizes based on map size
   */
  updateCanvasSize() {
    this.ensureCanvasReady();

    this.spriteCanvas.width = PX_PER_TILE * MAP_SIZE_C;
    this.backgroundCanvas.width = PX_PER_TILE * MAP_SIZE_C;
    this.spriteCanvas.height = PX_PER_TILE * MAP_SIZE_R;
    this.backgroundCanvas.height = PX_PER_TILE * MAP_SIZE_R;
  }
}
