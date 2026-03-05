import React from "react";
import { CanvasManager } from "./CanvasManager";
import { GamestateManager } from "./GamestateManager";
import { GamePGN } from "./types";

type GamerendererContextValue = {
	/** Bind to canvases that the Gamestates will be drawn to */
	registerCanvases: (spriteCanvas: HTMLCanvasElement, backgroundCanvas: HTMLCanvasElement) => void;
	
	/** Update match data with a new packet from python server. This is lazy and doesnt calc frames immediately, thats done on renderTurn (TODO: change?) */
	updateGamePGN: (newPGN: GamePGN) => void;

	/** Imperatively render this turn number onto the canvases. if no data exists for this turn, will throw an error! */
	renderTurn: (turn: number) => void;
};

const GamerendererContext = React.createContext<GamerendererContextValue | null>(null);

export function GamerendererProvider({ children }: { children: React.ReactNode }) {
	const gameManagerRef = React.useRef<GamestateManager>(new GamestateManager());
	const canvasManagerRef = React.useRef<CanvasManager>(new CanvasManager());

	const registerCanvases = React.useCallback((spriteCanvas: HTMLCanvasElement, backgroundCanvas: HTMLCanvasElement) => {
		canvasManagerRef.current.registerCanvases(spriteCanvas, backgroundCanvas);
	}, []);

	const updateGamePGN = React.useCallback((newPGN: GamePGN) => {
		gameManagerRef.current.updateGamePGN(newPGN);
	}, []);

	const renderTurn = React.useCallback((turn: number) => {
		const frame = gameManagerRef.current.getGameFrame(turn);
		canvasManagerRef.current.drawGameState(frame);
	}, []);

	const value = React.useMemo(() => ({
		registerCanvases, 
		updateGamePGN, 
		renderTurn
	} satisfies GamerendererContextValue), [
		// all these funcs are stable, so no deps needed
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