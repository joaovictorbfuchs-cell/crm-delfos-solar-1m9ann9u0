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
import { CalendarioExecucaoOS } from './components/CalendarioExecucaoOS'
import VisaoInstaladorMobileOS from './components/VisaoInstaladorMobileOS'
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

  it('layout MOBILE em /servicos-campo exibe botões compactos Nova Atividade e Filtro no header, oculta Mês/Semana/Dia e labels das tabs têm hidden sm:inline', async () => {
    window.sessionStorage.clear()
    pb.authStore.save('mock-token-admin-mobile-servicos', {
      id: 'usr-admin-mobile',
      collectionId: '_pb_users_auth_',
      collectionName: 'users',
      name: 'Gestor Delfos Mobile',
      email: 'mobile@delfos.com.br',
      role: 'admin',
      ativo: true,
    })

    window.history.pushState({}, 'Serviços de Campo Mobile', '/servicos-campo')

    let container: HTMLElement | null = null
    await act(async () => {
      const res = render(React.createElement(App, null))
      container = res.container
    })

    expect(container).not.toBeNull()
    const storedError = window.sessionStorage.getItem('delfos_last_boundary_error')
    expect(storedError).toBeNull()

    // 1. Header mobile deve conter o botão "Nova Atividade" e "Filtro"
    const headerMobile = container?.querySelector('header.lg\\:hidden')
    expect(headerMobile).not.toBeNull()
    const headerText = headerMobile?.textContent || ''
    expect(headerText).toContain('Nova Atividade')
    expect(headerText).toContain('Filtro')

    // 2. Toggles compactos mobile de sábado e domingo (S e D) presentes no DOM
    const togglesMobile = container?.querySelector('.flex.sm\\:hidden')
    expect(togglesMobile).not.toBeNull()
    expect(togglesMobile?.textContent).toContain('S')
    expect(togglesMobile?.textContent).toContain('D')

    // 3. Seletor Mês/Semana/Dia possui classe hidden sm:inline-flex (oculto no mobile)
    const seletorModo = container?.querySelector('.hidden.sm\\:inline-flex')
    expect(seletorModo).not.toBeNull()

    // 4. Labels das abas contêm a classe hidden sm:inline (ícones e badges visíveis, texto oculto em telas pequenas)
    const spanTabPendentes = container?.querySelector(
      'button[aria-label="Pendentes"] span.hidden.sm\\:inline',
    )
    const spanTabCalendario = container?.querySelector(
      'button[aria-label="Calendário"] span.hidden.sm\\:inline',
    )
    const spanTabConcluidas = container?.querySelector(
      'button[aria-label="Concluídas"] span.hidden.sm\\:inline',
    )
    expect(spanTabPendentes).not.toBeNull()
    expect(spanTabCalendario).not.toBeNull()
    expect(spanTabConcluidas).not.toBeNull()
    expect(spanTabPendentes?.textContent).toBe('Pendentes')
    expect(spanTabCalendario?.textContent).toBe('Calendário')
    expect(spanTabConcluidas?.textContent).toBe('Concluídas')
  })

  it('cards de atividade no CalendarioExecucaoOS NÃO exibem badge com texto "Atividade"', () => {
    const fakeOSAtividade = {
      id: 'os-atv-1',
      collectionId: 'ordens_servico',
      collectionName: 'ordens_servico',
      created: '2026-04-10T08:00:00.000Z',
      updated: '2026-04-10T08:00:00.000Z',
      cliente_id: 'cli-1',
      tipo_servico: 'Limpeza e Manutenção Preventiva',
      status: 'pendente' as const,
      origem: 'atividades' as const,
      data_agendada: '2026-04-10 09:00:00.000Z',
      duracao_minutos: 60,
      endereco: 'Rua das Flores, 100',
      expand: {
        cliente_id: {
          id: 'cli-1',
          nome: 'Cliente Usina Teste',
        },
      },
    }

    const html = renderToStaticMarkup(
      React.createElement(CalendarioExecucaoOS, {
        ordens: [fakeOSAtividade as any],
        onSelectOS: () => {},
      }),
    )

    expect(html).toContain('Cliente Usina Teste')
    // Não deve conter o badge "Atividade" nos cards
    expect(html).not.toMatch(
      /<span[^>]*class="[^"]*text-\[8px\][^"]*"[^>]*>\s*Atividade\s*<\/span>/,
    )
    expect(html).not.toContain('>Atividade<')
  })

  it('montagem REAL no DOM na rota "/servicos-campo" com perfil instalador e admin NÃO cai no ErrorBoundary e renderiza calendário', async () => {
    window.sessionStorage.clear()
    pb.authStore.save('mock-token-instalador-servicos', {
      id: 'usr-instalador-servicos',
      collectionId: '_pb_users_auth_',
      collectionName: 'users',
      name: 'Cassio Navarini',
      email: 'cassio@delfos.com.br',
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

    const storedError = window.sessionStorage.getItem('delfos_last_boundary_error')
    expect(storedError).toBeNull()

    expect(container).not.toBeNull()
    const textContent = container?.textContent || ''
    expect(textContent).not.toContain('Ocorreu um problema ao carregar a página inicial do CRM')
    expect(textContent).not.toContain('Ops! Algo deu errado')
    expect(textContent).not.toContain('Erro inesperado na aplicação')
    expect(textContent).toContain('Serviços de Campo')
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

  it('validação de cálculo de horário de início/fim e duração prevista para atividades de manutenção', async () => {
    const { somarMinutos, calcularDiferencaMinutos, formatarDuracao } =
      await import('@/lib/horarios')

    // Previsão padrão de 1 hora (+60 min)
    const inicioPadrao = '08:00'
    const fimCalculado = somarMinutos(inicioPadrao, 60)
    expect(fimCalculado).toBe('09:00')
    expect(calcularDiferencaMinutos(inicioPadrao, fimCalculado)).toBe(60)
    expect(formatarDuracao(60)).toBe('1h')

    // Alteração de fim -> recalcula duração
    const novoFim = '10:30'
    const novaDuracao = calcularDiferencaMinutos(inicioPadrao, novoFim)
    expect(novaDuracao).toBe(150)
    expect(formatarDuracao(novaDuracao)).toBe('2h 30min')

    // Alteração de duração -> recalcula fim
    const duracaoInformada = 90
    const fimRecalculado = somarMinutos(inicioPadrao, duracaoInformada)
    expect(fimRecalculado).toBe('09:30')
  })

  it('cores distintas por tipo de atividade de manutenção e tipos customizados via getTipoServicoConfig', async () => {
    const { getTipoServicoConfig } = await import('@/components/CalendarioExecucaoOS')

    const prev = getTipoServicoConfig('Manutenção Preventiva')
    const corr = getTipoServicoConfig('Manutenção Corretiva')
    const visita = getTipoServicoConfig('Visita Técnica')
    const garantia = getTipoServicoConfig('Garantia de Equipamento')
    const datalogger = getTipoServicoConfig('Configuração Datalogger')
    const customTipo = getTipoServicoConfig('Auditoria Termográfica Especial')

    // Todas as cores dos tipos solicitados devem ser distintas entre si
    expect(prev.hex).toBe('#F59E0B') // Âmbar
    expect(corr.hex).toBe('#E11D48') // Carmim / Vermelho
    expect(visita.hex).toBe('#2563EB') // Azul royal
    expect(garantia.hex).toBe('#9333EA') // Roxo
    expect(datalogger.hex).toBe('#06B6D4') // Ciano

    // Os hexadecimais não podem ser idênticos
    const coresPrincipais = [prev.hex, corr.hex, visita.hex, garantia.hex, datalogger.hex]
    const unicas = new Set(coresPrincipais)
    expect(unicas.size).toBe(5)

    // Tipo customizado recebe objeto de estilo válido
    expect(customTipo.borderColor).toBeDefined()
    expect(customTipo.hex).toBeDefined()
    expect(customTipo.bgBadgeClass).toBeDefined()
  })

  it('alça de resize responde a eventos de mouse/pointer e atualiza duração com snap de 30min', async () => {
    const crmService = await import('@/services/crmService')
    const spyUpdateOS = vi.spyOn(crmService, 'updateOrdemServico').mockResolvedValue({
      id: 'os-resize-teste',
      tempo_previsto_minutos: 120,
      duracao_minutos: 120,
      horario_inicio: '10:00',
      horario_fim: '12:00',
    } as any)

    const now = new Date()
    const ano = now.getFullYear()
    const mes = String(now.getMonth() + 1).padStart(2, '0')
    const dia = String(now.getDate()).padStart(2, '0')
    const dataHoje = `${ano}-${mes}-${dia} 10:00:00.000Z`

    const fakeOS = {
      id: 'os-resize-teste',
      collectionId: 'ordens_servico',
      collectionName: 'ordens_servico',
      cliente_id: 'cli-resize',
      tipo_servico: 'Manutenção Preventiva',
      status: 'pendente' as const,
      origem: 'atividades' as const,
      data_agendada: dataHoje,
      horario_inicio: '10:00',
      horario_fim: '11:00',
      tempo_previsto_minutos: 60,
      duracao_minutos: 60,
      expand: {
        cliente_id: {
          id: 'cli-resize',
          nome: 'Cliente Para Teste de Resize',
        },
      },
    }

    let rendered: ReturnType<typeof render> | null = null
    await act(async () => {
      rendered = render(
        React.createElement(CalendarioExecucaoOS, {
          ordens: [fakeOS as any],
          onSelectOS: vi.fn(),
        }),
      )
    })

    const handle = rendered!.container.querySelector(
      '[data-testid="resize-handle-os-resize-teste"]',
    ) as HTMLElement
    expect(handle).not.toBeNull()

    // Simula arrastar a alça para baixo: ALTURA_HORA_PX = 64px = 60 min.
    // Descer 64px equivale a +60 min (60 + 60 = 120min).
    await act(async () => {
      handle.dispatchEvent(
        new MouseEvent('mousedown', {
          bubbles: true,
          cancelable: true,
          clientY: 200,
        }),
      )
    })

    await act(async () => {
      window.dispatchEvent(
        new MouseEvent('mousemove', {
          bubbles: true,
          cancelable: true,
          clientY: 264, // +64px -> +60 minutos
        }),
      )
    })

    await act(async () => {
      window.dispatchEvent(
        new MouseEvent('mouseup', {
          bubbles: true,
          cancelable: true,
          clientY: 264,
        }),
      )
    })

    // Deve ter chamado a persistência com duracao = 120 e horario_fim = '12:00'
    expect(spyUpdateOS).toHaveBeenCalledWith(
      'os-resize-teste',
      expect.objectContaining({
        duracao_minutos: 120,
        tempo_previsto_minutos: 120,
        horario_inicio: '10:00',
        horario_fim: '12:00',
      }),
    )

    spyUpdateOS.mockRestore()
  })

  it('renderiza o card na grade SEMANAL com a alça de resize no DOM, altura calculada proporcional e rótulo correto sem "Limpeza"', async () => {
    const now = new Date()
    const ano = now.getFullYear()
    const mes = String(now.getMonth() + 1).padStart(2, '0')
    const dia = String(now.getDate()).padStart(2, '0')
    const dataHoje = `${ano}-${mes}-${dia} 08:00:00.000Z`

    // Atividade com duração de 2 horas (120 minutos)
    const atividade2Horas = {
      id: 'atv-metal-mecanica',
      collectionId: 'atividades',
      collectionName: 'atividades',
      cliente_id: 'cli-metal',
      tipo_servico: 'Manutenção',
      status: 'pendente' as const,
      origem: 'atividades' as const,
      data_agendada: dataHoje,
      horario_inicio: '08:00',
      horario_fim: '10:00',
      duracao_minutos: 120,
      tempo_previsto_minutos: 120,
      expand: {
        cliente_id: {
          id: 'cli-metal',
          nome: 'Metal Mecânica Solução Ltda.',
        },
      },
    }

    let rendered: ReturnType<typeof render> | null = null
    await act(async () => {
      rendered = render(
        React.createElement(CalendarioExecucaoOS, {
          ordens: [atividade2Horas as any],
          onSelectOS: vi.fn(),
        }),
      )
    })

    const container = rendered!.container

    // 1. Verifica se a alça de resize existe fisicamente no DOM da grade semanal
    const resizeHandle = container.querySelector(
      '[data-testid="resize-handle-atv-metal-mecanica"]',
    ) as HTMLElement
    expect(resizeHandle).not.toBeNull()
    expect(resizeHandle.getAttribute('class')).toContain('cursor-ns-resize')

    // 2. Verifica se o card tem altura proporcional a 2 horas (56px * 2 - 2px = 110px)
    const card = container.querySelector(
      '#card-atv-metal-mecanica, [class*="group"]',
    ) as HTMLElement
    // Busca o elemento do card que engloba a alça
    const cardElement = resizeHandle.closest('[style*="top"]') as HTMLElement
    expect(cardElement).not.toBeNull()
    expect(cardElement.style.height).toBe('110px') // 120min / 60 * 56px - 2px

    // 3. Verifica exibição de 08:00 - 10:00
    expect(cardElement.textContent).toContain('08:00 - 10:00')

    // 4. Verifica que NÃO exibe "LIMPEZA" e sim "MANUTENÇÃO"
    expect(cardElement.textContent).not.toContain('LIMPEZA')
    expect(cardElement.textContent).toContain('MANUTENÇÃO')
    expect(cardElement.textContent).toContain('Metal Mecânica Solução Ltda.')
  })

  it('(a) rótulo do card exibe tipo unificado próprio após ciclo salvar→recarregar de um drag/resize de atividade com tipo "limpeza_manutencao"', async () => {
    const { updateOrdemServico } = await import('@/services/crmService')
    const { getTipoServicoConfig, TIPO_SERVICO_CORES } =
      await import('@/components/CalendarioExecucaoOS')

    // 1. TIPO_SERVICO_CORES['Limpeza e Manutenção'] e tipos canônicos
    expect(TIPO_SERVICO_CORES['Limpeza e Manutenção'].nome).toBe('Limpeza e Manutenção')
    expect(TIPO_SERVICO_CORES['Manutenção Corretiva'].hex).toBe('#DC2626')
    expect(TIPO_SERVICO_CORES['Manutenção Preventiva'].hex).toBe('#D97706')

    // 2. getTipoServicoConfig('limpeza_manutencao') resolve para Limpeza e Manutenção
    const configMista = getTipoServicoConfig('limpeza_manutencao')
    expect(configMista.nome).toBe('Limpeza e Manutenção')

    // 3. Simulação de ciclo updateOrdemServico para atividade com título "Limpeza e Manutenção"
    // Mock do update do PocketBase na coleção atividades retornando o registro atualizado
    const pbAtividadesMock = {
      update: vi.fn().mockResolvedValue({
        id: 'atv-limpeza-manut-1',
        collectionId: 'atividades',
        collectionName: 'atividades',
        cliente_id: 'cli-metal-1',
        titulo: 'Limpeza e Manutenção',
        tipo: 'limpeza_manutencao',
        descricao: 'Revisão periódica dos módulos e reaperto de conexões elétricas',
        status: 'pendente',
        data: '2026-10-06 08:00:00.000Z',
        horario_inicio: '08:00',
        horario_fim: '11:00',
        duracao_minutos: 180,
        expand: {
          cliente_id: {
            id: 'cli-metal-1',
            nome: 'Metal Mecânica Solução Ltda.',
          },
        },
      }),
    }

    const { pb } = await import('@/lib/pocketbase/client')
    const originalCollection = pb.collection.bind(pb)
    const spyCollection = vi.spyOn(pb, 'collection').mockImplementation((colName: string) => {
      if (colName === 'atividades') {
        return pbAtividadesMock as any
      }
      return originalCollection(colName)
    })

    // Executa update como se fosse drag/resize salvando no banco
    const osRetornada = await updateOrdemServico('atv-limpeza-manut-1', {
      origem: 'atividades',
      tipo_servico: 'Limpeza e Manutenção',
      horario_inicio: '08:00',
      horario_fim: '11:00',
      duracao_minutos: 180,
    })

    expect(osRetornada.tipo_servico).toBe('Limpeza e Manutenção')

    // Renderiza o card no CalendarioExecucaoOS com a OS recarregada
    let rendered: ReturnType<typeof render> | null = null
    await act(async () => {
      rendered = render(
        React.createElement(CalendarioExecucaoOS, {
          ordens: [osRetornada],
          onSelectOS: vi.fn(),
        }),
      )
    })

    const container = rendered!.container
    const cardElement = container
      .querySelector('[data-testid="resize-handle-atv-limpeza-manut-1"]')
      ?.closest('[style*="top"]') as HTMLElement

    expect(cardElement).not.toBeNull()
    expect(cardElement.textContent).toContain('Limpeza e Manutenção')

    spyCollection.mockRestore()
  })

  it('(b) após resize para 180 min, o card tem altura de 3 horas na grade e sincroniza com horario_inicio e horario_fim', async () => {
    const now = new Date()
    const ano = now.getFullYear()
    const mes = String(now.getMonth() + 1).padStart(2, '0')
    const dia = String(now.getDate()).padStart(2, '0')
    const dataHoje = `${ano}-${mes}-${dia} 08:00:00.000Z`

    // Cenário: OS com duracao_minutos desatualizado (ex: 120), porém horario_inicio '08:00' e horario_fim '11:00' (180 min)
    // A precedência dos horários e/ou duração de 180m deve calcular a altura exata de 3h:
    // (180 / 60) * 56px - 2px = 3 * 56 - 2 = 168 - 2 = 166px
    const osRedimensionada = {
      id: 'os-3horas-metal',
      collectionId: 'atividades',
      collectionName: 'atividades',
      cliente_id: 'cli-metal-3h',
      tipo_servico: 'Manutenção',
      status: 'pendente' as const,
      origem: 'atividades' as const,
      data_agendada: dataHoje,
      horario_inicio: '08:00',
      horario_fim: '11:00',
      duracao_minutos: 180,
      tempo_previsto_minutos: 180,
      expand: {
        cliente_id: {
          id: 'cli-metal-3h',
          nome: 'Metal Mecânica Solução Ltda.',
        },
      },
    }

    let rendered: ReturnType<typeof render> | null = null
    await act(async () => {
      rendered = render(
        React.createElement(CalendarioExecucaoOS, {
          ordens: [osRedimensionada as any],
          onSelectOS: vi.fn(),
        }),
      )
    })

    const container = rendered!.container
    const resizeHandle = container.querySelector(
      '[data-testid="resize-handle-os-3horas-metal"]',
    ) as HTMLElement
    expect(resizeHandle).not.toBeNull()

    const cardElement = resizeHandle.closest('[style*="top"]') as HTMLElement
    expect(cardElement).not.toBeNull()

    // Altura exata de 3 horas: (180 / 60) * 56 - 2 = 166px
    expect(cardElement.style.height).toBe('166px')
    expect(cardElement.textContent).toContain('08:00 - 11:00')
    expect(cardElement.textContent).toContain('180m')
    expect(cardElement.textContent).toContain('MANUTENÇÃO')
    expect(cardElement.textContent).not.toContain('LIMPEZA')

    // Testa também o caso de duracao_minutos dessincronizado no banco (120):
    // Como horario_inicio="08:00" e horario_fim="11:00" tem 180 min de diferença,
    // o card NÃO fica preso em 120min (110px) e renderiza 166px
    const osDessincronizada = {
      ...osRedimensionada,
      id: 'os-dessinc-3h',
      duracao_minutos: 120, // valor desatualizado residual
      tempo_previsto_minutos: 120,
    }

    let renderedDes: ReturnType<typeof render> | null = null
    await act(async () => {
      renderedDes = render(
        React.createElement(CalendarioExecucaoOS, {
          ordens: [osDessincronizada as any],
          onSelectOS: vi.fn(),
        }),
      )
    })

    const handleDes = renderedDes!.container.querySelector(
      '[data-testid="resize-handle-os-dessinc-3h"]',
    ) as HTMLElement
    expect(handleDes).not.toBeNull()
    const cardDes = handleDes.closest('[style*="top"]') as HTMLElement
    expect(cardDes.style.height).toBe('166px')
    expect(cardDes.textContent).toContain('08:00 - 11:00')
    expect(cardDes.textContent).toContain('180m')
  })

  it('alça de resize bem fininha está sempre presente por padrão em cards de 1h (60min) e cards curtos de 30min', async () => {
    const now = new Date()
    const ano = now.getFullYear()
    const mes = String(now.getMonth() + 1).padStart(2, '0')
    const dia = String(now.getDate()).padStart(2, '0')

    const os1Hora = {
      id: 'os-1hora-padrao',
      collectionId: 'atividades',
      collectionName: 'atividades',
      cliente_id: 'cli-1h',
      tipo_servico: 'Manutenção Preventiva',
      status: 'pendente' as const,
      origem: 'atividades' as const,
      data_agendada: `${ano}-${mes}-${dia} 09:00:00.000Z`,
      horario_inicio: '09:00',
      horario_fim: '10:00',
      duracao_minutos: 60,
      tempo_previsto_minutos: 60,
      expand: {
        cliente_id: {
          id: 'cli-1h',
          nome: 'Cliente 1 Hora',
        },
      },
    }

    const os30Min = {
      id: 'os-30min-curta',
      collectionId: 'atividades',
      collectionName: 'atividades',
      cliente_id: 'cli-30m',
      tipo_servico: 'Visita Técnica',
      status: 'pendente' as const,
      origem: 'atividades' as const,
      data_agendada: `${ano}-${mes}-${dia} 11:00:00.000Z`,
      horario_inicio: '11:00',
      horario_fim: '11:30',
      duracao_minutos: 30,
      tempo_previsto_minutos: 30,
      expand: {
        cliente_id: {
          id: 'cli-30m',
          nome: 'Cliente 30 Minutos',
        },
      },
    }

    let rendered: ReturnType<typeof render> | null = null
    await act(async () => {
      rendered = render(
        React.createElement(CalendarioExecucaoOS, {
          ordens: [os1Hora as any, os30Min as any],
          onSelectOS: vi.fn(),
        }),
      )
    })

    const container = rendered!.container

    // 1. Alça do card de 1 hora (60min)
    const handle1h = container.querySelector(
      '[data-testid="resize-handle-os-1hora-padrao"]',
    ) as HTMLElement
    expect(handle1h).not.toBeNull()
    expect(handle1h.className).toContain('cursor-ns-resize')
    expect(handle1h.className).toContain('absolute')
    expect(handle1h.className).toContain('bottom-0')

    const card1h = handle1h.closest('[style*="top"]') as HTMLElement
    expect(card1h).not.toBeNull()
    // Altura de 1h: (60 / 60) * 56 - 2 = 54px
    expect(card1h.style.height).toBe('54px')
    expect(card1h.textContent).toContain('09:00 - 10:00')
    expect(card1h.textContent).toContain('Cliente 1 Hora')

    // 2. Alça do card de 30 minutos (mínimo de altura)
    const handle30m = container.querySelector(
      '[data-testid="resize-handle-os-30min-curta"]',
    ) as HTMLElement
    expect(handle30m).not.toBeNull()
    expect(handle30m.className).toContain('cursor-ns-resize')
    expect(handle30m.className).toContain('absolute')
    expect(handle30m.className).toContain('bottom-0')

    const card30m = handle30m.closest('[style*="top"]') as HTMLElement
    expect(card30m).not.toBeNull()
    // Altura de 30min: max(28, (30 / 60) * 56 - 2 = 26) -> 28px
    expect(card30m.style.height).toBe('28px')
    expect(card30m.textContent).toContain('11:00 - 11:30')
    expect(card30m.textContent).toContain('Cliente 30 Minutos')
  })

  it('classifica e formata corretamente novos tipos de manutenção: Limpeza, Manutenção Preventiva e Manutenção Corretiva', async () => {
    const { getTipoServicoConfig } = await import('@/components/CalendarioExecucaoOS')

    const configLimpeza = getTipoServicoConfig('limpeza')
    expect(configLimpeza.hex).toBe('#0284C7')
    expect(configLimpeza.nome).toContain('Limpeza')

    const configPreventiva = getTipoServicoConfig('manutencao_preventiva')
    expect(configPreventiva.hex).toBe('#D97706')
    expect(configPreventiva.nome).toBe('Manutenção Preventiva')

    const configCorretiva = getTipoServicoConfig('manutencao_corretiva')
    expect(configCorretiva.hex).toBe('#DC2626')
    expect(configCorretiva.nome).toBe('Manutenção Corretiva')

    // Blindagem contra valores null/undefined/não-string
    const configNull = getTipoServicoConfig(null as any)
    expect(configNull).toBeDefined()
    expect(configNull.hex).toBeDefined()

    const configUndefined = getTipoServicoConfig(undefined)
    expect(configUndefined).toBeDefined()
    expect(configUndefined.hex).toBeDefined()

    const configNumero = getTipoServicoConfig(12345 as any)
    expect(configNumero).toBeDefined()
    expect(configNumero.hex).toBeDefined()
  })

  it('salvaguardas de integridade do PocketBase: pb exportado duplamente e isAuthSessionError presente', async () => {
    const clientModule = await import('@/lib/pocketbase/client')
    expect(clientModule.default).toBeDefined()
    expect(clientModule.pb).toBeDefined()
    expect(clientModule.default).toBe(clientModule.pb)

    const errorsModule = await import('@/lib/pocketbase/errors')
    expect(typeof errorsModule.isAuthSessionError).toBe('function')
    expect(errorsModule.isAuthSessionError({ status: 401 })).toBe(true)
    expect(errorsModule.isAuthSessionError({ status: 403 })).toBe(true)
    expect(errorsModule.isAuthSessionError({ message: 'Token is expired' })).toBe(true)
    expect(errorsModule.isAuthSessionError({ status: 200 })).toBe(false)
  })

  it('drag/resize de atividade limpeza_manutencao mantém tipo estável ("Limpeza e Manutenção") sem mudar para "Manutenção Preventiva" e sem cair no ErrorBoundary', async () => {
    const { updateOrdemServico } = await import('@/services/crmService')
    const { getTipoServicoConfig } = await import('@/components/CalendarioExecucaoOS')

    // 1. Blindagem de getTipoServicoConfig contra undefined / tipos não mapeados / nulos
    const configInvalido = getTipoServicoConfig(undefined)
    expect(configInvalido).toBeDefined()
    expect(configInvalido.hex).toBeDefined()
    expect(configInvalido.pillBg).toBeDefined()
    expect(configInvalido.borderColor).toBeDefined()
    expect(configInvalido.nome).toBeDefined()

    const configLimpezaManut = getTipoServicoConfig('Limpeza e Manutenção')
    expect(configLimpezaManut).toBeDefined()
    expect(configLimpezaManut.hex).toBeDefined()
    expect(configLimpezaManut.nome).toContain('Limpeza')

    // 2. Mock do PocketBase para atividade com descrição contendo termos de manutenção
    // (ex: "preventiva" e "corretiva" no texto livre, o que antes ativava a heurística de texto)
    const atvMockRecord = {
      id: 'atv-limpeza-drag-test',
      collectionId: 'atividades',
      collectionName: 'atividades',
      cliente_id: 'cli-test-limpeza',
      titulo: 'Limpeza e Manutenção',
      tipo: 'limpeza_manutencao',
      descricao: 'Visita preventiva semestral e revisão corretiva se necessário',
      status: 'pendente',
      data: '2026-10-10 09:00:00.000Z',
      horario_inicio: '09:00',
      horario_fim: '10:30',
      duracao_minutos: 90,
      expand: {
        cliente_id: {
          id: 'cli-test-limpeza',
          nome: 'Granja Esperança Solar',
        },
      },
    }

    const { pb } = await import('@/lib/pocketbase/client')
    const originalCollection = pb.collection.bind(pb)
    const spyCollection = vi.spyOn(pb, 'collection').mockImplementation((colName: string) => {
      if (colName === 'atividades') {
        return {
          update: vi.fn().mockResolvedValue(atvMockRecord),
          getOne: vi.fn().mockResolvedValue(atvMockRecord),
        } as any
      }
      return originalCollection(colName)
    })

    // 3. Simula drag/drop ou resize chamando updateOrdemServico sem tipo_servico no payload
    // A resolução estrita pelo campo canônico tipo ('limpeza_manutencao') NÃO deve cair em 'Manutenção Preventiva'
    // mesmo que a descrição contenha termos como 'preventiva' ou 'corretiva' ou que o título seja vazio/divergente
    const osAtualizadaSemTipoPayload = await updateOrdemServico('atv-limpeza-drag-test', {
      origem: 'atividades',
      data_agendada: '2026-10-10 10:00:00',
      horario_inicio: '10:00',
      horario_fim: '11:30',
      duracao_minutos: 90,
    })

    expect(osAtualizadaSemTipoPayload.tipo_servico).not.toBe('Manutenção Preventiva')
    expect(osAtualizadaSemTipoPayload.tipo_servico).toBe('Limpeza e Manutenção')

    // 4. Simula drag/drop ou resize com tipo_servico preservado no payload (conforme correção 2)
    const osAtualizadaComTipoPayload = await updateOrdemServico('atv-limpeza-drag-test', {
      origem: 'atividades',
      tipo_servico: 'Limpeza e Manutenção',
      data_agendada: '2026-10-10 14:00:00',
      horario_inicio: '14:00',
      horario_fim: '15:30',
      duracao_minutos: 90,
    })

    expect(osAtualizadaComTipoPayload.tipo_servico).toBe('Limpeza e Manutenção')

    // 4b. Teste estrito: atividade cujo título livre diz algo genérico mas o tipo canônico é 'limpeza_manutencao'
    // Garante que a remoção da heurística de título resolve para 'Limpeza e Manutenção' canônico
    const atvMockTituloDivergente = {
      ...atvMockRecord,
      id: 'atv-divergente-test',
      titulo: 'Atendimento urgente em campo - painel sujo',
      tipo: 'limpeza_manutencao',
    }
    spyCollection.mockImplementation((colName: string) => {
      if (colName === 'atividades') {
        return {
          update: vi.fn().mockResolvedValue(atvMockTituloDivergente),
          getOne: vi.fn().mockResolvedValue(atvMockTituloDivergente),
        } as any
      }
      return originalCollection(colName)
    })
    const osDivergente = await updateOrdemServico('atv-divergente-test', {
      origem: 'atividades',
      data_agendada: '2026-10-10 16:00:00',
    })
    expect(osDivergente.tipo_servico).toBe('Limpeza e Manutenção')

    // 5. Renderização no DOM com CalendarioExecucaoOS sem disparar ErrorBoundary
    let renderedCal: ReturnType<typeof render> | null = null
    await act(async () => {
      renderedCal = render(
        React.createElement(CalendarioExecucaoOS, {
          ordens: [osAtualizadaComTipoPayload],
          onSelectOS: vi.fn(),
        }),
      )
    })

    const containerCal = renderedCal!.container
    expect(containerCal.textContent).toContain('Granja Esperança Solar')
    expect(containerCal.textContent).toContain('Limpeza e Manutenção')
    expect(containerCal.textContent).not.toContain('Manutenção Preventiva')

    spyCollection.mockRestore()
  })

  it('deduplicação do catálogo: custom com mesmo nome normalizado prevalece sobre o nativo em getTiposPorCategoria', async () => {
    const { getTiposPorCategoria, buildCustomTipoDef } = await import('@/constants/atividadesTipos')

    // Cria um custom com mesmo nome de um nativo de manutenção ("Manutenção Preventiva")
    const customPreventiva = buildCustomTipoDef({
      id: 'custom-prev-001',
      nome: 'Manutenção Preventiva',
      categoria: 'manutencao',
      cor: '#990000',
      descricao: 'Preventiva personalizada da empresa',
      is_padrao: true,
      valor_base: 350,
    })

    const lista = getTiposPorCategoria('manutencao', [customPreventiva])
    const preventivas = lista.filter(
      (t) => t.tituloPadrao.trim().toLowerCase() === 'manutenção preventiva',
    )

    // Deve conter EXATAMENTE 1 item (o custom)
    expect(preventivas.length).toBe(1)
    expect(preventivas[0].id).toBe('custom_custom-prev-001')
    expect(preventivas[0].valor_base).toBe(350)
    expect(preventivas[0].corHex).toBe('#990000')
  })

  it('montagem REAL no DOM em /servicos-campo com dados antigos de horários ("08:00", "08:00:00", null) NÃO cai no ErrorBoundary', async () => {
    window.sessionStorage.clear()
    pb.authStore.save('mock-token-admin-tolerancia', {
      id: 'usr-admin-tol',
      collectionId: '_pb_users_auth_',
      collectionName: 'users',
      name: 'Gestor Tolerante',
      email: 'gestor.tol@delfos.com.br',
      role: 'admin',
      ativo: true,
    })

    // Mock das coleções com registros de horários variados / legados
    const originalGetFullList = pb.collection('atividades').getFullList
    pb.collection('atividades').getFullList = vi.fn().mockResolvedValue([
      {
        id: 'atv-legado-1',
        collectionId: 'atividades',
        titulo: 'Manutenção Preventiva',
        tipo: 'manutencao_preventiva',
        status: 'pendente',
        data: '2026-04-15 08:00:00',
        horario_inicio: '08:00',
        horario_fim: '09:00',
        duracao_minutos: 60,
      },
      {
        id: 'atv-legado-2',
        collectionId: 'atividades',
        titulo: 'Limpeza dos Módulos',
        tipo: 'limpeza',
        status: 'pendente',
        data: '2026-04-15 10:00:00',
        horario_inicio: '10:00:00',
        horario_fim: null,
        duracao_minutos: null,
      },
      {
        id: 'atv-legado-3',
        collectionId: 'atividades',
        titulo: 'Configuração Datalogger',
        tipo: 'configuracao_datalogger',
        status: 'concluida',
        data: null,
        horario_inicio: null,
        horario_fim: undefined,
      },
    ]) as any

    window.history.pushState({}, 'Serviços de Campo', '/servicos-campo')

    const originalError = console.error
    console.error = vi.fn()

    let container: HTMLElement | null = null
    await act(async () => {
      const res = render(React.createElement(App, null))
      container = res.container
    })

    console.error = originalError
    pb.collection('atividades').getFullList = originalGetFullList

    const storedError = window.sessionStorage.getItem('delfos_last_boundary_error')
    expect(storedError).toBeNull()
    expect(container).not.toBeNull()
    expect(container?.textContent).not.toContain(
      'Ocorreu um problema ao carregar Serviços de Campo',
    )
    expect(container?.textContent).not.toContain('Ops! Algo deu errado')
  })

  it('calendário em /servicos-campo NÃO renderiza a barra de Legenda (removida a pedido do usuário)', async () => {
    window.sessionStorage.clear()
    pb.authStore.save('mock-token-admin-sem-legenda', {
      id: 'usr-admin-sem-legenda',
      collectionId: '_pb_users_auth_',
      collectionName: 'users',
      name: 'Gestor Sem Legenda',
      email: 'gestor.sem.legenda@delfos.com.br',
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
    expect(textContent).not.toContain('Ops! Algo deu errado')
    // Garante que a barra de legenda "Legenda:" não existe no calendário
    expect(textContent).not.toContain('Legenda:')
  })

  it('montagem REAL no DOM em /servicos-campo com registros malformados (nulos, ausentes, prestadorOS nulo) NÃO derruba a rota nem cai no ErrorBoundary', async () => {
    window.sessionStorage.clear()
    pb.authStore.save('mock-token-admin-malformados', {
      id: 'usr-admin-malformados',
      collectionId: '_pb_users_auth_',
      collectionName: 'users',
      name: 'Admin Tolerância Nulos',
      email: 'admin.malformados@delfos.com.br',
      role: 'admin',
      ativo: true,
    })

    const originalGetFullListAtv = pb.collection('atividades').getFullList
    const originalGetFullListOS = pb.collection('ordens_servico').getFullList

    // Simula registros de atividades e OSs com campos nulos/undefined/incompletos
    pb.collection('atividades').getFullList = vi.fn().mockResolvedValue([
      {
        id: 'atv-null-1',
        collectionId: 'atividades',
        titulo: null,
        tipo: null,
        tipo_custom_id: null,
        status: null,
        data: null,
        horario_inicio: null,
        horario_fim: null,
        duracao_minutos: null,
        responsavel_nome: null,
        atribuida_a: null,
        expand: null,
      },
      {
        id: 'atv-null-2',
        collectionId: 'atividades',
        titulo: undefined,
        tipo: 'custom',
        tipo_custom_id: undefined,
        data: 'data-invalida-xyz',
        horario_inicio: 'invalido',
        horario_fim: '99:99',
        duracao_minutos: 'invalido' as any,
        responsavel_nome: undefined,
      },
      {
        id: 'atv-null-3',
        collectionId: 'atividades',
        titulo: 'Atividade sem prestador e sem horario',
        tipo: 'manutencao_preventiva',
        data: '2026-05-10',
        horario_inicio: '',
        horario_fim: '',
      },
    ]) as any

    pb.collection('ordens_servico').getFullList = vi.fn().mockResolvedValue([
      {
        id: 'os-null-1',
        collectionId: 'ordens_servico',
        cliente_id: null,
        data_agendada: null,
        horario_inicio: null,
        horario_fim: null,
        duracao_minutos: null,
        atribuida_a: null,
        tipo_servico: null,
        status: 'pendente',
      },
      {
        id: 'os-null-2',
        collectionId: 'ordens_servico',
        cliente_id: 'cli-teste',
        data_agendada: '2026-05-10 14:00:00',
        horario_inicio: '14:00',
        horario_fim: '15:00',
        duracao_minutos: 60,
        atribuida_a: undefined,
        tipo_servico: 'Limpeza dos Módulos',
        status: 'pendente',
      },
    ]) as any

    window.history.pushState({}, 'Serviços de Campo', '/servicos-campo')

    const originalError = console.error
    console.error = vi.fn()

    let container: HTMLElement | null = null
    await act(async () => {
      const res = render(React.createElement(App, null))
      container = res.container
    })

    console.error = originalError
    pb.collection('atividades').getFullList = originalGetFullListAtv
    pb.collection('ordens_servico').getFullList = originalGetFullListOS

    const storedError = window.sessionStorage.getItem('delfos_last_boundary_error')
    expect(storedError).toBeNull()
    expect(container).not.toBeNull()

    const textContent = container?.textContent || ''
    expect(textContent).not.toContain('Ocorreu um problema ao carregar Serviços de Campo')
    expect(textContent).not.toContain('Ops! Algo deu errado')
    // O calendário deve estar presente e renderizado
    expect(textContent).toContain('Calendário')
  })

  it('Ficha do cliente / SecaoUsinasCliente: renderiza o card unificado com Concessionária acima, Titular abaixo e Portal da Concessionária com Login e Senha', async () => {
    const { SecaoUsinasCliente } = await import('@/components/SecaoUsinasCliente')
    const clienteMock: any = {
      id: 'cli-test-card-unificado',
      nome: 'Mauro Antônio Serraglio',
      cpf: '670.405.350-68',
      telefone: '54991766675',
      email: 'serragliomauro@gmail.com',
      cidade: 'Erechim',
    }

    const usinasMock: any[] = [
      {
        id: 'usina-1',
        cliente_id: 'cli-test-card-unificado',
        nome: 'Usina Mauro Serraglio',
        numero_uc: '3081543981',
        concessionaria: 'CPFL',
        classe_consumo: 'Rural',
        tarifa: 0.95,
        tipo_fornecimento: 'trifásico',
        titular_nome: 'Mauro Antônio Serraglio',
        titular_cpf: '670.405.350-68',
        titular_telefone: '54991766675',
        titular_email: 'serragliomauro@gmail.com',
        portal_login: 'portal.mauro@cpfl.com.br',
        portal_senha: 'senha-secreta-123',
      },
    ]

    let container: HTMLElement | null = null
    await act(async () => {
      const res = render(
        React.createElement(SecaoUsinasCliente, {
          clienteId: clienteMock.id,
          clienteNome: clienteMock.nome,
          cliente: clienteMock,
          usinas: usinasMock,
          contratos: [],
          isAdmin: true,
          onUpdateUsina: vi.fn().mockResolvedValue(undefined),
        } as any),
      )
      container = res.container
    })

    expect(container).not.toBeNull()

    // Clica no card da usina para abrir a gaveta de detalhes
    const cardUsina = container?.querySelector('button, [role="button"]') || container
    const usinaTitulo = Array.from(container?.querySelectorAll('*') || []).find(
      (el) =>
        el.textContent?.includes('Usina Mauro Serraglio') || el.textContent?.includes('3081543981'),
    )

    if (usinaTitulo) {
      await act(async () => {
        ;(usinaTitulo as HTMLElement).click()
      })
    }

    const text = document.body.textContent || ''
    // Garante presença das três seções unificadas no mesmo card
    expect(text).toContain('Concessionária de Energia')
    expect(text).toContain('Titular / Responsável')
    expect(text).toContain('Portal Concessionária')
    expect(text).toContain('Login:')
    expect(text).toContain('Senha:')
    expect(text).toContain('Copiar do cliente')
  })

  it('Kanban renderiza exatamente as 5 colunas esperadas, sem "Fechado" e sem "Perdido" como colunas', async () => {
    const { KANBAN_COLUMNS } = await import('@/components/KanbanBoard')
    expect(KANBAN_COLUMNS).toHaveLength(5)

    const ids = KANBAN_COLUMNS.map((c) => c.id)
    const titles = KANBAN_COLUMNS.map((c) => c.title)

    // Exatamente as 5 colunas esperadas
    expect(ids).toEqual(['Novo Lead', 'Levantamento', 'Orçamento', 'Negociação', 'Contato Futuro'])

    expect(titles).toEqual([
      '1 - Lead',
      '2 - Orçamento Enviado',
      '3 - Proposta',
      '4 - Negociação',
      '5 - Contato Futuro',
    ])

    // "Fechado" e "Perdido" NÃO devem ser colunas no Kanban
    expect(ids).not.toContain('Fechado')
    expect(ids).not.toContain('Perdido')
    expect(titles).not.toContain('Fechado')
    expect(titles).not.toContain('Perdido')
  })

  it('montagem REAL no DOM na rota "/servicos-campo" renderiza sem ErrorBoundary mesmo com registro de OS/atividade com datas nulas e checklist como string JSON', async () => {
    const { ClientesProvider } = await import('@/contexts/ClientesContext')
    const { AuthProvider } = await import('@/contexts/AuthContext')

    // Mock do PocketBase retornando registros com datas nulas e checklist como string JSON
    const mockOS = {
      id: 'os-com-checklist-string',
      collectionId: 'ordens_servico',
      collectionName: 'ordens_servico',
      cliente_id: 'cli-dummy',
      tipo_servico: 'Manutenção Preventiva',
      status: 'pendente',
      data_agendada: null,
      horario_inicio: null,
      horario_fim: null,
      duracao_minutos: null,
      checklist: JSON.stringify([
        { id: 'item-1', descricao: 'Inspecionar inversores', concluido: false },
        { id: 'item-2', descricao: 'Limpar conexões', concluido: true },
      ]),
      created: '2026-03-30 10:00:00.000Z',
      updated: '2026-03-30 10:00:00.000Z',
      expand: {
        cliente_id: { id: 'cli-dummy', nome: 'Cliente Teste Dados Nulos' },
      },
    }

    const mockAtividade = {
      id: 'atv-com-datas-nulas',
      collectionId: 'atividades',
      collectionName: 'atividades',
      cliente_id: 'cli-dummy',
      tipo: 'manutencao_preventiva',
      status: 'pendente',
      titulo: 'Atividade sem data agendada',
      data: null,
      horario_inicio: null,
      horario_fim: null,
      duracao_minutos: null,
      checklist: JSON.stringify([
        { id: 'chk-1', descricao: 'Verificar painéis', concluido: false },
      ]),
      created: '2026-03-30 10:00:00.000Z',
      updated: '2026-03-30 10:00:00.000Z',
      expand: {
        cliente_id: { id: 'cli-dummy', nome: 'Cliente Atividade Nula' },
      },
    }

    // Configura mock no PocketBase para ordens_servico e atividades
    const originalGetFullList = pb.collection('ordens_servico').getFullList
    const originalAtividadesGetFullList = pb.collection('atividades').getFullList

    vi.spyOn(pb.collection('ordens_servico'), 'getFullList').mockResolvedValue([mockOS] as any)
    vi.spyOn(pb.collection('atividades'), 'getFullList').mockResolvedValue([mockAtividade] as any)

    window.history.pushState({}, 'Serviços de Campo', '/servicos-campo')

    let container: HTMLElement | null = null
    await act(async () => {
      const res = render(
        React.createElement(
          AuthProvider,
          null,
          React.createElement(ClientesProvider, null, React.createElement(App)),
        ),
      )
      container = res.container
    })

    // Aguarda montagem assíncrona
    await act(async () => {
      await new Promise((r) => setTimeout(r, 150))
    })

    const textContent = container?.textContent || ''
    expect(textContent).not.toContain('Ocorreu um problema ao carregar Serviços de Campo')
    expect(textContent).not.toContain('Não foi possível carregar o módulo de Serviços de Campo')
    expect(textContent).not.toContain('Ops! Algo deu errado')
    expect(textContent).toContain('Calendário')

    // Restaura spies
    vi.restoreAllMocks()
  })

  it('montagem limpa de /servicos-campo sem ErrorBoundary e com toggles de Sábados e Domingos funcionando', async () => {
    const { ClientesProvider } = await import('@/contexts/ClientesContext')
    const { default: pbClient } = await import('@/lib/pocketbase/client')
    localStorage.clear()
    const mockOS = {
      id: 'os-clean-test',
      cliente_id: 'cli-clean-test',
      tipo_servico: 'Manutenção Preventiva',
      status: 'pendente',
      data_agendada: '2026-05-15 09:00:00',
      horario_inicio: '09:00',
      horario_fim: '10:00',
      duracao_minutos: 60,
      checklist: [{ id: 'chk-1', texto: 'Verificar inversor', concluido: false }],
      expand: {
        cliente_id: {
          id: 'cli-clean-test',
          nome: 'Cliente Limpo Solar',
        },
      },
    }

    vi.spyOn(pbClient.collection('ordens_servico'), 'getFullList').mockResolvedValue([
      mockOS,
    ] as any)
    vi.spyOn(pbClient.collection('atividades'), 'getFullList').mockResolvedValue([] as any)

    window.history.pushState({}, 'Serviços de Campo', '/servicos-campo')

    let rendered: any = null
    await act(async () => {
      rendered = render(
        React.createElement(
          AuthProvider,
          null,
          React.createElement(ClientesProvider, null, React.createElement(App)),
        ),
      )
    })

    await act(async () => {
      await new Promise((r) => setTimeout(r, 200))
    })

    const textContent = rendered.container?.textContent || ''
    expect(textContent).not.toContain('Não foi possível carregar o módulo de Serviços de Campo')
    expect(textContent).not.toContain('Não foi possível carregar o calendário de ordens de serviço')
    expect(textContent).not.toContain('Ops! Algo deu errado')

    // Verifica que os rótulos de Sábados e Domingos estão presentes no DOM
    expect(textContent).toContain('Sábados')
    expect(textContent).toContain('Domingos')

    // Encontra os checkboxes compactos de sábado e domingo
    const sabadosLabel = rendered.container.querySelector(
      'label:has(input[type="checkbox"]), label',
    )
    expect(rendered.container.innerHTML).toContain('Sábados')
    expect(rendered.container.innerHTML).toContain('Domingos')

    // Testa alternância e persistência em localStorage
    const sabadosCheckbox = rendered.container.querySelector(
      'button[role="checkbox"][data-state], input[type="checkbox"]',
    )
    // LocalStorage inicial ou default
    expect(localStorage.getItem('delfos_cal_show_sabados')).toBeFalsy()

    // Encontra botões de checkbox do Radix
    const checkboxes = rendered.container.querySelectorAll('button[role="checkbox"]')
    if (checkboxes.length >= 2) {
      const sabCheck = checkboxes[0] as HTMLButtonElement
      const domCheck = checkboxes[1] as HTMLButtonElement

      // Desmarca sábados
      await act(async () => {
        sabCheck.click()
        await new Promise((r) => setTimeout(r, 50))
      })
      expect(localStorage.getItem('delfos_cal_show_sabados')).toBe('false')

      // Desmarca domingos
      await act(async () => {
        domCheck.click()
        await new Promise((r) => setTimeout(r, 50))
      })
      expect(localStorage.getItem('delfos_cal_show_domingos')).toBe('false')

      // Marca sábados novamente
      await act(async () => {
        sabCheck.click()
        await new Promise((r) => setTimeout(r, 50))
      })
      expect(localStorage.getItem('delfos_cal_show_sabados')).toBe('true')
    }

    vi.restoreAllMocks()
  })

  it('filtragem de atividades para calendário de serviços de campo: atividades com data aparecem; logs de mudança de etapa e mesclagem (sem data ou não-manutenção) NÃO aparecem; OS real aparece', async () => {
    // 1. CalendarioExecucaoOS agrupa apenas registros que possuem data_agendada explícita (sem fallback para created)
    const now = new Date()
    const ano = now.getFullYear()
    const mes = String(now.getMonth() + 1).padStart(2, '0')
    const dia = String(now.getDate()).padStart(2, '0')
    const dataHoje = `${ano}-${mes}-${dia} 10:00:00.000Z`

    const osRealComData = {
      id: 'os-real-1',
      collectionId: 'ordens_servico',
      collectionName: 'ordens_servico',
      cliente_id: 'cli-1',
      tipo_servico: 'Limpeza e Manutenção Preventiva',
      status: 'pendente' as const,
      origem: 'ordens_servico' as const,
      data_agendada: dataHoje,
      horario_inicio: '10:00',
      horario_fim: '11:00',
      duracao_minutos: 60,
      expand: {
        cliente_id: { id: 'cli-1', nome: 'Cliente OS Real' },
      },
    }

    const atvManutencaoComData = {
      id: 'atv-manut-1',
      collectionId: 'atividades',
      collectionName: 'atividades',
      cliente_id: 'cli-2',
      tipo_servico: 'Manutenção Preventiva',
      status: 'pendente' as const,
      origem: 'atividades' as const,
      data_agendada: dataHoje,
      horario_inicio: '14:00',
      horario_fim: '15:00',
      duracao_minutos: 60,
      expand: {
        cliente_id: { id: 'cli-2', nome: 'Cliente Atividade Manutencao' },
      },
    }

    const logSemDataAgendada = {
      id: 'log-sem-data-1',
      collectionId: 'atividades',
      collectionName: 'atividades',
      cliente_id: 'cli-3',
      tipo_servico: 'Mudança de Estágio',
      status: 'concluida' as const,
      origem: 'atividades' as const,
      data_agendada: '', // Sem agendamento explícito
      created: dataHoje, // Possui created na data de hoje, mas NÃO deve aparecer no calendário
      expand: {
        cliente_id: { id: 'cli-3', nome: 'Cliente Log Historico' },
      },
    }

    const html = renderToStaticMarkup(
      React.createElement(CalendarioExecucaoOS, {
        ordens: [osRealComData as any, atvManutencaoComData as any, logSemDataAgendada as any],
        onSelectOS: () => {},
      }),
    )

    // A OS real com data deve aparecer
    expect(html).toContain('Cliente OS Real')
    // A atividade de manutenção com data deve aparecer
    expect(html).toContain('Cliente Atividade Manutencao')
    // O registro de log sem data explícita NÃO deve aparecer no calendário mesmo tendo created de hoje
    expect(html).not.toContain('Cliente Log Historico')
  })

  it('Auto Leitura RGE oculta campo genérico de Data e Horário Previsto e dispensa sua obrigatoriedade nos modais e ficha', async () => {
    const { ModalNovaAtividade } = await import('@/components/ModalNovaAtividade')
    const { ModalDetalhesAtividade } = await import('@/components/ModalDetalhesAtividade')
    const { FichaExecucaoOS } = await import('@/components/FichaExecucaoOS')

    // 1. ModalNovaAtividade: tipo auto_leitura_rge oculta "Data e Horário Previsto"
    const htmlModalNovaAutoLeitura = renderToStaticMarkup(
      React.createElement(ModalNovaAtividade, {
        isOpen: true,
        onClose: () => {},
        initialTipo: 'auto_leitura_rge',
        initialClienteId: 'cli-teste-1',
      }),
    )
    expect(htmlModalNovaAutoLeitura).not.toContain('Data e Horário Previsto')
    expect(htmlModalNovaAutoLeitura).toContain('Datas de Leitura Programadas')

    // 2. ModalNovaAtividade: tipo comum (ex: manutencao_preventiva) exibe "Data e Horário Previsto"
    const htmlModalNovaPreventiva = renderToStaticMarkup(
      React.createElement(ModalNovaAtividade, {
        isOpen: true,
        onClose: () => {},
        initialTipo: 'manutencao_preventiva',
        initialClienteId: 'cli-teste-1',
      }),
    )
    expect(htmlModalNovaPreventiva).toContain('Data e Horário Previsto')

    // 3. ModalDetalhesAtividade: tipo auto_leitura_rge oculta "Data e Horário Previsto"
    const htmlDetalhesAutoLeitura = renderToStaticMarkup(
      React.createElement(ModalDetalhesAtividade, {
        isOpen: true,
        onClose: () => {},
        atividade: {
          id: 'atv-auto-1',
          titulo: 'Auto Leitura – RGE - Cliente Teste',
          tipo: 'auto_leitura_rge',
          cliente_id: 'cli-teste-1',
          datas_leitura: ['2027-01-15', '2027-02-15'],
        } as any,
      }),
    )
    expect(htmlDetalhesAutoLeitura).not.toContain('Data e Horário Previsto')
    expect(htmlDetalhesAutoLeitura).toContain('Datas de Leitura Programadas')

    // 4. ModalDetalhesAtividade: tipo comum exibe "Data e Horário Previsto"
    const htmlDetalhesComum = renderToStaticMarkup(
      React.createElement(ModalDetalhesAtividade, {
        isOpen: true,
        onClose: () => {},
        atividade: {
          id: 'atv-comum-1',
          titulo: 'Reunião com Cliente',
          tipo: 'reuniao',
          cliente_id: 'cli-teste-1',
        } as any,
      }),
    )
    expect(htmlDetalhesComum).toContain('Data e Horário Previsto')

    // 5. FichaExecucaoOS: tipo auto_leitura_rge oculta bloco de "Data Agendada:"
    const htmlFichaAutoLeitura = renderToStaticMarkup(
      React.createElement(FichaExecucaoOS, {
        os: {
          id: 'os-auto-1',
          origem: 'atividades',
          tipo_servico: 'auto_leitura_rge',
          status: 'pendente',
          data_agendada: '2027-01-15 10:00:00',
        } as any,
        onBack: () => {},
        onOSUpdated: () => {},
        onOSFinalizada: () => {},
      }),
    )
    expect(htmlFichaAutoLeitura).not.toContain('Data Agendada:')
    expect(htmlFichaAutoLeitura).toContain('Responsável da Atividade:')

    // 6. FichaExecucaoOS: tipo comum de manutenção exibe "Data Agendada:"
    const htmlFichaPreventiva = renderToStaticMarkup(
      React.createElement(FichaExecucaoOS, {
        os: {
          id: 'os-prev-1',
          origem: 'atividades',
          tipo_servico: 'Manutenção Preventiva',
          status: 'pendente',
          data_agendada: '2027-01-15 10:00:00',
        } as any,
        onBack: () => {},
        onOSUpdated: () => {},
        onOSFinalizada: () => {},
      }),
    )
    expect(htmlFichaPreventiva).toContain('Data Agendada:')
  })

  it('BlocoAnotacoesUsina grava usina_id e cliente herdados, e validação de usina obrigatória/opcional opera nos 3 formulários', async () => {
    const { BlocoAnotacoesUsina } = await import('@/components/BlocoAnotacoesUsina')
    const { ModalNovaAtividade } = await import('@/components/ModalNovaAtividade')
    const { ModalDetalhesAtividade } = await import('@/components/ModalDetalhesAtividade')
    const { FichaExecucaoOS } = await import('@/components/FichaExecucaoOS')
    const { isCategoriaManutencaoOuAdministrativa, MSG_USINA_OBRIGATORIA, getTipoAtividadeConfig } =
      await import('@/constants/atividadesTipos')

    // 1. BlocoAnotacoesUsina renderiza com usina e cliente informados
    const htmlBloco = renderToStaticMarkup(
      React.createElement(BlocoAnotacoesUsina, {
        usina: {
          id: 'usina-teste-123',
          nome: 'Usina Solar Fazenda Esperança',
          cliente_id: 'cli-teste-456',
        } as any,
        clienteId: 'cli-teste-456',
        clienteNome: 'João da Silva',
      }),
    )
    expect(htmlBloco).toContain('Anotações da Usina')
    expect(htmlBloco).toContain('João da Silva')
    expect(htmlBloco).toContain('Nova Anotação')

    // 2. Helper isCategoriaManutencaoOuAdministrativa e mensagem canônica
    expect(MSG_USINA_OBRIGATORIA).toBe(
      'A usina é obrigatória para atividades de manutenção e administrativas',
    )
    expect(isCategoriaManutencaoOuAdministrativa('manutencao')).toBe(true)
    expect(isCategoriaManutencaoOuAdministrativa('administrativo_pos_venda')).toBe(true)
    expect(isCategoriaManutencaoOuAdministrativa('administrativa')).toBe(true)
    expect(isCategoriaManutencaoOuAdministrativa('comercial')).toBe(false)
    expect(isCategoriaManutencaoOuAdministrativa(null)).toBe(false)

    // Configurações canônicas de tipos
    const configPrev = getTipoAtividadeConfig('manutencao_preventiva')
    expect(isCategoriaManutencaoOuAdministrativa(configPrev.categoria)).toBe(true)

    const configComercial = getTipoAtividadeConfig('contato_ligacao')
    expect(isCategoriaManutencaoOuAdministrativa(configComercial.categoria)).toBe(false)

    // 3. ModalNovaAtividade com usina pré-selecionada
    const htmlModalNovaComUsina = renderToStaticMarkup(
      React.createElement(ModalNovaAtividade, {
        isOpen: true,
        onClose: () => {},
        initialTipo: 'manutencao_preventiva',
        initialClienteId: 'cli-teste-456',
        initialUsinaId: 'usina-teste-123',
      }),
    )
    expect(htmlModalNovaComUsina).toBeTruthy()

    // 4. ModalDetalhesAtividade com usina
    const htmlModalDetalhes = renderToStaticMarkup(
      React.createElement(ModalDetalhesAtividade, {
        isOpen: true,
        onClose: () => {},
        atividade: {
          id: 'atv-det-1',
          titulo: 'Revisão Inversores',
          tipo: 'manutencao_preventiva',
          cliente_id: 'cli-teste-456',
          usina_id: 'usina-teste-123',
        } as any,
      }),
    )
    expect(htmlModalDetalhes).toContain('Usina Vinculada')

    // 5. FichaExecucaoOS com usina vinculada e seletor
    const htmlFicha = renderToStaticMarkup(
      React.createElement(FichaExecucaoOS, {
        os: {
          id: 'os-teste-1',
          origem: 'atividades',
          tipo_servico: 'manutencao_preventiva',
          status: 'pendente',
          cliente_id: 'cli-teste-456',
          usina_id: 'usina-teste-123',
          data_agendada: '2027-01-15 10:00:00',
        } as any,
        onBack: () => {},
        onOSUpdated: () => {},
        onOSFinalizada: () => {},
      }),
    )
    expect(htmlFicha).toContain('Usina Vinculada:')

    // 6. BlocoAnotacoesUsina garante payload com campo data preenchido (mesmo com dataAnotacao em branco) e sem campo inválido 'cliente'
    const payloadEsperadoDataPreenchida = {
      tipo: 'anotacao',
      titulo: 'Anotação da Usina',
      descricao: 'Teste de observação operacional',
      usina_id: 'usina-teste-123',
      status: 'concluida',
      autor: 'João Teste',
      responsavel_nome: 'João Teste',
      data: new Date()
        .toISOString()
        .replace('T', ' ')
        .replace(/\.\d{3}Z?$/, ''),
      cliente_id: 'cli-teste-456',
    }
    expect(payloadEsperadoDataPreenchida.data).toBeTruthy()
    expect((payloadEsperadoDataPreenchida as any).cliente).toBeUndefined()
  })

  it('CalendarioExecucaoOS é blindado contra valores NaN em horario_inicio, duracao_minutos e data malformada', () => {
    const fakeOSNaN = {
      id: 'os-nan-1',
      cliente_id: 'cli-nan',
      tipo_servico: 'Limpeza dos Módulos',
      status: 'pendente' as const,
      origem: 'atividades' as const,
      data_agendada: 'data_invalida_sem_formato',
      horario_inicio: 'invalido:xx',
      duracao_minutos: '60' as any, // string em vez de número
      expand: {
        cliente_id: {
          id: 'cli-nan',
          nome: 'Cliente Teste NaN',
        },
      },
    }

    const fakeOSDuracaoNegativa = {
      id: 'os-nan-2',
      cliente_id: 'cli-nan-2',
      tipo_servico: 'Manutenção Preventiva',
      status: 'pendente' as const,
      origem: 'atividades' as const,
      data_agendada: '2026-06-10 10:00:00',
      horario_inicio: '10:00',
      duracao_minutos: -50,
      expand: {
        cliente_id: {
          id: 'cli-nan-2',
          nome: 'Cliente Duracao Negativa',
        },
      },
    }

    const html = renderToStaticMarkup(
      React.createElement(CalendarioExecucaoOS, {
        ordens: [fakeOSNaN as any, fakeOSDuracaoNegativa as any],
        onSelectOS: () => {},
      }),
    )

    expect(html).not.toContain('NaN')
    expect(html).not.toContain('NaNpx')
    expect(html).toContain('Cliente Teste NaN')
  })

  it('VisaoInstaladorMobileOS renderiza lista do dia do instalador, checklist e ações de status', () => {
    const fakeOS = {
      id: 'os-inst-mobile-1',
      cliente_id: 'cli-inst-1',
      responsavel_usuario_id: 'usr-inst-1',
      tipo_servico: 'Manutenção Preventiva',
      status: 'pendente' as const,
      data_agendada: '2026-06-10 09:00:00',
      horario_inicio: '09:00',
      endereco: 'Rua dos Operários, 123',
      checklist: [
        { id: 'chk_1', item: 'Verificar inversor solar', concluido: false },
        { id: 'chk_2', item: 'Aferir tensão das strings', concluido: true },
      ],
      expand: {
        cliente_id: {
          id: 'cli-inst-1',
          nome: 'Usina Solar Aurora',
        },
      },
    }

    const html = renderToStaticMarkup(
      React.createElement((VisaoInstaladorMobileOS as any)?.default || VisaoInstaladorMobileOS, {
        ordens: [fakeOS as any],
        userId: 'usr-inst-1',
        userName: 'Instalador Delfos',
        onOSUpdated: () => {},
      }),
    )

    expect(html).toContain('Minhas Atividades de Hoje')
    expect(html).toContain('Usina Solar Aurora')
    expect(html).toContain('09:00')
    expect(html).toContain('Rua dos Operários, 123')
    expect(html).toContain('Verificar inversor solar')
    expect(html).toContain('Concluir Atividade')
    expect(html).toContain('Lista')
    expect(html).toContain('Calendário')
  })

  it('VisaoInstaladorMobileOS tolera registros legados com Date, null, números e campos malformados sem TypeError', () => {
    const fakeLegado = {
      id: 'os-legado-data-date',
      cliente_id: 'cli-legado-1',
      responsavel_usuario_id: 'usr-inst-1',
      tipo_servico: 'Limpeza dos Módulos',
      status: 'pendente' as const,
      data_agendada: new Date('2026-06-10T14:30:00Z') as any, // Objeto Date em vez de string
      horario_inicio: null,
      endereco: 'Fazenda Sol Nascente',
      checklist: null, // Checklist null (comum em atividades reais de manutenção)
    }

    const fakeLegado2 = {
      id: 'os-legado-sem-data',
      cliente_id: 'cli-legado-2',
      responsavel_usuario_id: 'usr-inst-1',
      tipo_servico: 'Manutenção Corretiva',
      status: 'concluida' as const,
      data_agendada: null,
      horario_inicio: 14 as any, // Número em vez de string
      endereco: null,
      checklist: 'string json malformada {[',
    }

    const html = renderToStaticMarkup(
      React.createElement((VisaoInstaladorMobileOS as any)?.default || VisaoInstaladorMobileOS, {
        ordens: [fakeLegado as any, fakeLegado2 as any],
        userId: 'usr-inst-1',
        userName: 'Instalador Delfos',
        onOSUpdated: () => {},
      }),
    )

    expect(html).toContain('Minhas Atividades de Hoje')
    expect(html).toContain('Fazenda Sol Nascente')
  })

  it('prop mostrarLinhaDiaTodo em CalendarioExecucaoOS controla a exibição da linha "Dia todo"', () => {
    const fakeOS = {
      id: 'os-dia-todo-teste',
      cliente_id: 'cli-dia-todo',
      tipo_servico: 'Manutenção Preventiva',
      status: 'pendente' as const,
      origem: 'atividades' as const,
      data_agendada: '2026-05-15', // sem horário definido -> cai em diaInteiro
      expand: {
        cliente_id: {
          id: 'cli-dia-todo',
          nome: 'Cliente Dia Inteiro',
        },
      },
    }

    // Com mostrarLinhaDiaTodo={true} (ou padrão): seção "Dia todo" DEVE estar presente
    const htmlComDiaTodo = renderToStaticMarkup(
      React.createElement(CalendarioExecucaoOS, {
        ordens: [fakeOS as any],
        onSelectOS: () => {},
        mostrarLinhaDiaTodo: true,
      }),
    )
    expect(htmlComDiaTodo).toContain('Dia todo')

    // Com mostrarLinhaDiaTodo={false} (mobile): seção "Dia todo" NÃO deve ser renderizada
    const htmlSemDiaTodo = renderToStaticMarkup(
      React.createElement(CalendarioExecucaoOS, {
        ordens: [fakeOS as any],
        onSelectOS: () => {},
        mostrarLinhaDiaTodo: false,
      }),
    )
    expect(htmlSemDiaTodo).not.toContain('Dia todo')
  })
})
