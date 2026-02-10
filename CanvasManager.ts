import { 
	PX_PER_TILE, 
	getLocOnSpritesheet, 
	SPRITESHEET_FILE, 
	Sprite
} from "./spritesheet";
import { MapInfo } from "./types";

/**
 * Handler for rendering game things onto a canvas element.
 */
export class CanvasManager {

	public spriteCanvas: HTMLCanvasElement;
	public backgroundCanvas: HTMLCanvasElement;
	public spriteCtx: CanvasRenderingContext2D;
	public backgroundCtx: CanvasRenderingContext2D;

	public spritesheet: HTMLImageElement;

	public mapInfo: MapInfo;

	constructor(
		mapInfo: MapInfo,
		spriteCanvas: HTMLCanvasElement, 
		backgroundCanvas: HTMLCanvasElement
	) {
		this.mapInfo = mapInfo;

		this.spriteCanvas = spriteCanvas;
		this.backgroundCanvas = backgroundCanvas;
		const _spriteCtx = spriteCanvas.getContext("2d");
		const _backgroundCtx = backgroundCanvas.getContext("2d");

		this.spritesheet = new Image();

		if (!_spriteCtx || !_backgroundCtx) {
			// TODO - is there a way to handle this?
			throw new Error("Couldn't load canvas2d context!");
		}
		
		this.spriteCtx = _spriteCtx;
		this.backgroundCtx = _backgroundCtx;
		this.preloadAssets();
		this.updateCanvasSize();
	}

	drawGameState() {
		// TODO
	}

	/**
	 * preloads assets for the game (sprites, map textures, etc.).
	 * 
	 * Doesnt actually do anything on screen, but this helps with performance, i think.
	 */
	preloadAssets() {
		this.spriteCtx.imageSmoothingEnabled = false;
		this.backgroundCtx.imageSmoothingEnabled = false;
		this.spritesheet.src = SPRITESHEET_FILE;
	}

	/**
	 * Blit a sprite centered at the center of the tile (tileX, tileY) (0-indexed).
	 * ### X,Y in Bytefight are row,col based (like a 2D array), meaning TOP LEFT IS (0,0)!
	 * 
	 * Can optionally specify dx, dy, which are offsets by actual pixels on the canvas
	 * 
	 * Only use if spritesheet is loaded! (check is omitted for efficiency i love premature optimization)
	 */
	blitSpriteOnTile(
		name: Sprite,
		tileX: number, 
		tileY: number, 
		dx: number = 0, 
		dy: number = 0
	) {
		const { x: srcX, y: srcY } = getLocOnSpritesheet(name);

		this.spriteCtx.drawImage(this.spritesheet, 
			// src (where to yoink from spritesheet)
			srcX*PX_PER_TILE, 
			srcY*PX_PER_TILE, 
			PX_PER_TILE, 
			PX_PER_TILE, 

			// dst (where to draw on canvas)
			tileX*PX_PER_TILE+dx,
			tileY*PX_PER_TILE+dy,
			PX_PER_TILE,
			PX_PER_TILE,
		);
	}

	/**
	 * Draws the base map data screen, ie all static stuff like tiles, walls, hills, spawnpoints.
	 * Doing this with a simple loop instead of using patterns or whatever cuz im lazy
	 * and we should only be doing this once on load, so it dont matter
	 * 
	 * Only use if spritesheet is loaded!
	 */
	blitMap() {

		console.log(`Blitting map of size ${this.mapInfo.width}x${this.mapInfo.height}`);

		// helper function
		const blitMapFeature = (featureName: Sprite, tileX: number, tileY: number) => {
			const { x: srcX, y: srcY } = getLocOnSpritesheet(featureName);

			this.backgroundCtx.drawImage(this.spritesheet,
				srcX*PX_PER_TILE,
				srcY*PX_PER_TILE,
				PX_PER_TILE,
				PX_PER_TILE,
				tileX*PX_PER_TILE,
				tileY*PX_PER_TILE,
				PX_PER_TILE,
				PX_PER_TILE
			);
		};

		// equivalent to a normal loop. 
		// BATTLECODE REFERENCE! those who know...
		for (let y = this.mapInfo.height; --y >= 0;) {
			for (let x = this.mapInfo.width; --x >= 0;) {
				if (x % 2 === y % 2) {
					// light tile
					blitMapFeature(Sprite.TILE_LIGHT, x, y);
				} else {
					// dark tile
					blitMapFeature(Sprite.TILE_DARK, x, y);
				}
			}
		}

		// drawing walls
		for (const {x, y} of this.mapInfo.wallLocs) {
			blitMapFeature(Sprite.WALL, x, y);
		}

		// drawing hills
		for (const {x, y} of this.mapInfo.hillCenters) {
			blitMapFeature(Sprite.HILL_LIGHT, x, y);
		}
	}

	blitTestSprites() {

	}

	/**
	 * Update the canvas elements' sizes based on map size
	 */
	updateCanvasSize() {
		this.spriteCanvas.width = PX_PER_TILE * this.mapInfo.width;
		this.backgroundCanvas.width = PX_PER_TILE * this.mapInfo.width;

		this.spriteCanvas.height = PX_PER_TILE * this.mapInfo.height;
		this.backgroundCanvas.height = PX_PER_TILE * this.mapInfo.height;
	}
}