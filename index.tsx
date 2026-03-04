import React from 'react'
import { createRoot } from 'react-dom/client'
import './style.css'

import { GameRenderer } from './GameRenderer'

import TEST_DATA from "./matches_example/match.json";

function DevTest() {

  const [currentTurn, setCurrentTurn] = React.useState(0);

  return (
    <div className='app-root'>
      <div className='controls'>
        <h3>currentTurn: {currentTurn}</h3>
        <button onClick={() => setCurrentTurn((prev) => Math.max(0, prev - 1))}>(-)</button>
        <button onClick={() => setCurrentTurn((prev) => Math.min(TEST_DATA.turn_count - 1, prev + 1))}>(+)</button>
      </div>

      <GameRenderer 
      initialData={TEST_DATA} 
      currentTurn={currentTurn} 
      setCurrentTurn={setCurrentTurn} />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<DevTest />);
