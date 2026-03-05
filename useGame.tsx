import React from "react";
import { CanvasManager } from "./CanvasManager";
import { GamestateManager } from "./GamestateManager";
import { GamePGN, MapData } from "./types";

import _DEFAULT_MAP_DATA from "./defaults/DEFAULT_MAP_DATA.json";
const DEFAULT_MAP_DATA = _DEFAULT_MAP_DATA as MapData;

const BASE_PLAYBACK_INTERVAL_MS = 500; // base time between autoplayed moves at 1x speed

export type GameContextValue = {

	// SETUP AND GAMESTATE STUFF

	/** Bind to canvases that the Gamestates will be drawn to */
	registerCanvases: (spriteCanvas: HTMLCanvasElement, backgroundCanvas: HTMLCanvasElement) => void;
	
	/** Update match data (merge) with a new packet from python server. This is lazy and doesnt calc frames immediately, thats done on renderTurn (TODO: change?) */
	updateGamePGN: (newPGN: GamePGN) => void;

	/** Fully replace (instead of merging) the current match data and make state changes so everythings valid (e.g. clamping renderedGameFrame) */
	overwriteGamePGN: (replacementPGN: GamePGN) => void;

	/** Set the map data used by the renderer and game state manager and stuff. Redraws immediately! */
	updateMapData: (newMapData: MapData) => void;


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

export function GameProvider({ children }: { children: React.ReactNode }) {

	// SETUP AND GAMESTATE STUFF
	
	const gameManagerRef = React.useRef<GamestateManager>(new GamestateManager(DEFAULT_MAP_DATA));
	const canvasManagerRef = React.useRef<CanvasManager>(new CanvasManager());

	const registerCanvases = React.useCallback((spriteCanvas: HTMLCanvasElement, backgroundCanvas: HTMLCanvasElement) => {
		canvasManagerRef.current.registerCanvases(spriteCanvas, backgroundCanvas);
	}, []);

	const updateGamePGN = React.useCallback((newPGN: GamePGN) => {
		gameManagerRef.current.updateGamePGN(newPGN);
	}, []);

	const overwriteGamePGN = React.useCallback((replacementPGN: GamePGN) => {
		gameManagerRef.current.gamePGN = replacementPGN;

		// if the current rendered frame is now out of bounds, clamp it and turn off autoAdvance
		if (renderedGameFrameRef.current >= replacementPGN.turn_count) {
			setRenderedGameFrame(replacementPGN.turn_count - 1);
			setAutoAdvance(false);
		}
	}, []);

	const updateMapData = React.useCallback((newMapData: MapData) => {
		gameManagerRef.current.mapData = newMapData;
		canvasManagerRef.current.mapData = newMapData;
		canvasManagerRef.current.blitMap();
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

		// if no change, do nothing
		if (frame === renderedGameFrameRef.current) return;

		// clamp to max turn and turn off autoAdvance if we hit the end of the game
		if (frame >= gameManagerRef.current.gamePGN.turn_count) {
			frame = gameManagerRef.current.gamePGN.turn_count - 1;
			setAutoAdvance(false);
		}

		frame = Math.max(0, frame); // who would be stupid enough to do this....? (me)

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
			setRenderedGameFrame(renderedGameFrameRef.current + 1);
		}, BASE_PLAYBACK_INTERVAL_MS / playbackSpeed);

		return () => clearInterval(interval);
	}, [autoAdvance, playbackSpeed]);


	const value = React.useMemo(() => ({
		registerCanvases, 
		updateGamePGN, 
		overwriteGamePGN,
		updateMapData,

		renderedGameFrame,
		setRenderedGameFrame,
		incrementRenderedGameFrame,
		autoAdvance,
		setAutoAdvance,
		playbackSpeed,
		setPlaybackSpeed
	} satisfies GameContextValue), [
		renderedGameFrame,
		autoAdvance,
		playbackSpeed
	]);

	return (
		<GameContext.Provider value={value}>
			{children}
		</GameContext.Provider>
	);
}

export function useGame() {
	const ctx = React.useContext(GameContext);
	if (!ctx) throw new Error("useGame must be used inside GameProvider");
	return ctx;
}