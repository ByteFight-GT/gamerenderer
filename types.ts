export type MapLoc = {
	x: number;
	y: number;
}

export enum Symmetry {
	X,
	Y,
	XY,
}

export type PowerupSpawn = {
	loc: MapLoc;
	round: number;
}

export type PaintMatrix = number[][];

export type BeaconOwner = "P1" | "P2" | null;

export type BeaconMatrix = BeaconOwner[][];

export type PowerupCellState = {
	hasHealth: boolean;
	hasStamina: boolean;
};

export type PowerupMatrix = PowerupCellState[][];

export type GameRenderState = {
	p1Loc: MapLoc;
	p2Loc: MapLoc;
	paint?: PaintMatrix;
	beacons?: BeaconMatrix;
	powerups?: PowerupMatrix;
};

/**
 * Represents all data about a map.
 * Map features like hills, walls, spawnpoints, etc. are only guarnateed to be specified
 * for at least one side - for the other, use symmetry to compute.
 */
export type MapInfo = {
	width: number;
	height: number;
	hillCenters: MapLoc[];
	wallLocs: MapLoc[];
	spawnpointGreen: MapLoc;
	symmetry: Symmetry;
	healthPowerupSpawns: PowerupSpawn[];
	staminaPowerupSpawns: PowerupSpawn[];
}
