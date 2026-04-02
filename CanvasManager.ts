import { StaticImageData } from "next/image";
import { 
	PX_PER_TILE, 
	Sprite,
	SPRITE_FILES
} from "./spritesheet";
import { GameRenderState, MapInfo } from "./types";

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

		// draw paint
		if (paint) {
			for (let y = 0; y < this.mapInfo.height; y++) {
				for (let x = 0; x < this.mapInfo.width; x++) {
					const value = paint[y]?.[x] ?? 0;
					if (value === 0) continue;

					const magnitude = Math.min(3, Math.abs(value));

					let sprite: Sprite;

					if (value > 0) {
						if (magnitude === 1) sprite = Sprite.BLUE_TILE1;
						else if (magnitude === 2) sprite = Sprite.BLUE_TILE2;
						else sprite = Sprite.BLUE_TILE3;
					} else {
						if (magnitude === 1) sprite = Sprite.GREEN_TILE1;
						else if (magnitude === 2) sprite = Sprite.GREEN_TILE2;
						else sprite = Sprite.GREEN_TILE3;
					}

					this.blitSpriteOnTile(sprite, x, y);
				}
			}
		}

		// draw beacons
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
						this.blitSpriteOnTile(Sprite.POWERUP_HEALTH, x, y);
					}

					if (cell.hasStamina) {
						this.blitSpriteOnTile(Sprite.POWERUP_STAMINA, x, y);
					}
				}
			}
		}

		// ✅ NEW: draw hill borders on top of everything
		for (const { x, y } of this.mapInfo.hillCenters) {
			this.blitSpriteOnTile(Sprite.HILL_BORDER, x, y);
		}

		// draw players last (top-most)
		this.blitSpriteOnTile(Sprite.PLAYER_BLUE, p1Loc.x, p1Loc.y);
		this.blitSpriteOnTile(Sprite.PLAYER_GREEN, p2Loc.x, p2Loc.y);
	}

	preloadAssets() {
		this.spriteCtx.imageSmoothingEnabled = false;
		this.backgroundCtx.imageSmoothingEnabled = false;

		const entries = Object.entries(SPRITE_FILES) as [string, StaticImageData][];
		let loaded = 0;

		for (const [key, spriteData] of entries) {
			const sprite = Number(key) as Sprite;
			const img = new Image();

			img.onload = () => {
				this.spriteImages[sprite] = img;
				loaded++;

				if (loaded === entries.length) {
					this.blitMap();
				}
			};

			img.onerror = () => {
				console.error(`Failed to load sprite: ${key}`);
				loaded++;
				if (loaded === entries.length) this.blitMap();
			};

			img.src = typeof spriteData === "string" ? spriteData : spriteData.src;
		}
	}

	blitSpriteOnTile(
		name: Sprite,
		tileX: number, 
		tileY: number, 
		dx: number = 0, 
		dy: number = 0
	) {
		const img = this.spriteImages[name];
		if (!img) return;

		this.spriteCtx.drawImage(
			img,
			tileX * PX_PER_TILE + dx,
			tileY * PX_PER_TILE + dy,
			PX_PER_TILE,
			PX_PER_TILE,
		);
	}

	blitMap() {
		console.log(`Blitting map of size ${this.mapInfo.width}x${this.mapInfo.height}`);

		const blitMapFeature = (featureName: Sprite, tileX: number, tileY: number) => {
			const img = this.spriteImages[featureName];
			if (!img) return;

			this.backgroundCtx.drawImage(
				img,
				tileX * PX_PER_TILE,
				tileY * PX_PER_TILE,
				PX_PER_TILE,
				PX_PER_TILE
			);
		};

		// base tiles ONLY (neutral)
		for (let y = this.mapInfo.height; --y >= 0;) {
			for (let x = this.mapInfo.width; --x >= 0;) {
				if (x % 2 === y % 2) {
					blitMapFeature(Sprite.TILE_LIGHT, x, y);
				} else {
					blitMapFeature(Sprite.TILE_DARK, x, y);
				}
			}
		}

		// walls
		for (const { x, y } of this.mapInfo.wallLocs) {
			blitMapFeature(Sprite.WALL, x, y);
		}

		// ❌ REMOVED: hill base tiles (no HILL_LIGHT anymore)
	}

	updateCanvasSize() {
		this.spriteCanvas.width = PX_PER_TILE * this.mapInfo.width;
		this.backgroundCanvas.width = PX_PER_TILE * this.mapInfo.width;

		this.spriteCanvas.height = PX_PER_TILE * (this.mapInfo.height + 1);
		this.backgroundCanvas.height = PX_PER_TILE * (this.mapInfo.height + 1);
	}
}