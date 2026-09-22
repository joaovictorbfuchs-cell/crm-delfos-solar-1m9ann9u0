import fs from 'fs'
import path from 'path'

// Teste para validação do script de exportação do schema para XLSX
// Verifica a integridade dos dados gerados nas 3 abas obrigatórias

describe('Export Schema Script & Data Structure', () => {
  it('deve conter as 38 coleções do PocketBase no schema', () => {
    const rawSchema = fs.readFileSync(path.resolve('src/lib/pocketbase/schema.json'), 'utf8')
    const schema = JSON.parse(rawSchema)
    expect(schema.collections.length).toBe(38)
  })

  it('deve gerar os dados das 3 abas requeridas: Resumo, Campos e Chaves Estrangeiras', async () => {
    const { generateSchemaWorkbookData } = await import('../../scripts/exportSchema.js')
    const sheets = generateSchemaWorkbookData()
    expect(sheets.length).toBe(3)

    const [abaResumo, abaCampos, abaFKs] = sheets
    expect(abaResumo.name).toBe('Resumo')
    expect(abaCampos.name).toBe('Campos')
    expect(abaFKs.name).toBe('Chaves Estrangeiras')

    // Aba Resumo deve conter cabeçalho + 38 coleções + 1 linha totalizadora = 40 linhas
    expect(abaResumo.rows.length).toBe(40)

    // Aba Campos deve conter centenas de campos
    expect(abaCampos.rows.length).toBeGreaterThan(300)

    // Aba Chaves Estrangeiras deve listar as relações identificadas
    expect(abaFKs.rows.length).toBeGreaterThan(20)
  })

  it('deve gerar o binário XLSX válido com assinatura PKZIP', async () => {
    const { generateSchemaWorkbookData } = await import('../../scripts/exportSchema.js')
    const { buildXlsx } = await import('../../scripts/xlsxBuilder.js')

    const sheets = generateSchemaWorkbookData()
    const xlsxBuffer = buildXlsx(sheets)

    expect(xlsxBuffer.length).toBeGreaterThan(1000)
    // Assinatura PK\x03\x04
    expect(xlsxBuffer[0]).toBe(0x50)
    expect(xlsxBuffer[1]).toBe(0x4B)
    expect(xlsxBuffer[2]).toBe(0x03)
    expect(xlsxBuffer[3]).toBe(0x04)
  })
})
