import React from 'react'
import { createRoot } from 'react-dom/client'
import './style.css'

import { GameRenderer } from './GameRenderer'
import { GameProvider, useGame } from './useGame';
import { GamePGN, MapData } from './types';

import _TEST_PGN from "./matches_example/match.json";
const TEST_PGN = TEMP_convertRCArraysToObjects(_TEST_PGN) as GamePGN;

import _TEST_MAP_DATA from "./matches_example/test_map_data.json";
import { TEMP_convertRCArraysToObjects } from './utils';
const TEST_MAP_DATA = _TEST_MAP_DATA as MapData;

function DevTest() {

  const { renderedGameFrame, incrementRenderedGameFrame } = useGame();

  return (
    <div className='app-root'>
      <div className='controls'>
        <h3>currentTurn: {renderedGameFrame}</h3>
        <button onClick={() => incrementRenderedGameFrame(-1)}>(-)</button>
        <button onClick={() => incrementRenderedGameFrame(1)}>(+)</button>
      </div>

      <GameRenderer />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <GameProvider initPGN={TEST_PGN} initMapData={TEST_MAP_DATA}>
    <DevTest />
</GameProvider>
);
