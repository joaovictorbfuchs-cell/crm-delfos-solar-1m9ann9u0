/**
 * Tipos completos e serviços de Análise de Fatura RGE com Gemini e relatório interativo.
 */

import pb from '@/lib/pocketbase/client'
import { prepareDocumentForExtraction } from '@/lib/documentExtractor'

export interface ItemFaturadoDetalhado {
  item: string
  quantidade_kwh?: number | null
  tarifa_base?: number | null
  tarifa_com_impostos?: number | null
  valor_total_rs: number
  icms?: {
    base_calculo?: number
    aliquota?: number
    valor?: number
  }
  pis?: {
    base_calculo?: number
    valor?: number
  }
  cofins?: {
    base_calculo?: number
    valor?: number
  }
}

export interface AlertaAnaliseFatura {
  nivel: 'alerta' | 'atencao' | 'informativo'
  titulo: string
  mensagem: string
}

export interface AnaliseFaturaCompletaDados {
  e_fatura_rge: boolean
  erro_identificacao?: string | null
  concessionaria?: string
  dados_cadastrais_fatura?: {
    titular?: string
    cpf_cnpj?: string
    uc?: string
    endereco?: string
    cidade?: string
    tipo_fornecimento?: string
    classificacao?: string
    sugestao_preenchimento_crm?: string | null
  }
  periodo?: {
    data_leitura_anterior?: string
    data_leitura_atual?: string
    dias_ciclo?: number
    proxima_leitura_prevista?: string
    vencimento?: string
    numero_fatura_nf?: string
    data_emissao?: string
    mes_referencia?: string
  }
  papel_gd?: {
    papel_uc?: 'geradora' | 'receptora_autoconsumo_remoto' | 'mista' | string
    descricao_arranjo?: string
    participacao_geracao_percentual?: number | null
    percentual_energia_fica_instalacao?: number | null
    kwh_enviados_outras_ucs?: number | null
    kwh_retidos_instalacao?: number | null
    fluxo_creditos_detalhe?: string | null
  }
  historico_consumo?: Array<{
    mes?: string
    mes_ano?: string
    consumo_kwh: number
    dias_ciclo?: number
  }>
  medicao_e_creditos?: {
    energia_ativa_consumida?: {
      leitura_anterior?: number
      leitura_atual?: number
      multiplicador?: number
      consumo_mes_kwh?: number
    }
    energia_injetada_geracao?: {
      leitura_anterior?: number
      leitura_atual?: number
      multiplicador?: number
      kwh_injetados_mes?: number
    }
    creditos?: {
      creditos_compensados_mes_atual_kwh?: number
      creditos_antigos_competencias_anteriores_kwh?: number
      total_creditos_recebidos_kwh?: number
    }
    saldo_energia?: {
      saldo_atual_instalacao_kwh?: number
      saldo_a_expirar_proximo_mes_kwh?: number
      meses_cobertura_saldo?: number
    }
    historico_consumo?: Array<{
      mes?: string
      mes_ano?: string
      consumo_kwh: number
      dias_ciclo?: number
    }>
  }
  itens_faturados?: ItemFaturadoDetalhado[]
  totais?: {
    total_distribuidora_rs?: number
    total_a_pagar_rs?: number
    forma_pagamento?: string
    bandeira_tarifaria?: {
      cor?: 'Verde' | 'Amarela' | 'Vermelha P1' | 'Vermelha P2' | 'Escassez Hídrica' | string
      valor_adicional_rs?: number
    }
  }
  impostos?: {
    impostos_atuais?: {
      icms_total_rs?: number
      pis_total_rs?: number
      cofins_total_rs?: number
    }
    reforma_tributaria_lc214_simulacao?: {
      nota?: string
      ibs_simulado_rs?: number
      cbs_simulada_rs?: number
    }
  }
  indicadores?: {
    tarifa_cheia_efetiva_rs_kwh?: number
    economia_estimada_mes_rs?: number
    economia_acumulada_estimada_anual_rs?: number
    relacao_geracao_consumo_percentual?: number
    taxa_minima_disponibilidade_kwh?: number
    projecao_reajuste_9_ano?: {
      tarifa_atual?: number
      tarifa_1_ano?: number
      tarifa_3_anos?: number
      tarifa_5_anos?: number
    }
  }
  alertas?: AlertaAnaliseFatura[]
  conclusoes_recomendacoes?: string[]
}

export interface AnaliseFaturaRegistro {
  id: string
  token: string
  cliente_id?: string
  cliente_nome?: string
  uc?: string
  competencia?: string
  vencimento?: string
  total_pagar?: number
  consumo_kwh?: number
  energia_injetada_kwh?: number
  creditos_compensados_kwh?: number
  saldo_energia_kwh?: number
  saldo_expirar_kwh?: number
  economia_estimada_rs?: number
  papel_uc?: string
  arquivos_nomes?: string[]
  dados_completos?: AnaliseFaturaCompletaDados
  atividade_id?: string
  whatsapp_enviado?: boolean
  whatsapp_enviado_em?: string
  created: string
  updated?: string
}

