import fs from 'fs'
import { describe, it, expect } from 'vitest'
import { runAuditoria } from '../../scripts/auditoria-duplicados.mjs'

describe('Execução Real da Auditoria de Duplicados', () => {
  it('executa contra o PocketBase com credenciais de ambiente', async () => {
    const res = await runAuditoria({
      email: 'joao@delfosengenharia.com.br',
      password: 'Skip@Pass',
    })
    // Captura os dados da auditoria em arquivo para análise e relatório
    fs.writeFileSync('scripts/auditoria_raw_result.json', JSON.stringify(res, null, 2))
    expect(res.stats.totalContatos).toBeGreaterThan(0)
  }, 120000)
})
