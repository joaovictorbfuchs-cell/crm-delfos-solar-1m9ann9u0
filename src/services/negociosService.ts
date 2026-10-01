import pb from '@/lib/pocketbase/client'
import type { Negocio, TipoNegocioSelect, EtapaFunilSelect, NegocioStatus } from '@/types/crm'

export type CreateNegocioInput = {
  cliente_id: string
  titulo?: string
  tipo_negocio?: TipoNegocioSelect
  tipo_venda?: string
  valor?: number
  valor_estimado?: number
  valor_final?: number
  recorrencia_mensal?: boolean
  etapa_funil?: EtapaFunilSelect
  probabilidade?: number
  data_previsao_fechamento?: string
  data_fechamento?: string
  status?: NegocioStatus
  motivo_perda?: string
  reabertura?: boolean
  motivo_reabertura?: string
  condicao_pagamento?: string
  consultor_responsavel?: string
}

export type UpdateNegocioInput = Partial<CreateNegocioInput>

/**
 * Busca todos os negócios de um cliente ordenados pelo mais recente.
 */
export async function fetchNegociosByClienteId(clienteId: string): Promise<Negocio[]> {
  try {
    const records = await pb.collection('negocios').getFullList<Negocio>({
      filter: `cliente_id = "${clienteId}"`,
      sort: '-created',
      requestKey: null,
    })
    return records
  } catch (error) {
    console.error(`Erro ao buscar negócios do cliente ${clienteId}:`, error)
    return []
  }
}

/**
 * Busca todos os negócios do sistema (geral).
 */
export const fetchNegocios = fetchAllNegocios

export async function fetchAllNegocios(): Promise<Negocio[]> {
  try {
    const records = await pb.collection('negocios').getFullList<Negocio>({
      sort: '-created',
      expand: 'cliente_id',
      requestKey: null,
    })
    return records
  } catch (error) {
    console.error('Erro ao buscar todos os negócios:', error)
    return []
  }
}

/**
 * Busca um negócio por ID.
 */
export async function getNegocioById(id: string): Promise<Negocio> {
  return await pb.collection('negocios').getOne<Negocio>(id, {
    expand: 'cliente_id',
    requestKey: null,
  })
}

/**
 * Cria um novo negócio vinculado a um cliente.
 */
export async function createNegocio(data: CreateNegocioInput): Promise<Negocio> {
  const payload: Record<string, any> = {
    cliente_id: data.cliente_id,
    titulo: data.titulo || 'Negócio Comercial',
    tipo_negocio: data.tipo_negocio || 'venda usina',
    tipo_venda: data.tipo_venda || 'Energia Solar',
    valor_estimado: data.valor_estimado ?? 0,
    valor_final: data.valor_final ?? 0,
    valor:
      data.valor ??
      (data.valor_final && data.valor_final > 0 ? data.valor_final : (data.valor_estimado ?? 0)),
    etapa_funil: data.etapa_funil || 'novo lead',
    probabilidade: data.probabilidade ?? 10,
    status: data.status || 'em andamento',
    reabertura: Boolean(data.reabertura),
    recorrencia_mensal: Boolean(data.recorrencia_mensal),
  }

  if (data.data_previsao_fechamento) {
    payload.data_previsao_fechamento = data.data_previsao_fechamento
  }
  if (data.data_fechamento) {
    payload.data_fechamento = data.data_fechamento
  }
  if (data.motivo_perda) {
    payload.motivo_perda = data.motivo_perda
  }
  if (data.motivo_reabertura) {
    payload.motivo_reabertura = data.motivo_reabertura
  }
  if (data.condicao_pagamento) {
    payload.condicao_pagamento = data.condicao_pagamento
  }
  if (data.consultor_responsavel) {
    payload.consultor_responsavel = data.consultor_responsavel
  }

  return await pb.collection('negocios').create<Negocio>(payload, {
    expand: 'cliente_id,consultor_responsavel',
  })
}

/**
 * Atualiza um negócio existente.
 */
export async function updateNegocio(id: string, data: UpdateNegocioInput): Promise<Negocio> {
  return await pb.collection('negocios').update<Negocio>(id, data, {
    expand: 'cliente_id,consultor_responsavel',
  })
}

/**
 * Exclui um negócio individual.
 * ATENÇÃO: Exclui APENAS o negócio. O cliente vinculado permanece 100% intacto no cadastro.
 */
