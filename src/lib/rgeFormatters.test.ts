import { describe, it, expect } from 'vitest'
import { formatarTempoRelativo, formatarCompetenciaRge } from './rgeFormatters'

describe('rgeFormatters', () => {
  it('formata competência em diversos padrões para MMM/YYYY', () => {
    expect(formatarCompetenciaRge('2026-11')).toBe('NOV/2026')
    expect(formatarCompetenciaRge('2026-10-01')).toBe('OUT/2026')
    expect(formatarCompetenciaRge('11/2026')).toBe('NOV/2026')
    expect(formatarCompetenciaRge('NOV/2026')).toBe('NOV/2026')
    expect(formatarCompetenciaRge('')).toBe('-')
    expect(formatarCompetenciaRge(null)).toBe('-')
  })

  it('formata tempo relativo com precisão em português', () => {
    const agora = Date.now()
    const ha5Min = new Date(agora - 5 * 60000).toISOString()
    const ha2Horas = new Date(agora - 2 * 3600000).toISOString()
    const ha1Dia = new Date(agora - 26 * 3600000).toISOString()
    const ha2Meses = new Date(agora - 65 * 86400000).toISOString()

    expect(formatarTempoRelativo(ha5Min)).toBe('Há 5 minutos')
    expect(formatarTempoRelativo(ha2Horas)).toBe('Há 2 horas')
    expect(formatarTempoRelativo(ha1Dia)).toBe('Há 1 dia')
    expect(formatarTempoRelativo(ha2Meses)).toBe('Há 2 meses')
    expect(formatarTempoRelativo(null)).toBe('Há pouco')
  })
})
