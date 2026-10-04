import { describe, it, expect, vi, beforeEach } from 'vitest'
import { bulkDeleteNegocios } from './negociosService'
import pb from '@/lib/pocketbase/client'

describe('bulkDeleteNegocios', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('retorna resultado zerado quando lista for vazia', async () => {
    const res = await bulkDeleteNegocios([])
    expect(res).toEqual({
      total: 0,
      successCount: 0,
      failedCount: 0,
      failedIds: [],
    })
  })

  it('exclui múltiplos negócios com sucesso e em lotes controlados', async () => {
    const deleteMock = vi.fn().mockResolvedValue(true)
    vi.spyOn(pb, 'collection').mockReturnValue({
      delete: deleteMock,
    } as any)

    const ids = ['neg-1', 'neg-2', 'neg-3', 'neg-4', 'neg-5']
    const res = await bulkDeleteNegocios(ids, { concurrency: 2 })

    expect(deleteMock).toHaveBeenCalledTimes(5)
    expect(res.total).toBe(5)
    expect(res.successCount).toBe(5)
    expect(res.failedCount).toBe(0)
  })

  it('trata status 404 como exclusão idempotente bem-sucedida', async () => {
    const deleteMock = vi.fn().mockImplementation((id: string) => {
      if (id === 'neg-already-deleted') {
        const err = new Error('Record not found') as any
        err.status = 404
        return Promise.reject(err)
      }
      return Promise.resolve(true)
    })

    vi.spyOn(pb, 'collection').mockReturnValue({
      delete: deleteMock,
    } as any)

    const ids = ['neg-1', 'neg-already-deleted']
    const res = await bulkDeleteNegocios(ids)

    expect(res.successCount).toBe(2)
    expect(res.failedCount).toBe(0)
  })

  it('faz retry automático em rate limit 429 e sucede', async () => {
    let callCount = 0
    const deleteMock = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        const err = new Error('Too Many Requests') as any
        err.status = 429
        return Promise.reject(err)
      }
      return Promise.resolve(true)
    })

    vi.spyOn(pb, 'collection').mockReturnValue({
      delete: deleteMock,
    } as any)

    const res = await bulkDeleteNegocios(['neg-rate-limited'], { concurrency: 1 })

    expect(callCount).toBe(2)
    expect(res.successCount).toBe(1)
    expect(res.failedCount).toBe(0)
  })

  it('lança erro legível e com detalhes estruturados ao esgotar retries', async () => {
    const deleteMock = vi.fn().mockImplementation((id: string) => {
      const err = new Error(`Permissão negada ao excluir ${id}`) as any
      err.status = 403
      return Promise.reject(err)
    })

    vi.spyOn(pb, 'collection').mockReturnValue({
      delete: deleteMock,
    } as any)

    await expect(bulkDeleteNegocios(['neg-fail-1', 'neg-fail-2'])).rejects.toThrow(
      /Falha ao excluir 2 de 2 negócio\(s\)\. Motivo: Permissão negada/,
    )
  })
})

describe('createNegocio sanitização de payload', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('omite consultor_responsavel se vazio ou não informado, e expande apenas cliente_id', async () => {
    const { createNegocio } = await import('./negociosService')
    const createMock = vi.fn().mockImplementation((payload, options) => {
      return Promise.resolve({ id: 'neg-123', ...payload, ...options })
    })

    vi.spyOn(pb, 'collection').mockReturnValue({
      create: createMock,
    } as any)

    await createNegocio({
      cliente_id: 'cli-test',
      titulo: 'Negócio Teste',
      consultor_responsavel: '',
      tipo_negocio: 'venda usina',
      etapa_funil: 'novo lead',
    })

    expect(createMock).toHaveBeenCalledTimes(1)
    const [payload, options] = createMock.mock.calls[0]
    expect(payload.consultor_responsavel).toBeUndefined()
    expect(payload.cliente_id).toBe('cli-test')
    expect(payload.tipo_negocio).toBe('venda usina')
    expect(payload.etapa_funil).toBe('novo lead')
    expect(payload.status).toBe('em andamento')
    expect(payload.tipo_venda).toBe('Energia Solar')
    expect(options.expand).toBe('cliente_id')
  })

  it('inclui consultor_responsavel quando válido e expande cliente_id,consultor_responsavel', async () => {
    const { createNegocio } = await import('./negociosService')
    const createMock = vi.fn().mockImplementation((payload, options) => {
      return Promise.resolve({ id: 'neg-123', ...payload, ...options })
    })

    vi.spyOn(pb, 'collection').mockReturnValue({
      create: createMock,
    } as any)

    await createNegocio({
      cliente_id: 'cli-test',
      consultor_responsavel: 'user-456',
      data_previsao_fechamento: '2026-12-15',
    })

    const [payload, options] = createMock.mock.calls[0]
    expect(payload.consultor_responsavel).toBe('user-456')
    expect(payload.data_previsao_fechamento).toBe('2026-12-15 12:00:00.000Z')
    expect(options.expand).toBe('cliente_id,consultor_responsavel')
  })

  it('normaliza selects e coerção de valores numéricos', async () => {
    const { createNegocio } = await import('./negociosService')
    const createMock = vi.fn().mockImplementation((payload) => {
      return Promise.resolve({ id: 'neg-123', ...payload })
    })

    vi.spyOn(pb, 'collection').mockReturnValue({
      create: createMock,
    } as any)

    await createNegocio({
      cliente_id: 'cli-test',
      tipo_negocio: 'Energia Solar' as any,
      valor_estimado: '55000.5' as any,
      valor_final: '50000' as any,
      probabilidade: '75' as any,
    })

    const [payload] = createMock.mock.calls[0]
    expect(payload.tipo_negocio).toBe('venda usina')
    expect(payload.valor_estimado).toBe(55000.5)
    expect(payload.valor_final).toBe(50000)
    expect(payload.valor).toBe(50000)
    expect(payload.probabilidade).toBe(75)
  })
})

