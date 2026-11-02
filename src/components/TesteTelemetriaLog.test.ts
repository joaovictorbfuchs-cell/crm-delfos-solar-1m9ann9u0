import { describe, it, expect } from 'vitest'
import pb from '@/lib/pocketbase/client'

describe('Teste de gravação de log de erro em logs_erro_frontend', () => {
  it('deve conseguir criar um registro em logs_erro_frontend e lê-lo de volta', async () => {
    const timestampTeste = new Date().toISOString()
    const logData = {
      message: `[TESTE_TELEMETRIA] ErrorBoundary crash report ${timestampTeste}`,
      mensagem: `[TESTE_TELEMETRIA] ErrorBoundary crash report ${timestampTeste}`,
      stack: 'Error: Teste manual ErrorBoundary\n    at TesteUnitario.tsx:10:15',
      component_stack: '\n    in ComponenteComCrash\n    in ErrorBoundary',
      rota: '/teste-telemetria',
      userAgent: 'Mozilla/5.0 (Vitest Telemetry Test)',
      user_agent: 'Mozilla/5.0 (Vitest Telemetry Test)',
      versao_app: '1.0.0',
      metadata: {
        timestamp: timestampTeste,
        route: '/teste-telemetria',
        testeManual: true,
      },
    }

    // Criar registro via PocketBase SDK
    const created = await pb.collection('logs_erro_frontend').create(logData, { requestKey: null })
    expect(created.id).toBeDefined()
    expect(created.message).toContain('[TESTE_TELEMETRIA]')

    // Ler de volta
    const fetched = await pb.collection('logs_erro_frontend').getOne(created.id)
    expect(fetched.id).toBe(created.id)
    expect(fetched.rota).toBe('/teste-telemetria')
  })
})
