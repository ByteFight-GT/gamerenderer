/** size in px of a board tile on the canvas at 100% zoom */
export const PX_PER_TILE = 32;

export enum Sprite {
	WORKER_RED,
	WORKER_YELLOW,

	BOARD,
	TILE_BLOCKED,
	TILE_CARPET,

	GLUE, // overlaid on top of "primed" tiles
	RAT,
	RAT_CAUGHT, // for the turn on which a rat is caught
}

import workerRedPng from "./assets/worker_red.png";
import workerYellowPng from "./assets/worker_yellow.png";
import boardPng from "./assets/board.png";
import tileBlockedPng from "./assets/tile_blocked.png";
import tileCarpetPng from "./assets/tile_carpet.png";
import gluePng from "./assets/glue.png";
import ratPng from "./assets/rat.png";
import ratCaughtPng from "./assets/rat_caught.png";

type ImportedAsset = string | { src: string };

const resolveImportedAsset = (asset: ImportedAsset) =>
	typeof asset === "string" ? asset : asset.src;

const SPRITE_PATHS = {
	[Sprite.WORKER_RED]: resolveImportedAsset(workerRedPng),
	[Sprite.WORKER_YELLOW]: resolveImportedAsset(workerYellowPng),

	[Sprite.BOARD]: resolveImportedAsset(boardPng),
	[Sprite.TILE_BLOCKED]: resolveImportedAsset(tileBlockedPng),
	[Sprite.TILE_CARPET]: resolveImportedAsset(tileCarpetPng),

	[Sprite.GLUE]: resolveImportedAsset(gluePng),
	[Sprite.RAT]: resolveImportedAsset(ratPng),
	[Sprite.RAT_CAUGHT]: resolveImportedAsset(ratCaughtPng),
} as const satisfies Record<Sprite, string>;

export const SPRITE_FILES = SPRITE_PATHS;
