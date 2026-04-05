import React from "react";
import { CanvasManager } from "./CanvasManager";
import { GamestateManager } from "./GamestateManager";
import { clamp } from "./utils";
import type { GameFrame, GamePGN } from "./types";

/** base ms between autoplayed moves at 1x speed */
const BASE_PLAYBACK_INTERVAL_MS = 500; 

type SubscriptionHandler = (
	entirePGN: GamePGN | null, 
	currGameFrame: GameFrame | null,
	currFrameIdx: number,  
) => void
type Unsubscriber = () => void;

export type VisualizerContextValue = {

	// SETUP AND GAMESTATE STUFF

	gameManagerRef: React.RefObject<GamestateManager>;
	canvasManagerRef: React.RefObject<CanvasManager>;

	/** Bind to canvases that the Gamestates will be drawn to */
	_registerCanvases: (spriteCanvas: HTMLCanvasElement, backgroundCanvas: HTMLCanvasElement) => void;

	/**
	 * Add a callback to be called whenever the game pgn or current frame changes.
	 *
	 * ### PLEASE DO NOT WRITE TO THE DATA IN THE CALLBACK, THESE SHOULD BE FOR READING ONLY!!!
	 * ### THANK YOU FOR YOUR ATTENTION TO THIS MATTER. -President Donald J Trump
	 *
	 * Returns an unsubscribe function to remove the handler.
	 */
	subscribeToGameOrFrameChanges: (handler: SubscriptionHandler) => Unsubscriber;

	/**
	 * Make the visualizer switch context to a new game
	 * This causes the canvases to redraw immediately, resets states like the current frame.
	 */
	setVisualizerState: (gamePGN: GamePGN) => void;

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
	
	const stateSubscribersRef = React.useRef<Set<SubscriptionHandler>>(new Set());

	const renderedGameFrameRef = React.useRef(0);

	const gameManagerRef = React.useRef<GamestateManager>(new GamestateManager(null));
	const canvasManagerRef = React.useRef<CanvasManager>(new CanvasManager());

	const _registerCanvases = React.useCallback((spriteCanvas: HTMLCanvasElement, backgroundCanvas: HTMLCanvasElement) => {
		canvasManagerRef.current.registerCanvases(spriteCanvas, backgroundCanvas);
	}, []);

	const setVisualizerState: VisualizerContextValue["setVisualizerState"] = 
		React.useCallback(gamePGN => {
			gameManagerRef.current.reset(gamePGN);
			canvasManagerRef.current.reset(gamePGN.blocked_positions);

			// reset controls except for playback speed cuz thats more of a user setting
			setRenderedGameFrame(0);
			renderFrame(0);
			setAutoAdvance(false);

			updateStateSubscribers();
		}, []);

	const clearVisualizerState = React.useCallback(() => {
		console.log(`[GameProvider.clearVisualizerState] restoring to default board`);
		gameManagerRef.current.reset(null);
		canvasManagerRef.current.reset([]);

		// reset controls except for playback speed cuz thats more of a user setting
		setRenderedGameFrame(0);
		setAutoAdvance(false);

		updateStateSubscribers();
	}, []);

	const subscribeToGameOrFrameChanges = React.useCallback((handler: SubscriptionHandler) => {
		// give it initial notification
		const currGameFrame = gameManagerRef.current.getGameFrame(renderedGameFrameRef.current);
		handler(gameManagerRef.current.gamePGN, currGameFrame, renderedGameFrameRef.current);

		stateSubscribersRef.current.add(handler);
		return () => stateSubscribersRef.current.delete(handler); // unsubscriber
	}, []);

	const updateStateSubscribers = React.useCallback(() => {
		const currGameFrame = gameManagerRef.current.getGameFrame(renderedGameFrameRef.current);
		stateSubscribersRef.current.forEach(
			handler => handler(
				gameManagerRef.current.gamePGN, 
				currGameFrame, 
				renderedGameFrameRef.current
			)
		);
	}, []);

	const renderFrame = React.useCallback((turn: number) => {
		const frame = gameManagerRef.current.getGameFrame(turn);
		canvasManagerRef.current.drawGameFrame(frame);
	}, []);

	// USER CONTROLS STUFF

	const [autoAdvance, setAutoAdvance] = React.useState(false);
	const [playbackSpeed, setPlaybackSpeed] = React.useState(1);
	
	// setRenderedGameFrame wrapper with extra checks/handlers
	const setRenderedGameFrame = React.useCallback((frame: number) => {
		if (!gameManagerRef.current.gamePGN) {
			console.warn(`[Visualizer.setRenderedGameFrame] tried to set frame to ${frame} but no gamePGN loaded`);
			return;
		}

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
		_registerCanvases, 
		setVisualizerState,
		clearVisualizerState,
		subscribeToGameOrFrameChanges,
		setRenderedGameFrame,
		incrementRenderedGameFrame,
		autoAdvance,
		setAutoAdvance,
		playbackSpeed,
		setPlaybackSpeed,
	} satisfies VisualizerContextValue), [
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