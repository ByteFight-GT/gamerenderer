import { 
	PX_PER_TILE, 
	Sprite,
	SPRITE_FILES
} from "./spritesheet";
import { GameRenderState, MapInfo } from "./types";


import { StaticImageData } from "next/image";
/**
 * Handler for rendering game things onto a canvas element.
 */
export class CanvasManager {

	public spriteCanvas: HTMLCanvasElement;
	public backgroundCanvas: HTMLCanvasElement;
	public spriteCtx: CanvasRenderingContext2D;
	public backgroundCtx: CanvasRenderingContext2D;

	private spriteImages: Partial<Record<Sprite, HTMLImageElement>> = {};

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

		if (!_spriteCtx || !_backgroundCtx) {
			// TODO - is there a way to handle this?
			throw new Error("Couldn't load canvas2d context!");
		}
		
		this.spriteCtx = _spriteCtx;
		this.backgroundCtx = _backgroundCtx;
		this.preloadAssets();
		this.updateCanvasSize();
	}

	drawGameState(state: GameRenderState) {
		// clear dynamic layer
		this.spriteCtx.clearRect(0, 0, this.spriteCanvas.width, this.spriteCanvas.height);

		const { paint, beacons, powerups, p1Loc, p2Loc } = state;

		// draw paint as colored overlays
		if (paint) {
			for (let y = 0; y < this.mapInfo.height; y++) {
				for (let x = 0; x < this.mapInfo.width; x++) {
					const value = paint[y]?.[x] ?? 0;
					if (value === 0) continue;

					const magnitude = Math.min(3, Math.abs(value));
					const alpha = 0.2 + 0.2 * magnitude;

					if (value > 0) {
						// positive -> blue player
						this.spriteCtx.fillStyle = `rgba(30, 144, 255, ${alpha})`;
					} else {
						// negative -> green player
						this.spriteCtx.fillStyle = `rgba(0, 200, 0, ${alpha})`;
					}

					this.spriteCtx.fillRect(
						x * PX_PER_TILE,
						y * PX_PER_TILE,
						PX_PER_TILE,
						PX_PER_TILE
					);
				}
			}
		}

		// draw beacons on top of paint
		if (beacons) {
			for (let y = 0; y < this.mapInfo.height; y++) {
				for (let x = 0; x < this.mapInfo.width; x++) {
					const owner = beacons[y]?.[x];
					if (!owner) continue;

					if (owner === "P1") {
						this.blitSpriteOnTile(Sprite.BEACON_BLUE, x, y);
					} else {
						this.blitSpriteOnTile(Sprite.BEACON_GREEN, x, y);
					}
				}
			}
		}

		// draw powerups
		if (powerups) {
			for (let y = 0; y < this.mapInfo.height; y++) {
				for (let x = 0; x < this.mapInfo.width; x++) {
					const cell = powerups[y]?.[x];
					if (!cell) continue;

					if (cell.hasHealth) {
						this.blitSpriteOnTile(
							Sprite.POWERUP_HEALTH,
							x,
							y,
						);
					}

					if (cell.hasStamina) {
						this.blitSpriteOnTile(
							Sprite.POWERUP_STAMINA,
							x,
							y,
						);
					}
				}
			}
		}

		// draw players last so they are on top
		this.blitSpriteOnTile(Sprite.PLAYER_BLUE, p1Loc.x, p1Loc.y);
		this.blitSpriteOnTile(Sprite.PLAYER_GREEN, p2Loc.x, p2Loc.y);
	}

	/**
	 * preloads assets for the game (sprites, map textures, etc.).
	 * 
	 * Doesnt actually do anything on screen, but this helps with performance, i think.
	 */
	preloadAssets() {
		this.spriteCtx.imageSmoothingEnabled = false;
		this.backgroundCtx.imageSmoothingEnabled = false;

		// Next.js imports return an object { src: string, ... }, so we cast accordingly
		const entries = Object.entries(SPRITE_FILES) as unknown as [string, { src: string }][];
		let loaded = 0;

		for (const [key, spriteData] of entries) {
			const sprite = Number(key) as Sprite;
			const img = new Image();

			img.onload = () => {
				this.spriteImages[sprite] = img;
				loaded++;

				if (loaded === entries.length) {
					this.blitMap(); // draw once when everything is ready
				}
			};

			// If a single image fails to load, the counter should still increment 
			// to prevent the game from hanging on a blank screen forever.
			img.onerror = () => {
				console.error(`Failed to load sprite: ${key}`);
				loaded++;
				if (loaded === entries.length) this.blitMap();
			};

			// Access the .src property from the Next.js StaticImageData object
			img.src = spriteData.src;
		}
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
		const img = this.spriteImages[name];
		if (!img) {
			return;
		}

		this.spriteCtx.drawImage(
			img,
			tileX * PX_PER_TILE + dx,
			tileY * PX_PER_TILE + dy,
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
			const img = this.spriteImages[featureName];
			if (!img) {
				return;
			}

			this.backgroundCtx.drawImage(
				img,
				tileX * PX_PER_TILE,
				tileY * PX_PER_TILE,
				PX_PER_TILE,
				PX_PER_TILE
			);
		};

		// draw main board tiles
		for (let y = this.mapInfo.height; --y >= 0;) {
			for (let x = this.mapInfo.width; --x >= 0;) {
				if (x % 2 === y % 2) {
					blitMapFeature(Sprite.TILE_LIGHT, x, y);
				} else {
					blitMapFeature(Sprite.TILE_DARK, x, y);
				}
			}
		}

		// decorative floating pieces row just below the map
		const decoY = this.mapInfo.height;
		for (let x = 0; x < this.mapInfo.width; x++) {
			blitMapFeature(Sprite.FLOATING_PIECE_BOTTOM, x, decoY);
		}

		// drawing walls
		// Build quick lookup for wall positions
		for (const { x, y } of this.mapInfo.wallLocs) {
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

		// add one extra decorative row below the map
		this.spriteCanvas.height = PX_PER_TILE * (this.mapInfo.height + 1);
		this.backgroundCanvas.height = PX_PER_TILE * (this.mapInfo.height + 1);
	}
}