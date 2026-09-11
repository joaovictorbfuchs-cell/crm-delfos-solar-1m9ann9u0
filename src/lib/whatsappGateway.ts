/**
 * Utilitários para integração com gateways de WhatsApp (Z-API e Evolution/Genérico).
 * Usado pelo frontend e validado por testes unitários.
 */

export interface WhatsAppGatewayRequestConfig {
  targetUrl: string
  headers: Record<string, string>
  payload: Record<string, unknown>
  isZApi: boolean
  cleanPhone: string
  isWellFormedZApi?: boolean
  maskedTargetUrl?: string
}

/**
 * Normaliza número de telefone para o padrão exigido pela Z-API e gateways WhatsApp:
 * Apenas dígitos, com DDI 55 caso o número tenha DDD + telefone (10 ou 11 dígitos) e não possua 55 inicial.
 */
export function normalizeWhatsAppDestinationPhone(phone: string | undefined | null): string {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')
  if (!digits) return ''

  // Se tem 10 dígitos (ex: 5491292121) ou 11 dígitos (ex: 54991292121) e não começa com 55:
  if ((digits.length === 10 || digits.length === 11) && !digits.startsWith('55')) {
    return '55' + digits
  }

  return digits
}

/**
 * Detecta se a URL do gateway aponta para a Z-API (z-api.com ou z-api.io).
 */
export function isZApiGatewayUrl(url: string | undefined | null): boolean {
  if (!url) return false
  const lower = url.toLowerCase().trim()
  return lower.includes('z-api.com') || lower.includes('z-api.io')
}

/**
 * Valida se a URL da Z-API segue o padrão canônico /instances/{id}/token/{token} (com ou sem /send-text).
 */
export function isValidZApiInstanceUrl(url: string | undefined | null): boolean {
  if (!url) return false
  let clean = url
    .trim()
    .replace(/[\r\n\t]/g, '')
    .replace(/\/+$/, '')
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    clean = 'https://' + clean
  }
  const baseWithoutSuffix = clean.replace(/\/+send-text\/?$/i, '').replace(/\/+$/, '')
  return /^(https?:\/\/[^/]+)\/instances\/([^/]+)\/token\/([^/?#]+)$/i.test(baseWithoutSuffix)
}

/**
 * Valida e formata a URL base para envio de mensagens na Z-API.
 * Aceita múltiplos formatos colados pelo usuário:
 * - https://api.z-api.io/instances/{id}/token/{token}
 * - https://api.z-api.io/instances/{id}/token/{token}/send-text
 * - https://api.z-api.com/... (ambos os domínios .io e .com)
 * - Com ou sem barra final, com ou sem maiúsculas/minúsculas no sufixo /send-text
 * Garante sempre {base}/send-text sem duplicação de sufixo ou barras duplas.
 */
export function formatZApiEndpoint(url: string | undefined | null, endpoint = 'send-text'): string {
  if (!url) return ''
  let clean = url
    .trim()
    .replace(/[\r\n\t]/g, '')
    .replace(/\/+$/, '')
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    clean = 'https://' + clean
  }

  const endpointSlug = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint

  // Remover qualquer sufixo existente (/send-text, /send-text/, etc.) de forma insensível a maiúsculas
  const suffixPattern = new RegExp(`(/+${endpointSlug}/?$)|(/+$)`, 'i')
  const base = clean.replace(suffixPattern, '').replace(/\/+$/, '')

  return `${base}/${endpointSlug}`
}

/**
 * Mascara de forma segura a URL do gateway para exibição na interface e logs,
 * ocultando o token secreto da instância.
 */
