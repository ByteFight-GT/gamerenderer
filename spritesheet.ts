/** size in px of a board tile on the canvas at 100% zoom */
export const PX_PER_TILE = 32;

export enum Sprite {
	PLAYER_GREEN,
	PLAYER_BLUE,

	TILE_LIGHT,
	TILE_DARK,
	HILL_LIGHT,
	HILL_DARK,
	HILL_BORDER,
	WALL,

	BLUE_TILE_1,
	BLUE_TILE_2,
	BLUE_TILE_3,
	BLUE_TILE_4,
	BLUE_SPAWN,

	GREEN_TILE_1,
	GREEN_TILE_2,
	GREEN_TILE_3,
	GREEN_TILE_4,
	GREEN_SPAWN,

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


const SPRITE_PATHS = {
	[Sprite.PLAYER_GREEN]: "green_player.png",
	[Sprite.PLAYER_BLUE]: "blue_player.png",

	// neutral tile is used for both light and dark base tiles
	[Sprite.TILE_LIGHT]: "neutral_tile.png",
	[Sprite.TILE_DARK]: "neutral_tile.png",

	[Sprite.HILL_LIGHT]: "hill_tile.png",
	[Sprite.HILL_DARK]: "hill_tile.png",
	[Sprite.HILL_BORDER]: "hill_border.png",
	[Sprite.WALL]: "wall_tile.png",

	[Sprite.BLUE_TILE_1]: "blue_tile_1.png",
	[Sprite.BLUE_TILE_2]: "blue_tile_2.png",
	[Sprite.BLUE_TILE_3]: "blue_tile_3.png",
	[Sprite.BLUE_TILE_4]: "blue_tile_4.png",
	[Sprite.BLUE_SPAWN]: "mapbuilder/BLUE_SPAWN.png",

	[Sprite.GREEN_TILE_1]: "green_tile_1.png",
	[Sprite.GREEN_TILE_2]: "green_tile_2.png",
	[Sprite.GREEN_TILE_3]: "green_tile_3.png",
	[Sprite.GREEN_TILE_4]: "green_tile_4.png",
	[Sprite.GREEN_SPAWN]: "mapbuilder/GREEN_SPAWN.png",

	// dedicated beacon / powerup sprites
	[Sprite.BEACON_GREEN]: "green_beacon.png",
	[Sprite.BEACON_BLUE]: "blue_beacon.png",
	[Sprite.POWERUP_HEALTH]: "power_cell.png",
	[Sprite.POWERUP_STAMINA]: "power_cell.png",

	[Sprite.FLOATING_PIECE_BOTTOM]: "floating_piece_bottom.png",
	[Sprite.WALL_TOP]: "wall_top.png",
	[Sprite.WALL_BOTTOM]: "wall_bottom.png",
	[Sprite.WALL_LEFT]: "wall_left.png",
	[Sprite.WALL_RIGHT]: "wall_right.png",

	[Sprite.WALL_TOP_LEFT]: "wall_top_left.png",
	[Sprite.WALL_TOP_RIGHT]: "wall_top_right.png",
	[Sprite.WALL_BOTTOM_LEFT]: "wall_bottom_left.png",
	[Sprite.WALL_BOTTOM_RIGHT]: "wall_bottom_right.png",
} as const satisfies Record<Sprite, string>;

// so that we dont need to shove these assets in the public/ folder
// of whatever app is using this submodule
export const SPRITE_FILES = Object.fromEntries(
	Object.entries(SPRITE_PATHS).map(([sprite, path]) => [
		sprite,
		new URL(`./assets/${path}`, import.meta.url).href
	]),
) as Record<Sprite, string>;
