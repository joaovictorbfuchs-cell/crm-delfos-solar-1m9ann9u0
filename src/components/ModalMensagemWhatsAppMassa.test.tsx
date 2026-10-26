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
  {
    id: 'lista-manual-2-clientes',
    collectionId: 'listas_envio',
    collectionName: 'listas_envio',
    nome: 'Lista Manual 2 Clientes',
    segmento: 'pos_vendas',
    filtros: {
      tipo_selecao: 'manual',
      clientes_ids: ['cli-pos-1', 'cli-solar-1'],
      total_clientes_selecionados: 2,
    },
    created: '2025-01-03',
    updated: '2025-01-03',
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

const mockFiltrosSalvosClientes = [
  {
    id: 'filtro-custom-1',
    nome: 'Clientes de Passo Fundo',
    modulo: 'clientes',
    dono: 'user-1',
    visibilidade: 'shared',
    condicoes: {
      all: [
        {
          id: 'c1',
          campoId: 'cidade',
          operador: 'e',
          valor: 'Passo Fundo',
        },
      ],
      any: [],
    },
    created: '2025-01-01',
    updated: '2025-01-01',
  },
]

const mockFetchFiltrosSalvos = vi.fn().mockResolvedValue(mockFiltrosSalvosClientes)
const mockGetFavoritosFiltrosIds = vi.fn().mockReturnValue(['filtro-custom-1'])
const mockToggleFavoritoFiltroId = vi.fn().mockReturnValue([])

vi.mock('@/services/filtrosSalvosService', () => ({
  fetchFiltrosSalvos: () => mockFetchFiltrosSalvos(),
  getFavoritosFiltrosIds: () => mockGetFavoritosFiltrosIds(),
  toggleFavoritoFiltroId: () => mockToggleFavoritoFiltroId(),
}))

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

  it('garante que nenhum cliente vem pré-marcado ao abrir diretamente e modal ocupa tela cheia', async () => {
    render(<ModalMensagemWhatsAppMassa open={true} onOpenChange={vi.fn()} />)

    // Verifica que 0 destinatários vêm selecionados por padrão
    expect(screen.getByText(/0 de \d+ destinatários selecionados/i)).toBeDefined()
    expect(screen.getByText(/0 clientes selecionados/i)).toBeDefined()

    // Botão de envio desabilitado por não haver clientes selecionados
    const btnEnviar = screen.getByRole('button', { name: /Enviar Mensagem/i })
    expect(btnEnviar).toBeDefined()
    expect((btnEnviar as HTMLButtonElement).disabled).toBe(true)

    // O modal possui as classes de tela cheia
    const dialogContent = document.querySelector('[role="dialog"]')
    expect(dialogContent?.className).toContain('w-screen')
    expect(dialogContent?.className).toContain('h-screen')
    expect(dialogContent?.className).toContain('inset-0')
  })

  it('preserva pré-seleção quando destinatariosIniciais é informado', async () => {
    render(
      <ModalMensagemWhatsAppMassa
        open={true}
        onOpenChange={vi.fn()}
        destinatariosIniciais={[{ cliente: clientesMock[0] }, { cliente: clientesMock[1] }]}
      />,
    )

    // Deve vir com os 2 clientes pré-selecionados
    await waitFor(() => {
      expect(screen.getByText(/2 de 2 destinatários selecionados/i)).toBeDefined()
      expect(screen.getByText(/2 clientes selecionados/i)).toBeDefined()
    })
  })

  it('renderiza o dropdown de segmento com contadores coerentes no bloco unificado e filtra os clientes', async () => {
    render(<ModalMensagemWhatsAppMassa open={true} onOpenChange={vi.fn()} />)

    // Verifica que o modal abriu com título e bloco unificado de Filtros Combináveis
    expect(screen.getByText('Disparo Individual Z-API')).toBeDefined()
    expect(screen.getByText('Filtros Combináveis')).toBeDefined()

    // O dropdown de segmento unificado deve existir
    const selectSegmento = screen.getByRole('combobox', { name: /Filtro de segmento/i })
    expect(selectSegmento).toBeDefined()

    // Opções de segmento com contadores
    expect(selectSegmento.textContent).toContain('Clientes O&M (1)')
    expect(selectSegmento.textContent).toContain('Clientes Bateria (1)')
    expect(selectSegmento.textContent).toContain('Pós-Venda (1)')

    // Seleciona "Clientes O&M" no dropdown
    fireEvent.change(selectSegmento, { target: { value: 'clientes_om' } })

    // A lista de destinatários deve filtrar exibindo Empresa O&M e não Carlos Solar
    await waitFor(() => {
      expect(screen.getByText('Empresa O&M Manutencoes')).toBeDefined()
      expect(screen.queryByText('Carlos Solar')).toBeNull()
      expect(screen.queryByText('Fazenda Baterias')).toBeNull()
    })

    // Seleciona "Clientes Bateria" no dropdown
    fireEvent.change(selectSegmento, { target: { value: 'clientes_bateria' } })

    // Deve exibir Fazenda Baterias (tipo_venda Baterias) e NÃO Cliente Inversor Híbrido Sem Bateria (tipo_sistema Híbrido)
    await waitFor(() => {
      expect(screen.getByText('Fazenda Baterias')).toBeDefined()
      expect(screen.queryByText('Cliente Inversor Híbrido Sem Bateria')).toBeNull()
      expect(screen.queryByText('Empresa O&M Manutencoes')).toBeNull()
      expect(screen.queryByText('Carlos Solar')).toBeNull()
    })

    // Seleciona "Pós-Venda" no dropdown
    fireEvent.change(selectSegmento, { target: { value: 'pos_vendas' } })

    await waitFor(() => {
      expect(screen.getByText('João Fechado PosVenda')).toBeDefined()
      expect(screen.queryByText('Carlos Solar')).toBeNull()
    })

    // Volta para "Todos"
    fireEvent.change(selectSegmento, { target: { value: 'todos' } })

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

  it('permite filtrar clientes sem WhatsApp cadastrado via dropdown unificado de WhatsApp para completar o cadastro', async () => {
    render(<ModalMensagemWhatsAppMassa open={true} onOpenChange={vi.fn()} />)

    // Filtro WhatsApp: dropdown unificado
    const selectWpp = screen.getByRole('combobox', { name: /Filtro de WhatsApp/i })
    expect(selectWpp).toBeDefined()

    // Seleciona "Sem WhatsApp cadastrado"
    fireEvent.change(selectWpp, { target: { value: 'sem_whatsapp' } })

    await waitFor(() => {
      expect(screen.getByText('Cliente Inversor Híbrido Sem Bateria')).toBeDefined()
      expect(screen.getByText('Sem número cadastrado')).toBeDefined()
      expect(screen.queryByText('Carlos Solar')).toBeNull()
      expect(screen.queryByText('Empresa O&M Manutencoes')).toBeNull()
    })

    // Seleciona "Só com WhatsApp"
    fireEvent.change(selectWpp, { target: { value: 'com_whatsapp' } })

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

  it('permite abrir o modal "Salvar seleção como lista" e persistir nova lista salva', async () => {
    render(<ModalMensagemWhatsAppMassa open={true} onOpenChange={vi.fn()} />)

    const btnSalvar = screen.getByRole('button', { name: /Salvar seleção como lista/i })
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

  it('grava exatamente os clientes_ids selecionados manualmente por checkbox ao salvar lista', async () => {
    render(<ModalMensagemWhatsAppMassa open={true} onOpenChange={vi.fn()} />)

    // Clica no cliente "Carlos Solar" para marcar checkbox
    const clienteCarlos = screen.getByText('Carlos Solar')
    fireEvent.click(clienteCarlos)

    // Abre modal de salvar lista
    const btnSalvar = screen.getByRole('button', { name: /Salvar seleção como lista/i })
    fireEvent.click(btnSalvar)

    await waitFor(() => {
      expect(screen.getByText('Salvar Seleção Atual')).toBeDefined()
      expect(screen.getByText(/1 cliente\(s\) marcados por checkbox serão gravados/i)).toBeDefined()
    })

    const inputNome = screen.getByPlaceholderText(/Ex: Clientes O&M/i)
    fireEvent.change(inputNome, { target: { value: 'Lista Carlos Solar Manual' } })

    const btnConfirmar = screen.getByRole('button', { name: /^Salvar Lista$/i })
    fireEvent.click(btnConfirmar)

    await waitFor(() => {
      expect(mockCreateListaEnvio).toHaveBeenCalledWith(
        expect.objectContaining({
          nome: 'Lista Carlos Solar Manual',
          clientes_ids: ['cli-solar-1'],
          filtros: expect.objectContaining({
            tipo_selecao: 'manual',
            clientes_ids: ['cli-solar-1'],
            total_clientes_selecionados: 1,
          }),
        }),
      )
    })
  })

  it('aplica exatamente os clientes gravados ao carregar uma lista salva por seleção manual', async () => {
    render(<ModalMensagemWhatsAppMassa open={true} onOpenChange={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Lista Manual 2 Clientes')).toBeDefined()
    })

    const selectListas = screen.getByRole('combobox', { name: /Seletor de listas salvas/i })
    fireEvent.change(selectListas, { target: { value: 'lista-manual-2-clientes' } })

    // Deve aplicar exatamente os 2 clientes gravados na lista manual
    await waitFor(() => {
      expect(screen.getByText(/2 de \d+ destinatários selecionados/i)).toBeDefined()
      expect(screen.getByText(/2 clientes selecionados/i)).toBeDefined()
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

  it('grava o lote na coleção disparos_massa ao confirmar o envio após selecionar destinatários', async () => {
    render(<ModalMensagemWhatsAppMassa open={true} onOpenChange={vi.fn()} />)

    // Filtra "Só com WhatsApp" no dropdown unificado
    const selectWpp = screen.getByRole('combobox', { name: /Filtro de WhatsApp/i })
    fireEvent.change(selectWpp, { target: { value: 'com_whatsapp' } })

    // Seleciona todos os clientes filtrados
    const btnSelectAll = screen.getByRole('button', { name: /Selecionar todos/i })
    fireEvent.click(btnSelectAll)

    // Botão de envio habilitado com os clientes selecionados
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

  it('permite carregar um filtro salvo de clientes como base dos destinatários, exibe chip ativo e contagem', async () => {
    render(<ModalMensagemWhatsAppMassa open={true} onOpenChange={vi.fn()} />)

    // O botão do dropdown de carregar filtro salvo deve existir
    const btnFiltroSalvo = screen.getByRole('button', { name: /Carregar filtro salvo/i })
    expect(btnFiltroSalvo).toBeDefined()
    expect(btnFiltroSalvo.textContent).toContain('Carregar filtro salvo...')

    // Abre o popover
    fireEvent.click(btnFiltroSalvo)

    // Espera listar os filtros (sistema e customizados)
    await waitFor(() => {
      expect(screen.getByText('Clientes de Passo Fundo')).toBeDefined()
      expect(screen.getByText('Com WhatsApp')).toBeDefined()
      expect(screen.getByText('Sem WhatsApp')).toBeDefined()
    })

    // Clica no filtro customizado "Clientes de Passo Fundo"
    const itemFiltro = screen.getByText('Clientes de Passo Fundo')
    fireEvent.click(itemFiltro)

    // O chip deve aparecer exibindo o nome e a contagem base
    await waitFor(() => {
      expect(screen.getByText(/Filtro Salvo: Clientes de Passo Fundo/i)).toBeDefined()
      expect(screen.getByText(/1 na base/i)).toBeDefined()
    })

    // Na lista, apenas Carlos Solar (de Passo Fundo) deve aparecer
    expect(screen.getByText('Carlos Solar')).toBeDefined()
    expect(screen.queryByText('Empresa O&M Manutencoes')).toBeNull()
    expect(screen.queryByText('Fazenda Baterias')).toBeNull()

    // Clica no botão X do chip para remover o filtro salvo
    const btnRemoverFiltro = screen.getByRole('button', { name: /Remover filtro salvo/i })
    fireEvent.click(btnRemoverFiltro)

    // O chip deve sumir e os outros clientes voltam a ficar visíveis
    await waitFor(() => {
      expect(screen.queryByText(/Filtro Salvo: Clientes de Passo Fundo/i)).toBeNull()
      expect(screen.getByText('Empresa O&M Manutencoes')).toBeDefined()
    })
  })

  it('combina o filtro salvo como base com filtros extras do modal (AND)', async () => {
    render(<ModalMensagemWhatsAppMassa open={true} onOpenChange={vi.fn()} />)

    // Carrega filtro salvo de sistema "Com WhatsApp"
    const btnFiltroSalvo = screen.getByRole('button', { name: /Carregar filtro salvo/i })
    fireEvent.click(btnFiltroSalvo)

    await waitFor(() => {
      expect(screen.getByText('Com WhatsApp')).toBeDefined()
    })
    fireEvent.click(screen.getByText('Com WhatsApp'))

    await waitFor(() => {
      expect(screen.getByText(/Filtro Salvo: Com WhatsApp/i)).toBeDefined()
    })

    // Clientes sem whatsapp não aparecem
    expect(screen.queryByText('Cliente Inversor Híbrido Sem Bateria')).toBeNull()

    // Agora aplica filtro extra Cidade: Marau
    const selectCidade = screen.getByRole('combobox', { name: /Filtro de cidade/i })
    fireEvent.change(selectCidade, { target: { value: 'Marau' } })

    // Resultado: Com WhatsApp AND Cidade = Marau => Empresa O&M Manutencoes
    await waitFor(() => {
      expect(screen.getByText('Empresa O&M Manutencoes')).toBeDefined()
      expect(screen.queryByText('Carlos Solar')).toBeNull()
    })
  })
})
