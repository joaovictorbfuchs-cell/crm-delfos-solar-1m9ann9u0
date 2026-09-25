import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { ClienteAutocomplete, HighlightMatch } from './ClienteAutocomplete'
import type { Cliente } from '@/types/crm'

const mockClientes: Cliente[] = [
  {
    id: 'c1',
    collectionId: 'clientes',
    collectionName: 'clientes',
    nome: 'Baita (Cladir João Dariva)',
    cidade: 'Erechim',
    estado: 'RS',
    telefone: '54999990001',
    whatsapp: '54999990001',
    endereco: 'Rua Principal',
    uc: '123456',
    potencia_kwp: 5,
    valor_estimado: 25000,
    status: 'Novo Lead',
    data_instalacao: '',
    inversor_marca: '',
    inversor_modelo: '',
    placas_qtd: 10,
    placas_marca: '',
    telhado_tipo: 'metalico',
    created: '2025-01-01',
    updated: '2025-01-01',
  },
  {
    id: 'c2',
    collectionId: 'clientes',
    collectionName: 'clientes',
    nome: 'João Silva Solar',
    cidade: 'Passo Fundo',
    estado: 'RS',
    telefone: '54999990002',
    endereco: 'Av Central',
    uc: '654321',
    potencia_kwp: 10,
    valor_estimado: 45000,
    status: 'Novo Lead',
    data_instalacao: '',
    inversor_marca: '',
    inversor_modelo: '',
    placas_qtd: 20,
    placas_marca: '',
    telhado_tipo: 'ceramico',
    created: '2025-01-01',
    updated: '2025-01-01',
  },
  {
    id: 'c3',
    collectionId: 'clientes',
    collectionName: 'clientes',
    nome: 'Maria Santos',
    cidade: 'Erechim',
    estado: 'RS',
    telefone: '54999990003',
    endereco: 'Rua Sul',
    uc: '987654',
    potencia_kwp: 3,
    valor_estimado: 15000,
    status: 'Novo Lead',
    data_instalacao: '',
    inversor_marca: '',
    inversor_modelo: '',
    placas_qtd: 6,
    placas_marca: '',
    telhado_tipo: 'fibrocimento',
    created: '2025-01-01',
    updated: '2025-01-01',
  },
]

describe('HighlightMatch', () => {
  it('renders mark element with high contrast styling when matched', () => {
    const { container } = render(<HighlightMatch text="Baita (Cladir João Dariva)" query="João" />)
    const mark = container.querySelector('mark')
    expect(mark).not.toBeNull()
    expect(mark?.textContent).toBe('João')
    // Verifica se possui classes de destaque visível
    expect(mark?.className).toContain('bg-emerald-100')
    expect(mark?.className).toContain('text-emerald-950')
  })

  it('matches accent-insensitively (e.g. Joao matches João)', () => {
    const { container } = render(<HighlightMatch text="Baita (Cladir João Dariva)" query="joao" />)
    const mark = container.querySelector('mark')
    expect(mark).not.toBeNull()
    expect(mark?.textContent).toBe('João')
  })

  it('renders normal text without mark when query does not match', () => {
    const { container } = render(<HighlightMatch text="Maria Santos" query="João" />)
    const mark = container.querySelector('mark')
    expect(mark).toBeNull()
    expect(container.textContent).toContain('Maria Santos')
  })
})

describe('ClienteAutocomplete', () => {
  it('renders input with placeholder', () => {
    render(
      <ClienteAutocomplete
        clientes={mockClientes}
        value=""
        onChange={vi.fn()}
        placeholder="Digite o nome do cliente..."
      />,
    )

    expect(screen.getByPlaceholderText('Digite o nome do cliente...')).toBeDefined()
  })

  it('shows matched clients when typing "João" including Baita (Cladir João Dariva)', () => {
    render(<ClienteAutocomplete clientes={mockClientes} value="" onChange={vi.fn()} />)

    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'João' } })

    // Ambos os clientes com João devem aparecer na lista
    expect(screen.getByText(/Baita/)).toBeDefined()
    expect(screen.getByText(/João Silva Solar/)).toBeDefined()
    // Maria Santos não deve aparecer na lista filtrada
    expect(screen.queryByText(/Maria Santos/)).toBeNull()
  })

  it('allows selecting a client by clicking on the suggestion', () => {
    const handleChange = vi.fn()
    render(<ClienteAutocomplete clientes={mockClientes} value="" onChange={handleChange} />)

    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'Baita' } })

    const option = screen.getByText(/Baita/)
    fireEvent.mouseDown(option)

    expect(handleChange).toHaveBeenCalledWith(
      'c1',
      expect.objectContaining({ nome: 'Baita (Cladir João Dariva)' }),
    )
  })
})
