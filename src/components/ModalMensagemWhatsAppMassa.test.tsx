import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import ModalMensagemWhatsAppMassa from '@/components/ModalMensagemWhatsAppMassa'
import type { Cliente, ContratoOM } from '@/types/crm'

// Mock de ClientesContext
const mockSendWhatsAppMessage = vi.fn().mockResolvedValue({ id: 'msg-1' })
const mockAddAtividade = vi.fn().mockResolvedValue({ id: 'ativ-1' })
const mockUpdateCliente = vi.fn().mockResolvedValue({})

// Mock de listasEnvioService
const mockListasSalvas = [
  {
    id: 'lista-1',
    collectionId: 'listas_envio',
    collectionName: 'listas_envio',
    nome: 'Clientes O&M Marau Com WhatsApp',
    segmento: 'clientes_om',
    filtros: {
      whatsapp: 'com_whatsapp',
      cidade: 'Marau',
    },
    created: '2025-01-01',
    updated: '2025-01-01',
  },
  {
    id: 'lista-sem-wpp',
    collectionId: 'listas_envio',
    collectionName: 'listas_envio',
    nome: 'Clientes Sem WhatsApp para Completar',
    segmento: 'todos',
    filtros: {
      whatsapp: 'sem_whatsapp',
    },
    created: '2025-01-02',
    updated: '2025-01-02',
  },
]

const mockFetchListasEnvio = vi.fn().mockResolvedValue(mockListasSalvas)
const mockCreateListaEnvio = vi.fn().mockImplementation(async (input) => ({
  id: 'lista-nova-123',
  collectionId: 'listas_envio',
  collectionName: 'listas_envio',
  nome: input.nome,
  segmento: input.segmento,
  filtros: input.filtros,
  created: new Date().toISOString(),
  updated: new Date().toISOString(),
}))
const mockDeleteListaEnvio = vi.fn().mockResolvedValue(true)
const mockCreateDisparoMassa = vi.fn().mockResolvedValue({ id: 'lote-123' })
const mockSalvarPadroesTextosReenvio = vi.fn()

vi.mock('@/services/listasEnvioService', () => ({
  fetchListasEnvio: () => mockFetchListasEnvio(),
  createListaEnvio: (input: unknown) => mockCreateListaEnvio(input),
  deleteListaEnvio: (id: string) => mockDeleteListaEnvio(id),
}))

vi.mock('@/services/disparosMassaService', () => ({
  getPadroesTextosReenvio: () => ({
    texto1: 'Olá, [nome do cliente]! Passando para checar se viu a mensagem anterior...',
    texto2: 'Olá, [nome do cliente]! Já faz um tempo desde nosso último contato...',
  }),
  salvarPadroesTextosReenvio: (p: any) => mockSalvarPadroesTextosReenvio(p),
  createDisparoMassa: (data: any) => mockCreateDisparoMassa(data),
}))

