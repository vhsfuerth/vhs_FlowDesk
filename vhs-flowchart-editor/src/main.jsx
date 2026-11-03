import { createRoot } from 'react-dom/client'
import 'jointjs/dist/joint.css'
import './index.css'
import './styles/diagram.css'
// Register vhs custom shapes in JointJS namespace BEFORE any component mounts
import './diagram/shapes'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import ConfirmProvider from './components/ConfirmDialog.jsx'

// Nach einem Update kann eine noch geöffnete alte Version nachzuladende Dateien
// (Dialoge, PDF/Word-Export) nicht mehr finden. Dann einmalig neu laden – die
// aktuelle Arbeit ist über den Autosave-Entwurf gesichert und wird angeboten.
const RELOAD_FLAG = 'vhs-reloaded-after-update'
window.addEventListener('vite:preloadError', (event) => {
  try {
    if (sessionStorage.getItem(RELOAD_FLAG)) return
    sessionStorage.setItem(RELOAD_FLAG, '1')
  } catch {
    return
  }
  event.preventDefault()
  window.location.reload()
})
window.addEventListener('load', () => {
  // Erfolgreich geladen: bei einem späteren Update darf wieder neu geladen werden
  setTimeout(() => {
    try { sessionStorage.removeItem(RELOAD_FLAG) } catch { /* ignorieren */ }
  }, 10000)
})

createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <ConfirmProvider>
      <App />
    </ConfirmProvider>
  </ErrorBoundary>,
)

