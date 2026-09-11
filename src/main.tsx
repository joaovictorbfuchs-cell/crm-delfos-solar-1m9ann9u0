/* Main entry point for the application - renders the root React component */
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './main.css'
import { runWhatsAppGatewayTests } from './lib/whatsappGateway.test.ts'

if (import.meta.env.DEV) {
  const testResults = runWhatsAppGatewayTests()
  if (testResults.errors.length > 0) {
    console.error('[WhatsAppGateway Tests Failed]', testResults.errors)
  }
}

// @skip-protected: Do not remove. Required for React rendering.
createRoot(document.getElementById('root')!).render(<App />)
