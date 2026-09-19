import { describe, it, expect } from 'vitest'
import fs from 'fs'
import { parseXlsxFile } from './lib/spreadsheetParser'

describe('Validação da Planilha de Orçamento XLSX', () => {
  it('lê a planilha oficial e valida os parâmetros', async () => {
    const buffer = fs.readFileSync('src/assets/planilha-de-orcamento-49b17.xlsx')
    const parsed = await parseXlsxFile(
      buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
    )

    // Procura linhas que contenham 331,43 ou 1,1039 ou 1,1979 ou 365,87 ou 397,02 ou 71,94 ou GD Eco
    const achados: string[] = []
    parsed.rawMatrix.forEach((r, idx) => {
      const lineStr = JSON.stringify(r)
      if (
        lineStr.includes('331') ||
        lineStr.includes('1.1039') ||
        lineStr.includes('1,1039') ||
        lineStr.includes('1.1979') ||
        lineStr.includes('1,1979') ||
        lineStr.includes('365') ||
        lineStr.includes('397') ||
        lineStr.includes('71,94') ||
        lineStr.includes('71.94') ||
        lineStr.toLowerCase().includes('eco') ||
        lineStr.toLowerCase().includes('cip') ||
        lineStr.toLowerCase().includes('ilumin')
      ) {
        achados.push(`Linha ${idx}: ${lineStr}`)
      }
    })

    expect(achados.length).toBe(0) // intentionally fail to see stdout/snapshot
  })
})
