import React from 'react'
import { createRoot } from 'react-dom/client'

import { GameRenderer } from './GameRenderer'
import { useVisualizer, VisualizerProvider } from './useVisualizer';
import type { GameFrame, GamePGN } from './types';

import _TEST_PGN from "./TEST_PGN.json";
const TEST_PGN = _TEST_PGN as unknown as GamePGN;

function VisualizerControls() {
  const {
    subscribeToGameOrFrameChanges,
    setRenderedGameFrame,
    incrementRenderedGameFrame,
    autoAdvance,
    setAutoAdvance,
    playbackSpeed,
    setPlaybackSpeed,
  } = useVisualizer();

  const [currFrameIdx, setCurrFrameIdx] = React.useState<number>(0);
  const [maxFrameIdx, setMaxFrameIdx] = React.useState<number>(0);
  const [currGameFrame, setCurrGameFrame] = React.useState<GameFrame | null>(null);

  React.useEffect(() => {
    return subscribeToGameOrFrameChanges((entirePGN, gameFrame, frameIdx) => {
      setCurrGameFrame(gameFrame);
      setCurrFrameIdx(frameIdx);
      setMaxFrameIdx(entirePGN?.turn_count ?? 0);
    });
  }, [subscribeToGameOrFrameChanges]);

  const to2dp = (n: number) => n.toFixed(2);

  return (
    <div className='stats' style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button type="button" onClick={() => setRenderedGameFrame(0)}>
          First
        </button>
        <button type="button" onClick={() => incrementRenderedGameFrame(-1)}>
          Prev
        </button>
        <button type="button" onClick={() => incrementRenderedGameFrame(1)}>
          Next
        </button>
        <button type="button" onClick={() => setRenderedGameFrame(maxFrameIdx)}>
          Last
        </button>

        <button
          type="button"
          onClick={() => setAutoAdvance(prev => !prev)}
        >
          {autoAdvance ? "Pause" : "Play"}
        </button>

        <label htmlFor="playback-speed">Speed</label>
        <select
          id="playback-speed"
          value={String(playbackSpeed)}
          onChange={e => setPlaybackSpeed(Number(e.target.value))}
        >
          <option value="0.25">0.25x</option>
          <option value="0.5">0.5x</option>
          <option value="1">1x</option>
          <option value="2">2x</option>
          <option value="4">4x</option>
        </select>
      </div>

      <div style={{ display: "grid", gap: 4 }}>
        <div><strong>Frame:</strong> {currFrameIdx} / {maxFrameIdx}</div>
        <div><strong>Auto:</strong> {autoAdvance ? "On" : "Off"}</div>
        <div><strong>Red:</strong> {currGameFrame ? `(${currGameFrame.redLoc[0]}, ${currGameFrame.redLoc[1]})` : "-"}</div>
        <div><strong>Yellow:</strong> {currGameFrame ? `(${currGameFrame.yellowLoc[0]}, ${currGameFrame.yellowLoc[1]})` : "-"}</div>
        <div><strong>Rat:</strong> {currGameFrame ? `(${currGameFrame.ratLoc[0]}, ${currGameFrame.ratLoc[1]})` : "-"}</div>
        <div><strong>Rat caught:</strong> {currGameFrame?.wasRatCaught ? "Yes" : "No"}</div>
        <div><strong>Score:</strong> {currGameFrame ? `${currGameFrame.aPoints} - ${currGameFrame.bPoints}` : "-"}</div>
        <div><strong>Turns left:</strong> {currGameFrame ? `${currGameFrame.aTurnsLeft} / ${currGameFrame.bTurnsLeft}` : "-"}</div>
        <div><strong>Time left:</strong> {currGameFrame ? `${to2dp(currGameFrame.aTimeLeft)}s / ${to2dp(currGameFrame.bTimeLeft)}s` : "-"}</div>
        <div><strong>Carpeted tiles:</strong> {currGameFrame?.carpetedTiles.length ?? 0}</div>
        <div><strong>Glued tiles:</strong> {currGameFrame?.gluedTiles.length ?? 0}</div>
      </div>
    </div>
  );
}

function DevTest() {

  const { setVisualizerState } = useVisualizer();

  React.useEffect(() => {
    setVisualizerState(TEST_PGN);
  }, [setVisualizerState]);

  return (
    <div className='container'>
      <GameRenderer className='board-container' />

      <hr />

      <VisualizerControls />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <VisualizerProvider>
    <DevTest />
  </VisualizerProvider>
);
