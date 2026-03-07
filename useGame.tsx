import React from "react";
import { CanvasManager } from "./CanvasManager";
import { GamestateManager } from "./GamestateManager";
import { GamePGN, GamePGNDiff, MapData } from "./types";
import { clamp } from "./utils";

import _EMPTY_GAME_PGN from "./defaults/EMPTY_GAME_PGN.json";
const EMPTY_GAME_PGN = _EMPTY_GAME_PGN as unknown as GamePGN;
import _DEFAULT_MAP_DATA from "./defaults/DEFAULT_MAP_DATA.json";
import { MatchMetadata } from "../../common/types";
const DEFAULT_MAP_DATA = _DEFAULT_MAP_DATA as unknown as MapData;

/** base ms between autoplayed moves at 1x speed */
const BASE_PLAYBACK_INTERVAL_MS = 500; 

/** 
 * If current frame is above (turn_count * this), then updateGamePGN will automatically 
 * push the rendered frame to newest whenever it gets called.
 * Note that this isnt just a ux thing lol, trying to advance only if we are at the latest 
 * frame breaks cuz the state cant update fast enough before another pgnDiff comes in and 
 * the rounds end up "runing away" from the current frame.
 */
const LIVE_GAME_AUTOADVANCE_THRESHOLD = 0.995; 

export type GameContextValue = {

	// SETUP AND GAMESTATE STUFF

	gameManagerRef: React.RefObject<GamestateManager>;
	canvasManagerRef: React.RefObject<CanvasManager>;
	currentMatchData: MatchMetadata | null;

	/** Bind to canvases that the Gamestates will be drawn to */
	registerCanvases: (spriteCanvas: HTMLCanvasElement, backgroundCanvas: HTMLCanvasElement) => void;
	
	/** Update match data (merge) with a new packet from python server. This is lazy and doesnt calc frames immediately, thats done on renderTurn (TODO: change?) */
	updateGamePGN: (diff: GamePGNDiff) => void;

	/**
	 * Make the visualizer switch context to a new game from potentially a new match
	 * This causes the canvases to redraw immediately, and causes GamestateManager to reset!
	 */
	setVisualizerState: (matchData: MatchMetadata, gamePGN: GamePGN, mapData: MapData) => void;

	/**
	 * Blanks out the visualizer so that theres no match/game being viewed. The renderer
	 * will switch to showing the default empty board.
	 */
	clearVisualizerState: () => void;

	// USER CONTROLS STUFF

	/** Index of the game frame (state of game AFTER turn [i]) that is being rendered */
	renderedGameFrame: number;
	setRenderedGameFrame: (frame: number) => void;

	/** Convenience func for moving n frames forward/backward */
	incrementRenderedGameFrame: (n: number) => void;

	/** Whether to auto-advance renderedGameFrame. Will auto-set to false if renderedGameFrame is at the end of the current pgn. */
	autoAdvance: boolean;
	setAutoAdvance: React.Dispatch<React.SetStateAction<boolean>>;

	/** Speed multipler for autoAdvance. base is 500ms (see BASE_PLAYBACK_INTERVAL_MS). DO NOT MAKE <= 0 OR ELSE!  */
	playbackSpeed: number;
	setPlaybackSpeed: React.Dispatch<React.SetStateAction<number>>;

};
const GameContext = React.createContext<GameContextValue | null>(null);


/**
 * Store that handles all things related to the game viewer, like
 * current match, rendering logic, game state, user controls, etc.
 */
