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


const SPRITE_PATHS = {
	[Sprite.WORKER_RED]: "worker_red.png",
	[Sprite.WORKER_YELLOW]: "worker_yellow.png",

	[Sprite.BOARD]: "board.png",
	[Sprite.TILE_BLOCKED]: "tile_blocked.png",
	[Sprite.TILE_CARPET]: "tile_carpet.png",

	[Sprite.GLUE]: "glue.png",
	[Sprite.RAT]: "rat.png",
	[Sprite.RAT_CAUGHT]: "rat_caught.png",
} as const satisfies Record<Sprite, string>;

// so that we dont need to shove these assets in the public/ folder
// of whatever app is using this submodule
export const SPRITE_FILES = Object.fromEntries(
	Object.entries(SPRITE_PATHS).map(([sprite, path]) => [
		sprite,
		new URL(`./assets/${path}`, import.meta.url).href
	]),
) as Record<Sprite, string>;
