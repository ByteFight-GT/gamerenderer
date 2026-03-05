import React from "react";
import { CanvasManager } from "./CanvasManager";
import { GamestateManager } from "./GamestateManager";
import { GamePGN } from "./types";

const BASE_PLAYBACK_INTERVAL_MS = 500; // base time between autoplayed moves at 1x speed

export type GamerendererContextValue = {

	// SETUP AND GAMESTATE STUFF

	/** Bind to canvases that the Gamestates will be drawn to */
	registerCanvases: (spriteCanvas: HTMLCanvasElement, backgroundCanvas: HTMLCanvasElement) => void;
	
	/** Update match data with a new packet from python server. This is lazy and doesnt calc frames immediately, thats done on renderTurn (TODO: change?) */
	updateGamePGN: (newPGN: GamePGN) => void;

	// USER CONTROLS STUFF

	/** Index of the game frame (state of game AFTER turn [i]) that is being rendered */
	renderedGameFrame: number;
	setRenderedGameFrame: (frame: number) => void;

	/** Whether to auto-advance renderedGameFrame. Will auto-set to false if renderedGameFrame is at the end of the current pgn. */
	autoAdvance: boolean;
	setAutoAdvance: React.Dispatch<React.SetStateAction<boolean>>;

	/** Speed multipler for autoAdvance. base is 500ms (see BASE_PLAYBACK_INTERVAL_MS). DO NOT MAKE <= 0 OR ELSE!  */
	playbackSpeed: number;
	setPlaybackSpeed: React.Dispatch<React.SetStateAction<number>>;

};

const GamerendererContext = React.createContext<GamerendererContextValue | null>(null);

export function GamerendererProvider({ children }: { children: React.ReactNode }) {

	// SETUP AND GAMESTATE STUFF
	
	const gameManagerRef = React.useRef<GamestateManager>(new GamestateManager());
	const canvasManagerRef = React.useRef<CanvasManager>(new CanvasManager());

	const registerCanvases = React.useCallback((spriteCanvas: HTMLCanvasElement, backgroundCanvas: HTMLCanvasElement) => {
		canvasManagerRef.current.registerCanvases(spriteCanvas, backgroundCanvas);
	}, []);

	const updateGamePGN = React.useCallback((newPGN: GamePGN) => {
		gameManagerRef.current.updateGamePGN(newPGN);
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
		if (frame > gameManagerRef.current.gamePGN.turn_count) {
			frame = gameManagerRef.current.gamePGN.turn_count;
			setAutoAdvance(false);
		}

		frame = Math.max(0, frame); // who would be stupid enough to do this....? (me)

		renderFrame(frame);
		_setRenderedGameFrame(frame);
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

		renderedGameFrame,
		setRenderedGameFrame,
		autoAdvance,
		setAutoAdvance,
		playbackSpeed,
		setPlaybackSpeed
	} satisfies GamerendererContextValue), [
		renderedGameFrame,
		autoAdvance,
		playbackSpeed
	]);

	return (
		<GamerendererContext.Provider value={value}>
			{children}
		</GamerendererContext.Provider>
	);
}

export function useGamerenderer() {
	const ctx = React.useContext(GamerendererContext);
	if (!ctx) throw new Error("useGamerenderer must be used inside GamerendererProvider");
	return ctx;
}