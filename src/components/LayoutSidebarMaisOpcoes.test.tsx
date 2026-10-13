import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Layout from '@/components/Layout'

// Mock dos contextos necessários para o Layout
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'usr-admin', name: 'Gestor Teste', email: 'admin@delfos.eng.br' },
    userProfile: { name: 'Gestor Teste', role: 'admin' },
    isAdmin: true,
    isInstalador: false,
    logout: vi.fn(),
  }),
}))

vi.mock('@/contexts/ClientesContext', () => ({
  useClientes: () => ({
    whatsAppConversas: [],
    profissionais: [],
    refreshData: vi.fn(),
  }),
}))

vi.mock('@/components/BarraBuscaGlobal', () => ({
  BarraBuscaGlobal: () => <div data-testid="barra-busca-global" />,
}))

vi.mock('@/components/NotificacoesBell', () => ({
  NotificacoesBell: () => <div data-testid="notificacoes-bell" />,
}))

vi.mock('@/components/AssistenteDelfosChat', () => ({
  default: () => null,
  AssistenteDelfosBotao: () => <div data-testid="assistente-btn" />,
}))

vi.mock('@/components/FichaClienteDrawer', () => ({
  FichaClienteDrawer: () => null,
}))

vi.mock('@/components/ModalGerenciarWhatsAppTemplates', () => ({
  ModalGerenciarWhatsAppTemplates: () => null,
}))

describe('Layout Desktop - Sidebar com Mais Opções', () => {
  it('renderiza os itens principais fixos na sidebar desktop', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Layout />
      </MemoryRouter>,
    )

    // Itens principais fixos
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Comercial').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Propostas').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Atividades').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Projetos').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Serviços').length).toBeGreaterThan(0)
    expect(screen.getAllByText('O&M').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Clientes').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Contatos').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Mais Opções').length).toBeGreaterThan(0)
  })

  it('abre o flyout Mais Opções ao clicar no botão e lista itens secundários', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Layout />
      </MemoryRouter>,
    )

    const botaoMaisOpcoes = screen.getByRole('button', { name: /Mais Opções/i })
    expect(botaoMaisOpcoes).not.toBeNull()

    // Inicialmente o popover não deve estar aberto
    expect(screen.queryByRole('dialog', { name: /Menu Mais Opções/i })).toBeNull()

    // Clica para abrir
    fireEvent.click(botaoMaisOpcoes)

    // O popover abre
    const dialog = screen.getByRole('dialog', { name: /Menu Mais Opções/i })
    expect(dialog).not.toBeNull()

    // Verifica itens do flyout
    expect(screen.getByText('Automações')).not.toBeNull()
    expect(screen.getByText('Cadastro de equipamentos')).not.toBeNull()
    expect(screen.getByText('Ativos das usinas')).not.toBeNull()
    expect(screen.getByText('Galeria de usinas')).not.toBeNull()
    expect(screen.getByText('Fornecedores')).not.toBeNull()
    expect(screen.getByText('Importar Clientes')).not.toBeNull()
    expect(screen.getByText('Gerenciar usuários')).not.toBeNull()
    expect(screen.getByText('Base de Conhecimento')).not.toBeNull()
    expect(screen.getByText('Configurações')).not.toBeNull()

    // Fecha pelo botão de fechar (X)
    const botaoFechar = screen.getByRole('button', { name: /Fechar/i })
    fireEvent.click(botaoFechar)

    expect(screen.queryByRole('dialog', { name: /Menu Mais Opções/i })).toBeNull()
  })

  it('fecha o flyout Mais Opções com a tecla Escape', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Layout />
      </MemoryRouter>,
    )

    const botaoMaisOpcoes = screen.getByRole('button', { name: /Mais Opções/i })
    fireEvent.click(botaoMaisOpcoes)
    expect(screen.getByRole('dialog', { name: /Menu Mais Opções/i })).not.toBeNull()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: /Menu Mais Opções/i })).toBeNull()
  })
})
