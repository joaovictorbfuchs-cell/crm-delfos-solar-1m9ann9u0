import { describe, it, expect, beforeEach, vi } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
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
