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

	BLUE_TILE_1,
	BLUE_TILE_2,
	BLUE_TILE_3,

	GREEN_TILE_1,
	GREEN_TILE_2,
	GREEN_TILE_3,

	BEACON_GREEN,
	BEACON_BLUE,

	POWERUP_HEALTH,
	POWERUP_STAMINA,

	FLOATING_PIECE_BOTTOM,

	WALL_TOP,
	WALL_BOTTOM,
	WALL_LEFT,
	WALL_RIGHT,
	WALL_TOP_LEFT,
	WALL_TOP_RIGHT,
	WALL_BOTTOM_LEFT,
	WALL_BOTTOM_RIGHT,
}
/**
 * File paths for individual sprite images.
 * Each PNG in the `sprites/` folder has a semantic name, e.g. `blue_player.png`.
 */
export const SPRITE_FILES = {
	[Sprite.PLAYER_GREEN]: "/sprites/green_player.png",
	[Sprite.PLAYER_BLUE]: "/sprites/blue_player.png",

	// neutral tile is used for both light and dark base tiles
	[Sprite.TILE_LIGHT]: "/sprites/neutral_tile.png",
	[Sprite.TILE_DARK]: "/sprites/neutral_tile.png",

	[Sprite.HILL_LIGHT]: "/sprites/hill_tile.png",
	[Sprite.HILL_DARK]: "/sprites/hill_tile.png",
	[Sprite.WALL]: "/sprites/wall_tile.png",

	[Sprite.BLUE_TILE_1]: "/sprites/blue_tile_1.png",
	[Sprite.BLUE_TILE_2]: "/sprites/blue_tile_2.png",
	[Sprite.BLUE_TILE_3]: "/sprites/blue_tile_3.png",

	[Sprite.GREEN_TILE_1]: "/sprites/green_tile_1.png",
	[Sprite.GREEN_TILE_2]: "/sprites/green_tile_2.png",
	[Sprite.GREEN_TILE_3]: "/sprites/green_tile_3.png",

	// dedicated beacon / powerup sprites
	[Sprite.BEACON_GREEN]: "/sprites/green_beacon.png",
	[Sprite.BEACON_BLUE]: "/sprites/blue_beacon.png",
	[Sprite.POWERUP_HEALTH]: "/sprites/power_cell.png",
	[Sprite.POWERUP_STAMINA]: "/sprites/power_cell.png",

	[Sprite.FLOATING_PIECE_BOTTOM]: "/sprites/floating_piece_bottom.png",
	[Sprite.WALL_TOP]: "/sprites/wall_top.png",
	[Sprite.WALL_BOTTOM]: "/sprites/wall_bottom.png",
	[Sprite.WALL_LEFT]: "/sprites/wall_left.png",
	[Sprite.WALL_RIGHT]: "/sprites/wall_right.png",

	[Sprite.WALL_TOP_LEFT]: "/sprites/wall_top_left.png",
	[Sprite.WALL_TOP_RIGHT]: "/sprites/wall_top_right.png",
	[Sprite.WALL_BOTTOM_LEFT]: "/sprites/wall_bottom_left.png",
	[Sprite.WALL_BOTTOM_RIGHT]: "/sprites/wall_bottom_right.png",
} as const;
