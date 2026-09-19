import pb from '@/lib/pocketbase/client'

export type ClasseTarifaria = 'residencial' | 'comercial'

export interface ParametroTarifarioRecord {
  id: string
  ano: number
  classe: ClasseTarifaria
  tarifa: number
  fio_b: number
  fs: number
  gd_eco_liquida: number
  created?: string
  updated?: string
}

export interface ParametroTarifarioInput {
  ano: number
  classe: ClasseTarifaria
  tarifa: number
  fio_b: number
  fs: number
  gd_eco_liquida: number
}

const COLLECTION_NAME = 'parametros_tarifarios'

/**
 * Busca parâmetros tarifários ordenados por ano crescente.
 * Opcionalmente filtra por classe ('residencial' ou 'comercial').
 */
export async function fetchParametrosTarifarios(
  classe?: ClasseTarifaria,
): Promise<ParametroTarifarioRecord[]> {
  try {
    const filter = classe ? `classe = '${classe}'` : ''
    const records = await pb.collection(COLLECTION_NAME).getFullList<ParametroTarifarioRecord>({
      filter: filter || undefined,
      sort: 'ano',
      requestKey: null,
    })
    return records
  } catch (error) {
    console.warn('Erro ao buscar parametros_tarifarios do PocketBase:', error)
    return []
  }
}

/**
 * Busca um único parâmetro tarifário específico para o ano e classe informados.
 * Retorna null se não encontrar.
 */
export async function fetchParametroTarifarioPorAno(
  ano: number,
  classe: ClasseTarifaria,
): Promise<ParametroTarifarioRecord | null> {
  try {
    const record = await pb
      .collection(COLLECTION_NAME)
      .getFirstListItem<ParametroTarifarioRecord>(`ano = ${ano} && classe = '${classe}'`, {
        requestKey: null,
      })
    return record
  } catch {
    return null
  }
}

/**
 * Conta os registros de parâmetros tarifários cadastrados por classe.
 */
export async function countParametrosTarifarios(): Promise<{
  residencial: number
  comercial: number
  total: number
}> {
  try {
    const records = await pb.collection(COLLECTION_NAME).getFullList<ParametroTarifarioRecord>({
      fields: 'id,classe',
      requestKey: null,
    })
    let residencial = 0
    let comercial = 0
    for (const r of records) {
      if (r.classe === 'residencial') residencial++
      else if (r.classe === 'comercial') comercial++
    }
    return {
      residencial,
      comercial,
      total: records.length,
    }
  } catch (error) {
    console.warn('Erro ao contar parametros_tarifarios:', error)
    return { residencial: 0, comercial: 0, total: 0 }
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Grava ou atualiza parâmetros tarifários no banco de dados.
 * Faz upsert: se o registro (ano, classe) já existir, atualiza; caso contrário cria novo.
 * Também mantém espelhado na coleção retrocompatível `projecao_tarifaria` se ela existir.
 */
export async function saveParametrosTarifarios(
  items: ParametroTarifarioInput[],
  options: {
    delayBetweenItemsMs?: number
    onProgress?: (current: number, total: number) => void
  } = {},
): Promise<{ success: boolean; insertedOrUpdated: number; errors: string[] }> {
  const { delayBetweenItemsMs = 80, onProgress } = options

  if (!items || items.length === 0) {
    return { success: true, insertedOrUpdated: 0, errors: [] }
  }

  let processed = 0
  const errors: string[] = []
  const total = items.length

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    try {
      // 1. Procurar registro existente em parametros_tarifarios
      let existingRecordId: string | null = null
      try {
        const found = await pb
          .collection(COLLECTION_NAME)
          .getFirstListItem(`ano = ${item.ano} && classe = '${item.classe}'`, { requestKey: null })
        existingRecordId = found.id
      } catch {
        existingRecordId = null
      }

      const payload = {
        ano: item.ano,
        classe: item.classe,
        tarifa: item.tarifa,
        fio_b: item.fio_b,
        fs: item.fs,
        gd_eco_liquida: item.gd_eco_liquida,
      }

      if (existingRecordId) {
        await pb.collection(COLLECTION_NAME).update(existingRecordId, payload, { requestKey: null })
      } else {
        await pb.collection(COLLECTION_NAME).create(payload, { requestKey: null })
      }

      // 2. Tentar atualizar também projecao_tarifaria (retrocompatibilidade)
      try {
        let projId: string | null = null
        try {
          const foundProj = await pb
            .collection('projecao_tarifaria')
            .getFirstListItem(`ano = ${item.ano} && tipo_cliente = '${item.classe}'`, {
              requestKey: null,
            })
          projId = foundProj.id
        } catch {
          projId = null
        }

        const projPayload = {
          ano: item.ano,
          tipo_cliente: item.classe,
          tarifa_kwh: item.tarifa,
          fio_b_kwh: item.fio_b,
          fs: item.fs,
          gd_eco_liquida: item.gd_eco_liquida,
        }

        if (projId) {
          await pb
            .collection('projecao_tarifaria')
            .update(projId, projPayload, { requestKey: null })
        } else {
          await pb.collection('projecao_tarifaria').create(projPayload, { requestKey: null })
        }
      } catch {
        // silencioso se projecao_tarifaria falhar
      }

      processed++
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`Ano ${item.ano} (${item.classe}): ${msg}`)
    }

    if (onProgress) {
      onProgress(i + 1, total)
    }

    if (i < items.length - 1 && delayBetweenItemsMs > 0) {
      await sleep(delayBetweenItemsMs)
    }
  }

  return {
    success: errors.length === 0,
    insertedOrUpdated: processed,
    errors,
  }
}
