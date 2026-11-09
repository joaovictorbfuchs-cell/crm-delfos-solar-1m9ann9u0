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
      expand: { cliente_id: { id: 'cli-1', nome: 'Carlos Ortiz' } },
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

  const mockBeneficiarias = [
    {
      id: 'ben-1',
      credencial_id: 'cred-1',
      uc: '11111111111',
      rotulo: 'Carlos Ortiz - Filial Centro',
      percentual: 8,
    },
    {
      id: 'ben-2',
      credencial_id: 'cred-2',
      uc: '22222222222',
      rotulo: 'Filial Desvinculada',
      percentual: 0,
    },
    {
      id: 'ben-3',
      credencial_id: 'cred-2',
      uc: '33333333333',
      percentual: 40,
      observacao: 'com erro de leitura',
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

      if (urlStr.includes('/backend/v1/rge/beneficiarias-uc')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            itens: mockBeneficiarias,
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

  async function abrirBeneficiarias() {
    const btn = await screen.findByRole('button', { name: 'Beneficiárias' })
    fireEvent.click(btn)
    expect(await screen.findByText('Confira as suas unidades geradoras e beneficiárias.')).toBeTruthy()
    expect(screen.getByText('Gestão de Beneficiárias')).toBeTruthy()
    expect(screen.getByText('UC Beneficiárias desvinculadas')).toBeTruthy()
    expect(screen.getByPlaceholderText('Filtre pelo nome da unidade...')).toBeTruthy()
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

  it('renderiza abas Gerenciar Concessionária, Gerenciar Faturas e Beneficiárias', async () => {
    setupFetchMock()
    render(<IntegracoesRgePage />)

    expect(await screen.findByRole('button', { name: 'Gerenciar Concessionária' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Gerenciar Faturas' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Beneficiárias' })).toBeTruthy()
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

    // Badges Integrado
    expect(screen.getAllByText('Integrado').length).toBeGreaterThanOrEqual(1)

    // Link da concessionária RGE
    expect(screen.getAllByText('RGE').length).toBeGreaterThanOrEqual(1)
  })

  it('mostra o nome do cliente na coluna UNIDADE da aba Gerenciar Faturas', async () => {
    setupFetchMock()
    render(<IntegracoesRgePage />)

    await screen.findByText('80203300140')
    fireEvent.click(screen.getByRole('button', { name: 'Gerenciar Faturas' }))

    // UNIDADE da fatura com vínculo de cliente = nome do cliente (igual à aba Concessionária)
    expect(await screen.findByText('Carlos Ortiz')).toBeTruthy()

    // Colunas da tabela Faturas conforme layout
    expect(screen.getByText('CONCESSIONÁRIA')).toBeTruthy()
    expect(screen.getByText('UNIDADE')).toBeTruthy()
    expect(screen.getByText('Nº UNIDADE')).toBeTruthy()
    expect(screen.getByText('MÊS')).toBeTruthy()
    expect(screen.getByText('ALERTAS')).toBeTruthy()
    expect(screen.getByText('ORIGEM')).toBeTruthy()

    // Alertas COM ERRO e SEM ALERTA
    expect(screen.getByText('COM ERRO')).toBeTruthy()
    expect(screen.getAllByText('SEM ALERTA').length).toBeGreaterThanOrEqual(1)

    // Origens
    expect(screen.getByText('AUTOMÁTICO')).toBeTruthy()
    expect(screen.getByText('MANUAL')).toBeTruthy()
  })

  it('mostra o nome do cliente na coluna UNIDADE mesmo via usina vinculada', async () => {
    setupFetchMock()
    render(<IntegracoesRgePage />)

    await screen.findByText('80203300140')
    fireEvent.click(screen.getByRole('button', { name: 'Gerenciar Faturas' }))

    await waitFor(() => {
      expect(screen.getAllByText('Carlos Ortiz').length).toBeGreaterThanOrEqual(1)
    })
  })

  it('exibe o título, subtítulo e sub-abas da área Beneficiárias', async () => {
    setupFetchMock()
    render(<IntegracoesRgePage />)

    await abrirBeneficiarias()

    expect(screen.getByText('Beneficiárias')).toBeTruthy()
    expect(screen.getByText('Confira as suas unidades geradoras e beneficiárias.')).toBeTruthy()
  })

  it('agrupa beneficiárias por cliente com linha geradora e beneficiárias indentadas', async () => {
    setupFetchMock()
    render(<IntegracoesRgePage />)

    await abrirBeneficiarias()

    // Colunas do layout de referência
    expect(screen.getByText('UNIDADE')).toBeTruthy()
    expect(screen.getByText('Nº DA UC')).toBeTruthy()
    expect(screen.getByText('DISTRIBUIÇÃO')).toBeTruthy()
    expect(screen.getByText('ALERTAS')).toBeTruthy()
    expect(screen.getByText('CONCESSIONÁRIA')).toBeTruthy()

    // Grupo do cliente (geradora) e beneficiária indentada
    expect(await screen.findByText('Carlos Ortiz')).toBeTruthy()
    expect(screen.getByText('Carlos Ortiz - Filial Centro')).toBeTruthy()
    expect(screen.getByText('11111111111')).toBeTruthy()

    // Rodapé com contagem (2 grupos visíveis)
    expect(screen.getByText(/Mostrando 1–2 de 2 itens/)).toBeTruthy()
  })

  it('pinta a distribuição de laranja entre 0 e 10% e cinza escuro nas demais', async () => {
    setupFetchMock()
    render(<IntegracoesRgePage />)

    await abrirBeneficiarias()

    const oito = await screen.findByText('8%')
    expect(oito.className).toContain('text-amber-600')

    const quarenta = await screen.findByText('40%')
    expect(quarenta.className).not.toContain('text-amber-600')
moc
  it('exibe ALERTAS "COM ERRO" em vermelho para beneficiária com erro', async () => {
    setupFetchMock()
    render(<IntegracoesRgePage />)

    await abrirBeneficiarias()

    const comErro = await screen.findByText('COM ERRO')
    expect(comErro.className).toContain('text-rose-600')
    expect(screen.getAllByText('SEM ALERTA').length).toBeGreaterThanOrEqual(2)
  })

  it('mostra "—" quando a beneficiária não tem % de distribuição', async () => {
    setupFetchMock()
    render(<IntegracoesRgePage />)

    await abrirBeneficiarias()

    const semPct = await screen.findAllByText('—')
    expect(semPct.length).toBeGreaterThanOrEqual(1)
  })

  it('sub-aba UC Beneficiárias desvinculadas mostra apenas unidades sem cliente', async () => {
    setupFetchMock()
    render(<IntegracoesRgePage />)

    await abrirBeneficiarias()

    fireEvent.click(screen.getByText('UC Beneficiárias desvinculadas'))

    expect(await screen.findByText('Filial Desvinculada')).toBeTruthy()
    expect(screen.getByText('Carlos Ortiz - Filial Centro')).toBeTruthy()
    expect(screen.queryByText('Carlos Ortiz')).toBeNull()
 expect(screen.getByText(/Mostrando 1–2 de 2 itens/)).toBeTruthy()
  })

  it('filtra pelo nome da unidade na busca de beneficiárias', async () => {
    setupFetchMock()
    render(<IntegracoesRgePage />)

    await abrirBeneficiarias()

    const input = screen.getByPlaceholderText('Filtre pelo nome da unidade...')
    fireEvent.change(input, { target: { value: 'Filial Centro' } })

    expect(await screen.findByText('Carlos Ortiz')).toBeTruthy()
    expect(screen.queryByText('Filial Desvinculada')).toBeNull()
    expect(screen.getByText(/Mostrando 1–1 de 1 itens/)).toBeTruthy()
  })

  it('pagina em 10 itens por página com rodapé Mostrando 1–10 de X itens', async () => {
    // 12 beneficiárias distribuídas em 2 grupos => 14 linhas => 2 páginas
    const muitas = Array.from({ length: 12 }).map((_, i) => ({
      id: `ben-${i + 1}`,
      credencial_id: i % 2 === 0 ? 'cred-1' : 'cred-2',
      uc: `9000000000${i}`,
      rotulo: `Beneficiária ${i + 1}`,
      percentual: 5,
    }))

    global.fetch = vi.fn().mockImplementation((url: RequestInfo | URL) => {
      const urlStr = String(url)
      if (urlStr.includes('/backend/v1/rge/beneficiarias-uc')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ ok: true, itens: muitas }),
        })
      }
      if (urlStr.includes('/backend/v1/rge/credenciais')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ ok: true, itens: mockCredenciais }),
        })
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ ok: true, itens: [] }),
      })
    }) as unknown as typeof fetch

    render(<IntegracoesRgePage />)
    await abrirBeneficiarias()

    expect(screen.getByText(/Mostrando 1–10 de 14 itens/)).toBeTruthy()
    const btn2 = screen.getByRole('button', { name: '2' })
    fireEvent.click(btn2)

    expect(await screen.findByText('Beneficiária 12')).toBeTruthy()
    expect(screen.getByText(/Mostrando 11–14 de 14 itens/)).toBeTruthy()
  })

  it('abre o modal de nova beneficiária ao clicar em Adicionar unidade beneficiária', async () => {
    setupFetchMock()
    render(<IntegracoesRgePage />)

    await abrirBeneficiarias()

    const btnAdd = await screen.findByRole('button', { name: /Adicionar unidade beneficiária/i })
    fireEvent.click(btnAdd)

    expect(await screen.findByText('Adicionar unidade beneficiária')).toBeTruthy()
    expect(screen.getByText('Nova unidade beneficiária')).toBeTruthy()
    expect(screen.getByLabelText(/Nome \/ endereço da unidade/)).toBeTruthy()
    expect(screen.getByLabelText(/Nº da UC/)).toBeTruthy()
    expect(screen.getByLabelText(/Distribuição \(%\)/)).toBeTruthy()
  })

  it('salva nova beneficiária com validação de soma até 100%', async () => {
    setupFetchMock()
    render(<IntegracoesRgePage />)

    await abrirBeneficiarias()

    // O grupo do Carlos Ortiz já tem 8% alocados; tentar 95% deve avisar
    fireEvent.click(await screen.findByRole('button', { name: /Adicionar unidade beneficiária/i }))
    expect(await screen.findByText('Nova unidade beneficiária')).toBeTruthy()

    fireEvent.change(screen.getByLabelText(/Nome \/ endereço da unidade/), {
      target: { value: 'Nova Filial' },
    })
    fireEvent.change(screen.getByLabelText(/Nº da UC/), { target: { value: '44444444444' } })
    fireEvent.change(screen.getByLabelText(/Distribuição \(%\)/), { target: { value: '95' } })

    fireEvent.click(screen.getByRole('button', { name: 'Salvar beneficiária' }))

    // Aviso de soma > 100% aparece e nada é salvo antes de confirmar
    expect(await screen.findByText(/somaria 103%/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Salvar beneficiária' })).toBeTruthy()
  })

  it('alterna sub-abas mantendo a busca de beneficiárias', async () => {
    setupFetchMock()
    render(<IntegracoesRgePage />)

    await abrirBeneficiarias()

    fireEvent.click(screen.getByText('UC Beneficiárias desvinculadas'))
    expect(await screen.findByText('Filial Desvinculada')).toBeTruthy()

    fireEvent.click(screen.getByText('Gestão de Beneficiárias'))
    expect(await screen.findByText('Carlos Ortiz')).toBeTruthy()
  })
})
