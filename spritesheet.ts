/** size in px of a board tile on the canvas at 100% zoom */
export const PX_PER_TILE = 32;

export const BOARD_FILE = "./assets/board.png";
export const SPRITESHEET_FILE = "./assets/spritesheet.png";

export enum Sprite {
	PLAYER_GREEN,
	PLAYER_BLUE,

	TILE_LIGHT,
	TILE_DARK,
	HILL_LIGHT,
	HILL_DARK,
	WALL,

	BEACON_GREEN,
	BEACON_BLUE,

	POWERUP_HEALTH,
	POWERUP_STAMINA,
}

/** units are of size `PX_PER_TILE` */
export const SPRITESHEET_INDEX = {
	[Sprite.PLAYER_GREEN]: 		{ x: 0, y: 0 },
	[Sprite.PLAYER_BLUE]: 			{ x: 1, y: 0 },

	[Sprite.TILE_LIGHT]: 			{ x: 0, y: 1 },
	[Sprite.TILE_DARK]: 				{ x: 1, y: 1 },
	[Sprite.HILL_LIGHT]: 			{ x: 2, y: 1 },
	[Sprite.HILL_DARK]: 				{ x: 3, y: 1 },
	[Sprite.WALL]:							{ x: 0, y: 3 },

	[Sprite.POWERUP_HEALTH]: 	{ x: 0, y: 2 },
	[Sprite.POWERUP_STAMINA]: 	{ x: 1, y: 2 },
} as const;

export function getLocOnSpritesheet(name: Sprite): { x: number; y: number } {
	return SPRITESHEET_INDEX[name];
}
