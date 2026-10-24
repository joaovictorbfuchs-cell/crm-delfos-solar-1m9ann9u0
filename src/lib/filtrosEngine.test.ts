import { describe, it, expect } from 'vitest'
import {
  aplicarFiltroSalvo,
  registroPassaFiltro,
  sanitizarEstrutura,
  isCondicaoValida,
} from './filtrosEngine'
import type { EstruturaCondicoes } from '@/types/filtros'

describe('Motor de Filtragem Único (filtrosEngine)', () => {
  const mockClientes = [
    {
      id: 'cli-1',
      nome: 'João Silva',
      cidade: 'Erechim',
      concessionaria: 'RGE',
      tipo_cliente: 'residencial',
      status: 'Novo Lead',
      potenciaKwp: 10.5,
      whatsapp: '54999990001',
      temContratoOM: true,
      totalUsinas: 2,
    },
    {
      id: 'cli-2',
      nome: 'Empresa Metalúrgica ABC',
      cidade: 'Passo Fundo',
      concessionaria: 'RGE',
      tipo_cliente: 'industrial',
      status: 'Fechado',
      potenciaKwp: 75.0,
      whatsapp: '',
      temContratoOM: false,
      totalUsinas: 1,
    },
    {
      id: 'cli-3',
      nome: 'Sítio Boa Vista',
      cidade: 'Erechim',
      concessionaria: 'CPFL',
      tipo_cliente: 'rural',
      status: 'Negociação',
      potenciaKwp: 25.0,
      whatsapp: '54988880002',
      temContratoOM: false,
      totalUsinas: 0,
    },
  ]

  it('valida se uma condição é válida ou incompleta', () => {
    expect(
      isCondicaoValida(
        { id: '1', campoId: 'nome', operador: 'contem', valor: 'Silva' },
        'clientes',
      ),
    ).toBe(true)

    // Condição sem valor onde o operador requer valor
    expect(
      isCondicaoValida({ id: '2', campoId: 'nome', operador: 'contem', valor: '' }, 'clientes'),
    ).toBe(false)

    // Operador booleano ou esta_vazio não precisa de valor
    expect(
      isCondicaoValida({ id: '3', campoId: 'tem_whatsapp', operador: 'e_verdadeiro' }, 'clientes'),
    ).toBe(true)

    // Operador 'entre' requer dois valores
    expect(
      isCondicaoValida(
        { id: '4', campoId: 'potencia_kwp', operador: 'entre', valor: 10, valorSecundario: 50 },
        'clientes',
      ),
    ).toBe(true)
    expect(
      isCondicaoValida(
        { id: '5', campoId: 'potencia_kwp', operador: 'entre', valor: 10, valorSecundario: '' },
        'clientes',
      ),
    ).toBe(false)
  })

  it('filtra registros usando bloco ALL (todas as condições)', () => {
    const estrutura: EstruturaCondicoes = {
      all: [
        { id: '1', campoId: 'cidade', operador: 'contem', valor: 'Erechim' },
        { id: '2', campoId: 'tem_contrato_om', operador: 'e_verdadeiro' },
      ],
      any: [],
    }

    const resultado = aplicarFiltroSalvo(mockClientes, estrutura, 'clientes')
    expect(resultado).toHaveLength(1)
    expect(resultado[0].nome).toBe('João Silva')
  })

  it('filtra registros usando bloco ANY (qualquer condição)', () => {
    const estrutura: EstruturaCondicoes = {
      all: [],
      any: [
        { id: '1', campoId: 'tipo_cliente', operador: 'e', valor: 'industrial' },
        { id: '2', campoId: 'tipo_cliente', operador: 'e', valor: 'rural' },
      ],
      any2: undefined,
    } as any

    const resultado = aplicarFiltroSalvo(mockClientes, estrutura, 'clientes')
    expect(resultado).toHaveLength(2)
    expect(resultado.map((r) => r.id)).toEqual(['cli-2', 'cli-3'])
  })

  it('combina blocos ALL e ANY conjuntamente', () => {
    // Deve ser de Erechim (ALL) E (deve ser residencial OU rural - ANY)
    const estrutura: EstruturaCondicoes = {
      all: [{ id: '1', campoId: 'cidade', operador: 'contem', valor: 'Erechim' }],
      any: [
        { id: '2', campoId: 'tipo_cliente', operador: 'e', valor: 'residencial' },
        { id: '3', campoId: 'tipo_cliente', operador: 'e', valor: 'rural' },
      ],
    }

    const resultado = aplicarFiltroSalvo(mockClientes, estrutura, 'clientes')
    expect(resultado).toHaveLength(2)
    expect(resultado.map((r) => r.id)).toEqual(['cli-1', 'cli-3'])
  })

  it('operações numéricas (maior, menor, entre)', () => {
    const estrutura: EstruturaCondicoes = {
      all: [
        {
          id: '1',
          campoId: 'potencia_kwp',
          operador: 'entre',
          valor: 20,
          valorSecundario: 80,
        },
      ],
      any: [],
    }

    const resultado = aplicarFiltroSalvo(mockClientes, estrutura, 'clientes')
    expect(resultado).toHaveLength(2) // 75.0 e 25.0
    expect(resultado.map((r) => r.id)).toEqual(['cli-2', 'cli-3'])
  })

  it('operações de lista com e_um_de', () => {
    const estrutura: EstruturaCondicoes = {
      all: [
        {
          id: '1',
          campoId: 'status',
          operador: 'e_um_de',
          valor: ['Novo Lead', 'Negociação'],
        },
      ],
      any: [],
    }

    const resultado = aplicarFiltroSalvo(mockClientes, estrutura, 'clientes')
    expect(resultado).toHaveLength(2)
    expect(resultado.map((r) => r.id)).toEqual(['cli-1', 'cli-3'])
  })

  it('estrutura vazia retorna todos os registros sem alteração', () => {
    const vazia: EstruturaCondicoes = { all: [], any: [] }
    expect(aplicarFiltroSalvo(mockClientes, vazia, 'clientes')).toHaveLength(3)
  })

  describe('Módulo Atividades', () => {
    const mockAtividades = [
      {
        id: 'ativ-1',
        tipo: 'limpeza',
        categoria: 'Manutenção',
        status: 'pendente',
        responsavel: 'Carlos Técnico',
        usina: 'Usina Solar Norte',
        data_agendamento: '2025-01-15',
        atrasada: true,
      },
      {
        id: 'ativ-2',
        tipo: 'visita_tecnica',
        categoria: 'Comercial',
        status: 'concluida',
        responsavel: 'Ana Vendedora',
        usina: '',
        data_agendamento: '2025-03-20',
        atrasada: false,
      },
      {
        id: 'ativ-3',
        tipo: 'manutencao_preventiva',
        categoria: 'Manutenção',
        status: 'pendente',
        responsavel: 'Carlos Técnico',
        usina: 'Usina Solar Sul',
        data_agendamento: '2025-04-10',
        atrasada: false,
      },
    ]

    it('filtra por categoria e atrasada (booleano)', () => {
      const estrutura: EstruturaCondicoes = {
        all: [
          { id: '1', campoId: 'categoria', operador: 'e', valor: 'Manutenção' },
          { id: '2', campoId: 'atrasada', operador: 'e_verdadeiro' },
        ],
        any: [],
      }
      const resultado = aplicarFiltroSalvo(mockAtividades, estrutura, 'atividades')
      expect(resultado).toHaveLength(1)
      expect(resultado[0].id).toBe('ativ-1')
    })

    it('filtra por responsável e tipo', () => {
      const estrutura: EstruturaCondicoes = {
        all: [
          { id: '1', campoId: 'responsavel', operador: 'contem', valor: 'Carlos' },
          { id: '2', campoId: 'tipo', operador: 'e', valor: 'manutencao_preventiva' },
        ],
        any: [],
      }
      const resultado = aplicarFiltroSalvo(mockAtividades, estrutura, 'atividades')
      expect(resultado).toHaveLength(1)
      expect(resultado[0].id).toBe('ativ-3')
    })
  })

  describe('Módulo Contratos O&M', () => {
    const mockContratosOM = [
      {
        id: 'ct-1',
        plano: 'completo',
        status: 'ativo',
        vencimento: '2026-12-31',
        potencia_somada: 125.5,
        usinas_vinculadas: 3,
      },
      {
        id: 'ct-2',
        plano: 'essencial',
        status: 'vencendo',
        vencimento: '2025-05-15',
        potencia_somada: 15.0,
        usinas_vinculadas: 1,
      },
      {
        id: 'ct-3',
        plano: 'monitoramento',
        status: 'vencido',
        vencimento: '2024-10-01',
        potencia_somada: 7.5,
        usinas_vinculadas: 1,
      },
    ]

    it('filtra por plano e status', () => {
      const estrutura: EstruturaCondicoes = {
        all: [
          { id: '1', campoId: 'plano', operador: 'e', valor: 'completo' },
          { id: '2', campoId: 'status', operador: 'e', valor: 'ativo' },
        ],
        any: [],
      }
      const resultado = aplicarFiltroSalvo(mockContratosOM, estrutura, 'contratos_om')
      expect(resultado).toHaveLength(1)
      expect(resultado[0].id).toBe('ct-1')
    })

    it('filtra por potência somada e usinas vinculadas (números)', () => {
      const estrutura: EstruturaCondicoes = {
        all: [
          { id: '1', campoId: 'potencia_somada', operador: 'maior', valor: 10 },
          { id: '2', campoId: 'usinas_vinculadas', operador: 'maior_igual', valor: 2 },
        ],
        any: [],
      }
      const resultado = aplicarFiltroSalvo(mockContratosOM, estrutura, 'contratos_om')
      expect(resultado).toHaveLength(1)
      expect(resultado[0].id).toBe('ct-1')
    })
  })
})
