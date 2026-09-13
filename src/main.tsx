/* Main entry point for the application - renders the root React component */
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './main.css'
import { runWhatsAppGatewayTests } from './lib/whatsappGateway.test.ts'
import { runOrcamentoFornecedorFlowTests } from './lib/orcamentoFornecedorFlow.test.ts'
import { runOmCategorizacaoTests } from './lib/omCategorizacao.test.ts'
import { runDeduplicacaoPipedriveTests } from './lib/deduplicacaoPipedrive.test.ts'
import { runOrigemClienteTests } from './lib/origemCliente.test.ts'

if (import.meta.env.DEV) {
  try {
    runOrigemClienteTests()
  } catch (err) {
    console.error('[OrigemCliente Tests Failed]', err)
  }
  const testResults = runWhatsAppGatewayTests()
  if (testResults.errors.length > 0) {
    console.error('[WhatsAppGateway Tests Failed]', testResults.errors)
  }

  const orcamentoTests = runOrcamentoFornecedorFlowTests()
  if (orcamentoTests.errors.length > 0) {
    console.error('[OrcamentoFornecedor Tests Failed]', orcamentoTests.errors)
  }

  const omTests = runOmCategorizacaoTests()
  if (omTests.errors.length > 0) {
    console.error('[OmCategorizacao Tests Failed]', omTests.errors)
  }

  const dedupTests = runDeduplicacaoPipedriveTests()
  if (dedupTests.errors.length > 0) {
    console.error('[DeduplicacaoPipedrive Tests Failed]', dedupTests.errors)
  }
}

// @skip-protected: Do not remove. Required for React rendering.
createRoot(document.getElementById('root')!).render(<App />)
