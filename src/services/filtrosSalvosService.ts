import pb from '@/lib/pocketbase/client'
import type { FiltroSalvoRecord, ModuloFiltro, SalvarFiltroInput } from '@/types/filtros'

const FAVORITOS_STORAGE_KEY_PREFIX = 'delfos_filtros_favoritos_'

/**
 * Busca os filtros salvos disponíveis para o usuário autenticado no módulo especificado.
 * Conforme regras do PocketBase: filtros próprios (dono = userId) OU compartilhados (visibilidade = 'shared').
 */
export async function fetchFiltrosSalvos(modulo: ModuloFiltro): Promise<FiltroSalvoRecord[]> {
  try {
    const records = await pb.collection('filtros_salvos').getFullList<any>({
      filter: `modulo = '${modulo}'`,
      sort: '-created',
      expand: 'dono',
    })

    return records.map((r) => ({
      id: r.id,
      nome: r.nome,
      modulo: r.modulo,
      condicoes: r.condicoes || { all: [], any: [] },
      colunas: Array.isArray(r.colunas)
        ? r.colunas
        : Array.isArray(r.condicoes?.colunas)
          ? r.condicoes.colunas
          : undefined,
      visibilidade: r.visibilidade || 'private',
      dono: r.dono,
      dono_nome: r.expand?.dono?.name || 'Usuário',
      created: r.created,
      updated: r.updated,
    }))
  } catch (err) {
    console.error('Erro ao buscar filtros_salvos:', err)
    return []
  }
}

/**
 * Cria um novo filtro salvo no PocketBase.
 */
export async function createFiltroSalvo(input: SalvarFiltroInput): Promise<FiltroSalvoRecord> {
  const currentUserId = pb.authStore.record?.id
  if (!currentUserId) {
    throw new Error('Usuário não autenticado para salvar filtro.')
  }

  const condicoesComColunas = {
    ...input.condicoes,
    ...(input.colunas ? { colunas: input.colunas } : {}),
  }

  const payload: Record<string, any> = {
    nome: input.nome.trim(),
    modulo: input.modulo,
    condicoes: condicoesComColunas,
    visibilidade: input.visibilidade,
    dono: currentUserId,
  }

  // Tenta enviar também no campo `colunas` caso a migração tenha sido aplicada
  if (input.colunas) {
    payload.colunas = input.colunas
  }

  let record: any
  try {
    record = await pb.collection('filtros_salvos').create<any>(payload, {
      expand: 'dono',
    })
  } catch (err) {
    // Se falhar por campo desconhecido 'colunas', faz fallback salvando apenas no JSON condicoes
    if (payload.colunas) {
      delete payload.colunas
      record = await pb.collection('filtros_salvos').create<any>(payload, {
        expand: 'dono',
      })
    } else {
      throw err
    }
  }

  return {
    id: record.id,
    nome: record.nome,
    modulo: record.modulo,
    condicoes: record.condicoes || { all: [], any: [] },
    colunas: Array.isArray(record.colunas)
      ? record.colunas
      : Array.isArray(record.condicoes?.colunas)
        ? record.condicoes.colunas
        : input.colunas,
    visibilidade: record.visibilidade,
    dono: record.dono,
    dono_nome: record.expand?.dono?.name || pb.authStore.record?.name || 'Você',
    created: record.created,
    updated: record.updated,
  }
}

/**
 * Atualiza um filtro salvo existente (permitido apenas para o dono).
 */
export async function updateFiltroSalvo(
  id: string,
  input: Partial<SalvarFiltroInput>,
): Promise<FiltroSalvoRecord> {
  const payload: Record<string, any> = {}
  if (input.nome !== undefined) payload.nome = input.nome.trim()
  if (input.condicoes !== undefined) {
    payload.condicoes = {
      ...input.condicoes,
      ...(input.colunas !== undefined ? { colunas: input.colunas } : {}),
    }
  }
  if (input.colunas !== undefined) {
    payload.colunas = input.colunas
  }
  if (input.visibilidade !== undefined) payload.visibilidade = input.visibilidade

  let record: any
  try {
    record = await pb.collection('filtros_salvos').update<any>(id, payload, {
      expand: 'dono',
    })
  } catch (err) {
    if (payload.colunas !== undefined) {
      delete payload.colunas
      record = await pb.collection('filtros_salvos').update<any>(id, payload, {
        expand: 'dono',
      })
    } else {
      throw err
    }
  }

  return {
    id: record.id,
    nome: record.nome,
    modulo: record.modulo,
    condicoes: record.condicoes,
    colunas: Array.isArray(record.colunas)
      ? record.colunas
      : Array.isArray(record.condicoes?.colunas)
        ? record.condicoes.colunas
        : input.colunas,
    visibilidade: record.visibilidade,
    dono: record.dono,
    dono_nome: record.expand?.dono?.name || 'Você',
    created: record.created,
    updated: record.updated,
  }
}

/**
 * Exclui um filtro salvo (permitido apenas para o dono).
 */
export async function deleteFiltroSalvo(id: string): Promise<boolean> {
  await pb.collection('filtros_salvos').delete(id)
  return true
}

/**
 * Gerenciamento de Favoritos local (por usuário / módulo).
 */
export function getFavoritosFiltrosIds(modulo: ModuloFiltro): string[] {
  try {
    const raw = localStorage.getItem(`${FAVORITOS_STORAGE_KEY_PREFIX}${modulo}`)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function toggleFavoritoFiltroId(modulo: ModuloFiltro, filtroId: string): string[] {
  try {
    const atuais = getFavoritosFiltrosIds(modulo)
    const novo = atuais.includes(filtroId)
      ? atuais.filter((id) => id !== filtroId)
      : [...atuais, filtroId]
    localStorage.setItem(`${FAVORITOS_STORAGE_KEY_PREFIX}${modulo}`, JSON.stringify(novo))
    return novo
  } catch {
    return []
  }
}
