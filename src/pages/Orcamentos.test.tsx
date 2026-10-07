import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Orcamentos from './Orcamentos'

// Mock do contexto useClientes
const mockOrcamentos = [
  {
    id: 'orc-1',
    cliente_id: 'cli-1',
    numero_revisao: 1,
    autor: 'João Victor',
    potencia_kwp: 30.8,
    numero_placas: 56,
    potencia_placa_wp: 550,
    valor_investimento: 125000,
    custo_por_kwp: 4058.44,
    geracao_mensal_kwh: 2827,
    economia_1_mes: 3128.59,
    payback_meses: 20,
    status: 'Em elaboração' as const,
    data_orcamento: '2026-09-30T10:00:00Z',
    created: '2026-09-30T10:00:00Z',
    expand: {
      cliente_id: {
        id: 'cli-1',
        nome: 'Fazenda Santa Rita',
        cidade: 'Erechim',
        tipo_cliente: 'Rural',
      },
    },
  },
]

vi.mock('@/contexts/ClientesContext', () => ({
  useClientes: () => ({
    isSessionExpired: false,
    authError: null,
    orcamentosSolar: mockOrcamentos,
    clientes: [
      {
        id: 'cli-1',
        nome: 'Fazenda Santa Rita',
        cidade: 'Erechim',
        tipo_cliente: 'Rural',
      },
    ],
    usuarios: [{ id: 'usr-1', name: 'João Victor', email: 'jv@delfos.com.br' }],
    updateOrcamentoSolar: vi.fn(),
    removeOrcamentoSolar: vi.fn(),
    openFichaCliente: vi.fn(),
    isLoading: false,
    error: null,
    refreshData: vi.fn(),
  }),
}))

describe('Tela Orcamentos (/propostas) - Nova disposição visual da tabela', () => {
  it('renderiza o container em largura total sem max-w-7xl', () => {
    const { container } = render(
      <MemoryRouter>
        <Orcamentos />
      </MemoryRouter>,
    )

    const rootDiv = container.firstElementChild
    expect(rootDiv).toBeDefined()
    expect(rootDiv?.className).toContain('w-full')
    expect(rootDiv?.className).not.toContain('max-w-7xl')
  })

  it('exibe potência em uma linha no formato "30,80 kWp · 56 placas (550W)"', () => {
    render(
      <MemoryRouter>
        <Orcamentos />
      </MemoryRouter>,
    )

    expect(screen.getByText('30,80 kWp · 56 placas (550W)')).toBeDefined()
  })

  it('exibe geração em até duas linhas (geração mensal e economia)', () => {
    render(
      <MemoryRouter>
        <Orcamentos />
      </MemoryRouter>,
    )

    expect(screen.getByText('2.827 kWh/mês')).toBeDefined()
    expect(screen.getByText('Eco: R$ 3.128,59/mês')).toBeDefined()
  })

  it('exibe payback em uma linha só ("20 meses")', () => {
    render(
      <MemoryRouter>
        <Orcamentos />
      </MemoryRouter>,
    )

    expect(screen.getByText('20 meses')).toBeDefined()
  })

  it('exibe status com classe whitespace-nowrap e data curta de 2 dígitos no ano ("30/09/26")', () => {
    render(
      <MemoryRouter>
        <Orcamentos />
      </MemoryRouter>,
    )

    const statusEl = screen.getByText('Em elaboração')
    expect(statusEl).toBeDefined()
    // O container do badge de status tem whitespace-nowrap
    const badgeContainer = statusEl.closest('span')
    expect(badgeContainer?.className).toContain('whitespace-nowrap')

    // Data no formato curto com 2 dígitos
    expect(screen.getByText('30/09/26')).toBeDefined()
  })

  it('botão WhatsApp é compactado (ícone com tooltip e aria-label)', () => {
    render(
      <MemoryRouter>
        <Orcamentos />
      </MemoryRouter>,
    )

    const btnWhats = screen.getByLabelText('Enviar proposta por WhatsApp')
    expect(btnWhats).toBeDefined()
    // Não contém texto "WhatsApp" dentro do botão
    expect(btnWhats.textContent?.trim()).toBe('')
  })
})
