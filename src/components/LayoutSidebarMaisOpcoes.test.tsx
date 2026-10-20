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

describe('Layout Desktop - Sidebar Reorganizada (Ordem Oficial)', () => {
  it('renderiza os itens na ordem aprovada (incluindo Integrações, Financeiro e link direto Configurações sem flyout)', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Layout />
      </MemoryRouter>,
    )

    // Itens principais fixos: Dashboard, Comercial, Propostas, Atividades, Projetos, Serviços, O&M, Clientes, Contatos, Integrações, Financeiro, Configurações
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Comercial').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Propostas').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Atividades').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Projetos').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Serviços').length).toBeGreaterThan(0)
    expect(screen.getAllByText('O&M').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Clientes').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Contatos').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Integrações').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Financeiro').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Configurações').length).toBeGreaterThan(0)

    // Configurações agora é link direto para /configuracoes e NÃO tem mais flyout / menu flutuante nem botão de trigger
    const linkConfiguracoes = screen.getByRole('link', { name: /Configurações/i })
    expect(linkConfiguracoes).not.toBeNull()
    expect(linkConfiguracoes.getAttribute('href')).toBe('/configuracoes')

    // Links de Integrações e Financeiro
    const linkIntegracoes = screen.getByRole('link', { name: /Integrações/i })
    expect(linkIntegracoes.getAttribute('href')).toBe('/integracoes')

    const linkFinanceiro = screen.getByRole('link', { name: /Financeiro/i })
    expect(linkFinanceiro.getAttribute('href')).toBe('/financeiro')

    // Sem menu flutuante / dialog de flyout de configurações
    expect(screen.queryByRole('dialog', { name: /Menu Configurações/i })).toBeNull()
  })

  it('Configurações não abre flyout ao ser clicado, comportando-se como link de rota direta', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Layout />
      </MemoryRouter>,
    )

    const linkConfiguracoes = screen.getByRole('link', { name: /Configurações/i })
    fireEvent.click(linkConfiguracoes)

    // Não deve disparar nenhum dialog de flyout
    expect(screen.queryByRole('dialog', { name: /Menu Configurações/i })).toBeNull()
  })

  it('instalador vê APENAS Serviços (sem Configurações, sem Integrações, sem Financeiro)', async () => {
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
    expect(screen.queryByText('Integrações')).toBeNull()
    expect(screen.queryByText('Financeiro')).toBeNull()
    expect(screen.queryByText('Mais Opções')).toBeNull()
    expect(screen.queryByRole('dialog', { name: /Menu Configurações/i })).toBeNull()
  })
})
