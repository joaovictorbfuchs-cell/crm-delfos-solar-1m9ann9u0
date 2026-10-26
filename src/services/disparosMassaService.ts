import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'

export type StatusDisparoMassa = 'ativo' | 'concluido' | 'cancelado'

export type StatusDestinatarioLote =
  | 'pendente'
  | 'respondido'
  | 'atendido'
  | 'reenvio_1_agendado'
  | 'reenvio_2_agendado'
  | 'finalizado'
  | 'bloqueado'
  | 'sem_whatsapp'
  | 'nao_perturbe'
  | 'arquivado'

export type MarcacaoRespostaDestinatario =
  | 'nenhuma'
  | 'respondeu'
  | 'interessado'
  | 'sem_resposta'
  | 'nao_perturbe'

export type OrigemEntradaFollowUp = 'manual' | 'por_disparo' | 'automatica_por_estagio'

export interface ItemTrilhaFollowUp {
  fluxo_id: string
  fluxo_nome?: string
  fluxo_anterior_id?: string
  fluxo_anterior_nome?: string
  etapa_origem_id?: string
  etapa_origem_nome?: string
  motivo?: string
  resposta_detectada?: boolean
  preview_mensagem?: string
  data?: string
  origem_entrada?: OrigemEntradaFollowUp
  estagio_gatilho?: string
}

export interface DestinatarioLoteMassa {
  cliente_id: string
  nome: string
  telefone: string
  status: StatusDestinatarioLote
  motivo_saida?: string
  data_envio_inicial?: string
  reenvio_1_data?: string
  reenvio_1_msg_id?: string
  reenvio_2_data?: string
  reenvio_2_msg_id?: string
  respondido_em?: string
  atendido_em?: string
  // Suporte a fluxos de follow-up dinâmicos e Fase 2 / Fase 3
  fluxo_atual_id?: string
  fluxo_origem_id?: string
  fluxo_origem_nome?: string
  desvio_motivo?: string
  marcacao_resposta?: MarcacaoRespostaDestinatario
  marcacao_data?: string
  origem_entrada?: OrigemEntradaFollowUp
  estagio_origem?: string
  negocio_id?: string
  trilha?: ItemTrilhaFollowUp[]
  etapa_atual_ordem?: number
  etapa_atual_nome?: string
  proximo_envio_data?: string
  proxima_etapa_nome?: string
  etapas_executadas?: Array<{
    ordem: number
    etapa_id?: string
    fluxo_id?: string
    nome: string
    enviado_em: string
    mensagem_id?: string
  }>
}

export interface EstatisticasDisparoMassa {
  total: number
  pendentes: number
  respondidos: number
  atendidos: number
  bloqueados: number
  finalizados: number
  reenvios_1_enviados?: number
  reenvios_2_enviados?: number
  ultima_verificacao?: string
}

export interface DisparoMassaRegistro extends RecordModel {
  id: string
  collectionId: string
  collectionName: string
  titulo: string
  status: StatusDisparoMassa
  segmento?: string
  filtros?: Record<string, unknown>
  total_destinatarios: number
  intervalo_segundos: number
  data_disparo: string
  mensagem_original: string
  reenvio_ativo: boolean
  texto_reenvio_1?: string
  texto_reenvio_2?: string
  fluxo_id?: string
  origem_entrada?: OrigemEntradaFollowUp
  destinatarios: DestinatarioLoteMassa[]
  estatisticas?: EstatisticasDisparoMassa
  criado_por?: string
  created: string
  updated: string
}

export interface CriarDisparoMassaInput {
  titulo: string
  segmento?: string
  filtros?: Record<string, unknown>
  total_destinatarios: number
  intervalo_segundos?: number
  data_disparo?: string
  mensagem_original: string
  reenvio_ativo: boolean
  texto_reenvio_1?: string
  texto_reenvio_2?: string
  fluxo_id?: string
  origem_entrada?: OrigemEntradaFollowUp
  destinatarios: DestinatarioLoteMassa[]
}

const STORAGE_KEY_TEXTO_REENVIO_1 = 'delfos_padrao_texto_reenvio_1'
const STORAGE_KEY_TEXTO_REENVIO_2 = 'delfos_padrao_texto_reenvio_2'

