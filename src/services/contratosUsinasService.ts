import pb from '@/lib/pocketbase/client'
import type { ContratoOM, UsinaCliente, Sistema } from '@/types/crm'

export type SistemaOuUsina = UsinaCliente | Sistema

export interface TotaisUsinasContrato {
  usinas: SistemaOuUsina[]
  quantidadeUsinas: number
  potenciaTotalKwp: number | null
  qtdModulosTotal: number | null
  geracaoEstimadaMensalKwh: number | null
}

export function calcularTotaisUsinasContrato(
  contratoId: string | undefined,
  clienteId: string | undefined,
  sistemas: SistemaOuUsina[],
  vinculosContratosUsinas: ContratoUsina[],
  fallbackContrato?: {
    potencia_kwp?: number
    qtd_modulos?: number
    geracao_media_mensal_kwh?: number
  },
  fallbackCliente?: { potencia_kwp?: number; placas_qtd?: number },
): TotaisUsinasContrato {
  const listaSistemas = Array.isArray(sistemas) ? sistemas : []
  const listaVinculos = Array.isArray(vinculosContratosUsinas) ? vinculosContratosUsinas : []

  // 1. Filtrar vínculos ativos para este contrato
  const vinculosAtivos = contratoId
    ? listaVinculos.filter((v) => v?.contrato_id === contratoId && v?.ativo !== false)
    : []

  let usinasResolvidas: SistemaOuUsina[] = []

  if (vinculosAtivos.length > 0) {
    // Resolve usinas a partir dos vínculos
    usinasResolvidas = vinculosAtivos
      .map((v) => {
        const encontrada = listaSistemas.find((s) => s?.id === v.usina_id)
        if (encontrada) return encontrada
        if (v.expand?.usina_id && (v.expand.usina_id as unknown as SistemaOuUsina).id) {
          return v.expand.usina_id as unknown as SistemaOuUsina
        }
        return null
      })
      .filter((u): u is SistemaOuUsina => Boolean(u && u.id))
  } else if (contratoId) {
    // Fallback: usinas vinculadas pelo campo contrato_id direto na usina
    usinasResolvidas = listaSistemas.filter((s) => s?.contrato_id === contratoId)
  }

  // Se ainda não encontrou vínculos específicos por contrato, verifica pelo clienteId
  if (usinasResolvidas.length === 0 && clienteId) {
    usinasResolvidas = listaSistemas.filter((s) => s?.cliente_id === clienteId)
  }

  // Deduplicar usinas por id
  const usinasUnicas: SistemaOuUsina[] = []
  const vistos = new Set<string>()
  for (const u of usinasResolvidas) {
    if (u?.id && !vistos.has(u.id)) {
      vistos.add(u.id)
      usinasUnicas.push(u)
    }
  }

  // 2. Calcular somatórios de potência, placas e geração estimada
  let somaPotencia = 0
  let temPotencia = false

  let somaModulos = 0
  let temModulos = false

  let somaGeracao = 0
  let temGeracao = false

  for (const u of usinasUnicas) {
    const rawPot =
      (u as Record<string, unknown>).potencia_total_kwp ??
      (u as Record<string, unknown>).potencia_kwp
    const pot = Number(rawPot)
    if (!isNaN(pot) && pot > 0) {
      somaPotencia += pot
      temPotencia = true
    }

    const rawMod =
      (u as Record<string, unknown>).quantidade_modulos ??
      (u as Record<string, unknown>).qtd_modulos ??
      (u as Record<string, unknown>).quantidade_placas
    const mod = Number(rawMod)
    if (!isNaN(mod) && mod > 0) {
      somaModulos += mod
      temModulos = true
    }

    const rawGer =
      (u as Record<string, unknown>).geracao_estimada_kwh ??
      (u as Record<string, unknown>).geracao_media_mensal_kwh
    const ger = Number(rawGer)
    if (!isNaN(ger) && ger > 0) {
      somaGeracao += ger
      temGeracao = true
    }
  }

  // Fallbacks contratuais e do cliente
  const fbContratoPot =
    typeof fallbackContrato?.potencia_kwp === 'number' && fallbackContrato.potencia_kwp > 0
      ? fallbackContrato.potencia_kwp
      : null
  const fbClientePot =
    typeof fallbackCliente?.potencia_kwp === 'number' && fallbackCliente.potencia_kwp > 0
      ? fallbackCliente.potencia_kwp
      : null

  const fbContratoMod =
    typeof fallbackContrato?.qtd_modulos === 'number' && fallbackContrato.qtd_modulos > 0
      ? fallbackContrato.qtd_modulos
      : null
  const fbClienteMod =
    typeof fallbackCliente?.placas_qtd === 'number' && fallbackCliente.placas_qtd > 0
      ? fallbackCliente.placas_qtd
      : null

  const fbContratoGer =
    typeof fallbackContrato?.geracao_media_mensal_kwh === 'number' &&
    fallbackContrato.geracao_media_mensal_kwh > 0
      ? fallbackContrato.geracao_media_mensal_kwh
      : null

  const potenciaTotalKwp = temPotencia
    ? Math.round(somaPotencia * 100) / 100
    : (fbContratoPot ?? fbClientePot ?? null)

  const qtdModulosTotal = temModulos
    ? Math.round(somaModulos)
    : (fbContratoMod ?? fbClienteMod ?? null)

  const geracaoEstimadaMensalKwh = temGeracao
    ? Math.round(somaGeracao * 100) / 100
    : (fbContratoGer ?? null)

  return {
    usinas: usinasUnicas,
    quantidadeUsinas: usinasUnicas.length,
    potenciaTotalKwp,
    qtdModulosTotal,
    geracaoEstimadaMensalKwh,
  }
}

