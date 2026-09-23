import { describe, it, expect } from 'vitest'
import { parseDatasheetText, parseFileNameHints } from './datasheetExtractor'

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

  it('extrai corretamente RONMA 585W TOPCon Bifacial RM-585W-182M144TB', () => {
    // Linhas reconstruídas a partir da tabela técnica do datasheet da Ronma
    const lines = [
      'RONMA SOLAR | N-TopCon BIFACIAL DUAL GLASS MODULE',
      'RM-565W~585W-182M144TB',
      'ELECTRICAL PARAMETERS AT STC',
      'Module Type | RM-570W-182M144TB | RM-575W-182M144TB | RM-580W-182M144TB | RM-585W-182M144TB',
      'Rated Maximum Power (Pmax) [W] | 570 | 575 | 580 | 585',
      'Open Circuit Voltage (Voc) [V] | 50.80 | 51.00 | 51.20 | 51.40',
      'Maximum Power Voltage (Vmp) [V] | 42.40 | 42.60 | 42.80 | 43.00',
      'Short Circuit Current (Isc) [A] | 14.16 | 14.23 | 14.30 | 14.37',
      'Maximum Power Current (Imp) [A] | 13.44 | 13.50 | 13.55 | 13.61',
      'Module Efficiency [%] | 22.07% | 22.26% | 22.45% | 22.65%',
      'Power Tolerance | 0~+5W',
      'Temperature Coefficient of Pmax | -0.30%/°C',
      '15 Years Product Warranty on Materials and Workmanship',
      '30 Years Linear Power Output Warranty',
    ]

    const tableText = lines.join('\n')
    const fullText = lines.join(' ')
    const hints = parseFileNameHints('RONMA 585W BIFACIAL N-TopCon RM-585W-182M144TB.pdf')

    const result = parseDatasheetText(lines, tableText, fullText, hints)

    expect(result.marca).toBe('RONMA')
    expect(result.modelo).toBe('RM-585W-182M144TB')
    expect(result.potencia_w).toBe(585)
    expect(result.garantia_anos).toBe(15)
    expect(result.eficiencia).toBe('22.65%')
    expect(result.tipo).toBe('modulo_fv')
    expect(result.descricao_padrao).toContain('RONMA')
    expect(result.descricao_padrao).toContain('RM-585W-182M144TB')
    expect(result.descricao_padrao).toContain('585W')
    expect(result.descricao_padrao).toContain('TOPCon N-Type')
    expect(result.descricao_padrao).toContain('Bifacial')
  })

  it('extrai dados com fallback pelo nome do arquivo RONMA mesmo se o texto estiver fragmentado', () => {
    const hints = parseFileNameHints('RONMA 585W BIFACIAL N-TopCon RM-585W-182M144TB.pdf')
    expect(hints.marca).toBe('RONMA')
    expect(hints.modelo).toBe('RM-585W-182M144TB')
    expect(hints.potencia_w).toBe(585)
    expect(hints.tipo).toBe('modulo_fv')

    // Tabela com apenas rótulos genéricos e texto simplificado
    const lines = [
      'High Efficiency Solar Module',
      'Pmax: 585Wp',
      'Efficiency: 22.6%',
      '15-year materials and workmanship warranty',
    ]
    const result = parseDatasheetText(lines, lines.join('\n'), lines.join(' '), hints)

    expect(result.marca).toBe('RONMA')
    expect(result.modelo).toBe('RM-585W-182M144TB')
    expect(result.potencia_w).toBe(585)
    expect(result.garantia_anos).toBe(15)
    expect(result.eficiencia).toBe('22.6%')
    expect(result.tipo).toBe('modulo_fv')
  })

  it('retorna objeto vazio quando PDF não possui texto (ex.: scan/imagem)', () => {
    const lines: string[] = []
    const tableText = ''
    const fullText = ''

    const result = parseDatasheetText(lines, tableText, fullText)

    expect(result.marca).toBeUndefined()
    expect(result.modelo).toBeUndefined()
    expect(result.potencia_w).toBeUndefined()
    expect(result.garantia_anos).toBeUndefined()
    expect(result.eficiencia).toBeUndefined()
    expect(result.descricao_padrao).toBeUndefined()
  })
})
