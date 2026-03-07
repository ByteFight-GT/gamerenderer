import React from 'react'
import { createRoot } from 'react-dom/client'
import './style.css'

import { GameRenderer } from './GameRenderer'
import { VisualizerProvider, useVisualizer } from './useVisualizer';
import type { MatchMetadata, GamePGN, MapData } from '../../common/types';

import _TEST_PGN from "./matches_example/match.json";
const TEST_PGN = _TEST_PGN as unknown as GamePGN;

import _TEST_MAP_DATA from "./matches_example/test_map_data.json";
const TEST_MAP_DATA = _TEST_MAP_DATA as unknown as MapData;

const TEST_MATCH_DATA: MatchMetadata = {
  matchId: 'match_test_001',
  queuedTimestamp: Date.now() - 300000, // 5 minutes ago
  startTimestamp: Date.now() - 240000, // 4 minutes ago
  finishTimestamp: Date.now() - 60000, // 1 minute ago
  notes: 'Gamerenderer test match',
  maps: ['test_map'],
  outputDir: '/matches/match_test_001',
  teamGreen: 'ExampleBot_v1',
  teamBlue: 'ExampleBot_v2',
  greenWins: {},
  blueWins: {
    'test_map': {
      reason: 'Opponent eliminated',
      numRounds: 89
    }
  },
  draws: {},
  status: 'completed'
}

function DevTest() {

  const {renderedGameFrame, incrementRenderedGameFrame, setVisualizerState} = useVisualizer();

  return (
    <div className='app-root'>
      <div className='controls'>
        <button onClick={() => {
          setVisualizerState(TEST_MATCH_DATA, TEST_PGN, TEST_MAP_DATA);
        }}>Load</button>
        <h3>currentTurn: {renderedGameFrame}</h3>
        <button onClick={() => incrementRenderedGameFrame(-1)}>(-)</button>
        <button onClick={() => incrementRenderedGameFrame(1)}>(+)</button>
      </div>

      <GameRenderer />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <VisualizerProvider>
    <DevTest />
  </VisualizerProvider>
);
