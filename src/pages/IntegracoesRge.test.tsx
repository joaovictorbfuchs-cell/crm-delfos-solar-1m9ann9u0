import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { IntegracoesRgePage } from '@/pages/IntegracoesRge'

describe('IntegracoesRgePage', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  const mockCredenciais = [
    {
      id: 'cred-1',
      uc: '80203300140',
      login: 'carlosortizalberto15@gmail.com',
      rotulo: 'Carlos Ortiz',
      status: 'ok',
      ultimo_login: new Date(Date.now() - 30 * 86400000).toISOString(),
      cliente_id: 'cli-1',
      expand: {
        cliente_id: { id: 'cli-1', nome: 'Carlos Ortiz' },
      },
    },
    {
      id: 'cred-2',
      uc: '27136200162',
      login: 'claitongasparetto5729@gmail.com',
      rotulo: 'Claiton Gasparetto',
      status: 'ok',
      ultimo_login: new Date(Date.now() - 30 * 86400000).toISOString(),
    },
    {
      id: 'cred-3',
      uc: '19131100122',
      login: 'jaque.lupges@gmail.com',
      rotulo: 'SERGIO LUPGES',
      status: 'erro',
      ultimo_erro: 'Token expirado',
      ultimo_login: new Date(Date.now() - 60 * 86400000).toISOString(),
    },
  ]

  const mockContas = [
    {
      id: 'conta-1',
      uc: '80203300140',
      competencia: '2026-11',
      consumo_kwh: 340,
      origem: 'automático',
      created: new Date(Date.now() - 3600000).toISOString(),
      credencial_id: 'cred-1',
    },
    {
      id: 'conta-2',
      uc: '19131100122',
      competencia: '2026-11',
      consumo_kwh: 520,
      origem: 'manual',
      created: new Date(Date.now() - 2 * 3600000).toISOString(),
      credencial_id: 'cred-3',
    },
  ]

  function setupFetchMock(opts: { failCredenciais?: boolean } = {}) {
    global.fetch = vi.fn().mockImplementation((url: RequestInfo | URL) => {
      const urlStr = String(url)
      if (urlStr.includes('/backend/v1/rge/credenciais')) {
        if (opts.failCredenciais) {
          return Promise.resolve({
            ok: false,
            status: 400,
            json: async () => ({
              ok: false,
              error: "Invalid sort field 'created'",
            }),
          })
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            itens: mockCredenciais,
          }),
        })
      }

      if (urlStr.includes('/backend/v1/rge/contas')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            itens: mockContas,
          }),
        })
      }

      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
      })
    }) as unknown as typeof fetch
  }

  it('exibe os 3 cards de métricas no topo com contagens e badges corretos', async () => {
    setupFetchMock()
    render(<IntegracoesRgePage />)

    // Card 1: Cadastradas (3) e 1 Pendentes
    expect(await screen.findByText('Cadastradas')).toBeTruthy()
    expect(screen.getByText('3')).toBeTruthy()
    expect(screen.getByText('1 Pendentes')).toBeTruthy()

    // Card 2: Sucesso (2) e 1 Falhas
    expect(screen.getByText('Sucesso')).toBeTruthy()
    expect(screen.getByText('2')).toBeTruthy()
    expect(screen.getByText('1 Falhas')).toBeTruthy()

    // Card 3: Em Dia (2) e 01 Atrasadas
    expect(screen.getByText('Em Dia')).toBeTruthy()
    expect(screen.getByText('01 Atrasadas')).toBeTruthy()
  })

  it('renderiza abas Gerenciar Concessionária e Gerenciar Faturas e busca global', async () => {
    setupFetchMock()
    render(<IntegracoesRgePage />)

    expect(await screen.findByRole('button', { name: 'Gerenciar Concessionária' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Gerenciar Faturas' })).toBeTruthy()
    expect(screen.getByPlaceholderText('Buscar...')).toBeTruthy()
    expect(screen.getByRole('button', { name: /Integrar Concessionária/i })).toBeTruthy()
  })

  it('exibe colunas da aba Gerenciar Concessionária com senha mascarada e status', async () => {
    setupFetchMock()
    render(<IntegracoesRgePage />)

    expect(await screen.findByText('80203300140')).toBeTruthy()
    expect(screen.getByText('carlosortizalberto15@gmail.com')).toBeTruthy()

    // Senha mascarada
    const mascaras = screen.getAllByText('••••••••')
    expect(mascaras.length).toBeGreaterThan(0)

    // Badges Integrado e Promover
    expect(screen.getAllByText('Integrado').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Promover').length).toBeGreaterThanOrEqual(1)

    // Link da concessionária RGE
    expect(screen.getAllByText('RGE').length).toBeGreaterThanOrEqual(1)
  })

  it('alterna para a aba Gerenciar Faturas e exibe lista com competência formatada e alertas', async () => {
    setupFetchMock()
    render(<IntegracoesRgePage />)

    const btnFaturas = await screen.findByRole('button', { name: 'Gerenciar Faturas' })
    fireEvent.click(btnFaturas)

    // Competência formatada NOV/2026
    const competencias = await screen.findAllByText('NOV/2026')
    expect(competencias.length).toBe(2)

    // Colunas da tabela Faturas conforme layout
    expect(screen.getByText('CONCESSIONÁRIA')).toBeTruthy()
    expect(screen.getByText('UNIDADE')).toBeTruthy()
    expect(screen.getByText('Nº UNIDADE')).toBeTruthy()
    expect(screen.getByText('MÊS')).toBeTruthy()
    expect(screen.getByText('ALERTAS')).toBeTruthy()
    expect(screen.getByText('ORIGEM')).toBeTruthy()

    // Alertas COM ERRO e SEM ALERTA
    expect(screen.getByText('COM ERRO')).toBeTruthy()
    expect(screen.getByText('SEM ALERTA')).toBeTruthy()

    // Origens
    expect(screen.getByText('AUTOMÁTICO')).toBeTruthy()
    expect(screen.getByText('MANUAL')).toBeTruthy()
  })

  it('renderiza e navega na paginação numerada (10 por página) quando há mais de 10 itens', async () => {
    // Gerar 15 credenciais para forçar 2 páginas
    const quinzeCredenciais = Array.from({ length: 15 }).map((_, i) => ({
      id: `cred-${i + 1}`,
      uc: `1000000000${i}`,
      login: `user${i + 1}@email.com`,
      rotulo: `Unidade ${i + 1}`,
      status: 'ok',
      ultimo_login: new Date().toISOString(),
    }))

    global.fetch = vi.fn().mockImplementation((url: RequestInfo | URL) => {
      const urlStr = String(url)
      if (urlStr.includes('/backend/v1/rge/credenciais')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ ok: true, itens: quinzeCredenciais }),
        })
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ ok: true, itens: [] }),
      })
    }) as unknown as typeof fetch

    render(<IntegracoesRgePage />)

    // Botões de página 1 e 2
    const btnPagina1 = await screen.findByRole('button', { name: '1' })
    const btnPagina2 = screen.getByRole('button', { name: '2' })
    expect(btnPagina1).toBeTruthy()
    expect(btnPagina2).toBeTruthy()

    // Página 1 mostra Unidade 1 até 10
    expect(screen.getByText('Unidade 1')).toBeTruthy()
    expect(screen.getByText('Unidade 10')).toBeTruthy()
    expect(screen.queryByText('Unidade 11')).toBeNull()

    // Navegar para a página 2
    fireEvent.click(btnPagina2)
    expect(screen.getByText('Unidade 11')).toBeTruthy()
    expect(screen.getByText('Unidade 15')).toBeTruthy()
    expect(screen.queryByText('Unidade 1')).toBeNull()
  })

  it('abre o menu ⋮ de ações na linha da credencial e da fatura sem erro', async () => {
    setupFetchMock()
    render(<IntegracoesRgePage />)

    // Menu ⋮ na aba Concessionária
    const botoesMenuCred = await screen.findAllByRole('button', { name: 'Ações da credencial' })
    expect(botoesMenuCred.length).toBeGreaterThan(0)
    fireEvent.click(botoesMenuCred[0])

    expect(await screen.findByText('Colar Token')).toBeTruthy()
    expect(screen.getByText('Sincronizar Agora')).toBeTruthy()
    expect(screen.getByText('Baixar Última Conta')).toBeTruthy()
    expect(screen.getByText('Remover')).toBeTruthy()

    // Alternar para Faturas e abrir menu ⋮ da fatura
    const btnFaturas = screen.getByRole('button', { name: 'Gerenciar Faturas' })
    fireEvent.click(btnFaturas)

    const botoesMenuFat = await screen.findAllByRole('button', { name: 'Ações da fatura' })
    expect(botoesMenuFat.length).toBeGreaterThan(0)
    fireEvent.click(botoesMenuFat[0])

    expect(await screen.findByText('Ver Detalhes')).toBeTruthy()
    expect(screen.getByText('Baixar PDF')).toBeTruthy()
  })

  it('permite filtrar na busca global', async () => {
    setupFetchMock()
    render(<IntegracoesRgePage />)

    await screen.findByText('80203300140')

    const inputBusca = screen.getByPlaceholderText('Buscar...')
    fireEvent.change(inputBusca, { target: { value: 'carlosortiz' } })

    // Deve manter apenas o carlos
    expect(screen.getByText('80203300140')).toBeTruthy()
    expect(screen.queryByText('27136200162')).toBeNull()
  })

  it('abre modal de Integrar Concessionária ao clicar no botão', async () => {
    setupFetchMock()
    render(<IntegracoesRgePage />)

    const btnIntegrar = await screen.findByRole('button', { name: /Integrar Concessionária/i })
    fireEvent.click(btnIntegrar)

    expect(await screen.findByText('Integrar Concessionária RGE')).toBeTruthy()
    expect(screen.getByText('Número da Unidade Consumidora (UC) *')).toBeTruthy()
  })

  it('exibe mensagem quando endpoint rge/credenciais retorna erro', async () => {
    setupFetchMock({ failCredenciais: true })
    render(<IntegracoesRgePage />)

    await waitFor(() => {
      expect(screen.getByText("Invalid sort field 'created'")).toBeTruthy()
    })
  })
})
