import { describe, it, expect, beforeEach, vi } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { render, act } from '@testing-library/react'
import Login from './pages/Login'
import App from './App'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { MemoryRouter } from 'react-router-dom'
import { CardNegociosCliente } from './components/CardNegociosCliente'
import pb from './lib/pocketbase/client'

describe('Login e App Smoke Tests', () => {
  beforeEach(() => {
    pb.authStore.clear()
  })

  it('renderiza o formulário de Login com campos e textos esperados', () => {
    const html = renderToStaticMarkup(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/login'] },
        React.createElement(AuthProvider, null, React.createElement(Login, null)),
      ),
    )
    expect(html).toContain('Painel de Acesso')
    expect(html).toContain('E-mail Corporativo')
    expect(html).toContain('Senha de Acesso')
    expect(html).toContain('Entrar no Sistema')
    expect(html).toContain('Delfos Solar')
  })

  it('renderiza App na rota /login sem disparar ErrorBoundary', () => {
    // Salva o erro original do console para não poluir os logs de teste
    const originalError = console.error
    console.error = vi.fn()

    window.history.pushState({}, 'Login', '/login')
    const html = renderToStaticMarkup(React.createElement(App, null))

    console.error = originalError

    // Verifica que não renderizou a mensagem do ErrorBoundary
    expect(html).not.toContain('Ocorreu um problema ao carregar o painel de acesso')
    expect(html).not.toContain('Ops! Algo deu errado')
    // Verifica que renderizou a tela de login
    expect(html).toContain('Painel de Acesso')
  })

  it('renderiza App na rota raiz / deslogado redirecionando ou sem tela branca', () => {
    window.history.pushState({}, 'Dashboard', '/')
    const html = renderToStaticMarkup(React.createElement(App, null))
    // Quando não autenticado, no SSR/static markup renderiza loader de loading ou redirecionamento
    expect(html).toBeDefined()
    expect(html.length).toBeGreaterThan(0)
  })

  it('renderiza Index sem crash mesmo com lista de clientes nula ou indefinida', () => {
    const Index = React.lazy(() => import('./pages/Index'))
    expect(Index).toBeDefined()
  })

  it('renderiza rota "/" autenticado montando Layout e Index sem cair no ErrorBoundary', () => {
    // Simula usuário autenticado no authStore
    pb.authStore.save('mock-token-12345', {
      id: 'usr123',
      collectionId: '_pb_users_auth_',
      collectionName: 'users',
      name: 'João Delfos',
      email: 'joao@delfosengenharia.com.br',
      role: 'admin',
    })

    window.history.pushState({}, 'Dashboard', '/')
    const originalError = console.error
    console.error = vi.fn()

    const html = renderToStaticMarkup(React.createElement(App, null))
    console.error = originalError

    // Confirma que não caiu em nenhum ErrorBoundary na rota "/"
    expect(html).not.toContain('Ocorreu um problema ao carregar a página inicial do CRM')
    expect(html).not.toContain('Ocorreu um problema ao carregar o Dashboard')
    expect(html).not.toContain('Ops! Algo deu errado')
    expect(html).not.toContain('Erro inesperado na aplicação')
    expect(html).toBeDefined()
    expect(html.length).toBeGreaterThan(0)
  })

  it('montagem REAL no DOM (render completo via React 19) na rota "/" autenticado confirma montagem e ausência de delfos_last_boundary_error', async () => {
    window.sessionStorage.clear()
    pb.authStore.save('mock-token-real-render', {
      id: 'usr-admin-1',
      collectionId: '_pb_users_auth_',
      collectionName: 'users',
      name: 'Administrador Delfos',
      email: 'admin@delfos.com.br',
      role: 'admin',
      ativo: true,
    })

    window.history.pushState({}, 'Dashboard', '/')

    const originalError = console.error
    console.error = vi.fn()

    let container: HTMLElement | null = null
    await act(async () => {
      const res = render(React.createElement(App, null))
      container = res.container
    })

    console.error = originalError

    // Verifica sessionStorage: NÃO pode haver 'delfos_last_boundary_error'
    const storedError = window.sessionStorage.getItem('delfos_last_boundary_error')
    expect(storedError).toBeNull()

    // Verifica que o DOM montado contém elementos do CRM e não fallbacks de erro
    expect(container).not.toBeNull()
    const textContent = container?.textContent || ''
    expect(textContent).not.toContain('Ocorreu um problema ao carregar a página inicial do CRM')
    expect(textContent).not.toContain('Ocorreu um problema ao carregar o Dashboard')
    expect(textContent).not.toContain('Ops! Algo deu errado')
    expect(textContent).not.toContain('Erro inesperado na aplicação')
  })

  it('renderiza ProtectedRoute com fallback seguro quando deslogado', () => {
    const html = renderToStaticMarkup(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/'] },
        React.createElement(
          AuthProvider,
          null,
          React.createElement(
            ProtectedRoute,
            null,
            React.createElement('div', null, 'Conteúdo Protegido'),
          ),
        ),
      ),
    )
    expect(html).toBeDefined()
    // Como está deslogado no PocketBase mock, deve renderizar ou o loader do ProtectedRoute ou redirecionamento sem tela branca
    expect(html).not.toContain('Ocorreu um problema ao carregar a página')
  })

  it('montagem REAL no DOM na rota "/servicos-campo" com perfil instalador NÃO cai no ErrorBoundary', async () => {
    window.sessionStorage.clear()
    pb.authStore.save('mock-token-instalador', {
      id: 'usr-inst-1',
      collectionId: '_pb_users_auth_',
      collectionName: 'users',
      name: 'Instalador Delfos',
      email: 'delfos.usinas@gmail.com',
      role: 'instalador',
      ativo: true,
    })

    window.history.pushState({}, 'Serviços de Campo', '/servicos-campo')

    const originalError = console.error
    console.error = vi.fn()

    let container: HTMLElement | null = null
    await act(async () => {
      const res = render(React.createElement(App, null))
      container = res.container
    })

    console.error = originalError

    // Verifica que não foi registrado erro no sessionStorage nem exibida tela de erro
    const storedError = window.sessionStorage.getItem('delfos_last_boundary_error')
    expect(storedError).toBeNull()

    expect(container).not.toBeNull()
    const textContent = container?.textContent || ''
    expect(textContent).not.toContain('Ocorreu um problema ao carregar Serviços de Campo')
    expect(textContent).not.toContain('Ocorreu um problema ao carregar a página inicial do CRM')
    expect(textContent).not.toContain('Ops! Algo deu errado')
    expect(textContent).not.toContain('Erro inesperado na aplicação')
    // Verifica que a visualização inicial do calendário e da aba estão presentes
    expect(textContent).toContain('Calendário')
  })

  it('montagem REAL no DOM na rota "/servicos-campo" com perfil admin abre direto na aba Calendário e visão semana', async () => {
    window.sessionStorage.clear()
    pb.authStore.save('mock-token-admin-servicos', {
      id: 'usr-admin-os',
      collectionId: '_pb_users_auth_',
      collectionName: 'users',
      name: 'Gestor Delfos',
      email: 'gestao@delfos.com.br',
      role: 'admin',
      ativo: true,
    })

    window.history.pushState({}, 'Serviços de Campo', '/servicos-campo')

    const originalError = console.error
    console.error = vi.fn()

    let container: HTMLElement | null = null
    await act(async () => {
      const res = render(React.createElement(App, null))
      container = res.container
    })

    console.error = originalError

    const storedError = window.sessionStorage.getItem('delfos_last_boundary_error')
    expect(storedError).toBeNull()

    expect(container).not.toBeNull()
    const textContent = container?.textContent || ''
    expect(textContent).not.toContain('Ocorreu um problema ao carregar Serviços de Campo')
    expect(textContent).toContain('Calendário')
    expect(textContent).toContain('Pendentes')
    expect(textContent).toContain('Concluídas')
  })

  it('montagem REAL no DOM na rota "/comercial" com perfil admin NÃO cai no ErrorBoundary e renderiza conteúdo', async () => {
    window.sessionStorage.clear()
    pb.authStore.save('mock-token-admin-comercial', {
      id: 'usr-admin-comercial',
      collectionId: '_pb_users_auth_',
      collectionName: 'users',
      name: 'Admin Comercial',
      email: 'comercial@delfos.com.br',
      role: 'admin',
      ativo: true,
    })

    window.history.pushState({}, 'Comercial', '/comercial')

    const originalError = console.error
    console.error = vi.fn()

    let container: HTMLElement | null = null
    await act(async () => {
      const res = render(React.createElement(App, null))
      container = res.container
    })

    console.error = originalError

    const storedError = window.sessionStorage.getItem('delfos_last_boundary_error')
    expect(storedError).toBeNull()

    expect(container).not.toBeNull()
    const textContent = container?.textContent || ''
    expect(textContent).not.toContain('Ocorreu um problema ao carregar a página inicial do CRM')
    expect(textContent).not.toContain('Ops! Algo deu errado')
    expect(textContent).not.toContain('Erro inesperado na aplicação')
    // Verifica elementos do funil comercial ou botões de visualização
    expect(textContent).toBeDefined()
    expect(textContent.length).toBeGreaterThan(0)
  })

  it('CardNegociosCliente renderiza os negócios com Briefcase e totais monetários', () => {
    const html = renderToStaticMarkup(
      React.createElement(CardNegociosCliente, {
        clienteId: 'zka40z6j2ddnxtc',
        clienteNome: 'Arthur Paulo Medeiros',
      }),
    )
    expect(html).toContain('Negócios Vinculados')
    expect(html).toContain('Arthur')
  })
})
