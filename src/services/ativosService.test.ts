import { describe, it, expect, vi } from 'vitest'
import {
  calcularStatusGarantia,
  getLabelTipoAtivo,
  analisarImportacaoInversores,
} from './ativosService'
import pb from '@/lib/pocketbase/client'

describe('ativosService - calcularStatusGarantia', () => {
  it('retorna nao_informada quando data não é fornecida', () => {
    const res = calcularStatusGarantia(undefined)
    expect(res.status).toBe('nao_informada')
    expect(res.label).toBe('Não informada')
  })

  it('retorna vencida quando a data de garantia já passou', () => {
    const res = calcularStatusGarantia('2020-01-01')
    expect(res.status).toBe('vencida')
    expect(res.label).toBe('Garantia Vencida')
  })

  it('retorna proxima_vencimento quando faltam até 60 dias', () => {
    const dataFutura = new Date()
    dataFutura.setDate(dataFutura.getDate() + 15)
    const res = calcularStatusGarantia(dataFutura.toISOString().split('T')[0])
    expect(res.status).toBe('proxima_vencimento')
  })

  it('retorna vigente quando a garantia é longa', () => {
    const dataFutura = new Date()
    dataFutura.setFullYear(dataFutura.getFullYear() + 5)
    const res = calcularStatusGarantia(dataFutura.toISOString().split('T')[0])
    expect(res.status).toBe('vigente')
    expect(res.label).toBe('Garantia Vigente')
  })
})

describe('ativosService - getLabelTipoAtivo', () => {
  it('retorna label correto para tipos conhecidos', () => {
    expect(getLabelTipoAtivo('inversor')).toBe('Inversor')
    expect(getLabelTipoAtivo('placa_solar')).toContain('Placa Solar')
    expect(getLabelTipoAtivo('bateria')).toBe('Bateria')
    expect(getLabelTipoAtivo('string_box')).toBe('String Box')
  })

  it('retorna descrição personalizada para outros', () => {
    expect(getLabelTipoAtivo('outros', 'Transformador 50kVA')).toBe('Transformador 50kVA')
  })
})

describe('ativosService - analisarImportacaoInversores', () => {
  it('identifica corretamente registros aptos, já importados e fora por falta de dados', async () => {
    const mockInversores = [
      {
        id: 'inv1',
        cliente_id: 'cli1',
        marca_inversor: 'Deye',
        modelo_inversor: 'SUN-8K',
        numero_serie: 'SN123',
        potencia_kwp: 8,
      },
      {
        id: 'inv2',
        cliente_id: 'cli2',
        marca_inversor: '',
        modelo_inversor: '',
        numero_serie: '',
        potencia_kwp: 0,
      },
      {
        id: 'inv3',
        cliente_id: 'cli1',
        marca_inversor: 'Growatt',
        modelo_inversor: 'MIN 5000',
        numero_serie: 'GW789',
      },
    ]

    const mockUsinas = [
      {
        id: 'usina1',
        cliente_id: 'cli1',
        nome: 'Usina Principal',
      },
    ]

    const mockClientes = [
      { id: 'cli1', nome: 'Cliente Teste 1' },
      { id: 'cli2', nome: 'Cliente Teste 2' },
    ]

    const mockAtivos = [
      {
        id: 'ativo1',
        tipo: 'inversor',
        fabricante: 'Deye',
        modelo: 'SUN-8K',
        chave_importacao: 'cliente_inversores:inv1',
      },
    ]

    const origCollection = pb.collection
    pb.collection = vi.fn().mockImplementation((colName: string) => {
      return {
        getFullList: vi.fn().mockImplementation(async () => {
          if (colName === 'cliente_inversores') return mockInversores
          if (colName === 'usinas') return mockUsinas
          if (colName === 'clientes') return mockClientes
          if (colName === 'ativos') return mockAtivos
          return []
        }),
      } as any
    }) as any

    try {
      const analise = await analisarImportacaoInversores()
      expect(analise.totalInversores).toBe(3)
      expect(analise.jaImportados.length).toBe(1)
      expect(analise.jaImportados[0].inversorId).toBe('inv1')

      expect(analise.foraPorFaltaDados.length).toBe(1)
      expect(analise.foraPorFaltaDados[0].id).toBe('inv2')

      expect(analise.aptosParaCriar.length).toBe(1)
      expect(analise.aptosParaCriar[0].inversorId).toBe('inv3')
      expect(analise.aptosParaCriar[0].fabricante).toBe('Growatt')
      expect(analise.aptosParaCriar[0].usinaId).toBe('usina1')
    } finally {
      pb.collection = origCollection
    }
  })

  it('deduplica registros repetidos de cliente_inversores com mesmos dados', async () => {
    const mockInversores = [
      {
        id: 'inv_a',
        cliente_id: 'cli_dup',
        marca_inversor: 'Deye',
        modelo_inversor: '',
        numero_serie: '',
        potencia_kwp: 6.9,
      },
      {
        id: 'inv_b',
        cliente_id: 'cli_dup',
        marca_inversor: 'Deye',
        modelo_inversor: '',
        numero_serie: '',
        potencia_kwp: 6.9,
      },
    ]

    const origCollection = pb.collection
    pb.collection = vi.fn().mockImplementation((colName: string) => {
      return {
        getFullList: vi.fn().mockImplementation(async () => {
          if (colName === 'cliente_inversores') return mockInversores
          return []
        }),
      } as any
    }) as any

    try {
      const analise = await analisarImportacaoInversores()
      expect(analise.totalInversores).toBe(2)
      expect(analise.aptosParaCriar.length).toBe(1)
      expect(analise.foraPorFaltaDados.length).toBe(1)
      expect(analise.foraPorFaltaDados[0].motivo).toContain('duplicado')
    } finally {
      pb.collection = origCollection
    }
  })
})
