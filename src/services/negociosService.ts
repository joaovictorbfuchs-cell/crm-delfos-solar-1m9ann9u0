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

/**
 * Exclui múltiplos negócios em lote.
 * ATENÇÃO: Exclui APENAS os registros de negócios. Os clientes permanecem 100% intactos.
 */
export async function bulkDeleteNegocios(negocioIds: string[]): Promise<boolean> {
  if (!negocioIds || negocioIds.length === 0) return true
  const results = await Promise.allSettled(
    negocioIds.map((id) => pb.collection('negocios').delete(id)),
  )
  const failed = results.filter((r) => r.status === 'rejected')
  if (failed.length > 0) {
    console.error(`Falha ao excluir ${failed.length} de ${negocioIds.length} negócios`, failed)
    throw new Error(`Falha ao excluir ${failed.length} negócio(s).`)
  }
  return true
}
