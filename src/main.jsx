import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// iOS home-screen apps can report a viewport shorter than the physical
// screen, leaving a blank strip under the tab bar. In standalone mode the
// app always owns the whole screen, so size the root to the screen itself.
function syncAppHeight() {
  const standalone = window.navigator.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches
  if (!standalone) return
  const portrait = window.matchMedia('(orientation: portrait)').matches
  const screenH  = portrait
    ? Math.max(window.screen.width, window.screen.height)
    : Math.min(window.screen.width, window.screen.height)
  const h = Math.max(screenH, window.innerHeight)
  document.documentElement.style.setProperty('--app-height', `${h}px`)
}
syncAppHeight()
window.addEventListener('resize', syncAppHeight)
window.addEventListener('orientationchange', syncAppHeight)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
