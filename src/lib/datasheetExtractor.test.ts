import { describe, it, expect } from 'vitest'
import { parseDatasheetText } from './datasheetExtractor'

describe('datasheetExtractor', () => {
  it('extrai corretamente Canadian Solar CS6W-550MB-AG com prioridade em tabela técnica', () => {
    const lines = [
      'CANADIAN SOLAR INC. | BiHiKu6 | BIFACIAL MONO PERC',
      'CS6W-535 | 540 | 545 | 550 | 555MB-AG',
      'ELECTRICAL DATA | STC | CS6W-550MB-AG',
      'Nominal Max. Power (Pmax) | 550 W | 550 Watts',
      'Opt. Operating Voltage (Vmp) | 41.7 V',
      'Opt. Operating Current (Imp) | 13.20 A',
      'Module Efficiency | 21.3%',
      'Operating Temperature | -40°C ~ +85°C',
      '12 Years Enhanced Product Warranty on Materials and Workmanship',
      '30 Years Linear Power Output Warranty',
    ]

    const tableText = lines.join('\n')
    const fullText = lines.join(' ')

    const result = parseDatasheetText(lines, tableText, fullText)

    expect(result.marca).toBe('Canadian Solar')
    expect(result.modelo).toBe('CS6W-550MB-AG')
    expect(result.potencia_w).toBe(550)
    expect(result.garantia_anos).toBe(12)
    expect(result.eficiencia).toBe('21.3%')
    expect(result.tipo).toBe('modulo_fv')
    expect(result.descricao_padrao).toContain('Canadian Solar')
    expect(result.descricao_padrao).toContain('550W')
  })

  it('extrai inversor Growatt MIN 5000TL-X', () => {
    const lines = [
      'Growatt New Energy | Inversor Solar On-Grid',
      'Datasheet MIN 2500-6000TL-X',
      'Model: MIN 5000TL-X',
      'Max. Recommended PV Power | 7000W',
      'Rated AC Power / Potência Nominal | 5000W',
      'Max. Output Current | 22.7A',
      '10 Years Warranty / 10 anos de garantia de fábrica',
    ]

    const tableText = lines.join('\n')
    const fullText = lines.join(' ')

    const result = parseDatasheetText(lines, tableText, fullText)

    expect(result.marca).toBe('Growatt')
    expect(result.modelo).toBe('MIN 5000TL-X')
    expect(result.potencia_w).toBe(5000)
    expect(result.garantia_anos).toBe(10)
    expect(result.tipo).toBe('inversor')
  })
})