export const TEXTO_REENVIO_1_DEFAULT =
  'Olá, [nome do cliente]! Tudo bem? Passando para saber se você conseguiu ver nossa mensagem anterior. Qualquer dúvida sobre sua usina solar ou serviços Delfos, estou à disposição por aqui!'

export const TEXTO_REENVIO_2_DEFAULT =
  'Olá, [nome do cliente]! Tudo bem? Faz algum tempo que nos falamos por aqui. Gostaria de saber como está o desempenho da sua usina solar e se precisa de alguma revisão, limpeza dos módulos ou acompanhamento técnico da Delfos Solar.'

/**
 * Retorna os textos de reenvio padrão configurados ou salvos em localStorage pelo usuário.
 */
export function getPadroesTextosReenvio(): { texto1: string; texto2: string } {
  try {
    const salvo1 = localStorage.getItem(STORAGE_KEY_TEXTO_REENVIO_1)
    const salvo2 = localStorage.getItem(STORAGE_KEY_TEXTO_REENVIO_2)
    return {
      texto1: salvo1 !== null ? salvo1 : TEXTO_REENVIO_1_DEFAULT,
      texto2: salvo2 !== null ? salvo2 : TEXTO_REENVIO_2_DEFAULT,
    }
  } catch (_) {
    return {
      texto1: TEXTO_REENVIO_1_DEFAULT,
      texto2: TEXTO_REENVIO_2_DEFAULT,
    }
  }
}

/**
 * Salva os textos informados como o novo padrão do sistema para reenvios futuros.
 */
export function salvarPadroesTextosReenvio(texto1: string, texto2: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_TEXTO_REENVIO_1, texto1)
    localStorage.setItem(STORAGE_KEY_TEXTO_REENVIO_2, texto2)
  } catch {
    /* intentionally ignored */
  }
}

/**
 * Busca todos os lotes de disparos em massa registrados no PocketBase.
 */
export async function fetchDisparosMassa(): Promise<DisparoMassaRegistro[]> {
  try {
    const records = await pb.collection('disparos_massa').getFullList<DisparoMassaRegistro>({
      sort: '-created',
    })
    return records
  } catch (err) {
    console.error('Erro ao buscar disparos_massa:', err)
    return []
  }
}

/**
 * Busca um lote específico por ID.
 */
export async function fetchDisparoMassaById(id: string): Promise<DisparoMassaRegistro | null> {
  try {
    const record = await pb.collection('disparos_massa').getOne<DisparoMassaRegistro>(id)
    return record
  } catch (err) {
    console.error(`Erro ao buscar lote de disparo ${id}:`, err)
    return null
  }
}

/**
 * Registra um novo lote de disparo em massa na coleção disparos_massa.
 */
export async function createDisparoMassa(
  input: CriarDisparoMassaInput,
): Promise<DisparoMassaRegistro> {
  const currentUserId = pb.authStore.record?.id || undefined
  const agoraIso = new Date().toISOString()

  const statsIniciais: EstatisticasDisparoMassa = {
    total: input.destinatarios.length,
    pendentes: input.destinatarios.length,
    respondidos: 0,
    atendidos: 0,
    bloqueados: 0,
    finalizados: 0,
    reenvios_1_enviados: 0,
    reenvios_2_enviados: 0,
    ultima_verificacao: agoraIso,
  }

  const payload: Record<string, unknown> = {
    titulo: input.titulo.trim(),
    status: 'ativo',
    segmento: input.segmento || 'todos',
    filtros: input.filtros || {},
    total_destinatarios: input.total_destinatarios,
    intervalo_segundos: input.intervalo_segundos || 60,
    data_disparo: input.data_disparo || agoraIso,
    mensagem_original: input.mensagem_original,
    reenvio_ativo: Boolean(input.reenvio_ativo),
    texto_reenvio_1: input.texto_reenvio_1 || '',
    texto_reenvio_2: input.texto_reenvio_2 || '',
    fluxo_id: input.fluxo_id || '',
    origem_entrada: input.origem_entrada || 'por_disparo',
    destinatarios: input.destinatarios,
    estatisticas: statsIniciais,
  }

  if (currentUserId) {
    payload.criado_por = currentUserId
  }

  const record = await pb.collection('disparos_massa').create<DisparoMassaRegistro>(payload)
  return record
}

/**
 * Atualiza status de um lote (ex: cancelar, concluir).
 */
