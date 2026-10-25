import { describe, it, expect } from 'vitest'
import {
  getFiltrosSistema,
  isFiltroSistema,
  FILTROS_SISTEMA_NEGOCIOS,
  FILTROS_SISTEMA_CLIENTES,
  FILTROS_SISTEMA_ATIVIDADES,
} from './filtrosSistema'
import { aplicarFiltroSalvo } from './filtrosEngine'

describe('Filtros de Sistema Pré-Definidos (filtrosSistema)', () => {
  it('garante que os filtros de sistema são definidos puramente em código e não vazios', () => {
    expect(FILTROS_SISTEMA_NEGOCIOS.length).toBe(2)
    expect(FILTROS_SISTEMA_CLIENTES.length).toBe(2)
    expect(FILTROS_SISTEMA_ATIVIDADES.length).toBe(1)

    const negGanhos = FILTROS_SISTEMA_NEGOCIOS.find((f) => f.nome === 'Ganhos')
    const negPerdidos = FILTROS_SISTEMA_NEGOCIOS.find((f) => f.nome === 'Perdidos')
    expect(negGanhos).toBeDefined()
    expect(negPerdidos).toBeDefined()

    const cliComWpp = FILTROS_SISTEMA_CLIENTES.find((f) => f.nome === 'Com WhatsApp')
    const cliSemWpp = FILTROS_SISTEMA_CLIENTES.find((f) => f.nome === 'Sem WhatsApp')
    expect(cliComWpp).toBeDefined()
    expect(cliSemWpp).toBeDefined()

    const atvAtrasadas = FILTROS_SISTEMA_ATIVIDADES.find((f) => f.nome === 'Atrasadas')
    expect(atvAtrasadas).toBeDefined()
  })

  it('isFiltroSistema identifica corretamente registros de sistema e rejeita filtros normais', () => {
    expect(isFiltroSistema(FILTROS_SISTEMA_NEGOCIOS[0])).toBe(true)
    expect(isFiltroSistema(FILTROS_SISTEMA_CLIENTES[0])).toBe(true)
    expect(isFiltroSistema(FILTROS_SISTEMA_ATIVIDADES[0])).toBe(true)
    expect(isFiltroSistema({ id: 'sistema_custom', nome: 'X' } as any)).toBe(true)

    expect(isFiltroSistema({ id: 'rec-123456', nome: 'Meu Filtro' } as any)).toBe(false)
    expect(isFiltroSistema(null)).toBe(false)
    expect(isFiltroSistema(undefined)).toBe(false)
  })

  describe('Aplicação de Filtros de Sistema em Negócios (Ganhos e Perdidos)', () => {
    const mockNegocios = [
      {
        id: 'neg-1',
        titulo: 'Usina 10kWp João',
        status: 'em andamento',
        etapa_funil: 'proposta enviada',
      },
      {
        id: 'neg-2',
        titulo: 'Usina 50kWp Indústria ABC',
        status: 'ganho',
        etapa_funil: 'contrato assinado',
      },
      {
        id: 'neg-3',
        titulo: 'Usina 15kWp Sítio',
        status: 'perdido',
        etapa_funil: 'perdido',
      },
      {
        id: 'neg-4',
        titulo: 'Usina 8kWp Antiga (Fechado direto)',
        status: 'Fechado',
        etapa_funil: 'Fechado',
      },
    ]

    it('aplica filtro de sistema "Ganhos" filtrando contratos assinados e ganhos', () => {
      const filtroGanhos = FILTROS_SISTEMA_NEGOCIOS.find((f) => f.nome === 'Ganhos')!
      const filtrados = aplicarFiltroSalvo(mockNegocios, filtroGanhos.condicoes, 'negocios')

      expect(filtrados.map((n) => n.id)).toEqual(['neg-2', 'neg-4'])
    })

    it('aplica filtro de sistema "Perdidos" filtrando apenas negócios perdidos', () => {
      const filtroPerdidos = FILTROS_SISTEMA_NEGOCIOS.find((f) => f.nome === 'Perdidos')!
      const filtrados = aplicarFiltroSalvo(mockNegocios, filtroPerdidos.condicoes, 'negocios')

      expect(filtrados.map((n) => n.id)).toEqual(['neg-3'])
    })
  })

  describe('Aplicação de Filtros de Sistema em Clientes (Com e Sem WhatsApp)', () => {
    const mockClientes = [
      {
        id: 'cli-1',
        nome: 'Cliente Com WhatsApp Direto',
        whatsapp: '54999998888',
      },
      {
        id: 'cli-2',
        nome: 'Cliente Sem WhatsApp',
        whatsapp: '',
      },
      {
        id: 'cli-3',
        nome: 'Cliente Com WhatsApp Inválido Curto',
        whatsapp: '123',
      },
      {
        id: 'cli-4',
        nome: 'Cliente Com WhatsApp no rawCliente',
        rawCliente: {
          whatsapp: '54988887777',
        },
      },
    ]

    it('aplica filtro de sistema "Com WhatsApp"', () => {
      const filtroCom = FILTROS_SISTEMA_CLIENTES.find((f) => f.nome === 'Com WhatsApp')!
      const filtrados = aplicarFiltroSalvo(mockClientes, filtroCom.condicoes, 'clientes')

      expect(filtrados.map((c) => c.id)).toEqual(['cli-1', 'cli-4'])
    })

    it('aplica filtro de sistema "Sem WhatsApp"', () => {
      const filtroSem = FILTROS_SISTEMA_CLIENTES.find((f) => f.nome === 'Sem WhatsApp')!
      const filtrados = aplicarFiltroSalvo(mockClientes, filtroSem.condicoes, 'clientes')

      expect(filtrados.map((c) => c.id)).toEqual(['cli-2', 'cli-3'])
    })
  })

  describe('Aplicação de Filtros de Sistema em Atividades (Atrasadas)', () => {
    const ontem = new Date()
    ontem.setDate(ontem.getDate() - 2)
    const ontemStr = ontem.toISOString().split('T')[0]

    const amanha = new Date()
    amanha.setDate(amanha.getDate() + 2)
    const amanhaStr = amanha.toISOString().split('T')[0]

    const mockAtividades = [
      {
        id: 'atv-1',
        titulo: 'Manutenção Preventiva Atrasada',
        status: 'pendente',
        data_agendamento: ontemStr,
      },
      {
        id: 'atv-2',
        titulo: 'Visita Futura',
        status: 'pendente',
        data_agendamento: amanhaStr,
      },
      {
        id: 'atv-3',
        titulo: 'Limpeza do passado mas CONCLUÍDA (não atrasada)',
        status: 'concluida',
        data_agendamento: ontemStr,
      },
      {
        id: 'atv-4',
        titulo: 'Atividade com flag explícita isAtrasada',
        status: 'pendente',
        isAtrasada: true,
      },
    ]

    it('aplica filtro de sistema "Atrasadas" considerando data no passado e status pendente', () => {
      const filtroAtrasadas = FILTROS_SISTEMA_ATIVIDADES.find((f) => f.nome === 'Atrasadas')!
      const filtrados = aplicarFiltroSalvo(mockAtividades, filtroAtrasadas.condicoes, 'atividades')

      expect(filtrados.map((a) => a.id)).toEqual(['atv-1', 'atv-4'])
    })
  })
})
