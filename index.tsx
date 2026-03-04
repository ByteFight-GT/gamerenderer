import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './style.css'

import { GameRenderer } from './GameRenderer'

import TEST_DATA from "./matches_example/match.json";

createRoot(document.getElementById('root')!).render(
  <GameRenderer initialData={TEST_DATA} />
)
