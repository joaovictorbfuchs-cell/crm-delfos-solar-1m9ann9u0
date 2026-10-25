import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'

export interface RegraEntradaFluxo extends RecordModel {
  id: string
  collectionId: string
  collectionName: string
  fluxo_id: string
  estagio_funil: string
  ativo: boolean
  created: string
  updated: string
}

export interface CriarRegraEntradaInput {
  fluxo_id: string
  estagio_funil: string
  ativo?: boolean
}

export interface FluxoFollowUp extends RecordModel {
  id: string
  collectionId: string
  collectionName: string
  nome: string
  descricao?: string
  ativo: boolean
  is_padrao: boolean
  criado_por?: string
  created: string
  updated: string
  etapas?: EtapaFollowUp[]
  regras_entrada?: RegraEntradaFluxo[]
}

export type AcaoDesvioEtapa = 'nenhuma' | 'fluxo_alternativo' | 'arquivar'

export interface EtapaFollowUp extends RecordModel {
  id: string
  collectionId: string
  collectionName: string
  fluxo_id: string
  ordem: number
  nome: string
  dias_apos: number
  mensagem: string
  ativa: boolean
  desvio_acao?: AcaoDesvioEtapa
  desvio_dias?: number
  desvio_fluxo_id?: string
  created: string
  updated: string
}

export interface CriarFluxoInput {
  nome: string
  descricao?: string
  ativo?: boolean
  is_padrao?: boolean
}

export interface CriarEtapaInput {
  fluxo_id: string
  ordem?: number
  nome?: string
  dias_apos: number
  mensagem: string
  ativa?: boolean
  desvio_acao?: AcaoDesvioEtapa
  desvio_dias?: number
  desvio_fluxo_id?: string
}

export interface AtualizarEtapaInput {
  nome?: string
  dias_apos?: number
  mensagem?: string
  ativa?: boolean
  ordem?: number
  desvio_acao?: AcaoDesvioEtapa
  desvio_dias?: number
  desvio_fluxo_id?: string
}

/**
 * Busca todos os fluxos de follow-up cadastrados, com suas etapas ordenadas.
 */
export async function fetchFluxosFollowUp(apenasAtivos = false): Promise<FluxoFollowUp[]> {
  try {
    const filter = apenasAtivos ? 'ativo = true' : ''
    const fluxos = await pb.collection('fluxos_follow_up').getFullList<FluxoFollowUp>({
      filter,
      sort: '-is_padrao,nome',
    })

    if (fluxos.length === 0) {
      return []
    }

    // Busca todas as etapas dos fluxos encontrados
    const etapas = await pb.collection('etapas_follow_up').getFullList<EtapaFollowUp>({
      sort: 'ordem',
    })

    // Busca todas as regras de entrada cadastradas (Fase 3)
    let regras: RegraEntradaFluxo[] = []
    try {
      regras = await pb.collection('regras_entrada_fluxo').getFullList<RegraEntradaFluxo>({
        sort: 'created',
      })
    } catch (errRegras) {
      console.warn('Coleção regras_entrada_fluxo ainda não disponível ou vazia:', errRegras)
    }

    const etapasPorFluxo: Record<string, EtapaFollowUp[]> = {}
    for (const etapa of etapas) {
      if (!etapasPorFluxo[etapa.fluxo_id]) {
        etapasPorFluxo[etapa.fluxo_id] = []
      }
      etapasPorFluxo[etapa.fluxo_id].push(etapa)
    }

    const regrasPorFluxo: Record<string, RegraEntradaFluxo[]> = {}
    for (const regra of regras) {
      if (!regrasPorFluxo[regra.fluxo_id]) {
        regrasPorFluxo[regra.fluxo_id] = []
      }
      regrasPorFluxo[regra.fluxo_id].push(regra)
    }

    return fluxos.map((fluxo) => ({
      ...fluxo,
      etapas: (etapasPorFluxo[fluxo.id] || []).sort((a, b) => a.ordem - b.ordem),
      regras_entrada: regrasPorFluxo[fluxo.id] || [],
    }))
  } catch (err) {
    console.error('Erro ao buscar fluxos_follow_up:', err)
    return []
  }
}

