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
export async function clearProjecoesTarifarias(tipoCliente?: TipoClienteProjecao): Promise<number> {
  const filter = tipoCliente ? `tipo_cliente = '${tipoCliente}'` : ''
  const records = await pb.collection(COLLECTION_NAME).getFullList<ProjecaoTarifariaRecord>({
    filter: filter || undefined,
    fields: 'id',
    requestKey: null,
  })

  let count = 0
  for (const record of records) {
    try {
      await pb.collection(COLLECTION_NAME).delete(record.id)
      count++
    } catch (err) {
      console.warn(`Erro ao deletar registro ${record.id} de projecao_tarifaria:`, err)
    }
  }
  return count
}

/**
 * Salva uma lista de projeções tarifárias.
 * Se replaceExistingForType = true (padrão), apaga antes os registros existentes
 * daquele(s) tipo(s) para evitar duplicações.
 */
export async function saveProjecoesTarifarias(
  items: ProjecaoTarifariaItemInput[],
  options: { replaceExistingForType?: boolean } = { replaceExistingForType: true },
): Promise<{ success: boolean; inserted: number; errors: string[] }> {
  if (!items || items.length === 0) {
    return { success: true, inserted: 0, errors: [] }
  }

  // Descobrir quais tipos de cliente estão presentes no lote
  const tiposPresentes = Array.from(new Set(items.map((i) => i.tipo_cliente)))

  if (options.replaceExistingForType) {
    for (const tipo of tiposPresentes) {
      await clearProjecoesTarifarias(tipo)
    }
  }

  let inserted = 0
  const errors: string[] = []

  for (const item of items) {
    try {
      await pb.collection(COLLECTION_NAME).create({
        ano: item.ano,
        tipo_cliente: item.tipo_cliente,
        tarifa_kwh: item.tarifa_kwh,
        fio_b_kwh: item.fio_b_kwh,
        fs: item.fs,
        gd_eco_liquida: item.gd_eco_liquida,
        economia_acumulada: item.economia_acumulada ?? null,
        gasto_acumulado: item.gasto_acumulado ?? null,
      })
      inserted++
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`Ano ${item.ano} (${item.tipo_cliente}): ${msg}`)
    }
  }

  return {
    success: errors.length === 0,
    inserted,
    errors,
  }
}
