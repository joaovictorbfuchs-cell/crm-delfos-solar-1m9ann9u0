import pb from '@/lib/pocketbase/client'
import type { TipoClienteProjecao } from '@/data/planilhaBaseProjecao'

export interface ProjecaoTarifariaRecord {
  id: string
  ano: number
  tipo_cliente: TipoClienteProjecao
  tarifa_kwh: number
  fio_b_kwh: number
  fs: number // Fator de simultaneidade (ex: 0.3 ou 0.7)
  gd_eco_liquida: number
  economia_acumulada?: number
  gasto_acumulado?: number
  created?: string
  updated?: string
}

export interface ProjecaoTarifariaItemInput {
  ano: number
  tipo_cliente: TipoClienteProjecao
  tarifa_kwh: number
  fio_b_kwh: number
  fs: number
  gd_eco_liquida: number
  economia_acumulada?: number
  gasto_acumulado?: number
}

const COLLECTION_NAME = 'projecao_tarifaria'

/**
 * Busca todos os registros de projeção tarifária ordenados por ano crescente.
 * Opcionalmente filtra por tipo_cliente ('residencial' ou 'comercial').
 */
export async function fetchProjecoesTarifarias(
  tipoCliente?: TipoClienteProjecao,
): Promise<ProjecaoTarifariaRecord[]> {
  try {
    const filter = tipoCliente ? `tipo_cliente = '${tipoCliente}'` : ''
    const records = await pb.collection(COLLECTION_NAME).getFullList<ProjecaoTarifariaRecord>({
      filter: filter || undefined,
      sort: 'ano',
      requestKey: null,
    })
    return records
  } catch (error) {
    console.warn('Erro ao buscar projecao_tarifaria do PocketBase:', error)
    return []
  }
}

/**
 * Conta quantos registros existem para cada tipo de cliente.
 */
export async function countProjecoesTarifarias(): Promise<{
  residencial: number
  comercial: number
  total: number
}> {
  try {
    const records = await pb.collection(COLLECTION_NAME).getFullList<ProjecaoTarifariaRecord>({
      fields: 'id,tipo_cliente',
      requestKey: null,
    })
    let residencial = 0
    let comercial = 0
    for (const r of records) {
      if (r.tipo_cliente === 'residencial') residencial++
      else if (r.tipo_cliente === 'comercial') comercial++
    }
    return {
      residencial,
      comercial,
      total: records.length,
    }
  } catch (error) {
    console.warn('Erro ao contar projecao_tarifaria:', error)
    return { residencial: 0, comercial: 0, total: 0 }
  }
}

/**
 * Remove todos os registros de um determinado tipo de cliente (ou todos, se não informado).
 */
/**
 * Utilitário de espera (delay em milissegundos).
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Verifica se um erro ou status representa rate limiting HTTP 429 ("Too Many Requests").
 */
function isRateLimitError(err: unknown): boolean {
  if (!err) return false
  if (typeof err === 'object') {
    const errorObj = err as {
      status?: number
      statusCode?: number
      response?: { status?: number }
      message?: string
    }
    if (
      errorObj.status === 429 ||
      errorObj.statusCode === 429 ||
      errorObj.response?.status === 429
    ) {
      return true
    }
    const msg = errorObj.message || ''
    if (msg.includes('429') || /too many requests/i.test(msg)) {
      return true
    }
  }
  return false
}

/**
 * Executa uma operação com retry automático e backoff exponencial em caso de erro 429 (Too Many Requests).
 */
async function executeWithRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number
    initialBackoffMs?: number
    maxBackoffMs?: number
    description?: string
  } = {},
): Promise<T> {
  const maxRetries = options.maxRetries ?? 5
  let backoffMs = options.initialBackoffMs ?? 300
  const maxBackoffMs = options.maxBackoffMs ?? 3000

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (err: unknown) {
      const is429 = isRateLimitError(err)
      const hasRetriesLeft = attempt < maxRetries

      if (is429 && hasRetriesLeft) {
        // Tentar ler header retry-after se houver
        let waitTime = backoffMs + Math.floor(Math.random() * 80) // jitter
        if (typeof err === 'object' && err !== null) {
          const resp = (err as { response?: { headers?: Record<string, string> } }).response
          const retryHeader = resp?.headers?.['retry-after']
          if (retryHeader) {
            const parsed = parseInt(retryHeader, 10)
            if (!isNaN(parsed) && parsed > 0) {
              waitTime = parsed * 1000
            }
          }
        }
        console.warn(
          `[projecaoTarifaria] Rate limit 429 detectado (${options.description || 'operação'}). Tentativa ${attempt + 1}/${maxRetries}. Aguardando ${waitTime}ms...`,
        )
        await sleep(waitTime)
        backoffMs = Math.min(backoffMs * 2, maxBackoffMs)
        continue
      }
      throw err
    }
  }
  throw new Error('Falha após múltiplas tentativas com retry')
}

