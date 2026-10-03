import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import { ModalMesclarClientes } from './ModalMesclarClientes'
import type { Cliente } from '@/types/crm'

vi.mock('@/services/crmService', () => ({
  contarVinculosCliente: vi.fn().mockResolvedValue({
    negocios: 2,
    atividades: 3,
    usinas: 1,
    orcamentos: 1,
    contratosOM: 0,
    projetos: 0,
    ordensServico: 0,
    conversasWhatsApp: 0,
    contatosAdicionais: 0,
    total: 7,
  }),
}))

const mockClientes: Cliente[] = [
  {
    id: 'cli-1',
    collectionId: 'clientes',
    collectionName: 'clientes',
    nome: 'Carlos Silva',
    tipo_pessoa: 'fisica',
    cpf: '111.111.111-11',
    telefone: '54999990001',
    whatsapp: '54999990001',
    email: 'carlos@exemplo.com',
    cidade: 'Erechim',
    estado: 'RS',
    endereco: 'Rua das Flores',
    numero: '100',
    status: 'Novo Lead',
    potencia_kwp: 5,
    valor_estimado: 25000,
    observacoes: 'Primeiro contato por indicacao',
    uc: '123456',
    data_instalacao: '2025-01-01',
    created: '2025-01-01',
    updated: '2025-01-01',
  } as unknown as Cliente,
  {
    id: 'cli-2',
    collectionId: 'clientes',
    collectionName: 'clientes',
    nome: 'Carlos A. Silva',
    tipo_pessoa: 'fisica',
    cpf: '111.111.111-11',
    telefone: '54999990002',
    whatsapp: '54999990002',
    email: 'carlos.silva@teste.com',
    cidade: 'Erechim',
    estado: 'RS',
    endereco: 'Rua das Palmeiras',
    numero: '200',
    status: 'Negociação',
    potencia_kwp: 7.5,
    valor_estimado: 38000,
    observacoes: 'Interesse em painel solar bifacial',
    uc: '123457',
    data_instalacao: '2025-01-02',
    created: '2025-01-02',
    updated: '2025-01-02',
  } as unknown as Cliente,
  {
    id: 'cli-3',
    collectionId: 'clientes',
    collectionName: 'clientes',
    nome: 'Carlos Antonio Silva',
    tipo_pessoa: 'fisica',
    cpf: '111.111.111-11',
    telefone: '54999990003',
    whatsapp: '54999990003',
    email: 'carlos.terceiro@teste.com',
    cidade: 'Passo Fundo',
    estado: 'RS',
    endereco: 'Av Central',
    numero: '500',
    status: 'Orçamento',
    potencia_kwp: 10,
    valor_estimado: 50000,
    observacoes: 'Tem usina em fazenda',
    uc: '123458',
    data_instalacao: '2025-01-03',
    created: '2025-01-03',
    updated: '2025-01-03',
  } as unknown as Cliente,
]

