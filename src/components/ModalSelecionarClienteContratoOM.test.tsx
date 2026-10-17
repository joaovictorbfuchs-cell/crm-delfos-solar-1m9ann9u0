import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { ModalSelecionarClienteContratoOM } from './ModalSelecionarClienteContratoOM'
import type { Cliente, PropostaOM } from '@/types/crm'

// Mock de useClientes
const mockClientes: Cliente[] = [
  {
    id: 'cli-1',
    nome: 'Empresa Alpha Ltda',
    cidade: 'Erechim/RS',
    cpf: '00.000.000/0001-00',
    potencia_kwp: 50,
  } as Cliente,
  {
    id: 'cli-2',
    nome: 'Cliente Sem Proposta',
    cidade: 'Getúlio Vargas/RS',
    cpf: '111.222.333-44',
  } as Cliente,
  {
    id: 'cli-3',
    nome: 'Cliente Com Proposta Em Elaboracao',
    cidade: 'Passo Fundo/RS',
  } as Cliente,
]

const mockPropostasOM: PropostaOM[] = [
  {
    id: 'prop-1',
    numero_proposta: 'OM-2025-001',
    cliente_id: 'cli-1',
    status: 'Aprovada',
    plano_escolhido: 'Prevenção',
    data_proposta: '2025-01-10T00:00:00.000Z',
    created: '2025-01-10T00:00:00.000Z',
  } as PropostaOM,
  {
    id: 'prop-2',
    numero_proposta: 'OM-2025-002',
    cliente_id: 'cli-3',
    status: 'Em elaboração',
    plano_escolhido: 'Essencial',
    data_proposta: '2025-01-12T00:00:00.000Z',
  } as PropostaOM,
]

vi.mock('@/contexts/ClientesContext', () => ({
  useClientes: () => ({
    clientes: mockClientes,
    propostasOM: mockPropostasOM,
  }),
}))

describe('ModalSelecionarClienteContratoOM', () => {
  it('exibe cliente com proposta aprovada na lista de Prontos para Contrato e aciona fluxo canônico', () => {
    const onContratoIniciado = vi.fn()
    const onOpenChange = vi.fn()

    render(
      <ModalSelecionarClienteContratoOM
        open={true}
        onOpenChange={onOpenChange}
        onContratoIniciado={onContratoIniciado}
      />,
    )

    expect(screen.getByText('Novo Contrato O&M — Selecionar Cliente')).toBeDefined()
    expect(screen.getByText('Empresa Alpha Ltda')).toBeDefined()
    expect(screen.getByText('1 proposta aprovada')).toBeDefined()

    // Clica no botão Gerar Contrato do cliente aprovado
    const btnGerar = screen.getByRole('button', { name: /Gerar Contrato/i })
    fireEvent.click(btnGerar)

    expect(onContratoIniciado).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'cli-1' }),
      expect.objectContaining({ id: 'prop-1', status: 'Aprovada' }),
    )
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('exibe alerta orientador se o usuário seleciona cliente SEM proposta aprovada', () => {
    const onContratoIniciado = vi.fn()
    const onOpenChange = vi.fn()

    render(
      <ModalSelecionarClienteContratoOM
        open={true}
        onOpenChange={onOpenChange}
        onContratoIniciado={onContratoIniciado}
      />,
    )

    // Troca para aba "Todos os Clientes"
    const btnTodos = screen.getByRole('button', { name: /Todos os Clientes/i })
    fireEvent.click(btnTodos)

    expect(screen.getByText('Cliente Sem Proposta')).toBeDefined()

    // Clica no cliente sem proposta
    const itemSemProposta = screen.getByText('Cliente Sem Proposta')
    fireEvent.click(itemSemProposta)

    // Deve exibir mensagem orientadora sem abrir modal de contrato direto
    expect(screen.getByText('Este cliente não tem proposta O&M aprovada.')).toBeDefined()
    expect(screen.getByText(/Aprove ou crie uma proposta antes de gerar o contrato/i)).toBeDefined()

    // Não deve ter disparado o contrato
    expect(onContratoIniciado).not.toHaveBeenCalled()
  })

  it('inicia diretamente o fluxo canônico se initialClienteId tiver proposta aprovada', () => {
    const onContratoIniciado = vi.fn()
    const onOpenChange = vi.fn()

    render(
      <ModalSelecionarClienteContratoOM
        open={true}
        onOpenChange={onOpenChange}
        onContratoIniciado={onContratoIniciado}
        initialClienteId="cli-1"
      />,
    )

    expect(onContratoIniciado).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'cli-1' }),
      expect.objectContaining({ id: 'prop-1' }),
    )
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
