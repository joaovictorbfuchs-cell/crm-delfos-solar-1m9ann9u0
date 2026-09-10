/**
 * Serviço de integração com o Agente de IA Nativo do Skip Cloud para Extração de Documentos
 */
import pb from '@/lib/pocketbase/client'
import { prepareDocumentForExtraction, type DocumentContentResult } from '@/lib/documentExtractor'

export interface DadosCadastraisExtraidos {
  nome?: string | null
  cpf_cnpj?: string | null
  rg?: string | null
  data_nascimento?: string | null
  telefone?: string | null
  email?: string | null
}

export interface EnderecoExtraido {
  endereco?: string | null
  numero?: string | null
  bairro?: string | null
  cidade?: string | null
  estado?: string | null
  cep?: string | null
  complemento?: string | null
}

export interface DadosTecnicosExtraidos {
  potencia_kwp?: number | null
  numero_modulos?: number | null
  fabricante_modulos?: string | null
  modelo_modulos?: string | null
  fabricante_inversores?: string | null
  modelo_inversores?: string | null
  tipo_telhado?: 'ceramico' | 'metalico' | 'laje' | 'fibrocimento' | null
  padrao_entrada?: string | null
  tipo_atendimento?: 'aéreo' | 'subterrâneo' | null
  numero_fases?: 'monofásico' | 'bifásico' | 'trifásico' | null
  geracao_mensal_kwh?: number | null
}

export interface ConsumoExtraido {
  uc?: string | null
  consumo_kwh_mes?: number | null
  tarifa?: number | null
  classe_consumo?: string | null
  concessionaria?: string | null
}

export interface DocumentoExtraidoData {
  dados_cadastrais: DadosCadastraisExtraidos
  endereco: EnderecoExtraido
  dados_tecnicos: DadosTecnicosExtraidos
  consumo: ConsumoExtraido
}

export interface ExtractDocumentResult {
  ok: boolean
  data: DocumentoExtraidoData | null
  raw_text?: string
  message?: string
  conversation_id?: string
  fileInfo: DocumentContentResult
}

/**
 * Envia o arquivo do documento para extração pelo agente nativo de IA do Skip Cloud.
 */
export async function extrairDadosDocumento(file: File): Promise<ExtractDocumentResult> {
  const fileInfo = await prepareDocumentForExtraction(file)

  const payload: Record<string, unknown> = {
    file_name: fileInfo.fileName,
    file_type: fileInfo.fileType,
    mime_type: fileInfo.mimeType,
  }

  if (fileInfo.textContent) {
    payload.text_content = fileInfo.textContent
  }
  if (fileInfo.imageBase64) {
    payload.image_base64 = fileInfo.imageBase64
  }

  const token = pb.authStore.token
  const baseUrl = import.meta.env.VITE_POCKETBASE_URL || ''

  const res = await fetch(`${baseUrl}/backend/v1/extract-document`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: token } : {}),
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    let errMessage = `Erro do servidor: status ${res.status}`
    try {
      const errBody = await res.json()
      if (errBody?.error) errMessage = errBody.error
      if (errBody?.message) errMessage = errBody.message
    } catch {
      /* intentionally ignored */
    }
    throw new Error(errMessage)
  }

  const json = (await res.json()) as {
    ok: boolean
    data: DocumentoExtraidoData | null
    raw_text?: string
    message?: string
    conversation_id?: string
  }

  return {
    ok: Boolean(json.ok && json.data),
    data: json.data || null,
    raw_text: json.raw_text,
    message: json.message,
    conversation_id: json.conversation_id,
    fileInfo,
  }
}