const clientesMock = [
  {
    id: 'cli-solar-1',
    collectionId: 'clientes',
    collectionName: 'clientes',
    nome: 'Carlos Solar',
    cidade: 'Passo Fundo',
    estado: 'RS',
    whatsapp: '54999112233',
    telefone: '54999112233',
    tipo_venda: 'Solar Fotovoltaico',
    tipo_cliente: 'residencial',
    concessionaria: 'RGE',
    potencia_kwp: 12.5,
    status: 'Negociação',
    created: '2025-01-01',
    updated: '2025-01-01',
  },
  {
    id: 'cli-om-1',
    collectionId: 'clientes',
    collectionName: 'clientes',
    nome: 'Empresa O&M Manutencoes',
    cidade: 'Marau',
    estado: 'RS',
    whatsapp: '54988776655',
    telefone: '54988776655',
    tipo_venda: 'O&M',
    tipo_cliente: 'comercial',
    concessionaria: 'RGE',
    contratou_om: true,
    status: 'Ativo',
    created: '2025-01-01',
    updated: '2025-01-01',
  },
  {
    id: 'cli-bateria-1',
    collectionId: 'clientes',
    collectionName: 'clientes',
    nome: 'Fazenda Baterias',
    cidade: 'Erechim',
    estado: 'RS',
    whatsapp: '54977665544',
    telefone: '54977665544',
    tipo_venda: 'Baterias',
    tipo_sistema: 'Híbrido com Baterias',
    tipo_cliente: 'rural',
    concessionaria: 'RGE',
    status: 'Negociação',
    created: '2025-01-01',
    updated: '2025-01-01',
  },
  {
    id: 'cli-hibrido-sem-bateria',
    collectionId: 'clientes',
    collectionName: 'clientes',
    nome: 'Cliente Inversor Híbrido Sem Bateria',
    cidade: 'Getúlio Vargas',
    estado: 'RS',
    whatsapp: '',
    telefone: '',
    tipo_venda: 'Solar Fotovoltaico',
    tipo_sistema: 'Híbrido Deye',
    tipo_cliente: 'residencial',
    concessionaria: 'RGE',
    status: 'Negociação',
    created: '2025-01-01',
    updated: '2025-01-01',
  },
  {
    id: 'cli-pos-1',
    collectionId: 'clientes',
    collectionName: 'clientes',
    nome: 'João Fechado PosVenda',
    cidade: 'Tapejara',
    estado: 'RS',
    whatsapp: '54966554433',
    telefone: '54966554433',
    tipo_venda: 'Solar Fotovoltaico',
    tipo_cliente: 'residencial',
    concessionaria: 'RGE',
    status: 'Concluído',
    transferido_pos_vendas: true,
    data_instalacao: '2024-11-20',
    potencia_kwp: 8.0,
    created: '2024-01-01',
    updated: '2024-12-01',
  },
] as unknown as Cliente[]

const contratosOMMock = [
  {
    id: 'ct-om-1',
    collectionId: 'contratos_om',
    collectionName: 'contratos_om',
    cliente_id: 'cli-om-1',
    numero_contrato: 'OM-2025-001',
    tipo_plano: 'manutencao_preventiva',
    plano: 'Plano Preventivo',
    valor_mensal: 350,
    valor_anual: 4200,
    status: 'Ativo',
    data_inicio: '2025-01-01',
    data_vencimento: '2026-01-01',
    created: '2025-01-01',
    updated: '2025-01-01',
  },
] as unknown as ContratoOM[]

vi.mock('@/contexts/ClientesContext', () => ({
  useClientes: () => ({
    clientes: clientesMock,
    contratosOM: contratosOMMock,
    usinas: [],
    sendWhatsAppMessage: mockSendWhatsAppMessage,
    addAtividade: mockAddAtividade,
    updateCliente: mockUpdateCliente,
    whatsAppConfig: { configured: true },
  }),
}))

