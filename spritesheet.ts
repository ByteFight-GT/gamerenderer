/** size in px of a board tile on the canvas at 100% zoom */
export const PX_PER_TILE = 32;

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

/**
 * File paths for individual sprite images.
 * Each PNG in the `sprites/` folder has a semantic name, e.g. `blue_player.png`.
 */
export const SPRITE_FILES = {
	[Sprite.PLAYER_GREEN]: "./sprites/green_player.png",
	[Sprite.PLAYER_BLUE]: "./sprites/blue_player.png",

	// neutral tile is used for both light and dark base tiles
	[Sprite.TILE_LIGHT]: "./sprites/neutral_tile.png",
	[Sprite.TILE_DARK]: "./sprites/neutral_tile.png",

	[Sprite.HILL_LIGHT]: "./sprites/hill_tile.png",
	[Sprite.HILL_DARK]: "./sprites/hill_tile.png",
	[Sprite.WALL]: "./sprites/wall_tile.png",

	// dedicated beacon / powerup sprites
	[Sprite.BEACON_GREEN]: "./sprites/green_beacon.png",
	[Sprite.BEACON_BLUE]: "./sprites/blue_beacon.png",
	[Sprite.POWERUP_HEALTH]: "./sprites/power_cell.png",
	[Sprite.POWERUP_STAMINA]: "./sprites/power_cell.png",
} as const;
