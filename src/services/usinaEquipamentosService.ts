import pb from '@/lib/pocketbase/client'
import type { UsinaEquipamentoAtivo, SalvarUsinaEquipamentoDados } from '@/types/equipamentos'

/**
 * Busca todos os equipamentos vinculados a uma determinada usina
 */
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