/**
 * Busca um fluxo pelo ID com suas etapas ordenadas.
 */
export async function fetchFluxoFollowUpById(id: string): Promise<FluxoFollowUp | null> {
  try {
    const fluxo = await pb.collection('fluxos_follow_up').getOne<FluxoFollowUp>(id)
    const etapas = await pb.collection('etapas_follow_up').getFullList<EtapaFollowUp>({
      filter: `fluxo_id = '${id}'`,
      sort: 'ordem',
    })
    let regras_entrada: RegraEntradaFluxo[] = []
    try {
      regras_entrada = await pb.collection('regras_entrada_fluxo').getFullList<RegraEntradaFluxo>({
        filter: `fluxo_id = '${id}'`,
      })
    } catch {
      /* intentionally ignored */
    }
    return {
      ...fluxo,
      etapas,
      regras_entrada,
    }
  } catch (err) {
    console.error(`Erro ao buscar fluxo ${id}:`, err)
    return null
  }
}

/**
 * Retorna o fluxo padrão do sistema (ou o primeiro ativo cadastrado).
 */
export async function fetchFluxoPadrao(): Promise<FluxoFollowUp | null> {
  try {
    const lista = await fetchFluxosFollowUp(true)
    const padrao = lista.find((f) => f.is_padrao) || lista[0] || null
    return padrao
  } catch (err) {
    console.error('Erro ao buscar fluxo padrão:', err)
    return null
  }
}

/**
 * Cria um novo fluxo de follow-up.
 */
export async function createFluxoFollowUp(input: CriarFluxoInput): Promise<FluxoFollowUp> {
  const currentUserId = pb.authStore.record?.id || undefined
  const payload: Record<string, unknown> = {
    nome: input.nome.trim(),
    descricao: input.descricao ? input.descricao.trim() : '',
    ativo: input.ativo !== undefined ? input.ativo : true,
    is_padrao: Boolean(input.is_padrao),
  }
  if (currentUserId) {
    payload.criado_por = currentUserId
  }

  const record = await pb.collection('fluxos_follow_up').create<FluxoFollowUp>(payload)
  return {
    ...record,
    etapas: [],
    regras_entrada: [],
  }
}

/**
 * Atualiza dados básicos de um fluxo.
 */
export async function updateFluxoFollowUp(
  id: string,
  dados: Partial<CriarFluxoInput>,
): Promise<FluxoFollowUp> {
  const payload: Record<string, unknown> = {}
  if (dados.nome !== undefined) payload.nome = dados.nome.trim()
  if (dados.descricao !== undefined) payload.descricao = dados.descricao.trim()
  if (dados.ativo !== undefined) payload.ativo = dados.ativo
  if (dados.is_padrao !== undefined) payload.is_padrao = dados.is_padrao

  const record = await pb.collection('fluxos_follow_up').update<FluxoFollowUp>(id, payload)
  return record
}

/**
 * Exclui um fluxo e suas etapas em cascata.
 */
export async function deleteFluxoFollowUp(id: string): Promise<boolean> {
  await pb.collection('fluxos_follow_up').delete(id)
  return true
}

/**
 * ============================================================================
 * REGRAS DE ENTRADA POR ESTÁGIO (FASE 3)
 * ============================================================================
 */

/**
 * Busca todas as regras de entrada de um fluxo.
 */
export async function fetchRegrasEntradaFluxo(fluxoId: string): Promise<RegraEntradaFluxo[]> {
  try {
    return await pb.collection('regras_entrada_fluxo').getFullList<RegraEntradaFluxo>({
      filter: `fluxo_id = '${fluxoId}'`,
      sort: 'created',
    })
  } catch (err) {
    console.error('Erro ao buscar regras de entrada do fluxo:', err)
    return []
  }
}

/**
 * Cria uma regra de entrada por estágio em um fluxo.
 */
export async function createRegraEntradaFluxo(
  input: CriarRegraEntradaInput,
): Promise<RegraEntradaFluxo> {
  const payload = {
    fluxo_id: input.fluxo_id,
    estagio_funil: input.estagio_funil.trim(),
    ativo: input.ativo !== undefined ? input.ativo : true,
  }
  return await pb.collection('regras_entrada_fluxo').create<RegraEntradaFluxo>(payload)
}