export interface UsinaItem {
  id: string
  cliente_id: string
  nome: string
  endereco?: string
  potencia_kwp?: number
  qtd_modulos?: number
  inversores_info?: string
  tipo_estrutura?: 'solo' | 'telhado'
  contrato_id?: string
  created: string
  updated: string
  [key: string]: unknown
}

export interface ContratoUsina {
  id: string
  contrato_id: string
  usina_id: string
  ativo: boolean
  data_vinculo?: string
  data_desvinculo?: string
  observacoes?: string
  created: string
  updated: string
  expand?: {
    contrato_id?: ContratoOM
    usina_id?: UsinaItem
  }
}

export interface VincularUsinaContratoPayload {
  contrato_id: string
  usina_id: string
  observacoes?: string
  data_vinculo?: string
}

/**
 * Lista todos os vínculos (ativos e histórico) de um contrato
 */
export async function getUsinasByContratoId(contratoId: string): Promise<ContratoUsina[]> {
  try {
    return await pb.collection('contratos_usinas').getFullList<ContratoUsina>({
      filter: `contrato_id = "${contratoId}"`,
      sort: '-ativo,-created',
      expand: 'usina_id,contrato_id',
    })
  } catch (err) {
    console.error('Erro ao buscar usinas do contrato:', err)
    return []
  }
}

/**
 * Lista todos os vínculos (ativos e histórico de contratos) de uma usina
 */
export async function getContratosByUsinaId(usinaId: string): Promise<ContratoUsina[]> {
  try {
    return await pb.collection('contratos_usinas').getFullList<ContratoUsina>({
      filter: `usina_id = "${usinaId}"`,
      sort: '-ativo,-created',
      expand: 'contrato_id,usina_id',
    })
  } catch (err) {
    console.error('Erro ao buscar contratos da usina:', err)
    return []
  }
}

/**
 * Vincula uma usina a um contrato na relação N:N.
 * Se já existir um vínculo anterior (por exemplo desvinculado), reativa ou cria novo,
 * mantendo o histórico de auditoria e atualizando o campo contrato_id na usina.
 */
