import { describe, it, expect } from 'vitest'
import {
  calcularDataLembrete2DiasAntes,
  formatarDataParaDDMMAAAA,
  normalizarDatasLeitura,
  substituirVariaveisAutoLeitura,
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

  it('substitui variáveis do template da auto leitura com valores reais ou fallbacks', () => {
    // Template padrão com [nome do cliente], [data], [dia anterior]
    const template1 =
      'Olá, [nome do cliente]! Sua usina está com a auto leitura do medidor agendada para [data]. Pedimos que envie até [dia anterior].'

    const res1 = substituirVariaveisAutoLeitura({
      texto: template1,
      nomeCliente: 'Mauro Antônio',
      dataLeitura: '2026-10-15', // 2026-10-15 é quinta-feira -> lembrete 2 dias antes: terça 13/10/2026
    })

    expect(res1).toBe(
      'Olá, Mauro Antônio! Sua usina está com a auto leitura do medidor agendada para 15/10/2026. Pedimos que envie até 13/10/2026.',
    )

    // Template com {{usina}}, {{numero_uc}}, {{endereco}} e tolerância a espaços
    const template2 =
      'Leitura na {{ usina }}, instalação {{ numero_uc }} e endereço {{ endereco }}.'

    const res2 = substituirVariaveisAutoLeitura({
      texto: template2,
      nomeUsina: 'Usina Solar Serraglio',
      numeroUc: '4004280183',
      endereco: 'Linha 3, Erechim - RS',
    })

    expect(res2).toBe(
      'Leitura na Usina Solar Serraglio, instalação 4004280183 e endereço Linha 3, Erechim - RS.',
    )

    // Fallbacks visíveis quando os dados não estão preenchidos
    const resFallbacks = substituirVariaveisAutoLeitura({
      texto:
        'Olá, [Nome do cliente]! {{usina}} UC: {{numero_uc}} [data] [dia anterior] {{endereco}}',
      nomeCliente: '',
      nomeUsina: '',
      numeroUc: '',
      endereco: '',
      dataLeitura: '',
    })

    expect(resFallbacks).toBe(
      'Olá, Nome do Cliente! Nome da Usina UC: Número da UC data da leitura data do lembrete Endereço',
    )
  })

  it('antecipa o dia anterior para sexta-feira se 2 dias antes cair no fim de semana', () => {
    // 2027-03-01 é Segunda-feira -> 2 dias antes é Sábado (27/02) -> recua para Sexta 26/02/2027
    const template = 'Leitura em [data], lembrete em [dia anterior].'
    const res = substituirVariaveisAutoLeitura({
      texto: template,
      dataLeitura: '2027-03-01',
    })
    expect(res).toBe('Leitura em 01/03/2027, lembrete em 26/02/2027.')
  })
})
