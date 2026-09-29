import fs from 'fs'
import path from 'path'
import { describe, it, expect } from 'vitest'
import { runAuditoria } from '../../scripts/auditoria-duplicados.mjs'

describe('Execução Real da Auditoria de Duplicados', () => {
  it('executa contra o PocketBase com credenciais de ambiente', async () => {
    const res = await runAuditoria({
      email: 'joao@delfosengenharia.com.br',
      password: 'Skip@Pass',
    })
    // Captura os dados da auditoria em arquivo para análise e relatório
    const fsPath = path.resolve(process.cwd(), 'scripts/auditoria_raw_result.json')
    fs.writeFileSync(fsPath, JSON.stringify(res, null, 2))
    console.log('AUDITORIA_ESCRITA_COM_SUCESSO_EM:', fsPath)
    expect(res.stats.totalContatos).toBeGreaterThan(0)
  }, 120000)
})
