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
  if (
    tipo === 'auto_leitura_rge' ||
    tipo.includes('auto_leitura') ||
    tipo.includes('autoleitura')
  ) {
    return true
  }
  const titulo = (atv.titulo || '').toLowerCase().trim()
  if (
    titulo.includes('auto leitura') ||
    titulo.includes('auto-leitura') ||
    titulo.includes('autoleitura') ||
    titulo.includes('leitura rge') ||
    titulo.includes('leitura - rge')
  ) {
    return true
  }
  return false
}

/**
 * Identifica se a atividade é uma filha gerada no padrão "Auto Leitura RGE - DD/MM/AAAA"
 */
export function isAtividadeAutoLeituraFilha(
  atv?: Partial<Atividade> | { tipo?: string | null; titulo?: string | null } | null,
): boolean {
  if (!atv) return false
  const isAuto = isAtividadeAutoLeitura(atv)
  if (!isAuto) return false
  const titulo = (atv.titulo || '').toLowerCase().trim()
  return (
    titulo.includes('auto leitura rge -') ||
    titulo.includes('auto leitura rge-') ||
    /auto\s*leitura.*rge.*-.*\d{2}\/\d{2}\/\d{4}/i.test(titulo)
  )
}

/**
 * Retorna o estado e dados da tag do lembrete de Auto Leitura RGE:
 * - Se já enviou lembrete: 'enviado' ("Mensagem enviada - aguardando dados", amarelo)
 * - Se não enviou: 'aguardando' ("Aguardando envio", verde)
 */
export function getAutoLeituraLembreteStatus(
  atv?: Partial<Atividade> | null,
): 'aguardando' | 'enviado' {
  if (!atv) return 'aguardando'
  if (atv.lembrete_whatsapp_enviado_em) {
    return 'enviado'
  }
  // Suporte a legado dentro de auto_leitura_dados
  if (atv.auto_leitura_dados) {
    let parsed: any = null
    if (typeof atv.auto_leitura_dados === 'object') parsed = atv.auto_leitura_dados
    else if (typeof atv.auto_leitura_dados === 'string') {
      try {
        parsed = JSON.parse(atv.auto_leitura_dados)
      } catch {
        /* intentionally ignored */
      }
    }
    if (parsed?.lembrete_whatsapp_enviado_em || parsed?.lembreteWhatsAppEnviadoEm) {
      return 'enviado'
    }
  }
  return 'aguardando'
}

export interface CronogramaDataItem {
  id: string
  data: string // YYYY-MM-DD
  responsavel: 'Cliente' | 'Distribuidora'
  observacao?: string
}

export interface AutoLeituraDadosConclusao {
  fotosEnviadas?: boolean
  valoresInformados?: boolean
  protocoloRealizado?: boolean
  valor03Consumo?: string
  valor103Injetada?: string
  protocoloRGE?: string
  dataLeitura?: string
  lembreteWhatsAppEnviadoEm?: string
  concluidoEm?: string
  concluidoPor?: string
}

export interface SalvarAutoLeituraParams {
  atividadeId: string
  cronogramaDatas?: CronogramaDataItem[]
  cronogramaArquivo?: File | null
  autoLeituraDados?: AutoLeituraDadosConclusao
  autoLeituraObs?: string
  protocoloRGE?: string
  valor03Consumo?: string
  valor103Injetada?: string
  dataLeitura?: string
  lembreteWhatsAppEnviadoEm?: string
  descricao?: string
  status?: 'pendente' | 'concluida' | 'cancelada' | 'agendada'
}

/**
 * Validação dos 4 requisitos estritos de conclusão da Auto Leitura - RGE:
 * 1. Protocolo RGE
 * 2. Valor grandeza 03
 * 3. Valor grandeza 103
 * 4. Data da leitura
 */
export function validarCamposConclusaoAutoLeitura(dados: {
  protocoloRGE?: string | null
  valorGrandeza03?: string | null
  valorGrandeza103?: string | null
  dataLeitura?: string | null
}): {
  valido: boolean
  erros: string[]
  faltantes: string[]
} {
  const faltantes: string[] = []
  if (!dados.protocoloRGE || !dados.protocoloRGE.trim()) {
    faltantes.push('Protocolo RGE')
  }
  if (!dados.valorGrandeza03 || !dados.valorGrandeza03.trim()) {
    faltantes.push('Valor grandeza 03')
  }
  if (!dados.valorGrandeza103 || !dados.valorGrandeza103.trim()) {
    faltantes.push('Valor grandeza 103')
  }
  if (!dados.dataLeitura || !dados.dataLeitura.trim()) {
    faltantes.push('Data da leitura')
  }

  const erros = faltantes.map((f) => `Preenchimento de "${f}" é obrigatório.`)
  return {
    valido: faltantes.length === 0,
    erros,
    faltantes,
  }
}

/**
 * Validação legada mantida para compatibilidade
 */
export function validarRequisitosConclusao(dados?: Partial<AutoLeituraDadosConclusao> | null): {
  valido: boolean
  erros: string[]
} {
  const erros: string[] = []
  if (!dados?.protocoloRGE?.trim()) {
    erros.push('Protocolo RGE é obrigatório.')
  }
  if (!dados?.valor03Consumo?.trim()) {
    erros.push('Valor grandeza 03 é obrigatório.')
  }
  if (!dados?.valor103Injetada?.trim()) {
    erros.push('Valor grandeza 103 é obrigatório.')
  }
  if (!dados?.dataLeitura?.trim()) {
    erros.push('Data da leitura é obrigatória.')
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
    protocoloRGE,
    valor03Consumo,
    valor103Injetada,
    dataLeitura,
    lembreteWhatsAppEnviadoEm,
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
    if (protocoloRGE !== undefined) {
      formData.append('protocolo_rge', protocoloRGE)
    }
    if (valor03Consumo !== undefined) {
      formData.append('valor_grandeza_03', valor03Consumo)
    }
    if (valor103Injetada !== undefined) {
      formData.append('valor_grandeza_103', valor103Injetada)
    }
    if (dataLeitura !== undefined) {
      formData.append('data_leitura', dataLeitura)
    }
    if (lembreteWhatsAppEnviadoEm !== undefined) {
      formData.append('lembrete_whatsapp_enviado_em', lembreteWhatsAppEnviadoEm)
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
  if (protocoloRGE !== undefined) {
    payload.protocolo_rge = protocoloRGE
  }
  if (valor03Consumo !== undefined) {
    payload.valor_grandeza_03 = valor03Consumo
  }
  if (valor103Injetada !== undefined) {
    payload.valor_grandeza_103 = valor103Injetada
  }
  if (dataLeitura !== undefined) {
    payload.data_leitura = dataLeitura
  }
  if (lembreteWhatsAppEnviadoEm !== undefined) {
    payload.lembrete_whatsapp_enviado_em = lembreteWhatsAppEnviadoEm
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
