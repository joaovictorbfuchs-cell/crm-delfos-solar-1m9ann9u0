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

  it('calcula data do lembrete 2 dias antes e antecipa para sexta-feira se cair no fim de semana', () => {
    // 2027-01-15 é Sexta-feira -> 2 dias antes é Quarta-feira (13/01)
    const res = calcularDataLembrete2DiasAntes('2027-01-15')
    expect(res.dataLeituraIso).toBe('2027-01-15T12:00:00.000Z')
    expect(res.dataLembreteIso).toBe('2027-01-13T08:00:00.000Z')

    // 2027-03-01 é Segunda-feira -> 2 dias antes seria Sábado (27/02)
    // Regra 1: se cair em sábado ou domingo, enviar na SEXTA-FEIRA anterior (nunca no fim de semana)
    // Sábado 27/02 -> antecipa para Sexta 26/02
    const resFev = calcularDataLembrete2DiasAntes('2027-03-01')
    expect(resFev.dataLembreteIso).toBe('2027-02-26T08:00:00.000Z')

    // 2027-03-02 é Terça-feira -> 2 dias antes seria Domingo (28/02)
    // Domingo 28/02 -> antecipa para Sexta 26/02
    const resTerca = calcularDataLembrete2DiasAntes('2027-03-02')
    expect(resTerca.dataLembreteIso).toBe('2027-02-26T08:00:00.000Z')
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