export async function vincularUsinaAoContrato(
  payload: VincularUsinaContratoPayload,
): Promise<ContratoUsina> {
  const agora = new Date().toISOString()
  const dataVinculo = payload.data_vinculo || agora

  // 1. Verificar se já existe registro desse par
  const existentes = await pb.collection('contratos_usinas').getList<ContratoUsina>(1, 1, {
    filter: `contrato_id = "${payload.contrato_id}" && usina_id = "${payload.usina_id}"`,
    sort: '-created',
  })

  let registro: ContratoUsina

  if (existentes.items.length > 0) {
    const item = existentes.items[0]
    registro = await pb.collection('contratos_usinas').update<ContratoUsina>(
      item.id,
      {
        ativo: true,
        data_vinculo: dataVinculo,
        data_desvinculo: null,
        observacoes: payload.observacoes || item.observacoes || '',
      },
      {
        expand: 'usina_id,contrato_id',
      },
    )
  } else {
    registro = await pb.collection('contratos_usinas').create<ContratoUsina>(
      {
        contrato_id: payload.contrato_id,
        usina_id: payload.usina_id,
        ativo: true,
        data_vinculo: dataVinculo,
        observacoes: payload.observacoes || '',
      },
      {
        expand: 'usina_id,contrato_id',
      },
    )
  }

  // 2. Garantir sincronização também via cliente (dupla segurança com o hook backend)
  try {
    await pb.collection('usinas').update(payload.usina_id, {
      contrato_id: payload.contrato_id,
    })
  } catch (err) {
    console.warn('Aviso ao sincronizar contrato_id na usina:', err)
  }

  return registro
}

/**
 * Desvincula uma usina de um contrato de forma aditiva:
 * NÃO apaga o registro, marca ativo = false e preenche data_desvinculo,
 * preservando todo o histórico temporal de contratos da usina.
 */
export async function desvincularUsinaDoContrato(
  vinculoId: string,
  observacoesEncerramento?: string,
): Promise<ContratoUsina> {
  const agora = new Date().toISOString()
  const vinculo = await pb.collection('contratos_usinas').getOne<ContratoUsina>(vinculoId)

  const atualizado = await pb.collection('contratos_usinas').update<ContratoUsina>(
    vinculoId,
    {
      ativo: false,
      data_desvinculo: agora,
      observacoes: observacoesEncerramento
        ? `${vinculo.observacoes ? `${vinculo.observacoes} | ` : ''}Desvinculado: ${observacoesEncerramento}`
        : vinculo.observacoes || '',
    },
    {
      expand: 'usina_id,contrato_id',
    },
  )

  // Sincronizar campo atual da usina: se apontava para esse contrato,
  // verificar se há outro contrato ativo para ela
  try {
    const usina = await pb.collection('usinas').getOne<UsinaItem>(vinculo.usina_id)
    if (usina.contrato_id === vinculo.contrato_id) {
      const outrosAtivos = await pb.collection('contratos_usinas').getList<ContratoUsina>(1, 1, {
        filter: `usina_id = "${vinculo.usina_id}" && ativo = true && id != "${vinculoId}"`,
        sort: '-created',
      })

      const novoContratoId =
        outrosAtivos.items.length > 0 ? outrosAtivos.items[0].contrato_id : null
      await pb.collection('usinas').update(vinculo.usina_id, {
        contrato_id: novoContratoId,
      })
    }
  } catch (err) {
    console.warn('Aviso ao sincronizar contrato_id pós desvinculação:', err)
  }

  return atualizado
}

/**
 * Busca todas as usinas (opcionalmente filtradas por cliente)
 */
export async function getUsinasDisponiveis(clienteId?: string): Promise<UsinaItem[]> {
  try {
    const filter = clienteId ? `cliente_id = "${clienteId}"` : ''
    return await pb.collection('usinas').getFullList<UsinaItem>({
      filter: filter || undefined,
      sort: 'nome',
    })
  } catch (err) {
    console.error('Erro ao buscar usinas disponíveis:', err)
    return []
  }
}

/**
 * Busca todos os vínculos de contratos_usinas ativos no sistema
 */
export async function getAllContratosUsinas(): Promise<ContratoUsina[]> {
  try {
    return await pb.collection('contratos_usinas').getFullList<ContratoUsina>({
      filter: 'ativo = true',
      sort: '-created',
      expand: 'usina_id,contrato_id',
    })
  } catch (err) {
    console.error('Erro ao buscar todos os vínculos de contratos_usinas:', err)
    return []
  }
}
