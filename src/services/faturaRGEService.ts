/**
 * Serviço de integração com o Gemini para análise de faturas de energia RGE.
 * Chama a rota backend POST /backend/v1/analisar-fatura-rge
 */
import pb from '@/lib/pocketbase/client'
import { prepareDocumentForExtraction } from '@/lib/documentExtractor'

export interface HistoricoConsumoItem {
  mes_ano: string
  consumo_kwh: number
  dias_ciclo: number
}

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
  return json
}
