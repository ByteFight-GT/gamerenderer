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
