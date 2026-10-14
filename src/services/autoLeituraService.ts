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

/**
 * Formata string YYYY-MM-DD para DD/MM/AAAA
 */
export function formatarDataParaDDMMAAAA(dataStr: string): string {
  if (!dataStr) return ''
  // Se contiver T ou hora, extrai somente YYYY-MM-DD
  const limpa = dataStr.slice(0, 10)
  const partes = limpa.split('-')
  if (partes.length === 3) {
    const [ano, mes, dia] = partes
    return `${dia.padStart(2, '0')}/${mes.padStart(2, '0')}/${ano}`
  }
  return dataStr
}

/**
 * Extrai data normalizada YYYY-MM-DD de uma string ou Date ISO
 */
export function extrairDataYYYYMMDD(dataStr?: string | null): string {
  if (!dataStr) return ''
  return dataStr.slice(0, 10)
}

/**
 * Calcula a data e hora do lembrete: 2 dias antes da data de leitura às 08:00 (UTC/ISO).
 * Ex: Se dataLeitura = '2027-01-15' -> Lembrete: '2027-01-13T08:00:00.000Z'
 */
export function calcularDataLembrete2DiasAntes(dataLeituraYYYYMMDD: string): {
  dataLembreteIso: string
  dataLeituraIso: string
} {
  const [ano, mes, dia] = dataLeituraYYYYMMDD.split('-').map(Number)
  // Leitura ao meio dia UTC
  const leituraDate = new Date(Date.UTC(ano, mes - 1, dia, 12, 0, 0))

  // Lembrete 2 dias antes; se cair em sábado ou domingo, antecipar para a sexta-feira anterior (nunca no fim de semana)
  const lembreteDate = new Date(Date.UTC(ano, mes - 1, dia - 2, 8, 0, 0))
  const diaSemanaLembrete = lembreteDate.getUTCDay() // 0 = Domingo, 6 = Sábado
  if (diaSemanaLembrete === 0) {
    // Caiu no domingo -> recua 2 dias para sexta-feira
    lembreteDate.setUTCDate(lembreteDate.getUTCDate() - 2)
  } else if (diaSemanaLembrete === 6) {
    // Caiu no sábado -> recua 1 dia para sexta-feira
    lembreteDate.setUTCDate(lembreteDate.getUTCDate() - 1)
  }

  return {
    dataLeituraIso: leituraDate.toISOString(),
    dataLembreteIso: lembreteDate.toISOString(),
  }
}

/**
 * Normaliza o campo datas_leitura (que pode vir como array ou string JSON) em string[] ordenada
 */
export function normalizarDatasLeitura(datas: unknown): string[] {
  if (!datas) return []
  let arr: string[] = []
  if (Array.isArray(datas)) {
    arr = datas.map((d) => String(d).slice(0, 10)).filter(Boolean)
  } else if (typeof datas === 'string') {
    try {
      const parsed = JSON.parse(datas)
      if (Array.isArray(parsed)) {
        arr = parsed.map((d) => String(d).slice(0, 10)).filter(Boolean)
      } else {
        arr = [datas.slice(0, 10)]
      }
    } catch {
      arr = [datas.slice(0, 10)]
    }
  }
  // Deduplica e ordena
  return Array.from(new Set(arr)).sort()
}

/**
 * Busca atividades filhas (lembrete_auto_leitura) de uma atividade mãe
 */
export async function buscarAtividadesFilhasAutoLeitura(maeId: string): Promise<Atividade[]> {
  if (!maeId) return []
  try {
    const filhas = await pb.collection('atividades').getFullList<Atividade>({
      filter: `parent_id = '${maeId}'`,
      sort: 'data_leitura',
      expand: 'cliente_id,usina_id,responsavel_id',
    })
    return filhas
  } catch (err) {
    console.error('Erro ao buscar filhas da atividade mãe:', err)
    return []
  }
}

export interface CriarFilhasLembreteParams {
  maeId: string
  clienteId: string
  usinaId?: string
  numeroUc?: string
  datasLeitura: string[] // Array de datas YYYY-MM-DD
  responsavelId?: string
  responsavelNome?: string
  autor?: string
  mensagemCliente?: string
}

/**
 * Cria atividades filhas para datas que ainda NÃO possuem filha vinculada (deduplicação por data_leitura).
 * Retorna as atividades criadas.
 * Regra: se o dia do lembrete (2 dias antes) cair no fim de semana (sábado ou domingo),
 * ajusta para a sexta-feira anterior (nunca no fim de semana).
 */