describe('ModalMensagemWhatsAppMassa - Filtros de Segmento e Listas Salvas', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renderiza os chips de segmento com contadores coerentes e filtra os clientes ao clicar', async () => {
    render(<ModalMensagemWhatsAppMassa open={true} onOpenChange={vi.fn()} />)

    // Verifica que o modal abriu com título e filtros
    expect(screen.getByText('Disparo em Massa')).toBeDefined()
    expect(screen.getByText('Filtrar por Segmento')).toBeDefined()

    // O chip "Clientes O&M" deve exibir contador 1
    const chipOM = screen.getByRole('button', { name: /Clientes O&M/i })
    expect(chipOM).toBeDefined()
    expect(chipOM.textContent).toContain('1')

    // O chip "Clientes Bateria" deve exibir contador 1
    const chipBateria = screen.getByRole('button', { name: /Clientes Bateria/i })
    expect(chipBateria).toBeDefined()
    expect(chipBateria.textContent).toContain('1')

    // O chip "Pós-Venda" deve exibir contador 1
    const chipPos = screen.getByRole('button', { name: /Pós-Venda/i })
    expect(chipPos).toBeDefined()
    expect(chipPos.textContent).toContain('1')

    // Clica no chip "Clientes O&M"
    fireEvent.click(chipOM)

    // A lista de destinatários deve filtrar exibindo Empresa O&M e não Carlos Solar
    await waitFor(() => {
      expect(screen.getByText('Empresa O&M Manutencoes')).toBeDefined()
      expect(screen.queryByText('Carlos Solar')).toBeNull()
      expect(screen.queryByText('Fazenda Baterias')).toBeNull()
    })

    // Clica no chip "Clientes Bateria"
    fireEvent.click(chipBateria)

    // Deve exibir Fazenda Baterias (tipo_venda Baterias) e NÃO Cliente Inversor Híbrido Sem Bateria (tipo_sistema Híbrido)
    await waitFor(() => {
      expect(screen.getByText('Fazenda Baterias')).toBeDefined()
      expect(screen.queryByText('Cliente Inversor Híbrido Sem Bateria')).toBeNull()
      expect(screen.queryByText('Empresa O&M Manutencoes')).toBeNull()
      expect(screen.queryByText('Carlos Solar')).toBeNull()
    })

    // Clica no chip "Pós-Venda"
    fireEvent.click(chipPos)

    await waitFor(() => {
      expect(screen.getByText('João Fechado PosVenda')).toBeDefined()
      expect(screen.queryByText('Carlos Solar')).toBeNull()
    })

    // Clica no chip "Todos"
    const chipTodos = screen.getByRole('button', { name: /^Todos/i })
    fireEvent.click(chipTodos)

    await waitFor(() => {
      expect(screen.getByText('Carlos Solar')).toBeDefined()
      expect(screen.getByText('Empresa O&M Manutencoes')).toBeDefined()
      expect(screen.getByText('Fazenda Baterias')).toBeDefined()
      expect(screen.getByText('Cliente Inversor Híbrido Sem Bateria')).toBeDefined()
      expect(screen.getByText('João Fechado PosVenda')).toBeDefined()
    })
  })

  it('permite alternar entre "Enviar agora" e "Agendar envio" com data/hora e intervalo', async () => {
    render(<ModalMensagemWhatsAppMassa open={true} onOpenChange={vi.fn()} />)

    const btnEnviarAgora = screen.getByRole('button', { name: /Enviar agora/i })
    const btnAgendar = screen.getByRole('button', { name: /Agendar envio/i })
    expect(btnEnviarAgora).toBeDefined()
    expect(btnAgendar).toBeDefined()

    expect(screen.queryByText(/Intervalo entre mensagens:/i)).toBeNull()

    fireEvent.click(btnAgendar)

    await waitFor(() => {
      expect(screen.getByText(/Intervalo entre mensagens:/i)).toBeDefined()
      expect(screen.getByText(/Data e Horário de Início/i)).toBeDefined()
    })

    const btnAcao = screen.getByRole('button', { name: /Agendar/i })
    expect(btnAcao).toBeDefined()
  })

  it('permite filtrar clientes sem WhatsApp cadastrado para completar o cadastro', async () => {
    render(<ModalMensagemWhatsAppMassa open={true} onOpenChange={vi.fn()} />)

    // Filtro WhatsApp: clica em "Sem WhatsApp cadastrado"
    const btnSemWpp = screen.getByRole('button', { name: /Sem WhatsApp cadastrado/i })
    fireEvent.click(btnSemWpp)

    await waitFor(() => {
      expect(screen.getByText('Cliente Inversor Híbrido Sem Bateria')).toBeDefined()
      expect(screen.getByText('Sem número cadastrado')).toBeDefined()
      expect(screen.queryByText('Carlos Solar')).toBeNull()
      expect(screen.queryByText('Empresa O&M Manutencoes')).toBeNull()
    })

    // Clica em "Só com WhatsApp"
    const btnComWpp = screen.getByRole('button', { name: /Só com WhatsApp/i })
    fireEvent.click(btnComWpp)

    await waitFor(() => {
      expect(screen.queryByText('Cliente Inversor Híbrido Sem Bateria')).toBeNull()
      expect(screen.getByText('Carlos Solar')).toBeDefined()
      expect(screen.getByText('Empresa O&M Manutencoes')).toBeDefined()
    })
  })

  it('permite aplicar uma lista salva no seletor e atualizar segmento e filtros automaticamente', async () => {
    render(<ModalMensagemWhatsAppMassa open={true} onOpenChange={vi.fn()} />)

    // Espera carregar listas salvas
    await waitFor(() => {
      expect(screen.getByText('Clientes O&M Marau Com WhatsApp')).toBeDefined()
    })

    const selectListas = screen.getByRole('combobox', { name: /Seletor de listas salvas/i })
    fireEvent.change(selectListas, { target: { value: 'lista-1' } })

    // Deve aplicar segmento Clientes O&M e filtrar cidade Marau
    await waitFor(() => {
      expect(screen.getByText('Empresa O&M Manutencoes')).toBeDefined()
      expect(screen.queryByText('Carlos Solar')).toBeNull()
    })
  })

  it('permite abrir o modal "Salvar seleção atual" e persistir nova lista salva', async () => {
    render(<ModalMensagemWhatsAppMassa open={true} onOpenChange={vi.fn()} />)

    const btnSalvar = screen.getByRole('button', { name: /Salvar seleção atual/i })
    fireEvent.click(btnSalvar)

    await waitFor(() => {
      expect(screen.getByText('Salvar Seleção Atual')).toBeDefined()
    })

    const inputNome = screen.getByPlaceholderText(/Ex: Clientes O&M/i)
    fireEvent.change(inputNome, { target: { value: 'Minha Lista Personalizada' } })

    const btnConfirmar = screen.getByRole('button', { name: /^Salvar Lista$/i })
    fireEvent.click(btnConfirmar)

    await waitFor(() => {
      expect(mockCreateListaEnvio).toHaveBeenCalledWith(
        expect.objectContaining({
          nome: 'Minha Lista Personalizada',
          segmento: 'todos',
        }),
      )
    })
  })

  it('permite excluir a lista salva selecionada após confirmação', async () => {
    render(<ModalMensagemWhatsAppMassa open={true} onOpenChange={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Clientes O&M Marau Com WhatsApp')).toBeDefined()
    })

    const selectListas = screen.getByRole('combobox', { name: /Seletor de listas salvas/i })
    fireEvent.change(selectListas, { target: { value: 'lista-1' } })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Excluir lista salva/i })).toBeDefined()
    })

    const btnExcluir = screen.getByRole('button', { name: /Excluir lista salva/i })
    fireEvent.click(btnExcluir)

    await waitFor(() => {
      expect(screen.getByText(/Tem certeza que deseja excluir a lista salva/i)).toBeDefined()
    })

    const btnConfirmarExcluir = screen.getByRole('button', { name: /^Excluir$/i })
    fireEvent.click(btnConfirmarExcluir)

    await waitFor(() => {
      expect(mockDeleteListaEnvio).toHaveBeenCalledWith('lista-1')
    })
  })

  it('exibe seção de reenvio automático com textos do 1º (+3d) e 2º reenvio (+90d) e botão salvar como padrão', async () => {
    render(<ModalMensagemWhatsAppMassa open={true} onOpenChange={vi.fn()} />)

    // Seção de reenvio automático presente
    expect(screen.getByText(/Reenvio Automático/i)).toBeDefined()
    expect(screen.getByText(/1º Reenvio \(\+3 dias sem resposta\)/i)).toBeDefined()
    expect(screen.getByText(/2º Reenvio \(\+90 dias sem resposta, contados do 1º\)/i)).toBeDefined()

    // Botão salvar como padrão
    const btnSalvarPadrao = screen.getByRole('button', { name: /Salvar como padrão/i })
    expect(btnSalvarPadrao).toBeDefined()

    fireEvent.click(btnSalvarPadrao)
    expect(mockSalvarPadroesTextosReenvio).toHaveBeenCalledWith(
      expect.stringContaining('Olá, [nome do cliente]!'),
      expect.stringContaining('Olá, [nome do cliente]!'),
    )
  })

  it('grava o lote na coleção disparos_massa ao confirmar o envio', async () => {
    render(<ModalMensagemWhatsAppMassa open={true} onOpenChange={vi.fn()} />)

    // Clica em "Só com WhatsApp" para ter destinatários válidos
    const btnComWpp = screen.getByRole('button', { name: /Só com WhatsApp/i })
    fireEvent.click(btnComWpp)

    // Botão de envio
    const btnEnviar = screen.getByRole('button', { name: /Enviar para \d+ Clientes/i })
    fireEvent.click(btnEnviar)

    await waitFor(() => {
      expect(mockCreateDisparoMassa).toHaveBeenCalledWith(
        expect.objectContaining({
          reenvio_ativo: true,
          total_destinatarios: expect.any(Number),
          mensagem_original: expect.any(String),
        }),
      )
    })
  })
})
