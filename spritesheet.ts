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

// Helper to resolve paths relative to THIS file for Vite bundle/submodule discovery
const resolveSprite = (path: string) => new URL(path, import.meta.url).href;

/**
 * File paths for individual sprite images.
 * Each PNG in the `sprites/` folder has a semantic name, e.g. `blue_player.png`.
 */
export const SPRITE_FILES = {
    [Sprite.PLAYER_GREEN]: resolveSprite("./sprites/green_player.png"),
    [Sprite.PLAYER_BLUE]: resolveSprite("./sprites/blue_player.png"),

    // neutral tile is used for both light and dark base tiles
    [Sprite.TILE_LIGHT]: resolveSprite("./sprites/neutral_tile.png"),
    [Sprite.TILE_DARK]: resolveSprite("./sprites/neutral_tile.png"),

    [Sprite.HILL_LIGHT]: resolveSprite("./sprites/hill_tile.png"),
    [Sprite.HILL_DARK]: resolveSprite("./sprites/hill_tile.png"),
    [Sprite.WALL]: resolveSprite("./sprites/wall_tile.png"),

    // dedicated beacon / powerup sprites
    [Sprite.BEACON_GREEN]: resolveSprite("./sprites/green_beacon.png"),
    [Sprite.BEACON_BLUE]: resolveSprite("./sprites/blue_beacon.png"),
    [Sprite.POWERUP_HEALTH]: resolveSprite("./sprites/power_cell.png"),
    [Sprite.POWERUP_STAMINA]: resolveSprite("./sprites/power_cell.png"),

    [Sprite.FLOATING_PIECE_BOTTOM]: resolveSprite("./sprites/floating_piece_bottom.png"),
    [Sprite.WALL_TOP]: resolveSprite("./sprites/wall_top.png"),
    [Sprite.WALL_BOTTOM]: resolveSprite("./sprites/wall_bottom.png"),
    [Sprite.WALL_LEFT]: resolveSprite("./sprites/wall_left.png"),
    [Sprite.WALL_RIGHT]: resolveSprite("./sprites/wall_right.png"),

    [Sprite.WALL_TOP_LEFT]: resolveSprite("./sprites/wall_top_left.png"),
    [Sprite.WALL_TOP_RIGHT]: resolveSprite("./sprites/wall_top_right.png"),
    [Sprite.WALL_BOTTOM_LEFT]: resolveSprite("./sprites/wall_bottom_left.png"),
    [Sprite.WALL_BOTTOM_RIGHT]: resolveSprite("./sprites/wall_bottom_right.png"),
} as const;