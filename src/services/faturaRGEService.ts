/**
 * Serviço de integração com o Gemini para análise de faturas de energia RGE.
 * Chama a rota backend POST /backend/v1/analisar-fatura-rge
 */
import pb from '@/lib/pocketbase/client'
import { prepareDocumentForExtraction } from '@/lib/documentExtractor'
import {
  normalizarEOordenarHistorico,
  calcularMetricasHistorico,
  type HistoricoConsumoItemNormalizado,
} from '@/lib/historicoConsumoFatura'

export type HistoricoConsumoItem = HistoricoConsumoItemNormalizado

export interface DetalhesTarifaFatura {
  tarifa_tusd_com_tributos?: number | null
  tarifa_te_com_tributos?: number | null
  tarifa_total_com_tributos?: number | null
}

export interface FaturaRGECalculos {
  quantidade_meses_historico?: number
  somatorio_consumo_anual_kwh: number
  media_mensal_consumo_kwh: number
  consumo_medio_diario_kwh: number
  maior_consumo_periodo?: {
    mes_ano: string
    consumo_kwh: number
  }
  menor_consumo_periodo?: {
    mes_ano: string
    consumo_kwh: number
  }
}

export interface EnderecoCompletoFatura {
  rua?: string
  numero?: string
  complemento?: string
  bairro?: string
  cidade?: string
  estado?: string
  cep?: string
}

export interface FaturaRGEDadosExtraidos {
  e_fatura_rge: boolean
  concessionaria_detectada?: string
  erro_identificacao?: string | null
  titular_nome?: string
  cpf_cnpj?: string
  endereco_completo?: EnderecoCompletoFatura
  uc?: string
  classificacao_grupo_subgrupo?: string
  tipo_fornecimento?: string
  tensao_nominal?: string
  tarifa_com_tributos?: number | null
  detalhes_tarifa?: DetalhesTarifaFatura
  valor_total_fatura?: number | null
  mes_referencia_atual?: string
  historico_consumo: HistoricoConsumoItem[]
  calculos: FaturaRGECalculos
  consumo_medio?: number | null
}

export interface AnaliseFaturaRGEResult {
  ok: boolean
  data: FaturaRGEDadosExtraidos | null
  error?: string
  model_used?: string
  elapsed_ms?: number
  file_name?: string
  raw_text?: string
}

/**
 * Converte um arquivo File em string base64 pura (sem data: prefix).
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
 * Detecta se o texto ou nome do arquivo sugere ser uma conta/fatura da RGE.
 */
export function isFaturaRGEProvavel(texto: string, nomeArquivo: string): boolean {
  const norm = `${texto} ${nomeArquivo}`.toLowerCase()
  const termosRGE = [
    'rge',
    'rio grande energia',
    'cpfl',
    'rge sul',
    'unidade consumidora',
    'fatura de energia',
    'conta de luz',
    'nota fiscal conta de energia',
    'histórico de consumo',
  ]
  const matchRGE = norm.includes('rge') || norm.includes('rio grande energia')
  const matchConta =
    norm.includes('fatura') ||
    norm.includes('consumidora') ||
    norm.includes('energia') ||
    norm.includes('kwh')
  return matchRGE && matchConta
}

/**
 * Envia um arquivo PDF ou imagem para análise de fatura RGE via Gemini API no backend.
 */
