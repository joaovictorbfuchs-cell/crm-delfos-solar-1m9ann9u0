import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'

export interface FiltrosExtrasListaEnvio {
  whatsapp?: 'todos' | 'com_whatsapp' | 'sem_whatsapp'
  cidade?: string
  concessionaria?: string
  tipo_cliente?: string
  status?: string
  /**
   * Tipo da lista: 'manual' (seleção pontual por checkboxes) ou 'filtro' (segmento/filtros dinâmicos).
   */
  tipo_selecao?: 'manual' | 'filtro'
  /**
   * Lista de IDs dos clientes selecionados manualmente na hora de salvar.
   */
  clientes_ids?: string[]
  /**
   * Quantidade de clientes que estavam selecionados no momento do salvamento.
   */
  total_clientes_selecionados?: number
}

export interface ListaEnvioRegistro extends RecordModel {
  id: string
  collectionId: string
  collectionName: string
  nome: string
  segmento: string
  filtros: FiltrosExtrasListaEnvio
  fluxo_id?: string
  criado_por?: string
  created: string
  updated: string
}

export interface SalvarListaEnvioInput {
  nome: string
  segmento: string
  filtros: FiltrosExtrasListaEnvio
  fluxo_id?: string
  clientes_ids?: string[]
}

export interface UpdateListaEnvioInput {
  nome?: string
  segmento?: string
  filtros?: FiltrosExtrasListaEnvio
  fluxo_id?: string
  clientes_ids?: string[]
}

const FAVORITOS_LISTAS_ENVIO_STORAGE_KEY = 'delfos_listas_envio_favoritos'

/**
 * Obtém os IDs das listas de envio favoritadas localmente pelo usuário.
 */
export function getFavoritosListasEnvioIds(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITOS_LISTAS_ENVIO_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * Alterna favorito (liga/desliga) para uma lista de envio salva.
 */
export function toggleFavoritoListaEnvioId(listaId: string): string[] {
  try {
    const atuais = getFavoritosListasEnvioIds()
    const novos = atuais.includes(listaId)
      ? atuais.filter((id) => id !== listaId)
      : [...atuais, listaId]
    localStorage.setItem(FAVORITOS_LISTAS_ENVIO_STORAGE_KEY, JSON.stringify(novos))
    return novos
  } catch {
    return []
  }
}

/**
 * Busca todas as listas de envio salvas no PocketBase.
 */
export async function fetchListasEnvio(): Promise<ListaEnvioRegistro[]> {
  try {
    const records = await pb.collection('listas_envio').getFullList<ListaEnvioRegistro>({
      sort: '-created',
    })
    return records
  } catch (err) {
    console.error('Erro ao buscar listas_envio:', err)
    return []
  }
}

/**
 * Cria uma nova lista de envio salva.
 */
export async function createListaEnvio(input: SalvarListaEnvioInput): Promise<ListaEnvioRegistro> {
  const currentUserId = pb.authStore.record?.id || undefined
  const payload: Record<string, unknown> = {
    nome: input.nome.trim(),
    segmento: input.segmento || 'todos',
    filtros: input.filtros || {},
    fluxo_id: input.fluxo_id || '',
  }
  // Se veio clientes_ids diretamente no input ou dentro de filtros, assegura integridade
  if (Array.isArray(input.clientes_ids) && input.clientes_ids.length > 0) {
    const filtrosObj = (
      payload.filtros && typeof payload.filtros === 'object' ? { ...payload.filtros } : {}
    ) as any
    filtrosObj.clientes_ids = input.clientes_ids
    filtrosObj.tipo_selecao = 'manual'
    filtrosObj.total_clientes_selecionados = input.clientes_ids.length
    payload.filtros = filtrosObj
  }
  if (currentUserId) {
    payload.criado_por = currentUserId
  }

  const record = await pb.collection('listas_envio').create<ListaEnvioRegistro>(payload)
  return record
}

/**
 * Exclui uma lista de envio salva pelo ID.
 */
export async function deleteListaEnvio(id: string): Promise<boolean> {
  await pb.collection('listas_envio').delete(id)
  return true
}

/**
 * Atualiza o fluxo_id associado a uma lista de envio.
 */
export async function updateListaEnvioFluxo(
  id: string,
  fluxoId: string,
): Promise<ListaEnvioRegistro> {
  const record = await pb.collection('listas_envio').update<ListaEnvioRegistro>(id, {
    fluxo_id: fluxoId,
  })
  return record
}

/**
 * Renomeia uma lista de envio salva.
 */
export async function renameListaEnvio(id: string, novoNome: string): Promise<ListaEnvioRegistro> {
  const record = await pb.collection('listas_envio').update<ListaEnvioRegistro>(id, {
    nome: novoNome.trim(),
  })
  return record
}

/**
 * Atualiza os campos e filtros de uma lista de envio salva.
 */
export async function updateListaEnvio(
  id: string,
  input: UpdateListaEnvioInput,
): Promise<ListaEnvioRegistro> {
  const payload: Record<string, unknown> = {}
  if (input.nome !== undefined) payload.nome = input.nome.trim()
  if (input.segmento !== undefined) payload.segmento = input.segmento
  if (input.fluxo_id !== undefined) payload.fluxo_id = input.fluxo_id
  if (input.filtros !== undefined) {
    const filtrosObj = { ...input.filtros }
    if (Array.isArray(input.clientes_ids)) {
      filtrosObj.clientes_ids = input.clientes_ids
      filtrosObj.tipo_selecao = input.clientes_ids.length > 0 ? 'manual' : 'filtro'
      filtrosObj.total_clientes_selecionados = input.clientes_ids.length
    }
    payload.filtros = filtrosObj
  }
  const record = await pb.collection('listas_envio').update<ListaEnvioRegistro>(id, payload)
  return record
}
