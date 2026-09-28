import { describe, it, expect } from 'vitest'
import {
  calcularDataLembrete2DiasAntes,
  formatarDataParaDDMMAAAA,
  normalizarDatasLeitura,
} from './autoLeituraService'

describe('autoLeituraService', () => {
  it('formata datas YYYY-MM-DD para DD/MM/AAAA corretamente', () => {
    expect(formatarDataParaDDMMAAAA('2027-01-15')).toBe('15/01/2027')
    expect(formatarDataParaDDMMAAAA('2027-02-05')).toBe('05/02/2027')
    expect(formatarDataParaDDMMAAAA('')).toBe('')
  })

  it('calcula data do lembrete exatamente 2 dias antes às 08:00 UTC', () => {
    const res = calcularDataLembrete2DiasAntes('2027-01-15')
    expect(res.dataLeituraIso).toBe('2027-01-15T12:00:00.000Z')
    expect(res.dataLembreteIso).toBe('2027-01-13T08:00:00.000Z')

    const resFev = calcularDataLembrete2DiasAntes('2027-03-01')
    // 2 dias antes de 01/03/2027 (não bissexto) é 27/02/2027
    expect(resFev.dataLembreteIso).toBe('2027-02-27T08:00:00.000Z')
  })

  it('normaliza datas_leitura de diferentes formatos e deduplica', () => {
    expect(normalizarDatasLeitura(['2027-01-15', '2027-02-15'])).toEqual([
      '2027-01-15',
      '2027-02-15',
    ])

    expect(normalizarDatasLeitura(JSON.stringify(['2027-03-15', '2027-01-15']))).toEqual([
      '2027-01-15',
      '2027-03-15',
    ])

    expect(normalizarDatasLeitura(['2027-01-15', '2027-01-15'])).toEqual(['2027-01-15'])
    expect(normalizarDatasLeitura(null)).toEqual([])
  })
})