/**
 * Remove todos os registros de um determinado tipo de cliente (ou todos, se não informado).
 * Inclui pequenas pausas entre as deleções e retry com backoff para prevenir erros 429.
 */
export async function clearProjecoesTarifarias(tipoCliente?: TipoClienteProjecao): Promise<number> {
  const filter = tipoCliente ? `tipo_cliente = '${tipoCliente}'` : ''
  const records = await executeWithRetry(
    () =>
      pb.collection(COLLECTION_NAME).getFullList<ProjecaoTarifariaRecord>({
        filter: filter || undefined,
        fields: 'id',
        requestKey: null,
      }),
    { description: 'buscar registros para limpar' },
  )

  let count = 0
  for (const record of records) {
    try {
      await executeWithRetry(() => pb.collection(COLLECTION_NAME).delete(record.id), {
        description: `deletar ${record.id}`,
      })
      count++
      // Pausa defensiva de 80ms entre deleções
      await sleep(80)
    } catch (err) {
      console.warn(`Erro ao deletar registro ${record.id} de projecao_tarifaria:`, err)
    }
  }
  return count
}

export interface SaveProjecoesOptions {
  replaceExistingForType?: boolean
  delayBetweenItemsMs?: number
  onProgress?: (current: number, total: number) => void
}

/**
 * Salva uma lista de projeções tarifárias com controle de taxa e retry exponencial para 429.
 * Se replaceExistingForType = true (padrão), apaga antes os registros existentes
 * daquele(s) tipo(s) para garantir idempotência e evitar duplicações.
 */
export async function saveProjecoesTarifarias(
  items: ProjecaoTarifariaItemInput[],
  options: SaveProjecoesOptions = {},
): Promise<{ success: boolean; inserted: number; errors: string[] }> {
  const { replaceExistingForType = true, delayBetweenItemsMs = 150, onProgress } = options

  if (!items || items.length === 0) {
    return { success: true, inserted: 0, errors: [] }
  }

  // Descobrir quais tipos de cliente estão presentes no lote
  const tiposPresentes = Array.from(new Set(items.map((i) => i.tipo_cliente)))

  if (replaceExistingForType) {
    for (const tipo of tiposPresentes) {
      await clearProjecoesTarifarias(tipo)
      // Pequeno descanso após limpeza da base daquele tipo
      await sleep(120)
    }
  }

  let inserted = 0
  const errors: string[] = []
  const total = items.length

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    try {
      await executeWithRetry(
        () =>
          pb.collection(COLLECTION_NAME).create(
            {
              ano: item.ano,
              tipo_cliente: item.tipo_cliente,
              tarifa_kwh: item.tarifa_kwh,
              fio_b_kwh: item.fio_b_kwh,
              fs: item.fs,
              gd_eco_liquida: item.gd_eco_liquida,
              economia_acumulada: item.economia_acumulada ?? null,
              gasto_acumulado: item.gasto_acumulado ?? null,
            },
            { requestKey: null },
          ),
        {
          description: `criar ano ${item.ano} (${item.tipo_cliente})`,
          maxRetries: 5,
          initialBackoffMs: 350,
        },
      )
      inserted++
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`Ano ${item.ano} (${item.tipo_cliente}): ${msg}`)
    }

    if (onProgress) {
      onProgress(i + 1, total)
    }

    // Intervalo de segurança entre cada criação de registro (ex: ~150ms)
    if (i < items.length - 1 && delayBetweenItemsMs > 0) {
      await sleep(delayBetweenItemsMs)
    }
  }

  return {
    success: errors.length === 0,
    inserted,
    errors,
  }
}