export async function sincronizarFilhasNovas(
  params: CriarFilhasLembreteParams,
  filhasExistentes?: Atividade[],
): Promise<Atividade[]> {
  const {
    maeId,
    clienteId,
    usinaId,
    numeroUc,
    datasLeitura,
    responsavelId,
    responsavelNome,
    autor,
    mensagemCliente,
  } = params

  const existentes = filhasExistentes ?? (await buscarAtividadesFilhasAutoLeitura(maeId))
  const datasJaExistentes = new Set(
    existentes.map((f) => extrairDataYYYYMMDD(f.data_leitura || f.data)),
  )

  const novasDatas = datasLeitura.filter((d) => !datasJaExistentes.has(d))
  const criadas: Atividade[] = []

  for (const dataStr of novasDatas) {
    const { dataLeituraIso, dataLembreteIso } = calcularDataLembrete2DiasAntes(dataStr)
    const dataFormatada = formatarDataParaDDMMAAAA(dataStr)
    const ucDesc = numeroUc ? ` para a UC ${numeroUc}` : ''

    const normalizarDataPb = (d: string) => d.replace('T', ' ').replace(/\.\d{3}Z?$/, '')

    const filhaPayload: Record<string, any> = {
      cliente_id: clienteId,
      parent_id: maeId,
      tipo: 'lembrete_auto_leitura',
      titulo: `Lembrete de Auto Leitura - ${dataFormatada}`,
      descricao: `Lembrete de leitura${ucDesc}. Data da leitura programada: ${dataFormatada}. Enviar foto do relógio e registrar grandezas 03 e 103.`,
      data: normalizarDataPb(dataLembreteIso),
      data_leitura: normalizarDataPb(dataLeituraIso),
      data_lembrete: normalizarDataPb(dataLembreteIso),
      status: 'pendente',
      autor: autor || responsavelNome || 'Sistema Delfos',
      mensagem_cliente: mensagemCliente || undefined,
    }

    if (usinaId && usinaId.trim()) {
      filhaPayload.usina_id = usinaId.trim()
    }
    if (numeroUc && numeroUc.trim()) {
      filhaPayload.numero_uc = numeroUc.trim()
    }
    if (responsavelId && responsavelId.trim()) {
      filhaPayload.responsavel_id = responsavelId.trim()
    }
    if (responsavelNome && responsavelNome.trim()) {
      filhaPayload.responsavel_nome = responsavelNome.trim()
    }

    const filhaRecord = await pb.collection('atividades').create<Atividade>(filhaPayload as any)

    criadas.push(filhaRecord)
  }

  return criadas
}

/**
 * Exclui a atividade filha correspondente a uma data específica de leitura
 */
export async function excluirFilhaPorData(
  maeId: string,
  dataLeituraYYYYMMDD: string,
  filhasExistentes?: Atividade[],
): Promise<boolean> {
  const existentes = filhasExistentes ?? (await buscarAtividadesFilhasAutoLeitura(maeId))
  const alvo = existentes.find(
    (f) => extrairDataYYYYMMDD(f.data_leitura || f.data) === dataLeituraYYYYMMDD,
  )

  if (alvo) {
    await pb.collection('atividades').delete(alvo.id)
    return true
  }
  return false
}

export interface SubstituirVariaveisAutoLeituraParams {
  texto: string
  nomeCliente?: string | null
  nomeUsina?: string | null
  numeroUc?: string | null
  endereco?: string | null
  dataLeitura?: string | null // YYYY-MM-DD ou DD/MM/AAAA
}

/**
 * Substitui em tempo real as variáveis do template da Auto Leitura RGE
 * para pré-visualização e disparo.
 *
 * Suporta formatos {{var}}, {var} e [var], insensível a maiúsculas/minúsculas e tolerante a espaços:
 * - [nome do cliente] / {{nome_cliente}} / {nome_cliente} -> Nome do Cliente (fallback: "Nome do Cliente")
 * - {{usina}} / [usina] / {usina} -> Nome da Usina (fallback: "Nome da Usina")
 * - {{numero_uc}} / [numero_uc] / {numero_uc} -> Número da UC (fallback: "Número da UC")
 * - {{endereco}} / [endereco] / {endereco} -> Endereço (fallback: "Endereço")
 * - [data] / {{data}} / {data} / {{data_leitura}} -> Data de Leitura formatada DD/MM/AAAA (fallback: "data da leitura")
 * - [dia anterior] / [dia_anterior] / {{dia_anterior}} -> Data do lembrete (2 dias antes; se fim de semana -> sexta-feira anterior) formatada DD/MM/AAAA (fallback: "data do lembrete")
 *
 * Se uma variável não estiver preenchida no formulário, mantém o fallback visível para o usuário perceber.
 */
