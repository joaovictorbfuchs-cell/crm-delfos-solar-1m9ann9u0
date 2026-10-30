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

const mockPropostasOM = [
  {
    id: 'prop-om-1',
    cliente_id: 'cli-om-1',
    autor: 'Equipe Comercial Delfos Solar',
    potencia_kwp: 12.5,
    numero_modulos: 24,
    valor_kwh: 0.92,
    distancia_km: 15,
    valor_km: 2.5,
    valor_por_placa: 9,
    valor_ativo_protegido: 58000,
    geracao_mensal_kwh: 1400,
    valor_plano_essencial: 76.67,
    valor_plano_inspecao: 426.67,
    valor_plano_completo: 776.67,
    plano_escolhido: 'Inspeção',
    status: 'Proposta Enviada',
    data_proposta: '2026-10-01T10:00:00Z',
    created: '2026-10-01T10:00:00Z',
    expand: {
      cliente_id: {
        id: 'cli-om-1',
        nome: 'Indústria Metalúrgica Sul',
        cidade: 'Barão de Cotegipe',
      },
    },
  },
]

vi.mock('@/contexts/ClientesContext', () => ({
  useClientes: () => ({
    isSessionExpired: false,
    authError: null,
    orcamentosSolar: mockOrcamentos,
    propostasOM: mockPropostasOM,
    sistemas: [],
    contratosOM: [],
    anomaliasOM: [],
    servicosAdicionaisOM: [],
    servicosAvulsos: [],
    clientes: [
      {
        id: 'cli-1',
        nome: 'Fazenda Santa Rita',
        cidade: 'Erechim',
        tipo_cliente: 'Rural',
      },
      {
        id: 'cli-om-1',
        nome: 'Indústria Metalúrgica Sul',
        cidade: 'Barão de Cotegipe',
      },
    ],
    usuarios: [{ id: 'usr-1', name: 'João Victor', email: 'jv@delfos.com.br' }],
    updateOrcamentoSolar: vi.fn(),
    removeOrcamentoSolar: vi.fn(),
    removePropostaOM: vi.fn(),
    openFichaCliente: vi.fn(),
    openFichaOM: vi.fn(),
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

  it('ao abrir WhatsApp a partir de /propostas, constrói dadosProposta e htmlProposta canônicos', async () => {
    const { fireEvent } = await import('@testing-library/react')
    render(
      <MemoryRouter>
        <Orcamentos />
      </MemoryRouter>,
    )

    const btnWhats = screen.getByLabelText('Enviar proposta por WhatsApp')
    fireEvent.click(btnWhats)

    // Modal deve ser exibido com cabeçalho de envio
    expect(screen.getByText('Enviar Proposta por WhatsApp')).toBeDefined()
    expect(screen.getByText('Fazenda Santa Rita')).toBeDefined()
  })

  it('exibe o Hub de Propostas com abas: Energia Solar, O&M, Baterias (Em breve) e Carregadores Veiculares (Ativa)', () => {
    render(
      <MemoryRouter initialEntries={['/propostas']}>
        <Orcamentos />
      </MemoryRouter>,
    )

    // Título do Hub
    expect(screen.getByRole('heading', { name: 'Propostas' })).toBeDefined()
    expect(
      screen.getByText('Central de geração e acompanhamento de propostas comerciais'),
    ).toBeDefined()

    // Abas visíveis
    expect(screen.getByRole('button', { name: /Energia Solar/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /O&M/i })).toBeDefined()
    expect(screen.getByText('Baterias')).toBeDefined()
    expect(screen.getByRole('button', { name: /Carregadores Veiculares/i })).toBeDefined()

    // Badge 'Em breve' na aba Baterias
    const badgesEmBreve = screen.getAllByText('Em breve')
    expect(badgesEmBreve.length).toBe(1)
  })

  it('permite abrir a aba Carregadores Veiculares via ?aba=carregadores e exibe a central Wallbox', () => {
    render(
      <MemoryRouter initialEntries={['/propostas?aba=carregadores']}>
        <Orcamentos />
      </MemoryRouter>,
    )

    expect(screen.getByText('Propostas de Carregadores Veiculares')).toBeDefined()
    expect(screen.getByText(/Infraestrutura Wallbox NBR 5410 & 17019/i)).toBeDefined()
    expect(screen.getByRole('button', { name: /Nova Proposta de Carregador/i })).toBeDefined()
  })

  it('abre na aba O&M quando acessado via ?aba=om e exibe lista isolada de O&M sem misturar com solar', () => {
    render(
      <MemoryRouter initialEntries={['/propostas?aba=om']}>
        <Orcamentos />
      </MemoryRouter>,
    )

    // Na aba O&M, deve exibir o botão de Nova Proposta O&M e o cliente da proposta O&M
    expect(screen.getByRole('button', { name: /Nova Proposta O&M/i })).toBeDefined()
    expect(screen.getByText('Indústria Metalúrgica Sul')).toBeDefined()
    expect(screen.getByText('Módulo O&M Delfos Solar')).toBeDefined()

    // O cliente solar NÃO deve ser renderizado na lista O&M
    expect(screen.queryByText('Fazenda Santa Rita')).toBeNull()
    expect(screen.queryByRole('button', { name: /Nova Proposta Solar/i })).toBeNull()
  })

  it('permite alternar entre as abas Energia Solar e O&M pelo clique', async () => {
    const { fireEvent } = await import('@testing-library/react')
    render(
      <MemoryRouter initialEntries={['/propostas']}>
        <Orcamentos />
      </MemoryRouter>,
    )

    // Inicialmente na aba solar
    expect(screen.getByText('Fazenda Santa Rita')).toBeDefined()

    // Clica na aba O&M
    const abaOM = screen.getByRole('button', { name: /O&M/i })
    fireEvent.click(abaOM)

    // Agora está na aba O&M
    expect(screen.getByText('Indústria Metalúrgica Sul')).toBeDefined()
    expect(screen.queryByText('Fazenda Santa Rita')).toBeNull()

    // Clica de volta na aba Solar
    const abaSolar = screen.getByRole('button', { name: /Energia Solar/i })
    fireEvent.click(abaSolar)

    // De volta na aba Solar
    expect(screen.getByText('Fazenda Santa Rita')).toBeDefined()
    expect(screen.queryByText('Indústria Metalúrgica Sul')).toBeNull()
  })

  it('no gerador de propostas solar (ModalOrcamentoSolar), cada botão Continuar avança para o próximo passo da própria sequência e no último passo o botão é omitido', async () => {
    const { fireEvent } = await import('@testing-library/react')
    render(
      <MemoryRouter initialEntries={['/propostas']}>
        <Orcamentos />
      </MemoryRouter>,
    )

    // Clica no botão "Nova Proposta Solar" para abrir o modal de proposta solar
    const btnNovo = screen.getByRole('button', { name: /Nova Proposta Solar/i })
    fireEvent.click(btnNovo)

    // Passo 1 inicial: "1. Dados Técnicos & Sistema" deve estar ativo
    expect(screen.getByText('1. Dados Técnicos & Sistema')).toBeDefined()
    expect(screen.getByText('Resumo Instantâneo do Sistema Solar (Erechim/RS)')).toBeDefined()

    // Botão Continuar deve estar presente e com título/ação para o próximo passo (Custos)
    const btnContinuar1 = screen.getByRole('button', { name: /Continuar/i })
    expect(btnContinuar1).toBeDefined()
    expect(btnContinuar1.getAttribute('title')).toBe('Continuar para Custos')

    // Clica em Continuar a partir do Passo 1
    fireEvent.click(btnContinuar1)

    // Agora deve estar no Passo 2: "2. Aba de Custos"
    expect(screen.getByText(/Composição Analítica dos Custos do Projeto/i)).toBeDefined()

    // O botão Continuar agora deve avançar para o Passo 3 (Parcelamentos & Financiamento), NÃO para Custos
    const btnContinuar2 = screen.getByRole('button', { name: /Continuar/i })
    expect(btnContinuar2.getAttribute('title')).toBe('Continuar para Parcelamentos')

    // Clica em Continuar a partir do Passo 2
    fireEvent.click(btnContinuar2)

    // Agora deve estar no Passo 3: "3. Parcelamentos & Financiamento"
    expect(screen.getByText(/Simulação de Parcelamento & Financiamento/i)).toBeDefined()

    // O botão Continuar agora deve avançar para o Passo 4 (Resumo & Proposta Oficial)
    const btnContinuar3 = screen.getByRole('button', { name: /Continuar/i })
    expect(btnContinuar3.getAttribute('title')).toBe('Continuar para Proposta')

    // Clica em Continuar a partir do Passo 3
    fireEvent.click(btnContinuar3)

    // Agora deve estar no Passo 4: "4. Resumo & Proposta Oficial"
    expect(screen.getByText(/Proposta Técnico-Comercial da Delfos Solar/i)).toBeDefined()

    // O botão "Baixar PDF" foi removido conforme solicitação (não baixava o PDF da proposta)
    expect(screen.queryByRole('button', { name: /Baixar PDF/i })).toBeNull()
    // Os botões "Imprimir / Gerar PDF", "Enviar por WhatsApp" e "Enviar por e-mail" continuam existindo
    expect(screen.getByRole('button', { name: /Imprimir \/ Gerar PDF/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /Enviar por WhatsApp/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /Enviar por e-mail/i })).toBeDefined()

    // No último passo (Passo 4), o botão Continuar NÃO deve mais existir (somente Cancelar e Salvar Orçamento)
    expect(screen.queryByRole('button', { name: /Continuar/i })).toBeNull()
    expect(screen.getByRole('button', { name: /Salvar Orçamento/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /Cancelar/i })).toBeDefined()
  })

  it('no Hub de Propostas (/propostas), exibe o botão + e o botão de filtro ao lado direito da linha de abas', async () => {
    const { fireEvent } = await import('@testing-library/react')
    render(
      <MemoryRouter initialEntries={['/propostas']}>
        <Orcamentos />
      </MemoryRouter>,
    )

    // Botão + na linha de abas
    const btnMais = screen.getByRole('button', { name: 'Criar nova proposta' })
    expect(btnMais).toBeDefined()

    // Botão de filtro por status ao lado esquerdo do +
    const btnFiltro = screen.getByRole('button', { name: 'Filtrar por status' })
    expect(btnFiltro).toBeDefined()

    // Clicar no botão + abre dropdown com "Nova proposta Solar", "Nova proposta O&M" e "Nova proposta Carregador"
    fireEvent.click(btnMais)
    expect(screen.getByText('Nova proposta Solar')).toBeDefined()
    expect(screen.getByText('Nova proposta O&M')).toBeDefined()
    expect(screen.getByText('Nova proposta Carregador')).toBeDefined()
  })
})
