import pb from '@/lib/pocketbase/client'
import type { UsinaEquipamentoAtivo, SalvarUsinaEquipamentoDados } from '@/types/equipamentos'

/**
 * Busca todos os equipamentos vinculados a uma determinada usina
 */
/**
 * Retorna um mapa { [equipamento_id]: total_usinas_vinculadas }
 * buscando todos os vínculos em uma única chamada em lote.
 */
export async function fetchContagemUsoEquipamentosEmUsinas(): Promise<Record<string, number>> {
  try {
    const records = await pb.collection('usina_equipamentos').getFullList<{
      id: string
      equipamento_id: string
      usina_id: string
    }>({
      fields: 'id,equipamento_id,usina_id',
    })

    const contagem: Record<string, number> = {}
    // Mapear usinas únicas por equipamento (ou total de vínculos de ativos)
    // Se o mesmo equipamento estiver em 2 usinas diferentes, conta 2.
    // Usamos um Set por equipamento para saber o número de usinas distintas vinculadas
    const usinasPorEquipamento = new Map<string, Set<string>>()
    for (const rec of records) {
      if (!rec.equipamento_id) continue
      let usinas = usinasPorEquipamento.get(rec.equipamento_id)
      if (!usinas) {
        usinas = new Set<string>()
        usinasPorEquipamento.set(rec.equipamento_id, usinas)
      }
      if (rec.usina_id) {
        usinas.add(rec.usina_id)
      } else {
        usinas.add(rec.id)
      }
    }

    usinasPorEquipamento.forEach((setUsinas, equipId) => {
      contagem[equipId] = setUsinas.size
    })

    return contagem
  } catch (err) {
    console.error('Erro ao buscar contagem de uso de equipamentos em usinas:', err)
    return {}
  }
}

export const fetchEquipamentosByUsinaId = fetchEquipamentosPorUsina

export async function fetchEquipamentosPorUsina(usinaId: string): Promise<UsinaEquipamentoAtivo[]> {
  if (!usinaId) return []
  try {
    const records = await pb.collection('usina_equipamentos').getFullList<UsinaEquipamentoAtivo>({
      filter: `usina_id = '${usinaId}'`,
      sort: '-created',
      expand: 'equipamento_id,equipamento_id.fornecedor_id,usina_id',
    })
    return records
  } catch (err) {
    console.error('Erro ao buscar equipamentos da usina:', err)
    return []
  }
}

/**
 * Vincula um equipamento à usina
 */
export async function vincularEquipamentoUsina(
  dados: SalvarUsinaEquipamentoDados,
): Promise<UsinaEquipamentoAtivo> {
  const payload: Record<string, any> = {
    usina_id: dados.usina_id,
    equipamento_id: dados.equipamento_id,
  }
  if (dados.quantidade !== undefined && dados.quantidade !== null) {
    payload.quantidade = Number(dados.quantidade)
  }
  if (dados.numero_serie !== undefined) {
    payload.numero_serie = dados.numero_serie ? dados.numero_serie.trim() : ''
  }
  if (dados.observacoes !== undefined) {
    payload.observacoes = dados.observacoes ? dados.observacoes.trim() : ''
  }

  const record = await pb.collection('usina_equipamentos').create<UsinaEquipamentoAtivo>(payload, {
    expand: 'equipamento_id,equipamento_id.fornecedor_id,usina_id',
  })
  return record
}

/**
 * Atualiza vínculo de equipamento na usina (ex: quantidade, número de série, observações)
 */
export async function updateVinculoEquipamentoUsina(
  id: string,
  dados: Partial<SalvarUsinaEquipamentoDados>,
): Promise<UsinaEquipamentoAtivo> {
  const payload: Record<string, any> = {}
  if (dados.quantidade !== undefined) {
    payload.quantidade =
      dados.quantidade === null || isNaN(Number(dados.quantidade)) ? null : Number(dados.quantidade)
  }
  if (dados.numero_serie !== undefined) {
    payload.numero_serie = dados.numero_serie ? dados.numero_serie.trim() : ''
  }
  if (dados.observacoes !== undefined) {
    payload.observacoes = dados.observacoes ? dados.observacoes.trim() : ''
  }

  const record = await pb
    .collection('usina_equipamentos')
    .update<UsinaEquipamentoAtivo>(id, payload, {
      expand: 'equipamento_id,equipamento_id.fornecedor_id,usina_id',
    })
  return record
}

/**
 * Remove vínculo de equipamento da usina
 */
export async function desvincularEquipamentoUsina(id: string): Promise<boolean> {
  await pb.collection('usina_equipamentos').delete(id)
  return true
}
