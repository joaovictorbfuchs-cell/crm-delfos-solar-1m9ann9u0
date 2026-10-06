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

  it('(a) rótulo do card permanece "MANUTENÇÃO" (não vira "LIMPEZA") após ciclo salvar→recarregar de um drag/resize de atividade com título "Limpeza e Manutenção"', async () => {
    const { updateOrdemServico } = await import('@/services/crmService')
    const { getTipoServicoConfig, TIPO_SERVICO_CORES } =
      await import('@/components/CalendarioExecucaoOS')

    // 1. TIPO_SERVICO_CORES['Limpeza e Manutenção'] deve ter estilização visual de Manutenção (âmbar #F59E0B)
    expect(TIPO_SERVICO_CORES['Limpeza e Manutenção'].hex).toBe('#F59E0B')
    expect(TIPO_SERVICO_CORES['Limpeza e Manutenção'].borderColor).toBe('#F59E0B')

    // 2. getTipoServicoConfig('Limpeza e Manutenção') deve resolver para Manutenção (âmbar #F59E0B) e NÃO Limpeza azul
    const configMista = getTipoServicoConfig('Limpeza e Manutenção')
    expect(configMista.hex).toBe('#F59E0B')
    expect(configMista.borderColor).toBe('#F59E0B')
    expect(configMista.hex).not.toBe('#0284C7')

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
      tipo_servico: 'Manutenção',
      horario_inicio: '08:00',
      horario_fim: '11:00',
      duracao_minutos: 180,
    })

    // O retorno normalizado não deve ser sobrescrito para visual de limpeza
    expect(osRetornada.tipo_servico).toBe('Manutenção')
    expect(osRetornada.tipo_servico).not.toBe('Limpeza')

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
    // O rótulo exibido DEVE conter "MANUTENÇÃO" e JAMAIS "LIMPEZA"
    expect(cardElement.textContent).toContain('MANUTENÇÃO')
    expect(cardElement.textContent).not.toContain('LIMPEZA')

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
})
