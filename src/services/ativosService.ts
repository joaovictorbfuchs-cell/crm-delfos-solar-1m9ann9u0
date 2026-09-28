import pb from '@/lib/pocketbase/client'
import type { AtivoUsina, InfoStatusGarantia, SalvarAtivoDados, TipoAtivo } from '@/types/ativos'
import type { UsinaCliente } from '@/types/crm'

export const OPCOES_TIPO_ATIVO: { value: TipoAtivo; label: string }[] = [
  { value: 'inversor', label: 'Inversor' },
  { value: 'placa_solar', label: 'Placa Solar (Módulo FV)' },
  { value: 'bateria', label: 'Bateria' },
  { value: 'string_box', label: 'String Box' },
  { value: 'outros', label: 'Outros' },
]

export function getLabelTipoAtivo(tipo: TipoAtivo, tipoOutroDescricao?: string): string {
  if (tipo === 'outros' && tipoOutroDescricao?.trim()) {
    return tipoOutroDescricao.trim()
  }
  const encontrado = OPCOES_TIPO_ATIVO.find((o) => o.value === tipo)
  return encontrado ? encontrado.label : tipo
}

/**
 * Indicador visual simples de status de garantia (vigente, próxima do vencimento em 60 dias, vencida, não informada).
 * Apenas visual e sem automação.
 */
export function calcularStatusGarantia(dataFimGarantia?: string): InfoStatusGarantia {
  if (!dataFimGarantia) {
    return {
      status: 'nao_informada',
      label: 'Não informada',
      descricao: 'Data de garantia não cadastrada',
      badgeVariant: 'outline',
      badgeClasses: 'bg-slate-50 text-slate-500 border-slate-200',
    }
  }

  const fimDate = new Date(dataFimGarantia)
  if (isNaN(fimDate.getTime())) {
    return {
      status: 'nao_informada',
      label: 'Data inválida',
      descricao: 'Data de garantia inválida',
      badgeVariant: 'outline',
      badgeClasses: 'bg-slate-50 text-slate-500 border-slate-200',
    }
  }

  // Normalizar para meia-noite do dia atual
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  fimDate.setHours(0, 0, 0, 0)

  const diffMs = fimDate.getTime() - hoje.getTime()
  const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDias < 0) {
    const diasVencida = Math.abs(diffDias)
    return {
      status: 'vencida',
      label: 'Garantia Vencida',
      descricao: `Venceu há ${diasVencida} ${diasVencida === 1 ? 'dia' : 'dias'}`,
      badgeVariant: 'destructive',
      badgeClasses: 'bg-rose-50 text-rose-700 border-rose-300',
      diasRestantes: diffDias,
    }
  }

  if (diffDias <= 60) {
    return {
      status: 'proxima_vencimento',
      label: diffDias === 0 ? 'Vence hoje' : `Vence em ${diffDias}d`,
      descricao: `Garantia vence em ${diffDias} ${diffDias === 1 ? 'dia' : 'dias'}`,
      badgeVariant: 'secondary',
      badgeClasses: 'bg-amber-50 text-amber-800 border-amber-300 font-semibold',
      diasRestantes: diffDias,
    }
  }

  return {
    status: 'vigente',
    label: 'Garantia Vigente',
    descricao: `Válida por mais ${diffDias} dias`,
    badgeVariant: 'default',
    badgeClasses: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold',
    diasRestantes: diffDias,
  }
}

export interface FiltrosAtivos {
  usinaId?: string
  tipo?: TipoAtivo
  busca?: string
  statusGarantia?: string
}

export async function fetchAllUsinasComCliente(): Promise<UsinaCliente[]> {
  try {
    return await pb.collection('usinas').getFullList<UsinaCliente>({
      sort: 'nome',
      expand: 'cliente_id',
    })
  } catch (err) {
    console.error('Erro ao buscar usinas com cliente:', err)
    return []
  }
}

