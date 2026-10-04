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

// Opções canônicas válidas conforme schema do PocketBase da coleção `negocios`
export const OPCOES_ETAPA_FUNIL_SCHEMA = [
  'novo lead',
  'qualificado',
  'proposta enviada',
  'negociação',
  'contrato assinado',
] as const

export const OPCOES_TIPO_NEGOCIO_SCHEMA = [
  'venda usina',
  'bateria',
  'expansão',
  'renovação',
  'serviço',
  'venda bateria',
] as const

export const OPCOES_STATUS_SCHEMA = ['em andamento', 'ganho', 'perdido'] as const

export const OPCOES_TIPO_VENDA_SCHEMA = [
  'Energia Solar',
  'O&M (Operação e Manutenção)',
  'Baterias',
  'Carregadores Veículos Elétricos',
] as const

/**
 * Normaliza e mapeia o valor de tipo_negocio para uma das opções estritas do schema.
 * Se o valor fornecido for um tipo_venda (ex: 'Energia Solar', 'O&M...'), mapeia para o tipo_negocio equivalente.
 */
export function normalizarTipoNegocioSchema(valor?: string | null): string | undefined {
  if (!valor || typeof valor !== 'string') return undefined
  const v = valor.trim().toLowerCase()

  if (OPCOES_TIPO_NEGOCIO_SCHEMA.includes(v as any)) {
    return v
  }
  if (v.includes('usina') || v.includes('solar')) return 'venda usina'
  if (v.includes('renov') || v.includes('o&m') || v.includes('manuten')) return 'renovação'
  if (v.includes('bateria') || v.includes('armazenamento')) return 'bateria'
  if (v.includes('expans')) return 'expansão'
  if (
    v.includes('veículo') ||
    v.includes('veiculo') ||
    v.includes('carregador') ||
    v.includes('servi')
  )
    return 'serviço'

  return undefined
}

/**
 * Normaliza e mapeia o valor de tipo_venda para uma das opções estritas do schema.
 */
export function normalizarTipoVendaSchema(valor?: string | null): string | undefined {
  if (!valor || typeof valor !== 'string') return undefined
  const v = valor.trim()

  const matchExato = OPCOES_TIPO_VENDA_SCHEMA.find((opt) => opt.toLowerCase() === v.toLowerCase())
  if (matchExato) return matchExato

  const lower = v.toLowerCase()
  if (lower.includes('o&m') || lower.includes('manuten') || lower.includes('renov')) {
    return 'O&M (Operação e Manutenção)'
  }
  if (lower.includes('bateria')) {
    return 'Baterias'
  }
  if (lower.includes('carregador') || lower.includes('veículo') || lower.includes('veiculo')) {
    return 'Carregadores Veículos Elétricos'
  }
  if (lower.includes('solar') || lower.includes('usina')) {
    return 'Energia Solar'
  }

  return undefined
}

/**
 * Normaliza e mapeia a etapa do funil estritamente para o schema do PocketBase.
 */
export function normalizarEtapaFunilSchema(valor?: string | null): string | undefined {
  if (!valor || typeof valor !== 'string') return undefined
  const v = valor.trim().toLowerCase()

  if (OPCOES_ETAPA_FUNIL_SCHEMA.includes(v as any)) {
    return v
  }
  if (v.includes('lead')) return 'novo lead'
  if (v.includes('qualif') || v.includes('levantamento')) return 'qualificado'
  if (v.includes('proposta')) return 'proposta enviada'
  if (v.includes('negoc') || v.includes('negociação')) return 'negociação'
  if (v.includes('contrato') || v.includes('assinado') || v.includes('fechado'))
    return 'contrato assinado'

  return undefined
}

/**
 * Normaliza e mapeia o status geral estritamente para o schema do PocketBase.
 */
export function normalizarStatusSchema(valor?: string | null): string | undefined {
  if (!valor || typeof valor !== 'string') return undefined
  const v = valor.trim().toLowerCase()

  if (OPCOES_STATUS_SCHEMA.includes(v as any)) {
    return v
  }
  if (v.includes('andamento') || v.includes('aberto')) return 'em andamento'
  if (v.includes('ganho') || v.includes('vencido') || v.includes('fechado')) return 'ganho'
  if (v.includes('perdido') || v.includes('cancelado')) return 'perdido'

  return undefined
}

/**
 * Normaliza uma data no formato aceito pelo PocketBase (YYYY-MM-DD HH:mm:ss.SSSZ).
 * Retorna undefined caso seja inválida ou vazia.
 */