export async function updateStatusDisparoMassa(
  id: string,
  novoStatus: StatusDisparoMassa,
): Promise<DisparoMassaRegistro> {
  const record = await pb.collection('disparos_massa').update<DisparoMassaRegistro>(id, {
    status: novoStatus,
  })
  return record
}

/**
 * Atualiza a marcação manual de um destinatário em um lote de disparo em massa.
 * Alimenta as regras de desvio / encerramento imediato.
 */
export async function marcarRespostaDestinatario(
  loteId: string,
  destinatarioIndex: number,
  marcacao: MarcacaoRespostaDestinatario,
): Promise<DisparoMassaRegistro> {
  const lote = await pb.collection('disparos_massa').getOne<DisparoMassaRegistro>(loteId)
  const dests = Array.isArray(lote.destinatarios) ? [...lote.destinatarios] : []

  if (destinatarioIndex < 0 || destinatarioIndex >= dests.length) {
    throw new Error('Destinatário não encontrado no lote')
  }

  const agoraIso = new Date().toISOString()
  const dest = { ...dests[destinatarioIndex] }
  dest.marcacao_resposta = marcacao
  dest.marcacao_data = agoraIso

  if (marcacao === 'nao_perturbe') {
    dest.status = 'nao_perturbe'
    dest.motivo_saida = 'Marcado manualmente: Não Perturbe'
    dest.proximo_envio_data = undefined
  } else if (marcacao === 'respondeu' || marcacao === 'interessado') {
    dest.status = 'respondido'
    dest.respondido_em = agoraIso
    dest.motivo_saida =
      marcacao === 'interessado'
        ? 'Marcado manualmente: Cliente Interessado'
        : 'Marcado manualmente: Cliente Respondeu'
    dest.proximo_envio_data = undefined
  } else if (marcacao === 'sem_resposta') {
    // Mantém na régua ou reativa status se estava respondido por engano
    if (dest.status === 'respondido' || dest.status === 'nao_perturbe') {
      dest.status = 'pendente'
      dest.motivo_saida = 'Aguardando timeout ou próxima etapa'
    }
  }

  dests[destinatarioIndex] = dest

  // Recalcular métricas do lote
  const stats = {
    total: dests.length,
    pendentes: dests.filter(
      (d) =>
        d.status === 'pendente' ||
        d.status === 'reenvio_1_agendado' ||
        d.status === 'reenvio_2_agendado',
    ).length,
    respondidos: dests.filter((d) => d.status === 'respondido').length,
    atendidos: dests.filter((d) => d.status === 'atendido').length,
    bloqueados: dests.filter((d) => d.status === 'bloqueado' || d.status === 'sem_whatsapp').length,
    finalizados: dests.filter(
      (d) => d.status === 'finalizado' || d.status === 'arquivado' || d.status === 'nao_perturbe',
    ).length,
    reenvios_1_enviados: dests.filter(
      (d) => Boolean(d.reenvio_1_data) || (d.etapas_executadas && d.etapas_executadas.length >= 1),
    ).length,
    reenvios_2_enviados: dests.filter(
      (d) => Boolean(d.reenvio_2_data) || (d.etapas_executadas && d.etapas_executadas.length >= 2),
    ).length,
    ultima_verificacao: agoraIso,
  }

  const record = await pb.collection('disparos_massa').update<DisparoMassaRegistro>(loteId, {
    destinatarios: dests,
    estatisticas: stats,
  })
  return record
}

/**
 * Ativa ou desativa a automação de reenvio de um lote.
 */
export async function toggleReenvioLote(
  id: string,
  reenvioAtivo: boolean,
): Promise<DisparoMassaRegistro> {
  const record = await pb.collection('disparos_massa').update<DisparoMassaRegistro>(id, {
    reenvio_ativo: reenvioAtivo,
  })
  return record
}

/**
 * Chama o backend para forçar o processamento de verificação dos reenvios.
 */
export async function dispararVerificacaoReenviosBackend(): Promise<{
  success: boolean
  resultado?: unknown
}> {
  try {
    const res = await pb.send('/backend/v1/delfos/processar-reenvios-massa', {
      method: 'POST',
    })
    return res
  } catch (err) {
    console.warn('Erro ao disparar verificação no backend:', err)
    return { success: false }
  }
}
