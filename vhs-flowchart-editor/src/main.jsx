import { createRoot } from 'react-dom/client'
import 'jointjs/dist/joint.css'
import './index.css'
import './styles/diagram.css'
// Register vhs custom shapes in JointJS namespace BEFORE any component mounts
import './diagram/shapes'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
)

