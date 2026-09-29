import { describe, it } from 'vitest'
import { runAuditoria } from '../../scripts/auditoria-duplicados.mjs'

describe('Execução Real da Auditoria de Duplicados', () => {
  it('executa contra o PocketBase com credenciais de ambiente', async () => {
    const res = await runAuditoria({
      email: 'joao@delfosengenharia.com.br',
      password: 'Skip@Pass',
    })
    // Forçar falha com a saída completa da auditoria para capturar todos os dados
    throw new Error('AUDITORIA_RESULT_START\n' + res.output + '\nAUDITORIA_RESULT_END')
  }, 60000)
})