export function normalizarDataPocketBase(data?: string | null): string | undefined {
  if (!data || typeof data !== 'string') return undefined
  const trimmed = data.trim()
  if (!trimmed) return undefined

  // Padrão YYYY-MM-DD
  const matchIsoDate = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (matchIsoDate) {
    const [, y, m, d] = matchIsoDate
    return `${y}-${m}-${d} 12:00:00.000Z`
  }

  const parsed = new Date(trimmed)
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getUTCFullYear()
    const m = String(parsed.getUTCMonth() + 1).padStart(2, '0')
    const d = String(parsed.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${d} 12:00:00.000Z`
  }

  return undefined
}

/**
 * Cria um novo negócio vinculado a um cliente.
 * Sanitiza rigorosamente o payload:
 * - Omite strings vazias em relations (consultor_responsavel, etc.)
 * - Valida selects contra o schema do PocketBase
 * - Sanitiza datas para formato PocketBase ou omite
 * - Coerção estrita de números para number
 */
export async function createNegocio(data: CreateNegocioInput): Promise<Negocio> {
  if (!data.cliente_id || typeof data.cliente_id !== 'string' || !data.cliente_id.trim()) {
    throw new Error('cliente_id é obrigatório para criar um negócio.')
  }

  const valorEstimado = Number(data.valor_estimado) || 0
  const valorFinal = Number(data.valor_final) || 0
  const valor =
    data.valor !== undefined && data.valor !== null
      ? Number(data.valor) || 0
      : valorFinal > 0
        ? valorFinal
        : valorEstimado

  const payload: Record<string, any> = {
    cliente_id: data.cliente_id.trim(),
    titulo: data.titulo ? String(data.titulo).trim() : 'Negócio Comercial',
    valor_estimado: valorEstimado,
    valor_final: valorFinal,
    valor,
    probabilidade:
      data.probabilidade !== undefined && data.probabilidade !== null
        ? Math.max(0, Math.min(100, Number(data.probabilidade) || 0))
        : 10,
    reabertura: Boolean(data.reabertura),
    recorrencia_mensal: Boolean(data.recorrencia_mensal),
  }

  // Select: tipo_negocio
  const tipoNegocioNormalizado = normalizarTipoNegocioSchema(data.tipo_negocio) || 'venda usina'
  if (tipoNegocioNormalizado) {
    payload.tipo_negocio = tipoNegocioNormalizado
  }

  // Select: tipo_venda
  const tipoVendaNormalizado = normalizarTipoVendaSchema(data.tipo_venda) || 'Energia Solar'
  if (tipoVendaNormalizado) {
    payload.tipo_venda = tipoVendaNormalizado
  }

  // Select: etapa_funil
  const etapaNormalizada = normalizarEtapaFunilSchema(data.etapa_funil) || 'novo lead'
  if (etapaNormalizada) {
    payload.etapa_funil = etapaNormalizada
  }

  // Select: status
  const statusNormalizado = normalizarStatusSchema(data.status) || 'em andamento'
  if (statusNormalizado) {
    payload.status = statusNormalizado
  }

  // Datas
  const dtPrev = normalizarDataPocketBase(data.data_previsao_fechamento)
  if (dtPrev) {
    payload.data_previsao_fechamento = dtPrev
  }
  const dtFech = normalizarDataPocketBase(data.data_fechamento)
  if (dtFech) {
    payload.data_fechamento = dtFech
  }

  // Campos de texto opcionais (apenas se preenchidos)
  if (data.motivo_perda && String(data.motivo_perda).trim()) {
    payload.motivo_perda = String(data.motivo_perda).trim()
  }
  if (data.motivo_reabertura && String(data.motivo_reabertura).trim()) {
    payload.motivo_reabertura = String(data.motivo_reabertura).trim()
  }
  if (data.condicao_pagamento && String(data.condicao_pagamento).trim()) {
    payload.condicao_pagamento = String(data.condicao_pagamento).trim()
  }

  // Relation: consultor_responsavel (NUNCA enviar string vazia "")
  const consultor =
    typeof data.consultor_responsavel === 'string' ? data.consultor_responsavel.trim() : undefined
  if (consultor) {
    payload.consultor_responsavel = consultor
  }

  // Se consultor_responsavel estiver vazio, faz expand apenas de cliente_id para evitar 400
  const expandQuery = consultor ? 'cliente_id,consultor_responsavel' : 'cliente_id'

  return await pb.collection('negocios').create<Negocio>(payload, {
    expand: expandQuery,
  })
}

/**
 * Atualiza um negócio existente.
 */
export async function updateNegocio(id: string, data: UpdateNegocioInput): Promise<Negocio> {
  const payload: Record<string, any> = {}

  if (data.titulo !== undefined) {
    payload.titulo = String(data.titulo).trim()
  }
  if (data.tipo_negocio !== undefined) {
    const tn = normalizarTipoNegocioSchema(data.tipo_negocio)
    if (tn) payload.tipo_negocio = tn
  }
  if (data.tipo_venda !== undefined) {
    const tv = normalizarTipoVendaSchema(data.tipo_venda)
    if (tv) payload.tipo_venda = tv
  }
  if (data.etapa_funil !== undefined) {
    const ef = normalizarEtapaFunilSchema(data.etapa_funil)
    if (ef) payload.etapa_funil = ef
  }
  if (data.status !== undefined) {
    const st = normalizarStatusSchema(data.status)
    if (st) payload.status = st
  }
  if (data.valor_estimado !== undefined) {
    payload.valor_estimado = Number(data.valor_estimado) || 0
  }
  if (data.valor_final !== undefined) {
    payload.valor_final = Number(data.valor_final) || 0
  }
  if (data.valor !== undefined) {
    payload.valor = Number(data.valor) || 0
  }
  if (data.probabilidade !== undefined) {
    payload.probabilidade = Math.max(0, Math.min(100, Number(data.probabilidade) || 0))
  }
  if (data.reabertura !== undefined) {
    payload.reabertura = Boolean(data.reabertura)
  }
  if (data.recorrencia_mensal !== undefined) {
    payload.recorrencia_mensal = Boolean(data.recorrencia_mensal)
  }
  if (data.data_previsao_fechamento !== undefined) {
    const dt = normalizarDataPocketBase(data.data_previsao_fechamento)
    payload.data_previsao_fechamento = dt || ''
  }
  if (data.data_fechamento !== undefined) {
    const dt = normalizarDataPocketBase(data.data_fechamento)
    payload.data_fechamento = dt || ''
  }
  if (data.motivo_perda !== undefined) {
    payload.motivo_perda = String(data.motivo_perda || '').trim()
  }
  if (data.motivo_reabertura !== undefined) {
    payload.motivo_reabertura = String(data.motivo_reabertura || '').trim()
  }
  if (data.condicao_pagamento !== undefined) {
    payload.condicao_pagamento = String(data.condicao_pagamento || '').trim()
  }
  if (data.consultor_responsavel !== undefined) {
    const c =
      typeof data.consultor_responsavel === 'string' ? data.consultor_responsavel.trim() : ''
    // No PocketBase relation field, enviar null desvincula a relation; string vazia pode dar 400
    payload.consultor_responsavel = c || null
  }

  const expandQuery = payload.consultor_responsavel
    ? 'cliente_id,consultor_responsavel'
    : 'cliente_id'

  return await pb.collection('negocios').update<Negocio>(id, payload, {
    expand: expandQuery,
  })
}

/**
 * Exclui um negócio individual.
 * ATENÇÃO: Exclui APENAS o negócio. O cliente vinculado permanece 100% intacto no cadastro.
 */
export async function deleteNegocio(id: string): Promise<boolean> {
  return await pb.collection('negocios').delete(id)
}

/**
 * Lista canônica de etapas ativas / em andamento do funil comercial (coleção `negocios`).
 * Correspondem às colunas do Kanban e aos estágios em aberto da esteira comercial:
 * - novo lead (Coluna: 1 - Novo Lead)
 * - qualificado (Coluna: 2 - Levantamento)
 * - proposta enviada (Coluna: 3 - Proposta Enviada)
 * - negociação (Coluna: 4 - Negociação)
 * - contrato assinado (estágio de conclusão em andamento até efetivar ganho)
 */
export const ETAPAS_FUNIL_EM_ANDAMENTO: readonly EtapaFunilSelect[] = [
  'novo lead',
  'qualificado',
  'proposta enviada',
  'negociação',
  'contrato assinado',
] as const

/**
 * Predicado canônico que define se um negócio está ativo dentro do funil comercial.
 * Critérios unificados (idênticos aos usados pelo KanbanBoard e pela Varredura de Limpeza):
 * 1. Objeto válido com ID
 * 2. Status em aberto (diferente de 'ganho' e diferente de 'perdido')
 * 3. Etapa em aberto (se definida, deve pertencer a ETAPAS_FUNIL_EM_ANDAMENTO)
 * 4. Cliente vinculado NÃO arquivado e NÃO transferido para Pós-Vendas
 */
export function isNegocioDentroDoFunil(negocio: Negocio | null | undefined): boolean {
  if (!negocio || !negocio.id) return false
  if (negocio.status === 'ganho' || negocio.status === 'perdido') return false

  const etapa = (negocio.etapa_funil || 'novo lead') as EtapaFunilSelect
  if (!ETAPAS_FUNIL_EM_ANDAMENTO.includes(etapa)) {
    return false
  }

  const cli = negocio.expand?.cliente_id as any
  if (cli && (cli.arquivado || cli.transferido_pos_vendas)) {
    return false
  }

  return true
}

/**
 * Filtra apenas negócios válidos dentro do funil comercial ativo.
 */
export function filtrarNegociosDentroDoFunil(negocios: Negocio[] | null | undefined): Negocio[] {
  if (!Array.isArray(negocios) || negocios.length === 0) return []
  return negocios.filter(isNegocioDentroDoFunil)
}

export interface BulkDeleteNegociosResult {
  total: number
  successCount: number
  failedCount: number
  failedIds: string[]
  firstErrorMessage?: string
}

export interface ItemNegocioForaDoFunil {
  id: string
  titulo: string
  etapa_funil: EtapaFunilSelect
  status: NegocioStatus
  valor: number
  cliente_id: string
  cliente_nome: string
  motivo_fora_funil: 'cliente_arquivado' | 'cliente_transferido_pos_vendas'
}

export interface VarreduraNegociosResult {
  totalEmAbertoAnalisados: number
  totalDentroDoFunil: number
  totalForaDoFunil: number
  negociosIdentificados: ItemNegocioForaDoFunil[]
  negociosApagados: ItemNegocioForaDoFunil[]
  falhasExclusao: Array<{ id: string; erro: string }>
}

/**
 * Realiza uma varredura em todos os negócios em aberto do sistema
 * e identifica/apaga os que estão fora do funil comercial (clientes arquivados ou transferidos para pós-vendas).
 * Apaga EXCLUSIVAMENTE o registro do negócio, preservando todas as atividades, propostas,
 * usinas, ordens de serviço e contatos do cliente.
 */
export async function executarVarreduraELimpezaNegocios(
  options: { dryRun?: boolean; concurrency?: number } = {},
): Promise<VarreduraNegociosResult> {
  const dryRun = options.dryRun ?? false
  const concurrency = options.concurrency ?? 6

  // 1. Busca todos os negócios em aberto (status != ganho && status != perdido)
  const todosNegocios = await pb.collection('negocios').getFullList<Negocio>({
    filter: "status != 'ganho' && status != 'perdido'",
    expand: 'cliente_id',
    sort: 'created',
    requestKey: null,
  })

  const ETAPAS_EM_ANDAMENTO = ETAPAS_FUNIL_EM_ANDAMENTO

  const foraDoFunil: ItemNegocioForaDoFunil[] = []
  let dentroDoFunil = 0

  for (const neg of todosNegocios) {
    const etapa = (neg.etapa_funil || 'novo lead') as EtapaFunilSelect
    // Confirma que a etapa é uma etapa de andamento
    if (!ETAPAS_EM_ANDAMENTO.includes(etapa)) {
      continue
    }

    const cli = neg.expand?.cliente_id as any
    const isArquivado = Boolean(cli?.arquivado)
    const isTransferidoPosVendas = Boolean(cli?.transferido_pos_vendas)

    if (isArquivado || isTransferidoPosVendas) {
      foraDoFunil.push({
        id: neg.id,
        titulo: neg.titulo || 'Negócio sem título',
        etapa_funil: etapa,
        status: neg.status,
        valor: Number(neg.valor || neg.valor_estimado || 0),
        cliente_id: neg.cliente_id || cli?.id || '',
        cliente_nome: cli?.nome || cli?.razao_social || 'Cliente não identificado',
        motivo_fora_funil: isArquivado ? 'cliente_arquivado' : 'cliente_transferido_pos_vendas',
      })
    } else {
      dentroDoFunil++
    }
  }

  const apagados: ItemNegocioForaDoFunil[] = []
  const falhas: Array<{ id: string; erro: string }> = []

  if (!dryRun && foraDoFunil.length > 0) {
    const ids = foraDoFunil.map((item) => item.id)
    const itemMap = new Map(foraDoFunil.map((item) => [item.id, item]))

    try {
      const deleteResult = await bulkDeleteNegocios(ids, { concurrency })
      for (const id of ids) {
        if (!deleteResult.failedIds.includes(id)) {
          const item = itemMap.get(id)
          if (item) apagados.push(item)
        }
      }
      for (const id of deleteResult.failedIds) {
        falhas.push({
          id,
          erro: deleteResult.firstErrorMessage || 'Erro ao excluir negócio',
        })
      }
    } catch (err: any) {
      const failedIds: string[] = err?.result?.failedIds || ids
      for (const id of ids) {
        if (!failedIds.includes(id)) {
          const item = itemMap.get(id)
          if (item) apagados.push(item)
        } else {
          falhas.push({
            id,
            erro: err?.message || 'Falha na exclusão em lote',
          })
        }
      }
    }
  }

  return {
    totalEmAbertoAnalisados: todosNegocios.length,
    totalDentroDoFunil: dentroDoFunil,
    totalForaDoFunil: foraDoFunil.length,
    negociosIdentificados: foraDoFunil,
    negociosApagados: dryRun ? [] : apagados,
    falhasExclusao: falhas,
  }
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
