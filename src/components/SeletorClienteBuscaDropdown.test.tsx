import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { SeletorClienteBuscaDropdown } from './SeletorClienteBuscaDropdown'
import type { Cliente } from '@/types/crm'

const mockClientes = [
  {
    id: 'cli-1',
    nome: 'João da Silva',
    razao_social: 'João Silva ME',
    nome_fantasia: 'Silva Elétrica',
    cpf: '123.456.789-00',
    cidade: 'Erechim',
    estado: 'RS',
    telefone: '(54) 99999-1111',
    whatsapp: '54999991111',
    email: 'joao@silva.com',
    status: 'Novo Lead',
  },
  {
    id: 'cli-2',
    nome: 'Maria Souza',
    razao_social: 'Souza & Cia Ltda',
    cnpj: '12.345.678/0001-99',
    cidade: 'Passo Fundo',
    estado: 'RS',
    telefone: '(54) 3333-2222',
    whatsapp: '54988882222',
    email: 'maria@souza.com',
    status: 'Negociação',
  },
] as unknown as Cliente[]

describe('SeletorClienteBuscaDropdown', () => {
  it('renderiza o input de busca com o placeholder correto', () => {
    const handleChange = vi.fn()
    render(
      <SeletorClienteBuscaDropdown
        clientes={mockClientes}
        value=""
        onChange={handleChange}
        placeholder="Buscar cliente teste..."
      />,
    )

    const input = screen.getByPlaceholderText('Buscar cliente teste...')
    expect(input).not.toBeNull()
  })

  it('exibe o botão de cadastrar novo cliente quando onNovoClienteClick for fornecido', () => {
    const handleChange = vi.fn()
    const handleNovoCliente = vi.fn()

    render(
      <SeletorClienteBuscaDropdown
        clientes={mockClientes}
        value=""
        onChange={handleChange}
        onNovoClienteClick={handleNovoCliente}
      />,
    )

    const input = screen.getByRole('combobox')
    fireEvent.focus(input)

    const btnNovo = screen.getAllByText(/\+ Cadastrar novo cliente/i)
    expect(btnNovo.length).toBeGreaterThan(0)

    fireEvent.mouseDown(btnNovo[0])
    expect(handleNovoCliente).toHaveBeenCalledTimes(1)
  })

  it('filtra clientes ao digitar e dispara onChange ao selecionar', () => {
    const handleChange = vi.fn()

    render(<SeletorClienteBuscaDropdown clientes={mockClientes} value="" onChange={handleChange} />)

    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'Passo Fundo' } })

    // Deve encontrar Souza & Cia Ltda de Passo Fundo
    expect(screen.getByText('Passo Fundo')).not.toBeNull()
    expect(screen.getByText('Souza & Cia Ltda')).not.toBeNull()

    const item = screen.getByText('Souza & Cia Ltda').closest('button')
    if (item) {
      fireEvent.mouseDown(item)
    }

    expect(handleChange).toHaveBeenCalledWith('cli-2', mockClientes[1])
  })
})