describe('ModalMesclarClientes - N clientes lado a lado', () => {
  it('deve renderizar os 3 clientes selecionados com colunas individuais lado a lado', async () => {
    const onConfirmar = vi.fn().mockResolvedValue(undefined)
    const onClose = vi.fn()

    render(
      <ModalMesclarClientes
        isOpen={true}
        onClose={onClose}
        clientesIniciais={mockClientes}
        todosClientes={mockClientes}
        onConfirmarMesclagem={onConfirmar}
      />,
    )

    // Título indica os 3 clientes selecionados
    expect(screen.getByText(/Mesclar Clientes \(3 selecionados\)/i)).toBeTruthy()

    // Todos os 3 nomes devem estar presentes nos cards/colunas
    expect(screen.getByText('Carlos Silva')).toBeTruthy()
    expect(screen.getByText('Carlos A. Silva')).toBeTruthy()
    expect(screen.getByText('Carlos Antonio Silva')).toBeTruthy()

    // O primeiro deve começar como Cliente Principal por padrão
    expect(screen.getByText('Cliente Principal')).toBeTruthy()

    // Tabela campo a campo deve ter coluna para cada cliente
    expect(screen.getByText(/Escolha de Dados Campo a Campo/i)).toBeTruthy()
  })

  it('permite alternar o cliente principal clicando no card correspondente', async () => {
    const onConfirmar = vi.fn().mockResolvedValue(undefined)
    const onClose = vi.fn()

    render(
      <ModalMesclarClientes
        isOpen={true}
        onClose={onClose}
        clientesIniciais={mockClientes}
        todosClientes={mockClientes}
        onConfirmarMesclagem={onConfirmar}
      />,
    )

    // Clicar em "Tornar Principal" no segundo ou terceiro card
    const botoesTornarPrincipal = screen.getAllByText('Tornar Principal')
    expect(botoesTornarPrincipal.length).toBeGreaterThan(0)
    fireEvent.click(botoesTornarPrincipal[0])

    // Verifica que agora há um cliente principal ativo
    expect(screen.getByText('Cliente Principal')).toBeTruthy()
  })

  it('chama onConfirmarMesclagem passando todos os clientes secundários e os campos escolhidos', async () => {
    const onConfirmar = vi.fn().mockResolvedValue(undefined)
    const onClose = vi.fn()

    render(
      <ModalMesclarClientes
        isOpen={true}
        onClose={onClose}
        clientesIniciais={mockClientes}
        todosClientes={mockClientes}
        onConfirmarMesclagem={onConfirmar}
      />,
    )

    const btnConfirmar = screen.getByRole('button', { name: /Confirmar e Mesclar 3 Clientes/i })
    expect(btnConfirmar).toBeTruthy()

    fireEvent.click(btnConfirmar)

    await waitFor(() => {
      expect(onConfirmar).toHaveBeenCalledTimes(1)
    })

    const payload = onConfirmar.mock.calls[0][0]
    expect(payload.clienteMestreId).toBe('cli-1')
    expect(payload.clientesSecundariosIds).toEqual(['cli-2', 'cli-3'])
    expect(payload.camposSobrescritos).toBeDefined()
    expect(payload.modo).toBe('unificar_cliente')
  })

  it('exibe indicador de progresso em tempo real e desabilita botões durante a mesclagem', async () => {
    let resolverMesclagem: () => void = () => {}
    const promessaPendente = new Promise<void>((resolve) => {
      resolverMesclagem = resolve
    })

    const onConfirmar = vi.fn().mockImplementation(async (opcoes) => {
      // Simula disparos de progresso do crmService
      opcoes.onProgresso?.({
        etapa: 'transferindo_registros',
        concluidos: 12,
        total: 40,
        porcentagem: 45,
        detalhe: 'Transferindo atividades... 12/40',
      })
      await promessaPendente
    })
    const onClose = vi.fn()

    render(
      <ModalMesclarClientes
        isOpen={true}
        onClose={onClose}
        clientesIniciais={mockClientes}
        todosClientes={mockClientes}
        onConfirmarMesclagem={onConfirmar}
      />,
    )

    const btnConfirmar = screen.getByRole('button', { name: /Confirmar e Mesclar 3 Clientes/i })
    fireEvent.click(btnConfirmar)

    // O indicador de progresso deve aparecer em tela com o texto em pt-BR
    await waitFor(() => {
      expect(screen.getByTestId('progresso-mesclagem-container')).toBeTruthy()
      expect(screen.getByText('Transferindo atividades... 12/40')).toBeTruthy()
      expect(screen.getByText('45%')).toBeTruthy()
      expect(screen.getByText('12/40 itens')).toBeTruthy()
    })

    // O botão deve estar desabilitado durante o processamento
    const btnDuranteEnvio = screen.getByRole('button', { name: /Unificando clientes.../i })
    expect(btnDuranteEnvio).toHaveProperty('disabled', true)

    // Concluir a mesclagem
    resolverMesclagem()
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled()
    })
  })
})