export interface AnalisarFaturasParams {
  cliente_id: string
  files: File[]
  onProgress?: (mensagem: string) => void
}

export interface RespostaAnaliseFatura {
  ok: boolean
  token?: string
  analise_id?: string
  model_used?: string
  elapsed_ms?: number
  data?: AnaliseFaturaCompletaDados | null
  error?: string
}

/**
 * Converte File para base64 pura
 */
async function fileToBase64Pure(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const base64 = result.includes(',') ? result.split(',')[1] : result
      resolve(base64)
    }
    reader.onerror = (err) => reject(err)
    reader.readAsDataURL(file)
  })
}

/**
 * Envia uma ou mais faturas da RGE para análise especializada pelo Gemini.
 */
export async function executarAnaliseFaturaRGECompleta(
  params: AnalisarFaturasParams,
): Promise<RespostaAnaliseFatura> {
  const { cliente_id, files, onProgress } = params

  if (!files || files.length === 0) {
    throw new Error('Nenhum arquivo de fatura selecionado.')
  }

  onProgress?.(`Preparando ${files.length} fatura(s) para extração...`)

  const arquivosProcessados: Array<{
    file_name: string
    mime_type: string
    file_base64?: string
    text_content?: string
  }> = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    onProgress?.(`Lendo arquivo [${i + 1}/${files.length}]: ${file.name}...`)

    const prep = await prepareDocumentForExtraction(file)
    let b64 = prep.imageBase64 || ''
    if (!b64) {
      try {
        b64 = await fileToBase64Pure(file)
      } catch (err) {
        console.warn('Erro ao converter arquivo em base64:', err)
      }
    }

    arquivosProcessados.push({
      file_name: file.name,
      mime_type: file.type || prep.mimeType || 'application/pdf',
      file_base64: b64,
      text_content: prep.textContent || '',
    })
  }

  onProgress?.('Enviando para a IA Gemini analisar tarifas, medições, GD e impostos...')

  const baseUrl = import.meta.env.VITE_POCKETBASE_URL || ''
  const token = pb.authStore.token

  const res = await fetch(`${baseUrl}/backend/v1/analisar-fatura-completa`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: token } : {}),
    },
    body: JSON.stringify({
      cliente_id,
      arquivos: arquivosProcessados,
    }),
  })

  if (!res.ok) {
    let errMsg = `Erro ${res.status} ao processar fatura com a IA`
    try {
      const errJson = await res.json()
      if (errJson?.error) errMsg = errJson.error
    } catch {
      /* intentionally ignored */
    }
    throw new Error(errMsg)
  }

  const json = (await res.json()) as RespostaAnaliseFatura
  return json
}

/**
 * Busca o relatório completo pelo token único (acessível pelo cliente ou pelo app).
 */
export async function obterRelatorioFaturaPorToken(token: string): Promise<AnaliseFaturaRegistro> {
  const baseUrl = import.meta.env.VITE_POCKETBASE_URL || ''

  const res = await fetch(
    `${baseUrl}/backend/v1/relatorio-fatura-publico/${encodeURIComponent(token)}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    },
  )

  if (!res.ok) {
    let errMsg = 'Relatório não encontrado ou link expirado.'
    try {
      const errJson = await res.json()
      if (errJson?.error) errMsg = errJson.error
    } catch {
      /* intentionally ignored */
    }
    throw new Error(errMsg)
  }

  const json = await res.json()
  return json as AnaliseFaturaRegistro
}

/**
 * Cria ou atualiza a atividade administrativa correspondente e salva o token de visualização.
 */
export async function registrarAtividadeAnaliseFatura(params: {
  cliente_id: string
  titulo: string
  descricao: string
  token_relatorio: string
  analise_id?: string
  total_pagar?: number
  economia_rs?: number
  responsavel_id?: string
  responsavel_nome?: string
}): Promise<string> {
  const atvPayload: Record<string, unknown> = {
    cliente_id: params.cliente_id,
    tipo: 'analise_fatura',
    titulo: params.titulo || 'Análise de Fatura RGE',
    descricao: params.descricao,
    data: new Date().toISOString(),
    status: 'concluida',
    responsavel_id: params.responsavel_id || pb.authStore.record?.id,
    responsavel_nome: params.responsavel_nome || pb.authStore.record?.name || 'Consultor Delfos',
  }

  const record = await pb.collection('atividades').create(atvPayload)

  if (params.analise_id) {
    try {
      await pb.collection('analises_fatura').update(params.analise_id, {
        atividade_id: record.id,
      })
    } catch (e) {
      console.warn('Erro ao linkar atividade à analise_fatura:', e)
    }
  }

  return record.id
}
