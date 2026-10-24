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