export async function deleteNegocio(id: string): Promise<boolean> {
  return await pb.collection('negocios').delete(id)
}

export interface BulkDeleteNegociosResult {
  total: number
  successCount: number
  failedCount: number
  failedIds: string[]
  firstErrorMessage?: string
}

/**
 * Exclui múltiplos negócios em lote com controle de taxa (concorrência limitada e retries com backoff).
 * ATENÇÃO: Exclui APENAS os registros de negócios. Os clientes permanecem 100% intactos.
 *
 * Utiliza concorrência controlada (ex.: 6 requisições simultâneas) e retentativas exponenciais
 * em caso de rate limit (HTTP 429) ou erros transitórios de rede, evitando estouro de cota e rejeições em massa.
 */
export async function bulkDeleteNegocios(
  negocioIds: string[],
  options?: {
    concurrency?: number
    onProgress?: (progress: { completed: number; total: number; failed: number }) => void
  },
): Promise<BulkDeleteNegociosResult> {
  const ids = Array.isArray(negocioIds) ? Array.from(new Set(negocioIds.filter(Boolean))) : []
  const total = ids.length
  if (total === 0) {
    return {
      total: 0,
      successCount: 0,
      failedCount: 0,
      failedIds: [],
    }
  }

  const concurrency = Math.max(1, Math.min(options?.concurrency ?? 6, 12))
  const failedItems: Array<{ id: string; error: unknown; message: string }> = []
  let completed = 0
  let cursor = 0

  async function deleteOneWithRetry(id: string): Promise<void> {
    const maxRetries = 3
    let attempt = 0
    let delay = 300

    while (attempt <= maxRetries) {
      try {
        await pb.collection('negocios').delete(id, { requestKey: null })
        return
      } catch (err: any) {
        attempt++
        const status = err?.status || err?.statusCode
        // 404 significa que já foi excluído anteriormente — tratamos como sucesso idempotente
        if (status === 404) {
          return
        }

        const isRateLimit = status === 429
        const isNetworkErr =
          status === 0 ||
          err?.name === 'TypeError' ||
          /failed to fetch|network|timeout/i.test(String(err?.message || ''))
        const isServerTransient = status >= 500 && status < 600

        const canRetry = attempt <= maxRetries && (isRateLimit || isNetworkErr || isServerTransient)
        if (!canRetry) {
          // Extrai mensagem real do PocketBase / Error
          let msg = 'Erro desconhecido'
          if (err?.message) {
            msg = String(err.message)
          }
          if (err?.response?.message) {
            msg = String(err.response.message)
          }
          if (status === 429) {
            msg = 'Limite de requisições excedido (429)'
          }
          failedItems.push({ id, error: err, message: msg })
          return
        }

        // Backoff exponencial com jitter para rate limits
        const jitter = Math.floor(Math.random() * 150)
        const waitMs = isRateLimit ? delay * 2 + jitter : delay + jitter
        await new Promise((resolve) => setTimeout(resolve, waitMs))
        delay *= 1.8
      }
    }
  }

  // Fila concorrente limitada
  const workers = Array.from({ length: Math.min(concurrency, total) }, async () => {
    while (cursor < total) {
      const idx = cursor++
      const id = ids[idx]
      await deleteOneWithRetry(id)
      completed++
      if (options?.onProgress) {
        options.onProgress({
          completed,
          total,
          failed: failedItems.length,
        })
      }
    }
  })

  await Promise.all(workers)

  const failedCount = failedItems.length
  const successCount = total - failedCount
  const firstErrorMessage = failedItems[0]?.message

  if (failedCount > 0) {
    const reasonsSummary = failedItems
      .slice(0, 5)
      .map((f) => `ID ${f.id}: ${f.message}`)
      .join('; ')
    console.error(
      `Falha ao excluir ${failedCount} de ${total} negócios. Exemplos de motivo: ${reasonsSummary}`,
      failedItems.map((f) => ({ id: f.id, message: f.message, status: (f.error as any)?.status })),
    )

    const err = new Error(
      `Falha ao excluir ${failedCount} de ${total} negócio(s). ${firstErrorMessage ? `Motivo: ${firstErrorMessage}` : ''}`,
    )
    ;(err as any).result = {
      total,
      successCount,
      failedCount,
      failedIds: failedItems.map((f) => f.id),
      firstErrorMessage,
    }
    throw err
  }

  return {
    total,
    successCount,
    failedCount: 0,
    failedIds: [],
  }
}
