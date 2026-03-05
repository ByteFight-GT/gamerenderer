import React from "react";
import { CanvasManager } from "./CanvasManager";
import { GamestateManager } from "./GamestateManager";
import { GamePGN, MapData } from "./types";

const BASE_PLAYBACK_INTERVAL_MS = 500; // base time between autoplayed moves at 1x speed

export type GameContextValue = {

	// SETUP AND GAMESTATE STUFF

	gameManagerRef: React.RefObject<GamestateManager>;
	canvasManagerRef: React.RefObject<CanvasManager>;

	/** Bind to canvases that the Gamestates will be drawn to */
	registerCanvases: (spriteCanvas: HTMLCanvasElement, backgroundCanvas: HTMLCanvasElement) => void;
	
	/** Update match data (merge) with a new packet from python server. This is lazy and doesnt calc frames immediately, thats done on renderTurn (TODO: change?) */
	updateGamePGN: (newPGN: Partial<GamePGN>) => void;

	/**
	 * Set the map and game data used by the renderer and game state manager. 
	 * This should really only be used when rendering an entirely new game!
	 * This causes the canvases to redraw immediately, and causes GamestateManager to reset!
	 */
	reset: (newMapData: MapData, newInitPGN: GamePGN) => void;


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


export type GameProviderProps = {
	children: React.ReactNode;
	initMapData?: MapData;
	initPGN?: GamePGN;
};
export function GameProvider(props: GameProviderProps) {

	// SETUP AND GAMESTATE STUFF
	
	const gameManagerRef = React.useRef<GamestateManager>(new GamestateManager(props.initMapData, props.initPGN));
	const canvasManagerRef = React.useRef<CanvasManager>(new CanvasManager(props.initMapData));

	const registerCanvases = React.useCallback((spriteCanvas: HTMLCanvasElement, backgroundCanvas: HTMLCanvasElement) => {
		canvasManagerRef.current.registerCanvases(spriteCanvas, backgroundCanvas);
	}, []);

	const updateGamePGN = React.useCallback((newPGN: Partial<GamePGN>) => {
		gameManagerRef.current.updateGamePGN(newPGN);
	}, []);

	const reset = React.useCallback((newMapData: MapData, newInitPGN: GamePGN) => {
		gameManagerRef.current.reset(newMapData, newInitPGN);
		canvasManagerRef.current.reset(newMapData);

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

		console.log(`[GameProvider:setRenderedGameFrame] requested to set renderedGameFrame to ${frame}`);

		// clamp to max turn and turn off autoAdvance if we hit the end of the game
		if (frame >= gameManagerRef.current.gamePGN.turn_count) {
			console.log(`[GameProvider:setRenderedGameFrame] reached end of game (only ${gameManagerRef.current.gamePGN.turn_count} turns)!, clamping frame to ${gameManagerRef.current.gamePGN.turn_count - 1} and turning off autoAdvance`);
			frame = gameManagerRef.current.gamePGN.turn_count - 1;
			// not actually disabling auto-advance - this allows live matches to run!
		}

		frame = Math.max(0, frame); // who would be stupid enough to do this....? (me)

		// if no change, do nothing
		if (frame === renderedGameFrameRef.current) return;

		console.log(`[GameProvider:setRenderedGameFrame] rendering ${frame}!`)

		renderFrame(frame);
		_setRenderedGameFrame(frame);
	}, []);
	
	const incrementRenderedGameFrame = React.useCallback((n: number) => {
		console.log(`[GameProvider:incrementRenderedGameFrame] incrementing by ${n} from ${renderedGameFrameRef.current}`);
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
		registerCanvases, 
		updateGamePGN,
		reset,

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
			{props.children}
		</GameContext.Provider>
	);
}


export function useGame() {
	const ctx = React.useContext(GameContext);
	if (!ctx) throw new Error("useGame must be used inside GameProvider");
	return ctx;
}