export function substituirVariaveisAutoLeitura(
  params: SubstituirVariaveisAutoLeituraParams,
): string {
  const { texto, nomeCliente, nomeUsina, numeroUc, endereco, dataLeitura } = params
  if (!texto) return ''

  const clienteValor = nomeCliente?.trim() || 'Nome do Cliente'
  const usinaValor = nomeUsina?.trim() || 'Nome da Usina'
  const ucValor = numeroUc?.trim() || 'Número da UC'
  const enderecoValor = endereco?.trim() || 'Endereço'

  let dataLeituraValor = 'data da leitura'
  let dataLembreteValor = 'data do lembrete'

  if (dataLeitura && dataLeitura.trim()) {
    const rawData = dataLeitura.trim().slice(0, 10)
    // Se estiver no formato YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(rawData)) {
      dataLeituraValor = formatarDataParaDDMMAAAA(rawData)
      try {
        const { dataLembreteIso } = calcularDataLembrete2DiasAntes(rawData)
        dataLembreteValor = formatarDataParaDDMMAAAA(dataLembreteIso.slice(0, 10))
      } catch {
        dataLembreteValor = 'data do lembrete'
      }
    } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(rawData)) {
      // Se já veio no formato DD/MM/AAAA
      dataLeituraValor = rawData
      const [d, m, y] = rawData.split('/')
      try {
        const { dataLembreteIso } = calcularDataLembrete2DiasAntes(`${y}-${m}-${d}`)
        dataLembreteValor = formatarDataParaDDMMAAAA(dataLembreteIso.slice(0, 10))
      } catch {
        dataLembreteValor = 'data do lembrete'
      }
    } else {
      dataLeituraValor = rawData
    }
  }

  let resultado = texto

  // 1. [nome do cliente] / {{nome_cliente}} / [nome_cliente] / {{nome do cliente}} / {nome_cliente}
  resultado = resultado.replace(
    /(?:\[\s*(?:nome\s+do\s+cliente|nome_cliente|cliente)\s*\]|\{\{?\s*(?:nome_cliente|nome\s+do\s+cliente|cliente)\s*\}?\})/gi,
    clienteValor,
  )

  // 2. {{usina}} / [usina] / {usina}
  resultado = resultado.replace(/(?:\[\s*usina\s*\]|\{\{?\s*usina\s*\}?\})/gi, usinaValor)

  // 3. {{numero_uc}} / [numero_uc] / [numero uc] / {{numero uc}} / {numero_uc} / {{uc}} / [uc]
  resultado = resultado.replace(
    /(?:\[\s*(?:numero_uc|numero\s+uc|uc)\s*\]|\{\{?\s*(?:numero_uc|numero\s+uc|uc)\s*\}?\})/gi,
    ucValor,
  )

  // 4. {{endereco}} / [endereco] / [endereço] / {{endereço}} / {endereco}
  resultado = resultado.replace(
    /(?:\[\s*(?:endereco|endereço)\s*\]|\{\{?\s*(?:endereco|endereço)\s*\}?\})/gi,
    enderecoValor,
  )

  // 5. [data] / {{data}} / {data} / {{data_leitura}} / [data da leitura] / [data_leitura]
  resultado = resultado.replace(
    /(?:\[\s*(?:data|data_leitura|data\s+da\s+leitura)\s*\]|\{\{?\s*(?:data|data_leitura|data\s+da\s+leitura)\s*\}?\})/gi,
    dataLeituraValor,
  )

  // 6. [dia anterior] / [dia_anterior] / {{dia_anterior}} / {{dia anterior}} / {dia_anterior}
  resultado = resultado.replace(
    /(?:\[\s*(?:dia\s+anterior|dia_anterior)\s*\]|\{\{?\s*(?:dia\s+anterior|dia_anterior)\s*\}?\})/gi,
    dataLembreteValor,
  )

  return resultado
}
