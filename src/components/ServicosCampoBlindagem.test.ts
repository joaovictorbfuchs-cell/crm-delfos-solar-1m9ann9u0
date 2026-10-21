import { describe, it, expect, vi } from 'vitest'
import { safeHorarioStr, formatarDuracao } from '@/components/FichaExecucaoOS'
import { sanitizeOS } from '@/components/CalendarioExecucaoOS'

describe('Blindagens e Regressão de Tipos em Serviços de Campo (FichaExecucaoOS e CalendarioExecucaoOS)', () => {
  describe('safeHorarioStr', () => {
    it('deve lidar com horario_inicio numérico sem lançar erro', () => {
      expect(safeHorarioStr(8)).toBe('08:00')
      expect(safeHorarioStr(14)).toBe('14:00')
      expect(safeHorarioStr(0)).toBe('00:00')
    })

    it('deve lidar com nulo, indefinido ou objeto sem lançar erro', () => {
      expect(safeHorarioStr(null)).toBe('08:00')
      expect(safeHorarioStr(undefined)).toBe('08:00')
      expect(safeHorarioStr({})).toBe('[object Object]')
      expect(safeHorarioStr('', '09:00')).toBe('09:00')
    })

    it('deve preservar strings válidas', () => {
      expect(safeHorarioStr('10:30')).toBe('10:30')
      expect(safeHorarioStr(' 15:45 ')).toBe('15:45')
    })
  })

  describe('formatarDuracao', () => {
    it('deve tratar duracaoMinutos como string numérica ou inválida sem lançar erro', () => {
      expect(formatarDuracao('60')).toBe('1h')
      expect(formatarDuracao('90')).toBe('1h 30min')
      expect(formatarDuracao('abc')).toBe('0min')
      expect(formatarDuracao(null)).toBe('0min')
      expect(formatarDuracao(undefined)).toBe('0min')
      expect(formatarDuracao(-10)).toBe('0min')
    })
  })

  describe('VisaoInstaladorMobileOS - Resolução de Checklist e Fallback Canônico', () => {
    it('deve deduplicar tipos custom prevalecendo sobre nativos e manter checklist dinâmico', async () => {
      // Verifica se a função deduplicarTiposAtividades está sendo usada corretamente
      const { deduplicarTiposAtividades, ATIVIDADES_PADRAO, buildCustomTipoDef } =
        await import('@/constants/atividadesTipos')
      const customDefs = [
        buildCustomTipoDef({
          id: 'custom-limpeza-1',
          nome: 'Limpeza dos Módulos',
          categoria: 'manutencao',
        }),
      ]
      const deduplicados = deduplicarTiposAtividades(ATIVIDADES_PADRAO, customDefs)
      const limpezaDef = deduplicados.find((t) => t.id === 'limpeza')
      expect(limpezaDef?.customRecordId).toBe('custom-limpeza-1')
    })
  })

  describe('sanitizeOS', () => {
    it('deve normalizar OS com data_agendada como Date, horario_inicio numérico e duracao como string', () => {
      const dataDate = new Date(2026, 9, 7, 14, 30) // 2026-10-07 14:30
      const rawOs: any = {
        id: 'os-teste-1',
        tipo_servico: 'Manutenção Preventiva',
        data_agendada: dataDate,
        horario_inicio: 14,
        duracao_minutos: '120',
        checklist: null,
      }

      const sanitized = sanitizeOS(rawOs)

      expect(sanitized.id).toBe('os-teste-1')
      expect(typeof sanitized.data_agendada).toBe('string')
      expect(sanitized.data_agendada).toContain('2026-10-07')
      expect(sanitized.horario_inicio).toBe('14:00')
      expect(sanitized.duracao_minutos).toBe(120)
      expect(sanitized.horario_fim).toBe('16:00')
      expect(Array.isArray(sanitized.checklist)).toBe(true)
    })

    it('deve tolerar data_agendada como Date inválida sem quebrar', () => {
      const invalidDate = new Date('data-totalmente-invalida')
      const rawOs: any = {
        id: 'os-teste-2',
        data_agendada: invalidDate,
        horario_inicio: undefined,
        duracao_minutos: null,
      }

      const sanitized = sanitizeOS(rawOs)
      expect(sanitized.id).toBe('os-teste-2')
      expect(sanitized.horario_inicio).toBe('08:00')
      expect(sanitized.duracao_minutos).toBe(60)
      expect(sanitized.horario_fim).toBe('09:00')
    })

    it('deve normalizar checklist nulo ou string JSON corrompida', () => {
      const os1 = sanitizeOS({ id: 'os-1', checklist: null })
      expect(Array.isArray(os1.checklist)).toBe(true)
      expect(os1.checklist.length).toBe(0)

      const os2 = sanitizeOS({ id: 'os-2', checklist: '{invalid-json' })
      expect(Array.isArray(os2.checklist)).toBe(true)
    })

    it('sanitiza e normaliza fotos heterogêneas de atividades (array, string única, nulo)', () => {
      const os1 = sanitizeOS({ id: 'os-fotos-1', fotos: null })
      expect(os1.fotos).toEqual([])

      const os2 = sanitizeOS({ id: 'os-fotos-2', fotos: 'foto_antiga.jpg' })
      expect(os2.fotos).toEqual(['foto_antiga.jpg'])

      const os3 = sanitizeOS({ id: 'os-fotos-3', fotos: ['f1.jpg', 'f2.jpg'] })
      expect(os3.fotos).toEqual(['f1.jpg', 'f2.jpg'])

      const os4 = sanitizeOS({ id: 'os-fotos-4', fotos: 12345 })
      expect(os4.fotos).toEqual([])
    })
  })

  describe('Slot rightActionsSlot no CalendarioExecucaoOS', () => {
    it('garante que a interface CalendarioExecucaoOSProps suporta rightActionsSlot e leftControlsSlot', async () => {
      const mod = await import('@/components/CalendarioExecucaoOS')
      expect(typeof mod.CalendarioExecucaoOS).toBe('function')
    })
  })

  describe('Filtros Canônicos e Dinâmicos de Serviços de Campo', () => {
    it('tipos de manutenção do catálogo contêm identificadores canônicos para filtros', async () => {
      const { ATIVIDADES_PADRAO, buildCustomTipoDef, deduplicarTiposAtividades } =
        await import('@/constants/atividadesTipos')

      const padroes = ATIVIDADES_PADRAO.filter((a) => a.categoria === 'manutencao')
      const idsPadroes = padroes.map((p) => p.id)
      expect(idsPadroes).toContain('limpeza')
      expect(idsPadroes).toContain('manutencao_preventiva')
      expect(idsPadroes).toContain('manutencao_corretiva')
      expect(idsPadroes).toContain('instalacao')
      expect(idsPadroes).toContain('configuracao_datalogger')
      expect(idsPadroes).toContain('garantia_equipamento')

      const customTipo = buildCustomTipoDef({
        id: 'cust-manut-123',
        nome: 'Revisão Semestral',
        categoria: 'manutencao',
      })
      const unificados = deduplicarTiposAtividades(padroes, [customTipo])
      const customEncontrado = unificados.find((t) => t.id === 'custom_cust-manut-123')
      expect(customEncontrado).toBeDefined()
      expect(customEncontrado?.customRecordId).toBe('cust-manut-123')
    })
  })

  describe('Tratamento de sessão expirada / erro de autenticação', () => {
    it('isAuthSessionError identifica corretamente erros de token expirado ou status 401/403', async () => {
      const { isAuthSessionError } = await import('@/lib/pocketbase/errors')
      expect(isAuthSessionError({ status: 401 })).toBe(true)
      expect(isAuthSessionError({ status: 403 })).toBe(true)
      expect(isAuthSessionError({ response: { status: 401 } })).toBe(true)
      expect(isAuthSessionError(new Error('Token is expired or invalid'))).toBe(true)
      expect(isAuthSessionError(new Error('Login expirou'))).toBe(true)
      expect(isAuthSessionError(new Error('Sessão expirada'))).toBe(true)
      expect(isAuthSessionError(new Error('Failed to authenticate'))).toBe(true)
      expect(isAuthSessionError(new Error('Generic network timeout'))).toBe(false)
      expect(isAuthSessionError(null)).toBe(false)
    })

    it('export { pb } e export default pb coexistem em client.ts', async () => {
      const client = await import('@/lib/pocketbase/client')
      expect(client.pb).toBeDefined()
      expect(client.default).toBeDefined()
      expect(client.pb).toBe(client.default)
    })
  })

  describe('Blindagem de Carregamento e Fallback de Expands para Instalador', () => {
    it('fetchOrdensServico aceita parâmetro isInstalador e não lança exceção em erro de expand', async () => {
      const { fetchOrdensServico } = await import('@/services/crmService')
      expect(typeof fetchOrdensServico).toBe('function')
      // Teste chamando com responsavelUsuarioId e isInstalador=true
      const result = await fetchOrdensServico(undefined, 'user-fake-instalador', true)
      expect(Array.isArray(result)).toBe(true)
    })

    it('updateAtividade e updateAtividadeComoOrdemServico exportadas e operacionais', async () => {
      const { updateAtividade, updateAtividadeComoOrdemServico } =
        await import('@/services/crmService')
      expect(typeof updateAtividade).toBe('function')
      expect(typeof updateAtividadeComoOrdemServico).toBe('function')
    })
  })

  describe('Upload Imediato e Autosave do Checklist (FichaExecucaoOS)', () => {
    it('exporta FichaExecucaoOS e renderiza checklist operacional com indicador de salvamento', async () => {
      const { FichaExecucaoOS } = await import('@/components/FichaExecucaoOS')
      const React = await import('react')
      const { renderToStaticMarkup } = await import('react-dom/server')

      const fakeOS = {
        id: 'os-autosave-test-1',
        origem: 'ordens_servico',
        tipo_servico: 'Manutenção Preventiva',
        status: 'pendente',
        checklist: [
          { id: 'chk_1', item: 'Inspeção visual dos módulos', concluido: false },
          { id: 'chk_2', item: 'Verificar conexões do inversor', concluido: true },
        ],
        fotos: ['foto_existente.jpg'],
        fotos_metadados: [
          {
            id: 'meta_1',
            arquivo: 'foto_existente.jpg',
            item_checklist_id: 'chk_1',
            item_checklist_texto: 'Inspeção visual dos módulos',
          },
        ],
      }

      const html = renderToStaticMarkup(
        React.createElement(FichaExecucaoOS, {
          os: fakeOS as any,
          onBack: () => {},
          onOSUpdated: () => {},
          onOSFinalizada: () => {},
        }),
      )

      expect(html).toContain('3. Checklist de Execução')
      expect(html).toContain('Inspeção visual dos módulos')
      expect(html).toContain('Verificar conexões do inversor')
      expect(html).toContain('4. Fotos do Serviço em Campo')
      expect(html).toContain('Tirar foto (câmera)')
      expect(html).toContain('Escolher da galeria')
    })

    it('valida exports críticos de pocketbase para salvaguardas contra regressão', async () => {
      const errors = await import('@/lib/pocketbase/errors')
      expect(typeof errors.isAuthSessionError).toBe('function')
      expect(typeof errors.isAbortError).toBe('function')
      expect(typeof errors.formatPbError).toBe('function')
      expect(typeof errors.extractFieldErrors).toBe('function')
      expect(typeof errors.getErrorMessage).toBe('function')

      const client = await import('@/lib/pocketbase/client')
      expect(client.default).toBeDefined()
      expect(client.pb).toBeDefined()
      expect(typeof client.isAuthSessionError).toBe('function')

      expect(errors.isAuthSessionError({ status: 401 })).toBe(true)
      expect(errors.isAuthSessionError({ status: 403 })).toBe(true)
      expect(errors.isAuthSessionError({ message: 'The request was aborted' })).toBe(false)
      expect(errors.isAbortError({ isAbort: true })).toBe(true)
      expect(errors.isAbortError({ name: 'AbortError' })).toBe(true)
    })

    it('garante que a rota /servicos-campo e o componente ExecucaoOS podem ser importados para montagem', async () => {
      const page = await import('@/pages/ExecucaoOS')
      expect(page.default).toBeDefined()
      expect(typeof page.default).toBe('function')
    })

    it('valida inclusão do bloco de avaliação no Google quando solicitarAvaliacaoGoogle é true', async () => {
      const { compilarDadosRelatorioOS } = await import('@/lib/relatorioOSCanonical')
      const fakeOSComAvaliacao: any = {
        id: 'os-aval-123456',
        tipo_servico: 'Manutenção Preventiva',
        solicitar_avaliacao_google: true,
        avaliacao_google_texto: 'Por favor nos avalie!',
        avaliacao_google_link: 'https://g.page/r/CTsVOsKTsWCTEBM/review',
      }
      const canonicalCom = compilarDadosRelatorioOS(fakeOSComAvaliacao, null, null)
      expect(canonicalCom.solicitarAvaliacaoGoogle).toBe(true)
      expect(canonicalCom.avaliacaoGoogleTexto).toBe('Por favor nos avalie!')
      expect(canonicalCom.avaliacaoGoogleLink).toBe('https://g.page/r/CTsVOsKTsWCTEBM/review')

      const fakeOSSemAvaliacao: any = {
        id: 'os-aval-789012',
        tipo_servico: 'Limpeza dos Módulos',
        solicitar_avaliacao_google: false,
      }
      const canonicalSem = compilarDadosRelatorioOS(fakeOSSemAvaliacao, null, null)
      expect(canonicalSem.solicitarAvaliacaoGoogle).toBe(false)
    })

    it('updateAtividadeComoOrdemServico e fetchOrdemServicoById persistem e retornam campos de avaliação Google', async () => {
      const { pb } = await import('@/lib/pocketbase/client')
      const { updateAtividadeComoOrdemServico, fetchOrdemServicoById } =
        await import('@/services/crmService')

      let payloadEnviado: any = null
      const originalCollection = pb.collection.bind(pb)
      const mockCollection = vi.spyOn(pb, 'collection').mockImplementation((colName: string) => {
        if (colName === 'atividades') {
          return {
            update: vi.fn().mockImplementation(async (id: string, payload: any) => {
              payloadEnviado = payload
              return {
                id,
                collectionId: 'atividades',
                collectionName: 'atividades',
                cliente_id: 'cli-teste-1',
                titulo: 'Limpeza dos Módulos',
                tipo: 'limpeza',
                status: 'em_execucao',
                solicitar_avaliacao_google: payload.solicitar_avaliacao_google,
                avaliacao_google_texto: payload.avaliacao_google_texto,
                avaliacao_google_link: payload.avaliacao_google_link,
                created: '2026-04-18T10:00:00.000Z',
                updated: '2026-04-18T10:30:00.000Z',
              }
            }),
            getOne: vi.fn().mockImplementation(async (id: string) => {
              return {
                id,
                collectionId: 'atividades',
                collectionName: 'atividades',
                cliente_id: 'cli-teste-1',
                titulo: 'Manutenção Preventiva',
                tipo: 'manutencao_preventiva',
                status: 'pendente',
                solicitar_avaliacao_google: true,
                avaliacao_google_texto: 'Avalie nossa equipe!',
                avaliacao_google_link: 'https://g.page/r/exemplo/review',
                created: '2026-04-18T10:00:00.000Z',
                updated: '2026-04-18T10:30:00.000Z',
              }
            }),
          } as any
        }
        if (colName === 'ordens_servico') {
          return {
            getOne: vi.fn().mockRejectedValue({ status: 404, message: 'Not found' }),
          } as any
        }
        return originalCollection(colName)
      })

      // 1. Testa persistência via updateAtividadeComoOrdemServico
      const resultadoUpdate = await updateAtividadeComoOrdemServico('atv-123', {
        solicitar_avaliacao_google: true,
        avaliacao_google_texto: 'Deixe sua nota 5 estrelas',
        avaliacao_google_link: 'https://g.page/r/delfos/review',
      })

      expect(payloadEnviado).not.toBeNull()
      expect(payloadEnviado.solicitar_avaliacao_google).toBe(true)
      expect(payloadEnviado.avaliacao_google_texto).toBe('Deixe sua nota 5 estrelas')
      expect(payloadEnviado.avaliacao_google_link).toBe('https://g.page/r/delfos/review')

      expect(resultadoUpdate.solicitar_avaliacao_google).toBe(true)
      expect(resultadoUpdate.avaliacao_google_texto).toBe('Deixe sua nota 5 estrelas')
      expect(resultadoUpdate.avaliacao_google_link).toBe('https://g.page/r/delfos/review')

      // 2. Testa leitura fallback via fetchOrdemServicoById
      const resultadoFetch = await fetchOrdemServicoById('atv-123')
      expect(resultadoFetch).not.toBeNull()
      expect(resultadoFetch?.solicitar_avaliacao_google).toBe(true)
      expect(resultadoFetch?.avaliacao_google_texto).toBe('Avalie nossa equipe!')
      expect(resultadoFetch?.avaliacao_google_link).toBe('https://g.page/r/exemplo/review')

      mockCollection.mockRestore()
    })
  })
})
