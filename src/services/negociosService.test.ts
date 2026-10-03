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
})
