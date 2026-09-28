import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import ModalMensagemWhatsAppMassa from '@/components/ModalMensagemWhatsAppMassa'
import type { Cliente, ContratoOM } from '@/types/crm'

// Mock de ClientesContext
const mockSendWhatsAppMessage = vi.fn().mockResolvedValue({ id: 'msg-1' })
const mockAddAtividade = vi.fn().mockResolvedValue({ id: 'ativ-1' })
const mockUpdateCliente = vi.fn().mockResolvedValue({})

const clientesMock: Cliente[] = [
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
    potencia_kwp: 12.5,
    status: 'Negociação',
    created: '2025-01-01',
    updated: '2025-01-01',
  } as Cliente,
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
    contratou_om: true,
    status: 'Negociação',
    created: '2025-01-01',
    updated: '2025-01-01',
  } as Cliente,
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
    status: 'Negociação',
    created: '2025-01-01',
    updated: '2025-01-01',
  } as Cliente,
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
    status: 'Negociação',
    transferido_pos_vendas: true,
    data_instalacao: '2024-11-20',
    potencia_kwp: 8.0,
    created: '2024-01-01',
    updated: '2024-12-01',
  } as Cliente,
]

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

describe('ModalMensagemWhatsAppMassa - Filtros de Segmento', () => {
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

    await waitFor(() => {
      expect(screen.getByText('Fazenda Baterias')).toBeDefined()
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
      expect(screen.getByText('João Fechado PosVenda')).toBeDefined()
    })
  })

  it('"Selecionar todos" seleciona apenas os clientes da lista filtrada ativa', async () => {
    render(<ModalMensagemWhatsAppMassa open={true} onOpenChange={vi.fn()} />)

    // Filtra por Clientes Bateria (apenas 1 cliente)
    const chipBateria = screen.getByRole('button', { name: /Clientes Bateria/i })
    fireEvent.click(chipBateria)

    await waitFor(() => {
      expect(screen.getByText('Fazenda Baterias')).toBeDefined()
    })

    // Clica em "Selecionar todos"
    const btnSelectAll = screen.getByText(/Selecionar todos/i)
    fireEvent.click(btnSelectAll)

    // Verifica que o rodapé indica 1 cliente selecionado (e não todos os 4)
    await waitFor(() => {
      expect(screen.getByText(/1 cliente selecionado/i)).toBeDefined()
    })
  })
})
