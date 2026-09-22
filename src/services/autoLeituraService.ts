import pb from '@/lib/pocketbase/client'
import type { Atividade } from '@/types/crm'

/**
 * Helper unificado para detectar se uma atividade é do tipo Auto Leitura - RGE,
 * seja pelo tipo estrito ('auto_leitura_rge'), subtipo contendo 'auto_leitura' ou
 * título contendo 'auto leitura' / 'auto-leitura' (legado).
 */
export function isAtividadeAutoLeitura(
  atv?: Partial<Atividade> | { tipo?: string | null; titulo?: string | null } | null,
): boolean {
  if (!atv) return false
  const tipo = (atv.tipo || '').toLowerCase().trim()
  if (tipo === 'auto_leitura_rge' || tipo.includes('auto_leitura')) {
    return true
  }
  const titulo = (atv.titulo || '').toLowerCase().trim()
  if (titulo.includes('auto leitura') || titulo.includes('auto-leitura')) {
    return true
  }
  return false
}

export interface CronogramaDataItem {
  id: string
  data: string // YYYY-MM-DD
  responsavel: 'Cliente' | 'Distribuidora'
  observacao?: string
}

export interface AutoLeituraDadosConclusao {
  fotosEnviadas: boolean
  valoresInformados: boolean
  protocoloRealizado: boolean
  valor03Consumo?: string
  valor103Injetada?: string
  protocoloRGE?: string
  concluidoEm?: string
  concluidoPor?: string
}

export interface SalvarAutoLeituraParams {
  atividadeId: string
  cronogramaDatas?: CronogramaDataItem[]
  cronogramaArquivo?: File | null
  autoLeituraDados?: AutoLeituraDadosConclusao
  autoLeituraObs?: string
  descricao?: string
  status?: 'pendente' | 'concluida' | 'cancelada' | 'agendada'
}

/**
 * Validação dos 3 requisitos de conclusão da Auto Leitura - RGE:
 * (1) fotos ou vídeo do medidor enviados
 * (2) valores das grandezas 03 e 103 informados
 * (3) protocolo na RGE realizado
 */
export function validarRequisitosConclusao(dados?: Partial<AutoLeituraDadosConclusao> | null): {
  valido: boolean
  erros: string[]
} {
  const erros: string[] = []
  if (!dados?.fotosEnviadas) {
    erros.push('Envio das fotos ou vídeo do medidor é obrigatório.')
  }
  if (!dados?.valoresInformados) {
    erros.push('Confirmação por escrito dos valores das grandezas 03 e 103 é obrigatória.')
  }
  if (!dados?.protocoloRealizado) {
    erros.push('Realização e registro do protocolo na RGE é obrigatório.')
  }
  return {
    valido: erros.length === 0,
    erros,
  }
}

/**
 * Adiciona, atualiza ou remove uma data do cronograma de uma atividade
 */
export async function atualizarDatasCronograma(
  atividadeId: string,
  atualizador: (datasAtuais: CronogramaDataItem[]) => CronogramaDataItem[],
): Promise<Atividade> {
  const atividade = await pb.collection('atividades').getOne<Atividade>(atividadeId)
  let datas: CronogramaDataItem[] = []
  if (Array.isArray(atividade.cronograma_datas)) {
    datas = atividade.cronograma_datas as CronogramaDataItem[]
  } else if (typeof atividade.cronograma_datas === 'string') {
    try {
      datas = JSON.parse(atividade.cronograma_datas)
    } catch {
      datas = []
    }
  }

  const novasDatas = atualizador(datas)
  return await salvarAtividadeAutoLeitura({
    atividadeId,
    cronogramaDatas: novasDatas,
  })
}

/**
 * Salva as alterações da atividade Auto Leitura - RGE no PocketBase
 */
export async function salvarAtividadeAutoLeitura(
  params: SalvarAutoLeituraParams,
): Promise<Atividade> {
  const {
    atividadeId,
    cronogramaDatas,
    cronogramaArquivo,
    autoLeituraDados,
    autoLeituraObs,
    descricao,
    status,
  } = params

  if (cronogramaArquivo) {
    const formData = new FormData()
    formData.append('cronograma_arquivo', cronogramaArquivo)
    if (cronogramaDatas !== undefined) {
      formData.append('cronograma_datas', JSON.stringify(cronogramaDatas))
    }
    if (autoLeituraDados !== undefined) {
      formData.append('auto_leitura_dados', JSON.stringify(autoLeituraDados))
    }
    if (autoLeituraObs !== undefined) {
      formData.append('auto_leitura_obs', autoLeituraObs)
    }
    if (descricao !== undefined) {
      formData.append('descricao', descricao)
    }
    if (status !== undefined) {
      formData.append('status', status)
    }
    const updated = await pb.collection('atividades').update<Atividade>(atividadeId, formData, {
      expand: 'cliente_id,usina_id,responsavel_id',
    })
    return updated
  }

  const payload: Record<string, unknown> = {}
  if (cronogramaDatas !== undefined) {
    payload.cronograma_datas = cronogramaDatas
  }
  if (autoLeituraDados !== undefined) {
    payload.auto_leitura_dados = autoLeituraDados
  }
  if (autoLeituraObs !== undefined) {
    payload.auto_leitura_obs = autoLeituraObs
  }
  if (descricao !== undefined) {
    payload.descricao = descricao
  }
  if (status !== undefined) {
    payload.status = status
  }

  const updated = await pb.collection('atividades').update<Atividade>(atividadeId, payload, {
    expand: 'cliente_id,usina_id,responsavel_id',
  })
  return updated
}

/**
 * Chama o backend para gerar automaticamente os lembretes para datas onde o responsável é 'Cliente'
 */
export async function dispararGeracaoLembretesBackend(
  atividadeId: string,
): Promise<{ ok: boolean; message: string; lembretesCriados?: number }> {
  try {
    const res = await pb.send<{ ok: boolean; message: string; lembretesCriados?: number }>(
      '/backend/v1/auto-leitura/gerar-lembretes',
      {
        method: 'POST',
        body: { atividade_id: atividadeId },
      },
    )
    return res
  } catch (err) {
    console.warn('Erro ao chamar /backend/v1/auto-leitura/gerar-lembretes:', err)
    return { ok: false, message: 'Não foi possível sincronizar lembretes no backend.' }
  }
}

/**
 * Busca o histórico de todas as atividades de Auto Leitura - RGE já realizadas (ou existentes) para um determinado cliente
 */
export async function buscarHistoricoAutoLeituraCliente(clienteId: string): Promise<Atividade[]> {
  if (!clienteId) return []
  try {
    const records = await pb.collection('atividades').getFullList<Atividade>({
      filter: `cliente_id = '${clienteId}' && tipo = 'auto_leitura_rge'`,
      sort: '-created',
      expand: 'cliente_id,usina_id,responsavel_id',
    })
    return records
  } catch (err) {
    console.error('Erro ao buscar histórico de auto leitura do cliente:', err)
    return []
  }
}