export async function analisarFaturaRGEGemini(
  file: File,
  options?: {
    onProgress?: (msg: string) => void
  },
): Promise<AnaliseFaturaRGEResult> {
  options?.onProgress?.('Preparando arquivo para análise da fatura RGE...')

  const prep = await prepareDocumentForExtraction(file)
  let base64 = prep.imageBase64 || ''
  let textContent = prep.textContent || ''

  // Se for PDF ou outro arquivo sem base64 extraído pelo helper de imagem, gerar base64 direto
  if (!base64) {
    try {
      base64 = await fileToBase64Pure(file)
    } catch (e) {
      console.warn('[analisarFaturaRGEGemini] Erro ao codificar base64:', e)
    }
  }

  const payload: Record<string, unknown> = {
    file_name: file.name,
    mime_type: file.type || prep.mimeType,
  }

  if (base64) {
    payload.file_base64 = base64
  }
  if (textContent) {
    payload.text_content = textContent
  }

  options?.onProgress?.('Enviando para a API do Google Gemini (análise especializada RGE)...')

  const token = pb.authStore.token
  const baseUrl = import.meta.env.VITE_POCKETBASE_URL || ''

  const res = await fetch(`${baseUrl}/backend/v1/analisar-fatura-rge`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: token } : {}),
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    let errMsg = `Erro ${res.status} ao analisar fatura RGE`
    try {
      const errJson = await res.json()
      if (errJson?.error) errMsg = errJson.error
    } catch {
      /* intentionally ignored */
    }
    throw new Error(errMsg)
  }

  const json = (await res.json()) as AnaliseFaturaRGEResult

  const d = json?.data
  if (d) {
    // 1. Validação estrita da UC no padrão oficial RGE: 3 dígitos . 3 dígitos . 3 dígitos - 2 dígitos
    const regexUcOficial = /^[0-9]{3}\.[0-9]{3}\.[0-9]{3}-[0-9]{2}$/
    if (d.uc && !regexUcOficial.test(d.uc.trim())) {
      console.warn(
        `[faturaRGEService] UC retornada "${d.uc}" não segue formato oficial RGE. Rejeitando valor inválido.`,
      )
      d.uc = 'não informado na fatura'
    }

    // 2. Validação determinística de Tarifa TUSD + TE: soma TUSD + TE com tributos
    const tusdVal =
      typeof d.detalhes_tarifa?.tarifa_tusd_com_tributos === 'number'
        ? d.detalhes_tarifa.tarifa_tusd_com_tributos
        : 0
    const teVal =
      typeof d.detalhes_tarifa?.tarifa_te_com_tributos === 'number'
        ? d.detalhes_tarifa.tarifa_te_com_tributos
        : 0

    if (tusdVal > 0.2 && teVal > 0.2) {
      const somaTarifas = Math.round((tusdVal + teVal) * 1e8) / 1e8
      if (!d.detalhes_tarifa) d.detalhes_tarifa = {}
      d.detalhes_tarifa.tarifa_total_com_tributos = somaTarifas
      d.tarifa_com_tributos = somaTarifas
    } else if (
      d.tarifa_com_tributos !== undefined &&
      d.tarifa_com_tributos !== null &&
      d.tarifa_com_tributos < 0.4
    ) {
      console.warn(
        `[faturaRGEService] Tarifa espúria descartada (< 0.40): ${d.tarifa_com_tributos}`,
      )
      d.tarifa_com_tributos = undefined
      if (d.detalhes_tarifa) d.detalhes_tarifa.tarifa_total_com_tributos = undefined
    }

    // 3. Normalização completa do histórico: ordenação cronológica (mais antigo -> mais recente),
    // deduplicação e recálculo determinístico das métricas
    if (Array.isArray(d.historico_consumo) && d.historico_consumo.length > 0) {
      const historicoOrdenado = normalizarEOordenarHistorico(d.historico_consumo)
      d.historico_consumo = historicoOrdenado

      const metricas = calcularMetricasHistorico(historicoOrdenado)
      d.calculos = {
        quantidade_meses_historico: metricas.quantidade_meses_historico,
        somatorio_consumo_anual_kwh: metricas.somatorio_consumo_anual_kwh,
        media_mensal_consumo_kwh: metricas.media_mensal_consumo_kwh,
        consumo_medio_diario_kwh: metricas.consumo_medio_diario_kwh,
        maior_consumo_periodo: metricas.maior_consumo_periodo,
        menor_consumo_periodo: metricas.menor_consumo_periodo,
      }
      d.consumo_medio = metricas.media_mensal_consumo_kwh
    } else if (d.calculos?.media_mensal_consumo_kwh) {
      d.consumo_medio = d.calculos.media_mensal_consumo_kwh
    }
  }

  return json
}
