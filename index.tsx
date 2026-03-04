import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './style.css'

import { GameRenderer } from './GameRenderer'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GameRenderer />
  </StrictMode>,
)