export function maskGatewayUrl(url: string | undefined | null): string {
  if (!url) return ''
  let clean = url
    .trim()
    .replace(/[\r\n\t]/g, '')
    .replace(/\/+$/, '')
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    clean = 'https://' + clean
  }

  if (isZApiGatewayUrl(clean)) {
    const hasSendTextSuffix = /\/+send-text\/?$/i.test(clean)
    const baseWithoutSuffix = clean.replace(/\/+send-text\/?$/i, '').replace(/\/+$/, '')

    const zapiRegex = /^(https?:\/\/[^/]+)\/instances\/([^/]+)\/token\/([^/?#]+)$/i
    const match = baseWithoutSuffix.match(zapiRegex)
    if (match) {
      const hostPrefix = match[1]
      const instanceId = match[2]
      const token = match[3]
      const maskedToken = token.length > 4 ? '••••' + token.slice(-4) : '••••'
      const maskedBase = `${hostPrefix}/instances/${instanceId}/token/${maskedToken}`
      return hasSendTextSuffix ? `${maskedBase}/send-text` : maskedBase
    }

    return clean.replace(/\/token\/[^/?#]+/i, '/token/••••••••')
  }

  return clean.length > 35 ? clean.substring(0, 35) + '...' : clean
}

/**
 * Constrói a configuração de requisição HTTP (URL, headers e body) para envio de texto,
 * chaveando automaticamente entre Z-API e gateway genérico.
 */
export function buildWhatsAppSendPayload(params: {
  apiUrl: string
  apiKey?: string
  originNumber?: string
  phone: string
  message: string
}): WhatsAppGatewayRequestConfig {
  const { apiUrl, apiKey, originNumber, phone, message } = params
  const cleanApiUrl = (apiUrl || '').trim().replace(/[\r\n\t]/g, '')
  const cleanApiKey = (apiKey || '').trim().replace(/[\r\n\t]/g, '')
  const cleanOrigin = (originNumber || '').trim().replace(/[\r\n\t]/g, '')

  const isZApi = isZApiGatewayUrl(cleanApiUrl)
  const isWellFormedZApi = isZApi ? isValidZApiInstanceUrl(cleanApiUrl) : undefined
  const cleanPhone = normalizeWhatsAppDestinationPhone(phone)

  let cleanBaseUrl = cleanApiUrl.replace(/\/+$/, '')
  if (!cleanBaseUrl.startsWith('http://') && !cleanBaseUrl.startsWith('https://')) {
    cleanBaseUrl = 'https://' + cleanBaseUrl
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (isZApi) {
    const targetUrl = formatZApiEndpoint(cleanBaseUrl, 'send-text')
    if (cleanApiKey) {
      headers['Client-Token'] = cleanApiKey
    }
    const payload = {
      phone: cleanPhone,
      message,
    }
    return {
      targetUrl,
      headers,
      payload,
      isZApi: true,
      cleanPhone,
      isWellFormedZApi,
      maskedTargetUrl: maskGatewayUrl(targetUrl),
    }
  }

  // Gateway Genérico / Evolution API
  if (cleanApiKey) {
    headers['apikey'] = cleanApiKey
    headers['Authorization'] = 'Bearer ' + cleanApiKey
    headers['X-Api-Key'] = cleanApiKey
  }

  const payload: Record<string, unknown> = {
    number: cleanPhone,
    phone: cleanPhone,
    message,
    text: message,
    sender: cleanOrigin,
  }

  return {
    targetUrl: cleanBaseUrl,
    headers,
    payload,
    isZApi: false,
    cleanPhone,
    maskedTargetUrl: maskGatewayUrl(cleanBaseUrl),
  }
}

/**
 * Extrai o ID externo retornado pelo gateway a partir do corpo JSON da resposta.
 */
export function extractGatewayExternalId(resJson: unknown): string {
  if (!resJson || typeof resJson !== 'object') return ''
  const rec = resJson as Record<string, unknown>

  if (rec.messageId) return String(rec.messageId)
  if (rec.id) return String(rec.id)
  if (rec.zaapId) return String(rec.zaapId)

  if (rec.key && typeof rec.key === 'object') {
    const keyObj = rec.key as Record<string, unknown>
    if (keyObj.id) return String(keyObj.id)
  }

  return ''
}