/**
 * Ativa / desativa ou atualiza uma regra de entrada.
 */
export async function updateRegraEntradaFluxo(
  id: string,
  dados: { estagio_funil?: string; ativo?: boolean },
): Promise<RegraEntradaFluxo> {
  const payload: Record<string, unknown> = {}
  if (dados.estagio_funil !== undefined) payload.estagio_funil = dados.estagio_funil.trim()
  if (dados.ativo !== undefined) payload.ativo = dados.ativo
  return await pb.collection('regras_entrada_fluxo').update<RegraEntradaFluxo>(id, payload)
}

/**
 * Exclui uma regra de entrada pelo ID.
 */
export async function deleteRegraEntradaFluxo(id: string): Promise<boolean> {
  await pb.collection('regras_entrada_fluxo').delete(id)
  return true
}

/**
 * Adiciona uma nova etapa a um fluxo.
 */
export async function createEtapaFollowUp(input: CriarEtapaInput): Promise<EtapaFollowUp> {
  let ordem = input.ordem
  if (ordem === undefined) {
    try {
      const existentes = await pb.collection('etapas_follow_up').getFullList<EtapaFollowUp>({
        filter: `fluxo_id = '${input.fluxo_id}'`,
        sort: '-ordem',
      })
      ordem = existentes.length > 0 ? (existentes[0].ordem || 0) + 1 : 1
    } catch {
      ordem = 1
    }
  }

  const payload: Record<string, unknown> = {
    fluxo_id: input.fluxo_id,
    ordem,
    nome: input.nome ? input.nome.trim() : `Etapa ${ordem}`,
    dias_apos: Number(input.dias_apos) || 1,
    mensagem: input.mensagem || '',
    ativa: input.ativa !== undefined ? input.ativa : true,
    desvio_acao: input.desvio_acao || 'nenhuma',
    desvio_dias: input.desvio_dias ? Number(input.desvio_dias) : 0,
    desvio_fluxo_id: input.desvio_fluxo_id || '',
  }

  const record = await pb.collection('etapas_follow_up').create<EtapaFollowUp>(payload)
  return record
}

/**
 * Atualiza uma etapa existente.
 */
export async function updateEtapaFollowUp(
  id: string,
  dados: AtualizarEtapaInput,
): Promise<EtapaFollowUp> {
  const payload: Record<string, unknown> = {}
  if (dados.nome !== undefined) payload.nome = dados.nome.trim()
  if (dados.dias_apos !== undefined) payload.dias_apos = Number(dados.dias_apos)
  if (dados.mensagem !== undefined) payload.mensagem = dados.mensagem
  if (dados.ativa !== undefined) payload.ativa = dados.ativa
  if (dados.ordem !== undefined) payload.ordem = Number(dados.ordem)
  if (dados.desvio_acao !== undefined) payload.desvio_acao = dados.desvio_acao
  if (dados.desvio_dias !== undefined) payload.desvio_dias = Number(dados.desvio_dias)
  if (dados.desvio_fluxo_id !== undefined) payload.desvio_fluxo_id = dados.desvio_fluxo_id

  const record = await pb.collection('etapas_follow_up').update<EtapaFollowUp>(id, payload)
  return record
}

/**
 * Ativa ou desativa uma etapa sem apagá-la.
 */
export async function toggleEtapaFollowUp(id: string, ativa: boolean): Promise<EtapaFollowUp> {
  return updateEtapaFollowUp(id, { ativa })
}

/**
 * Exclui uma etapa pelo ID.
 */
export async function deleteEtapaFollowUp(id: string): Promise<boolean> {
  await pb.collection('etapas_follow_up').delete(id)
  return true
}

/**
 * Reordena uma lista de etapas atualizando o campo ordem.
 */
export async function reordenarEtapasFollowUp(
  etapasOrdenadas: { id: string; ordem: number }[],
): Promise<void> {
  for (const item of etapasOrdenadas) {
    try {
      await pb.collection('etapas_follow_up').update(item.id, { ordem: item.ordem })
    } catch (err) {
      console.warn(`Erro ao atualizar ordem da etapa ${item.id}:`, err)
    }
  }
}
