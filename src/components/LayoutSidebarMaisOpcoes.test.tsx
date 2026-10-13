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
  it('renderiza os itens principais fixos na sidebar desktop e NÃO renderiza botão Mais Opções', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Layout />
      </MemoryRouter>,
    )

    // Itens principais fixos (incluindo Configurações na sequência principal)
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Comercial').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Propostas').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Atividades').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Projetos').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Serviços').length).toBeGreaterThan(0)
    expect(screen.getAllByText('O&M').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Clientes').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Contatos').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Configurações').length).toBeGreaterThan(0)

    // Botão de três pontinhos / Mais Opções removido completamente
    expect(screen.queryByText('Mais Opções')).toBeNull()
    expect(screen.queryByRole('button', { name: /Mais Opções/i })).toBeNull()
  })

  it('ao clicar em Configurações abre menu flutuante ao lado com as 8 opções exatas', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Layout />
      </MemoryRouter>,
    )

    const botaoConfiguracoes = screen.getByRole('button', { name: /Configurações/i })
    expect(botaoConfiguracoes).not.toBeNull()

    // Inicialmente o popover não deve estar aberto
    expect(screen.queryByRole('dialog', { name: /Menu Configurações/i })).toBeNull()

    // Clica para abrir o flyout
    fireEvent.click(botaoConfiguracoes)

    // O flyout abre
    const dialog = screen.getByRole('dialog', { name: /Menu Configurações/i })
    expect(dialog).not.toBeNull()

    // Verifica exatamente as 8 opções do flyout
    expect(screen.getByText('Automações')).not.toBeNull()
    expect(screen.getByText('Cadastro de equipamentos')).not.toBeNull()
    expect(screen.getByText('Ativos das usinas')).not.toBeNull()
    expect(screen.getByText('Galeria de usinas')).not.toBeNull()
    expect(screen.getByText('Fornecedores')).not.toBeNull()
    expect(screen.getByText('Importar Clientes')).not.toBeNull()
    expect(screen.getByText('Gerenciar usuários')).not.toBeNull()
    expect(screen.getByText('Base de Conhecimento')).not.toBeNull()

    // Fecha pelo botão de fechar (X)
    const botaoFechar = screen.getByRole('button', { name: /Fechar/i })
    fireEvent.click(botaoFechar)

    expect(screen.queryByRole('dialog', { name: /Menu Configurações/i })).toBeNull()
  })

  it('fecha o flyout Configurações com a tecla Escape', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Layout />
      </MemoryRouter>,
    )

    const botaoConfiguracoes = screen.getByRole('button', { name: /Configurações/i })
    fireEvent.click(botaoConfiguracoes)
    expect(screen.getByRole('dialog', { name: /Menu Configurações/i })).not.toBeNull()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: /Menu Configurações/i })).toBeNull()
  })

  it('instalador vê APENAS Serviços (sem Configurações, sem flyout e sem três pontinhos)', async () => {
    // Sobrescrever mock para perfil instalador
    const authModule = vi.spyOn(await import('@/contexts/AuthContext'), 'useAuth')
    authModule.mockReturnValue({
      user: { id: 'usr-inst', name: 'Instalador Teste', email: 'instalador@delfos.eng.br' },
      userProfile: { name: 'Instalador Teste', role: 'instalador' },
      isAdmin: false,
      isInstalador: true,
      logout: vi.fn(),
    } as any)

    render(
      <MemoryRouter initialEntries={['/servicos-campo']}>
        <Layout />
      </MemoryRouter>,
    )

    // Instalador vê apenas Serviços
    expect(screen.getAllByText('Serviços').length).toBeGreaterThan(0)
    expect(screen.queryByText('Configurações')).toBeNull()
    expect(screen.queryByText('Mais Opções')).toBeNull()
    expect(screen.queryByRole('button', { name: /Configurações/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /Mais Opções/i })).toBeNull()
    expect(screen.queryByRole('dialog', { name: /Menu Configurações/i })).toBeNull()
  })
})
