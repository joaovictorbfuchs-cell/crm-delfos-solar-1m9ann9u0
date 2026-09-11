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
 * Valida e formata a URL base para envio de mensagens na Z-API.
 * Z-API espera POST /send-text na URL da instância: https://api.z-api.com/instances/{instanceId}/token/{token}/send-text
 */
export function formatZApiEndpoint(url: string | undefined | null, endpoint = 'send-text'): string {
  if (!url) return ''
  let clean = url.trim().replace(/\/+$/, '')
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    clean = 'https://' + clean
  }

  const endpointSlug = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint
  if (clean.toLowerCase().endsWith('/' + endpointSlug.toLowerCase())) {
    return clean
  }

  return clean + '/' + endpointSlug
}

/**
 * Mascara de forma segura a URL da Z-API para exibição na interface,
 * ocultando o token secreto da instância.
 */
export function maskGatewayUrl(url: string | undefined | null): string {
  if (!url) return ''
  const trimmed = url.trim()

  if (isZApiGatewayUrl(trimmed)) {
    const zapiRegex = /(https?:\/\/[^/]+\/instances\/)([^/]+)(\/token\/)([^/?#]+)/i
    const match = trimmed.match(zapiRegex)
    if (match) {
      const prefix = match[1]
      const instanceId = match[2]
      const token = match[4]
      const maskedToken = token.length > 4 ? '••••' + token.slice(-4) : '••••'
      return `${prefix}${instanceId}/token/${maskedToken}`
    }
    return trimmed.replace(/\/token\/[^/?#]+/i, '/token/••••••••')
  }
  return trimmed.length > 35 ? trimmed.substring(0, 35) + '...' : trimmed
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
  const isZApi = isZApiGatewayUrl(apiUrl)
  const cleanPhone = normalizeWhatsAppDestinationPhone(phone)

  let cleanBaseUrl = apiUrl.trim().replace(/\/+$/, '')
  if (!cleanBaseUrl.startsWith('http://') && !cleanBaseUrl.startsWith('https://')) {
    cleanBaseUrl = 'https://' + cleanBaseUrl
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (isZApi) {
    const targetUrl = formatZApiEndpoint(cleanBaseUrl, 'send-text')
    if (apiKey) {
      headers['Client-Token'] = apiKey.trim()
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
    }
  }

  // Gateway Genérico / Evolution API
  if (apiKey) {
    headers['apikey'] = apiKey.trim()
    headers['Authorization'] = 'Bearer ' + apiKey.trim()
    headers['X-Api-Key'] = apiKey.trim()
  }

  const payload: Record<string, unknown> = {
    number: cleanPhone,
    phone: cleanPhone,
    message,
    text: message,
    sender: (originNumber || '').trim(),
  }

  return {
    targetUrl: cleanBaseUrl,
    headers,
    payload,
    isZApi: false,
    cleanPhone,
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
