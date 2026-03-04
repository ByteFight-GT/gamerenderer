// 1. Explicitly import the images (your bundler handles the magic here)
import playerGreenSrc from "./sprites/green_player.png";
import playerBlueSrc from "./sprites/blue_player.png";
import neutralTileSrc from "./sprites/neutral_tile.png";
import hillTileSrc from "./sprites/hill_tile.png";
import wallTileSrc from "./sprites/wall_tile.png";
import greenBeaconSrc from "./sprites/green_beacon.png";
import blueBeaconSrc from "./sprites/blue_beacon.png";
import powerCellSrc from "./sprites/power_cell.png";
import floatingPieceBottomSrc from "./sprites/floating_piece_bottom.png";
import wallTopSrc from "./sprites/wall_top.png";
import wallBottomSrc from "./sprites/wall_bottom.png";
import wallLeftSrc from "./sprites/wall_left.png";
import wallRightSrc from "./sprites/wall_right.png";
import wallTopLeftSrc from "./sprites/wall_top_left.png";
import wallTopRightSrc from "./sprites/wall_top_right.png";
import wallBottomLeftSrc from "./sprites/wall_bottom_left.png";
import wallBottomRightSrc from "./sprites/wall_bottom_right.png";

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

// 2. Assign the imported variables directly
export const SPRITE_FILES = {
    [Sprite.PLAYER_GREEN]: playerGreenSrc,
    [Sprite.PLAYER_BLUE]: playerBlueSrc,

    [Sprite.TILE_LIGHT]: neutralTileSrc,
    [Sprite.TILE_DARK]: neutralTileSrc,

    [Sprite.HILL_LIGHT]: hillTileSrc,
    [Sprite.HILL_DARK]: hillTileSrc,
    [Sprite.WALL]: wallTileSrc,

    [Sprite.BEACON_GREEN]: greenBeaconSrc,
    [Sprite.BEACON_BLUE]: blueBeaconSrc,
    [Sprite.POWERUP_HEALTH]: powerCellSrc,
    [Sprite.POWERUP_STAMINA]: powerCellSrc,

    [Sprite.FLOATING_PIECE_BOTTOM]: floatingPieceBottomSrc,
    [Sprite.WALL_TOP]: wallTopSrc,
    [Sprite.WALL_BOTTOM]: wallBottomSrc,
    [Sprite.WALL_LEFT]: wallLeftSrc,
    [Sprite.WALL_RIGHT]: wallRightSrc,

    [Sprite.WALL_TOP_LEFT]: wallTopLeftSrc,
    [Sprite.WALL_TOP_RIGHT]: wallTopRightSrc,
    [Sprite.WALL_BOTTOM_LEFT]: wallBottomLeftSrc,
    [Sprite.WALL_BOTTOM_RIGHT]: wallBottomRightSrc,
} as const;