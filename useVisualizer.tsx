import React from "react";
import { CanvasManager } from "./CanvasManager";
import { GamestateManager } from "./GamestateManager";
import { clamp } from "./utils";
import type { GamePGN, GamePGNDiff, MapDataOptionalSpawnpts, MapLoc, MatchMetadata } from "../../common/types";

import _EMPTY_GAME_PGN from "./defaults/EMPTY_GAME_PGN.json";
const EMPTY_GAME_PGN = _EMPTY_GAME_PGN as unknown as GamePGN;
import _DEFAULT_MAP_DATA from "./defaults/DEFAULT_MAP_DATA.json";
const DEFAULT_MAP_DATA = _DEFAULT_MAP_DATA as unknown as MapDataOptionalSpawnpts;

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

export type VisualizerContextValue = {

	// SETUP AND GAMESTATE STUFF

	gameManagerRef: React.RefObject<GamestateManager>;
	canvasManagerRef: React.RefObject<CanvasManager>;
	currentMatchData: MatchMetadata | null;

	/** Bind to canvases that the Gamestates will be drawn to */
	_registerCanvases: (spriteCanvas: HTMLCanvasElement, backgroundCanvas: HTMLCanvasElement) => void;
	
	/** for internal use by gamerenderer onclick */
	_updateClickSubscribers: (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;

	/** Update match data (merge) with a new packet from python server. This is lazy and doesnt calc frames immediately, thats done on renderTurn (TODO: change?) */
	updateGamePGN: (diff: GamePGNDiff) => void;

	/**
	 * Add a callback to be called whenever the game pgn or current frame changes.
	 *
	 * ### PLEASE DO NOT WRITE TO THE DATA IN THE CALLBACK, THESE SHOULD BE FOR READING ONLY!!!
	 * ### THANK YOU FOR YOUR ATTENTION TO THIS MATTER. -President Donald J Trump
	 *
	 * Returns an unsubscribe function to remove the handler.
	 */
	subscribeToGameOrFrameChanges: (
		handler: (entirePGN: GamePGN, currentFrame: number) => void,
	) => (() => void);

	subscribeToCanvasClicks: (
		handler: (mapLoc: MapLoc, event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void
	) => (() => void);

	/**
	 * Make the visualizer switch context to a new game from potentially a new match
	 * This causes the canvases to redraw immediately, resets states like the current frame.
	 * 
	 * Any args not given (undefined) will be kept as their current state. Note that this means
	 * setting matchData=null and not including it are different! (use null to explicitly clear it)
	 */
	setVisualizerState: (states: {
		matchData?: MatchMetadata | null,
		gamePGN?: GamePGN,
		mapData?: MapDataOptionalSpawnpts
	}) => void;

	/**
	 * Blanks out the visualizer so that theres no match/game being viewed. The renderer
	 * will switch to showing the default empty board.
	 */
	clearVisualizerState: () => void;

	// USER CONTROLS STUFF

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
const VisualizerContext = React.createContext<VisualizerContextValue | null>(null);


/**
 * Store that handles all things related to the game visualizer, like
 * current match, rendering logic, game state, user controls, etc.
 */
export function VisualizerProvider(props: {children: React.ReactNode}) {

	// SETUP AND GAMESTATE STUFF
	
	const stateSubscribersRef = React.useRef<Set<(pgn: GamePGN, frame: number) => void>>(new Set());
	const clickSubscribersRef = React.useRef<Set<(mapLoc: MapLoc, event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void>>(new Set());

	const renderedGameFrameRef = React.useRef(0);

	const gameManagerRef = React.useRef<GamestateManager>(new GamestateManager(DEFAULT_MAP_DATA, EMPTY_GAME_PGN));
	const canvasManagerRef = React.useRef<CanvasManager>(new CanvasManager(DEFAULT_MAP_DATA));

	const [currentMatchData, setCurrentMatchData] = React.useState<MatchMetadata | null>(null);

	const _registerCanvases = React.useCallback((spriteCanvas: HTMLCanvasElement, backgroundCanvas: HTMLCanvasElement) => {
		canvasManagerRef.current.registerCanvases(spriteCanvas, backgroundCanvas);
	}, []);

	const updateGamePGN = React.useCallback((diff: GamePGNDiff) => {
		const shouldMoveToHeadFrame = renderedGameFrameRef.current >= (gameManagerRef.current.gamePGN.turn_count * LIVE_GAME_AUTOADVANCE_THRESHOLD);

		gameManagerRef.current.updateGamePGN(diff);
		updateStateSubscribers();
		
		// TEMP: during games, render immediately if we are at head. we DO want this to happen but this impl feels weird idk.
		if (shouldMoveToHeadFrame) {
			setRenderedGameFrame(gameManagerRef.current.gamePGN.turn_count);
		}
	}, []);

	const setVisualizerState = React.useCallback(states => {
		if (states.matchData !== undefined) {
			setCurrentMatchData(states.matchData);
		}

		const mapData = states.mapData ?? gameManagerRef.current.mapData;
		const gamePGN = states.gamePGN ?? gameManagerRef.current.gamePGN;

		canvasManagerRef.current.reset(mapData);
		gameManagerRef.current.reset(mapData, gamePGN);

		// reset controls except for playback speed cuz thats more of a user setting
		setRenderedGameFrame(0);
		setAutoAdvance(false);

		updateStateSubscribers();
	}, []);

	const clearVisualizerState = React.useCallback(() => {
		console.log(`[GameProvider.clearVisualizerState] restoring to default board`);
		gameManagerRef.current.reset(DEFAULT_MAP_DATA, EMPTY_GAME_PGN);
		canvasManagerRef.current.reset(DEFAULT_MAP_DATA);
		setCurrentMatchData(null);

		// reset controls except for playback speed cuz thats more of a user setting
		setRenderedGameFrame(0);
		setAutoAdvance(false);

		updateStateSubscribers();
	}, []);

	const subscribeToGameOrFrameChanges = React.useCallback((
		handler: (entirePGN: GamePGN, currentFrame: number) => void,
	) => {
		// give it initial notification
		handler(gameManagerRef.current.gamePGN, renderedGameFrameRef.current);

		stateSubscribersRef.current.add(handler);
		return () => stateSubscribersRef.current.delete(handler); // unsubscriber
	}, []);

	const subscribeToCanvasClicks = React.useCallback((
		handler: (mapLoc: MapLoc, event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void
	) => {
		clickSubscribersRef.current.add(handler);
		return () => clickSubscribersRef.current.delete(handler); // unsubscriber
	}, []);

	const updateStateSubscribers = React.useCallback(() => {
		stateSubscribersRef.current.forEach(
			handler => handler(gameManagerRef.current.gamePGN, renderedGameFrameRef.current)
		);
	}, []);

	const _updateClickSubscribers = React.useCallback(
		(event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
			const mapLoc = canvasManagerRef.current.getRCFromClientCoords(event.clientX, event.clientY);
			clickSubscribersRef.current.forEach(
				handler => handler(mapLoc, event)
			);
	}, []);

	const renderFrame = React.useCallback((turn: number) => {
		const frame = gameManagerRef.current.getGameFrame(turn);
		canvasManagerRef.current.drawGameState(frame);
	}, []);

	// USER CONTROLS STUFF

	const [autoAdvance, setAutoAdvance] = React.useState(false);
	const [playbackSpeed, setPlaybackSpeed] = React.useState(1);
	
	// setRenderedGameFrame wrapper with extra checks/handlers
	const setRenderedGameFrame = React.useCallback((frame: number) => {
		// clamp
		frame = clamp(frame, 0, gameManagerRef.current.gamePGN.turn_count);

		// if no change, do nothing
		if (frame === renderedGameFrameRef.current) return;

		renderFrame(frame);
		renderedGameFrameRef.current = frame;
		updateStateSubscribers();
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
		_registerCanvases, 
		_updateClickSubscribers,
		updateGamePGN,
		setVisualizerState,
		clearVisualizerState,
		subscribeToGameOrFrameChanges,
		subscribeToCanvasClicks,
		setRenderedGameFrame,
		incrementRenderedGameFrame,
		autoAdvance,
		setAutoAdvance,
		playbackSpeed,
		setPlaybackSpeed,
	} satisfies VisualizerContextValue), [
		currentMatchData,
		autoAdvance,
		playbackSpeed,
	]);

	return (
		<VisualizerContext.Provider value={value}>
			{props.children}
		</VisualizerContext.Provider>
	);
}


export function useVisualizer() {
	const ctx = React.useContext(VisualizerContext);
	if (!ctx) throw new Error("useVisualizer must be used inside VisualizerProvider");
	return ctx;
}