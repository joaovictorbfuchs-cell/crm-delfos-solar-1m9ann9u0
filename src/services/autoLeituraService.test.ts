import { describe, it, expect } from 'vitest'
import {
  calcularDataLembrete2DiasAntes,
  formatarDataParaDDMMAAAA,
  normalizarDatasLeitura,
  substituirVariaveisAutoLeitura,
  sincronizarFilhasNovas,
} from './autoLeituraService'
import type { Atividade } from '@/types/crm'

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

  it('sincronizarFilhasNovas cria DUAS filhas por data: Aviso automático (2 dias antes) e Registro de auto leitura (no dia)', async () => {
    const criadas: Array<{ col: string; data: Record<string, unknown> }> = []

    const mockPb = {
      collection: (col: string) => ({
        getFullList: async () => [] as Atividade[],
        create: async (data: Record<string, unknown>) => {
          criadas.push({ col, data })
          return { id: `mock-${criadas.length}`, ...data }
        },
      }),
    }

    const atividadeMae: Atividade = {
      id: 'mae-123',
      titulo: 'Auto Leitura RGE',
      tipo: 'auto_leitura_rge',
      cliente_id: 'cli-001',
      usina_id: 'usina-001',
      responsavel_id: 'user-001',
      numero_uc: '196.880.001-93',
      created: '2026-11-10T12:00:00.000Z',
      updated: '2026-11-10T12:00:00.000Z',
    }

    // Datas a sincronizar: 1 data -> deve gerar exatamente 2 filhas
    const filhasCriadas = await sincronizarFilhasNovas(atividadeMae, ['2027-01-15'], mockPb as any)

    expect(filhasCriadas).toHaveLength(2)
    expect(criadas).toHaveLength(2)

    // Primeira filha: Aviso automático (lembrete_auto_leitura)
    const aviso = criadas.find((c) => c.data.tipo === 'lembrete_auto_leitura')
    expect(aviso).toBeDefined()
    expect(aviso?.data.titulo).toBe('Aviso automático — leitura em 15/01/2027')
    expect(aviso?.data.tipo).toBe('lembrete_auto_leitura')
    expect(aviso?.data.status).toBe('pendente')
    expect(aviso?.data.parent_id).toBe('mae-123')
    expect(aviso?.data.numero_uc).toBe('196.880.001-93')
    // 2027-01-15 é sexta-feira -> 2 dias antes é quarta 13/01
    expect(aviso?.data.data).toBe('2027-01-13T08:00:00.000Z')

    // Segunda filha: Registro de auto leitura (registro_auto_leitura)
    const registro = criadas.find((c) => c.data.tipo === 'registro_auto_leitura')
    expect(registro).toBeDefined()
    expect(registro?.data.titulo).toBe('Registro de auto leitura — 15/01/2027')
    expect(registro?.data.tipo).toBe('registro_auto_leitura')
    expect(registro?.data.status).toBe('pendente')
    expect(registro?.data.parent_id).toBe('mae-123')
    expect(registro?.data.numero_uc).toBe('196.880.001-93')
    // Data = dia da leitura
    expect(registro?.data.data).toBe('2027-01-15T12:00:00.000Z')
  })

  it('não duplica filhas se uma data já tiver aviso ou registro existente', async () => {
    const criadas: Array<{ col: string; data: Record<string, unknown> }> = []

    // Já existe o aviso da data 2027-01-15, mas não existe o registro
    const existentes: Atividade[] = [
      {
        id: 'filha-existente',
        titulo: 'Aviso automático — leitura em 15/01/2027',
        tipo: 'lembrete_auto_leitura',
        data_leitura: '2027-01-15',
        parent_id: 'mae-123',
        status: 'pendente',
        created: '2026-11-10T12:00:00.000Z',
        updated: '2026-11-10T12:00:00.000Z',
      },
    ]

    const mockPb = {
      collection: (col: string) => ({
        getFullList: async () => existentes,
        create: async (data: Record<string, unknown>) => {
          criadas.push({ col, data })
          return { id: `mock-${criadas.length}`, ...data }
        },
      }),
    }

    const atividadeMae: Atividade = {
      id: 'mae-123',
      titulo: 'Auto Leitura RGE',
      tipo: 'auto_leitura_rge',
      cliente_id: 'cli-001',
      created: '2026-11-10T12:00:00.000Z',
      updated: '2026-11-10T12:00:00.000Z',
    }

    const res = await sincronizarFilhasNovas(atividadeMae, ['2027-01-15'], mockPb as any)

    // Apenas o registro_auto_leitura deve ser criado, pois o aviso já existia
    expect(res).toHaveLength(1)
    expect(criadas).toHaveLength(1)
    expect(criadas[0].data.tipo).toBe('registro_auto_leitura')
  })
})
