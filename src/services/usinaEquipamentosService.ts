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
      expand:
        'equipamento_id,equipamento_id.fornecedor_id,equipamento_id.configuracao_monitoramento_id,usina_id',
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
  // Idempotência / Deduplicação: antes de criar, verificar se já existe vínculo
  // com mesmo usina_id + equipamento_id. Se existir, atualiza em vez de inserir duplicata.
  if (dados.usina_id && dados.equipamento_id) {
    try {
      const existentes = await pb
        .collection('usina_equipamentos')
        .getFullList<UsinaEquipamentoAtivo>({
          filter: `usina_id = '${dados.usina_id}' && equipamento_id = '${dados.equipamento_id}'`,
          requestKey: null,
        })
      if (existentes && existentes.length > 0) {
        const existente = existentes[0]
        const payloadUpdate: Record<string, any> = {}
        if (dados.quantidade !== undefined && dados.quantidade !== null) {
          payloadUpdate.quantidade = Number(dados.quantidade)
        }
        if (dados.numero_serie !== undefined && dados.numero_serie.trim()) {
          payloadUpdate.numero_serie = dados.numero_serie.trim()
        }
        if (dados.observacoes !== undefined && dados.observacoes.trim()) {
          payloadUpdate.observacoes = dados.observacoes.trim()
        }
        return await pb
          .collection('usina_equipamentos')
          .update<UsinaEquipamentoAtivo>(existente.id, payloadUpdate, {
            expand:
              'equipamento_id,equipamento_id.fornecedor_id,equipamento_id.configuracao_monitoramento_id,usina_id',
          })
      }
    } catch (errCheck) {
      console.warn('Aviso ao checar vínculo existente em usina_equipamentos:', errCheck)
    }
  }

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
    expand:
      'equipamento_id,equipamento_id.fornecedor_id,equipamento_id.configuracao_monitoramento_id,usina_id',
  })
  if (dados.usina_id) {
    await recalcularTotaisUsinaPorVinculos(dados.usina_id).catch((err) =>
      console.warn(
        '[usinaEquipamentosService] Falha ao recalcular totais da usina pós-vínculo:',
        err,
      ),
    )
  }
  return record
}

/**
 * Atualiza vínculo de equipamento na usina (ex: quantidade, número de série, observações)
 * e recalcula os totais de módulos e potência kWp da usina automaticamente.
 */
export async function updateVinculoEquipamentoUsina(
  id: string,
  dados: Partial<SalvarUsinaEquipamentoDados>,
  usinaIdHint?: string,
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
      expand:
        'equipamento_id,equipamento_id.fornecedor_id,equipamento_id.configuracao_monitoramento_id,usina_id',
    })
  const usinaId = dados.usina_id || record.usina_id || usinaIdHint
  if (usinaId) {
    await recalcularTotaisUsinaPorVinculos(usinaId).catch((err) =>
      console.warn('[usinaEquipamentosService] Falha ao recalcular totais pós-update:', err),
    )
  }
  return record
}

/**
 * Remove vínculo de equipamento da usina e recalcula totais da usina
 */
export async function desvincularEquipamentoUsina(
  id: string,
  usinaIdHint?: string,
): Promise<boolean> {
  let resolvedUsinaId = usinaIdHint
  if (!resolvedUsinaId) {
    try {
      const existente = await pb.collection('usina_equipamentos').getOne<UsinaEquipamentoAtivo>(id)
      resolvedUsinaId = existente.usina_id
    } catch {
      // segue sem erro se não conseguir buscar
    }
  }
  await pb.collection('usina_equipamentos').delete(id)
  if (resolvedUsinaId) {
    await recalcularTotaisUsinaPorVinculos(resolvedUsinaId).catch((err) =>
      console.warn('[usinaEquipamentosService] Falha ao recalcular totais pós-desvínculo:', err),
    )
  }
  return true
}

/**
 * Recalcula e persiste o total de módulos e a potência de pico (kWp) da usina
 * baseado nos vínculos atuais de módulos fotovoltaicos no catálogo:
 * - totalModulos = Σ(vinculo.quantidade) para todos os módulos vinculados à usina
 * - potenciaKwp = Σ(vinculo.quantidade × equipamento.potencia_w) / 1000 (somando modelos distintos)
 * Atualiza qtd_modulos, quantidade_placas, potencia_kwp e potencia_pico_modulos_kwp na coleção usinas.
 */
export async function recalcularTotaisUsinaPorVinculos(
  usinaId: string,
): Promise<{ qtd_modulos: number; potencia_kwp: number } | null> {
  if (!usinaId) return null
  try {
    const vinculos = await pb.collection('usina_equipamentos').getFullList<UsinaEquipamentoAtivo>({
      filter: `usina_id = "${usinaId}"`,
      expand: 'equipamento_id',
      requestKey: null,
    })

    const vinculosModulos = vinculos.filter((v) => v.expand?.equipamento_id?.tipo === 'modulo_fv')

    if (vinculosModulos.length === 0) {
      return null
    }

    let totalModulos = 0
    let totalPotenciaW = 0

    for (const v of vinculosModulos) {
      const qtd = Number(v.quantidade) > 0 ? Number(v.quantidade) : 1
      const potW = Number(v.expand?.equipamento_id?.potencia_w) || 0
      totalModulos += qtd
      totalPotenciaW += qtd * potW
    }

    const potenciaKwp = Number((totalPotenciaW / 1000).toFixed(2))

    const payloadUpdate: Record<string, unknown> = {
      qtd_modulos: totalModulos,
      quantidade_placas: totalModulos,
      potencia_kwp: potenciaKwp,
      potencia_pico_modulos_kwp: potenciaKwp,
    }

    await pb.collection('usinas').update(usinaId, payloadUpdate)
    return { qtd_modulos: totalModulos, potencia_kwp: potenciaKwp }
  } catch (err) {
    console.error(`[usinaEquipamentosService] Erro ao recalcular totais da usina ${usinaId}:`, err)
    return null
  }
}
