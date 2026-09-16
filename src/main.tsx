/* Main entry point for the application - renders the root React component */
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './main.css'
import { RootErrorBoundary } from './components/RootErrorBoundary.tsx'
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
  try {
    const testResults = runWhatsAppGatewayTests()
    if (testResults.errors.length > 0) {
      console.error('[WhatsAppGateway Tests Failed]', testResults.errors)
    }
  } catch (err) {
    console.error('[WhatsAppGateway Tests Threw]', err)
  }

  try {
    const orcamentoTests = runOrcamentoFornecedorFlowTests()
    if (orcamentoTests.errors.length > 0) {
      console.error('[OrcamentoFornecedor Tests Failed]', orcamentoTests.errors)
    }
  } catch (err) {
    console.error('[OrcamentoFornecedor Tests Threw]', err)
  }

  try {
    const omTests = runOmCategorizacaoTests()
    if (omTests.errors.length > 0) {
      console.error('[OmCategorizacao Tests Failed]', omTests.errors)
    }
  } catch (err) {
    console.error('[OmCategorizacao Tests Threw]', err)
  }

  try {
    const dedupTests = runDeduplicacaoPipedriveTests()
    if (dedupTests.errors.length > 0) {
      console.error('[DeduplicacaoPipedrive Tests Failed]', dedupTests.errors)
    }
  } catch (err) {
    console.error('[DeduplicacaoPipedrive Tests Threw]', err)
  }
}

// @skip-protected: Do not remove. Required for React rendering.
createRoot(document.getElementById('root')!).render(
  <RootErrorBoundary>
    <App />
  </RootErrorBoundary>,
)
