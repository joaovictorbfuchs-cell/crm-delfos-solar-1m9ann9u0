import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'

export interface FiltrosExtrasListaEnvio {
  whatsapp?: 'todos' | 'com_whatsapp' | 'sem_whatsapp'
  cidade?: string
  concessionaria?: string
  tipo_cliente?: string
  status?: string
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
