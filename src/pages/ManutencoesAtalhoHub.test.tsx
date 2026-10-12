import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import Manutencoes from './Manutencoes'

// Mock de navigate e hooks
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.mock('@/contexts/ClientesContext', () => ({
  useClientes: () => ({
    clientes: [],
    contratosOM: [],
    sistemas: [],
    anomaliasOM: [],
    servicosAdicionaisOM: [],
    servicosAvulsos: [],
    isLoading: false,
    openFichaOM: vi.fn(),
  }),
}))

// Mock de ListaOM para verificar repasse de onOpenNovaProposta
vi.mock('@/components/ListaOM', () => ({
  ListaOM: ({ onOpenNovaProposta }: { onOpenNovaProposta: () => void }) => (
    <div data-testid="lista-om-mock">
      <button type="button" data-testid="btn-nova-proposta-om" onClick={onOpenNovaProposta}>
        Nova Proposta O&M
      </button>
    </div>
  ),
}))

vi.mock('@/components/ModalNovoContratoOM', () => ({
  ModalNovoContratoOM: () => <div data-testid="modal-novo-contrato" />,
}))

vi.mock('@/components/ModalNovaPropostaOM', () => ({
  ModalNovaPropostaOM: () => <div data-testid="modal-nova-proposta" />,
}))

describe('Tela Manutencoes (/manutencoes) - Atalho para o Hub de Propostas O&M', () => {
  it('ao clicar em Nova Proposta O&M, navega para /propostas?aba=om', () => {
    mockNavigate.mockClear()

    render(
      <MemoryRouter initialEntries={['/manutencoes']}>
        <Routes>
          <Route path="/manutencoes" element={<Manutencoes />} />
        </Routes>
      </MemoryRouter>,
    )

    const btn = screen.getByTestId('btn-nova-proposta-om')
    expect(btn).toBeDefined()

    fireEvent.click(btn)

    // Deve ter navegado para o Hub com aba=om
    expect(mockNavigate).toHaveBeenCalledWith('/propostas?aba=om')
  })
})