export function GameProvider(props: {children: React.ReactNode}) {

	// SETUP AND GAMESTATE STUFF
	
	const gameManagerRef = React.useRef<GamestateManager>(new GamestateManager(DEFAULT_MAP_DATA, EMPTY_GAME_PGN));
	const canvasManagerRef = React.useRef<CanvasManager>(new CanvasManager(DEFAULT_MAP_DATA));

	const [currentMatchData, setCurrentMatchData] = React.useState<MatchMetadata | null>(null);

	const registerCanvases = React.useCallback((spriteCanvas: HTMLCanvasElement, backgroundCanvas: HTMLCanvasElement) => {
		canvasManagerRef.current.registerCanvases(spriteCanvas, backgroundCanvas);
	}, []);

	const updateGamePGN = React.useCallback((diff: GamePGNDiff) => {
		const shouldMoveToHeadFrame = renderedGameFrameRef.current >= (gameManagerRef.current.gamePGN.turn_count * LIVE_GAME_AUTOADVANCE_THRESHOLD);

		gameManagerRef.current.updateGamePGN(diff);
		
		// TEMP: during games, render immediately if we are at head. we DO want this to happen but this impl feels weird idk.
		if (shouldMoveToHeadFrame) {
			setRenderedGameFrame(gameManagerRef.current.gamePGN.turn_count);
		}
	}, []);

	const setVisualizerState = React.useCallback((matchData: MatchMetadata, gamePGN: GamePGN, mapData: MapData) => {
		console.log(`[GameProvider.setVisualizerState] changing context to match ID ${matchData.matchId}`);
		gameManagerRef.current.reset(mapData, gamePGN);
		canvasManagerRef.current.reset(mapData);
		setCurrentMatchData(matchData);

		// reset controls except for playback speed cuz thats more of a user setting
		setRenderedGameFrame(0);
		setAutoAdvance(false);
	}, []);

	const clearVisualizerState = React.useCallback(() => {
		console.log(`[GameProvider.clearVisualizerState] restoring to default board`);
		gameManagerRef.current.reset(DEFAULT_MAP_DATA, EMPTY_GAME_PGN);
		canvasManagerRef.current.reset(DEFAULT_MAP_DATA);
		setCurrentMatchData(null);

		// reset controls except for playback speed cuz thats more of a user setting
		setRenderedGameFrame(0);
		setAutoAdvance(false);
	}, []);

	const renderFrame = React.useCallback((turn: number) => {
		const frame = gameManagerRef.current.getGameFrame(turn);
		canvasManagerRef.current.drawGameState(frame);
	}, []);


	// USER CONTROLS STUFF

	const [renderedGameFrame, _setRenderedGameFrame] = React.useState(0);
	const [autoAdvance, setAutoAdvance] = React.useState(false);
	const [playbackSpeed, setPlaybackSpeed] = React.useState(1);

	const renderedGameFrameRef = React.useRef(renderedGameFrame); // need most updated value but we wanna keep setRenderedGameFrame stable
	React.useEffect(() => {renderedGameFrameRef.current = renderedGameFrame}, [renderedGameFrame]);
	
	// setRenderedGameFrame wrapper with extra checks/handlers
	const setRenderedGameFrame = React.useCallback((frame: number) => {
		// clamp
		frame = clamp(frame, 0, gameManagerRef.current.gamePGN.turn_count);

		// if no change, do nothing
		if (frame === renderedGameFrameRef.current) return;

		renderFrame(frame);
		_setRenderedGameFrame(frame);
	}, []);
	
	const incrementRenderedGameFrame = React.useCallback((n: number) => {
		setRenderedGameFrame(renderedGameFrameRef.current + n);
	}, []);

	// auto-advance handling
	React.useEffect(() => {
		if (!autoAdvance) return;

		const interval = setInterval(() => {
			incrementRenderedGameFrame(1);
		}, BASE_PLAYBACK_INTERVAL_MS / playbackSpeed);

		return () => clearInterval(interval);
	}, [autoAdvance, playbackSpeed]);


	const value = React.useMemo(() => ({
		gameManagerRef,
		canvasManagerRef,
		currentMatchData,
		registerCanvases, 
		updateGamePGN,
		setVisualizerState,
		clearVisualizerState,

		renderedGameFrame,
		setRenderedGameFrame,
		incrementRenderedGameFrame,
		autoAdvance,
		setAutoAdvance,
		playbackSpeed,
		setPlaybackSpeed
	} satisfies GameContextValue), [
		currentMatchData,
		renderedGameFrame,
		autoAdvance,
		playbackSpeed
	]);

	return (
		<GameContext.Provider value={value}>
			{props.children}
		</GameContext.Provider>
	);
}


export function useGame() {
	const ctx = React.useContext(GameContext);
	if (!ctx) throw new Error("useGame must be used inside GameProvider");
	return ctx;
}