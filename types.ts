/** [r, c], 0-indexed starting topleft */
export type MapLoc = [number, number];

export type GameResultReason =
	| "POINTS"
	| "TIME"
	| "ERROR"
	| "UNKNOWN";

export enum GameResult {
	TEAM_A_WIN = 1,
	TEAM_B_WIN = 2,
	DRAW = 3
}

export type LeftBehindKind = "plain" | "prime" | "carpet" | "search";

/** 
 * Game data. indexed by frame
 */
export type GamePGN = {
	a_pos: MapLoc[];
	b_pos: MapLoc[];
	a_points: number[];
	b_points: number[];
	a_turns_left: number[];
	b_turns_left: number[];
	a_time_left: number[];
	b_time_left: number[];
	rat_caught: boolean[];
	new_carpets: MapLoc[][]; // list of NEWLY ADDED carpeted tiles per frame
	left_behind: LeftBehindKind[];
	rat_position_history: MapLoc[];
	errlog_a: string;
	errlog_b: string;
	turn_count: number;
	result: GameResult;
	reason: GameResultReason;
	blocked_positions: MapLoc[];
};

export type GameFrame = {
	redLoc: MapLoc;
	yellowLoc: MapLoc;

	ratLoc: MapLoc;
	wasRatCaught: boolean;

	aPoints: number;
	bPoints: number;

	aTurnsLeft: number;
	bTurnsLeft: number;

	aTimeLeft: number;
	bTimeLeft: number;

	carpetedTiles: MapLoc[];
	gluedTiles: MapLoc[];
}