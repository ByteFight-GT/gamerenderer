import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './style.css'

import { GameRenderer } from './GameRenderer.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GameRenderer />
  </StrictMode>,
)