describe('executarVarreduraELimpezaNegocios', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('identifica e separa negócios dentro e fora do funil comercial', async () => {
    const { executarVarreduraELimpezaNegocios } = await import('./negociosService')

    const mockNegocios = [
      {
        id: 'neg-valido',
        titulo: 'Negócio Válido',
        status: 'em andamento',
        etapa_funil: 'qualificado',
        expand: {
          cliente_id: {
            id: 'cli-1',
            nome: 'Cliente Normal',
            arquivado: false,
            transferido_pos_vendas: false,
          },
        },
      },
      {
        id: 'neg-fora-posvendas',
        titulo: 'Negócio de Pós Vendas',
        status: 'em andamento',
        etapa_funil: 'novo lead',
        expand: {
          cliente_id: {
            id: 'cli-2',
            nome: 'Cliente Pós Vendas',
            arquivado: false,
            transferido_pos_vendas: true,
          },
        },
      },
      {
        id: 'neg-fora-arquivado',
        titulo: 'Negócio Arquivado',
        status: 'em andamento',
        etapa_funil: 'proposta enviada',
        expand: {
          cliente_id: {
            id: 'cli-3',
            nome: 'Cliente Arquivado',
            arquivado: true,
            transferido_pos_vendas: false,
          },
        },
      },
    ]

    const deleteMock = vi.fn().mockResolvedValue(true)
    vi.spyOn(pb, 'collection').mockReturnValue({
      getFullList: vi.fn().mockResolvedValue(mockNegocios),
      delete: deleteMock,
    } as any)

    const dryRes = await executarVarreduraELimpezaNegocios({ dryRun: true })
    expect(dryRes.totalEmAbertoAnalisados).toBe(3)
    expect(dryRes.totalDentroDoFunil).toBe(1)
    expect(dryRes.totalForaDoFunil).toBe(2)
    expect(dryRes.negociosIdentificados).toHaveLength(2)
    expect(dryRes.negociosApagados).toHaveLength(0)
    expect(deleteMock).not.toHaveBeenCalled()

    const execRes = await executarVarreduraELimpezaNegocios({ dryRun: false })
    expect(execRes.totalForaDoFunil).toBe(2)
    expect(execRes.negociosApagados).toHaveLength(2)
    expect(deleteMock).toHaveBeenCalledTimes(2)
  })

  it('isNegocioDentroDoFunil e filtrarNegociosDentroDoFunil aplicam exatamente as regras do funil comercial', async () => {
    const { isNegocioDentroDoFunil, filtrarNegociosDentroDoFunil } =
      await import('./negociosService')

    const negAtivo1 = {
      id: 'neg-1',
      status: 'em andamento',
      etapa_funil: 'qualificado',
      expand: { cliente_id: { id: 'c1', arquivado: false, transferido_pos_vendas: false } },
    } as any

    const negAtivo2 = {
      id: 'neg-2',
      status: 'em andamento',
      etapa_funil: 'novo lead',
      expand: { cliente_id: { id: 'c2', arquivado: false, transferido_pos_vendas: false } },
    } as any

    const negGanho = {
      id: 'neg-3',
      status: 'ganho',
      etapa_funil: 'contrato assinado',
      expand: { cliente_id: { id: 'c3', arquivado: false, transferido_pos_vendas: false } },
    } as any

    const negPerdido = {
      id: 'neg-4',
      status: 'perdido',
      etapa_funil: 'proposta enviada',
      expand: { cliente_id: { id: 'c4', arquivado: false, transferido_pos_vendas: false } },
    } as any

    const negArquivado = {
      id: 'neg-5',
      status: 'em andamento',
      etapa_funil: 'proposta enviada',
      expand: { cliente_id: { id: 'c5', arquivado: true, transferido_pos_vendas: false } },
    } as any

    const negPosVendas = {
      id: 'neg-6',
      status: 'em andamento',
      etapa_funil: 'negociação',
      expand: { cliente_id: { id: 'c6', arquivado: false, transferido_pos_vendas: true } },
    } as any

    expect(isNegocioDentroDoFunil(negAtivo1)).toBe(true)
    expect(isNegocioDentroDoFunil(negAtivo2)).toBe(true)
    expect(isNegocioDentroDoFunil(negGanho)).toBe(false)
    expect(isNegocioDentroDoFunil(negPerdido)).toBe(false)
    expect(isNegocioDentroDoFunil(negArquivado)).toBe(false)
    expect(isNegocioDentroDoFunil(negPosVendas)).toBe(false)

    const filtrados = filtrarNegociosDentroDoFunil([
      negAtivo1,
      negAtivo2,
      negGanho,
      negPerdido,
      negArquivado,
      negPosVendas,
    ])
    expect(filtrados).toHaveLength(2)
    expect(filtrados.map((n) => n.id)).toEqual(['neg-1', 'neg-2'])
  })
})
