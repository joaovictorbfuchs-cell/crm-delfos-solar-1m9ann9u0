import pb from '@/lib/pocketbase/client'
import type { ContratoOM } from '@/types/crm'

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
