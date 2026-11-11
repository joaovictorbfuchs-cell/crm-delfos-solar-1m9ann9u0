/* Main entry point for the application - renders the root React component */
import { createRoot } from 'react-dom/client'
import App from './App'
import './main.css'
import { RootErrorBoundary } from './components/RootErrorBoundary'
import { instalarManipuladoresGlobaisErros } from './lib/registroErrosGlobais'

// Captura crashes fora de ErrorBoundary (erros assíncronos, extensões, etc.)
// e grava em logs_erro_frontend, no mesmo formato fire-and-forget do boundary.
instalarManipuladoresGlobaisErros()

// @skip-protected: Do not remove. Required for React rendering.
const rootElement = document.getElementById('root')
if (rootElement) {
  createRoot(rootElement).render(
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>,
  )
}