export async function fetchAtivos(filtros?: FiltrosAtivos): Promise<AtivoUsina[]> {
  try {
    const parts: string[] = []

    if (filtros?.usinaId && filtros.usinaId !== 'todas') {
      parts.push(`usina_id = '${filtros.usinaId}'`)
    }
    if (filtros?.tipo && filtros.tipo !== ('todos' as any)) {
      parts.push(`tipo = '${filtros.tipo}'`)
    }
    if (filtros?.busca?.trim()) {
      const q = filtros.busca.trim().replace(/['"\\]/g, '')
      parts.push(
        `(fabricante ~ '${q}' || modelo ~ '${q}' || numero_serie ~ '${q}' || tipo_outro_descricao ~ '${q}')`,
      )
    }

    const filterString = parts.length > 0 ? parts.join(' && ') : undefined

    const records = await pb.collection('ativos').getFullList<AtivoUsina>({
      filter: filterString,
      sort: '-created',
      expand: 'usina_id,usina_id.cliente_id,responsavel_id',
    })

    if (filtros?.statusGarantia && filtros.statusGarantia !== 'todos') {
      return records.filter((item) => {
        const info = calcularStatusGarantia(item.data_fim_garantia)
        return info.status === filtros.statusGarantia
      })
    }

    return records
  } catch (err) {
    console.error('Erro ao buscar ativos:', err)
    return []
  }
}

export async function fetchAtivosPorUsina(usinaId: string): Promise<AtivoUsina[]> {
  if (!usinaId) return []
  try {
    return await pb.collection('ativos').getFullList<AtivoUsina>({
      filter: `usina_id = '${usinaId}'`,
      sort: 'tipo,fabricante,modelo',
      expand: 'responsavel_id',
    })
  } catch (err) {
    console.error(`Erro ao buscar ativos da usina ${usinaId}:`, err)
    return []
  }
}

export async function createAtivo(dados: SalvarAtivoDados): Promise<AtivoUsina> {
  const payload: Record<string, any> = {
    usina_id: dados.usina_id,
    tipo: dados.tipo,
    fabricante: dados.fabricante.trim(),
    modelo: dados.modelo.trim(),
    tipo_outro_descricao:
      dados.tipo === 'outros' && dados.tipo_outro_descricao
        ? dados.tipo_outro_descricao.trim()
        : '',
    numero_serie: dados.numero_serie ? dados.numero_serie.trim() : '',
    observacoes: dados.observacoes ? dados.observacoes.trim() : '',
    status_operacional: dados.status_operacional || 'operacional',
  }

  if (dados.data_instalacao) {
    payload.data_instalacao =
      dados.data_instalacao.includes('T') || dados.data_instalacao.includes(' ')
        ? dados.data_instalacao
        : `${dados.data_instalacao} 12:00:00.000Z`
  } else {
    payload.data_instalacao = null
  }

  if (dados.data_fim_garantia) {
    payload.data_fim_garantia =
      dados.data_fim_garantia.includes('T') || dados.data_fim_garantia.includes(' ')
        ? dados.data_fim_garantia
        : `${dados.data_fim_garantia} 12:00:00.000Z`
  } else {
    payload.data_fim_garantia = null
  }

  if (dados.responsavel_id) {
    payload.responsavel_id = dados.responsavel_id
  }

  return await pb.collection('ativos').create<AtivoUsina>(payload, {
    expand: 'usina_id,usina_id.cliente_id,responsavel_id',
  })
}

export async function updateAtivo(
  id: string,
  dados: Partial<SalvarAtivoDados>,
): Promise<AtivoUsina> {
  const payload: Record<string, any> = {}

  if (dados.usina_id !== undefined) payload.usina_id = dados.usina_id
  if (dados.tipo !== undefined) payload.tipo = dados.tipo
  if (dados.tipo_outro_descricao !== undefined)
    payload.tipo_outro_descricao = dados.tipo_outro_descricao.trim()
  if (dados.fabricante !== undefined) payload.fabricante = dados.fabricante.trim()
  if (dados.modelo !== undefined) payload.modelo = dados.modelo.trim()
  if (dados.numero_serie !== undefined) payload.numero_serie = dados.numero_serie.trim()
  if (dados.observacoes !== undefined) payload.observacoes = dados.observacoes.trim()
  if (dados.status_operacional !== undefined) payload.status_operacional = dados.status_operacional
  if (dados.responsavel_id !== undefined) payload.responsavel_id = dados.responsavel_id || null

  if (dados.data_instalacao !== undefined) {
    payload.data_instalacao = dados.data_instalacao
      ? dados.data_instalacao.includes('T') || dados.data_instalacao.includes(' ')
        ? dados.data_instalacao
        : `${dados.data_instalacao} 12:00:00.000Z`
      : null
  }

  if (dados.data_fim_garantia !== undefined) {
    payload.data_fim_garantia = dados.data_fim_garantia
      ? dados.data_fim_garantia.includes('T') || dados.data_fim_garantia.includes(' ')
        ? dados.data_fim_garantia
        : `${dados.data_fim_garantia} 12:00:00.000Z`
      : null
  }

  return await pb.collection('ativos').update<AtivoUsina>(id, payload, {
    expand: 'usina_id,usina_id.cliente_id,responsavel_id',
  })
}

export async function deleteAtivo(id: string): Promise<boolean> {
  await pb.collection('ativos').delete(id)
  return true
}
