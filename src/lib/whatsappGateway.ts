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
 * Constrói a configuração de requisição HTTP para envio de áudio (formato OGG/Opus ou URL),
 * chaveando para endpoint /send-audio da Z-API.
 */
export function buildWhatsAppAudioPayload(params: {
  apiUrl: string
  apiKey?: string
  originNumber?: string
  phone: string
  audio: string
}): WhatsAppGatewayRequestConfig {
  const { apiUrl, apiKey, originNumber, phone, audio } = params
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
    const targetUrl = formatZApiEndpoint(cleanBaseUrl, 'send-audio')
    if (cleanApiKey) {
      headers['Client-Token'] = cleanApiKey
    }
    const payload = {
      phone: cleanPhone,
      audio,
      waveform: true,
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
  }

  const targetUrl = `${cleanBaseUrl}/send-audio`
  const payload: Record<string, unknown> = {
    number: cleanPhone,
    phone: cleanPhone,
    audio,
    sender: cleanOrigin,
  }

  return {
    targetUrl,
    headers,
    payload,
    isZApi: false,
    cleanPhone,
    maskedTargetUrl: maskGatewayUrl(targetUrl),
  }
}

/**
 * Extrai o ID externo retornado pelo gateway a partir do corpo JSON da resposta.
 */
/**
 * Extrai mensagem amigável de erro ou aviso a partir da resposta do endpoint /backend/v1/whatsapp/send
 */
export function getFriendlyWhatsAppErrorMessage(result: {
  ok?: boolean
  sent?: boolean
  gatewayConfigured?: boolean
  status?: string
  message?: string
  error?: string
}): string {
  if (result.gatewayConfigured === false) {
    return 'Gateway não configurado: adicione WHATSAPP_API_URL e WHATSAPP_API_KEY aos Secrets do backend.'
  }
  const msg = result.error || result.message || ''
  if (/instância não encontrada|instance not found/i.test(msg)) {
    return 'Instância Z-API não encontrada. Verifique se a URL e a instância estão ativas no painel da Z-API.'
  }
  if (/client-token/i.test(msg)) {
    return 'Client-Token ausente ou inválido na Z-API. Verifique WHATSAPP_API_KEY nos Secrets.'
  }
  if (/disconnected|desconectad/i.test(msg)) {
    return 'Instância da Z-API está desconectada do WhatsApp. Conecte o QR Code no painel da Z-API.'
  }
  if (/expirad|trial/i.test(msg)) {
    return 'Plano ou trial da Z-API expirado. Renove a assinatura no painel da Z-API.'
  }
  if (/telefone|phone|número inválido|invalid/i.test(msg)) {
    return 'Número de telefone inválido para envio via WhatsApp.'
  }
  return (
    msg || 'Falha ao enviar mensagem pelo WhatsApp. Verifique os Secrets e a conexão com a Z-API.'
  )
}

/**
 * Obtém a URL de exibição de mídia do WhatsApp com resiliência:
 * 1. Prioriza o arquivo armazenado localmente no PocketBase (`msg.arquivo`), garantindo
 *    que a mídia funcione perpetuamente mesmo se a instância Z-API expirar ou for desconectada.
 * 2. Se não houver arquivo local mas houver URL ou ID da mensagem, utiliza o proxy de mídia seguro do backend
 *    (/backend/v1/whatsapp/media-proxy), que também tenta persistir o arquivo em segundo plano.
 */
export function getWhatsAppMediaUrl(
  msgOrMedia:
    | {
        id?: string
        arquivo?: string | null
        documento_url?: string | null
      }
    | string
    | null
    | undefined,
  fallbackMessageId?: string | null,
): string {
  if (!msgOrMedia) {
    if (fallbackMessageId) {
      const pbUrl = (import.meta.env.VITE_POCKETBASE_URL || '').replace(/\/+$/, '')
      return `${pbUrl}/backend/v1/whatsapp/media-proxy?msgId=${encodeURIComponent(fallbackMessageId)}`
    }
    return ''
  }

  const pbUrl = (import.meta.env.VITE_POCKETBASE_URL || '').replace(/\/+$/, '')

  // Se for um objeto de mensagem
  if (typeof msgOrMedia === 'object') {
    const { id, arquivo, documento_url } = msgOrMedia
    if (arquivo && id) {
      return `${pbUrl}/api/files/whatsapp_mensagens/${id}/${encodeURIComponent(arquivo)}`
    }
    if (documento_url || id || fallbackMessageId) {
      return getWhatsAppMediaProxyUrl(documento_url, id || fallbackMessageId)
    }
    return ''
  }

  // Se for uma string de URL direta
  const trimmedUrl = msgOrMedia.trim()
  if (!trimmedUrl) {
    if (fallbackMessageId) {
      return `${pbUrl}/backend/v1/whatsapp/media-proxy?msgId=${encodeURIComponent(fallbackMessageId)}`
    }
    return ''
  }

  if (trimmedUrl.startsWith('data:') || trimmedUrl.startsWith('blob:')) {
    return trimmedUrl
  }

  return getWhatsAppMediaProxyUrl(trimmedUrl, fallbackMessageId)
}

/**
 * Converte uma URL de mídia externa da Z-API / Backblaze / storage em uma URL servida
 * com segurança pelo backend via endpoint proxy (/backend/v1/whatsapp/media-proxy).
 * Nunca expõe credenciais no navegador e evita problemas de CORS ou links protegidos.
 */
export function getWhatsAppMediaProxyUrl(
  mediaUrl?: string | null,
  messageId?: string | null,
): string {
  if (!mediaUrl && !messageId) return ''
  const trimmedUrl = (mediaUrl || '').trim()

  // Se já for uma URL relativa ou data URL, não precisa de proxy
  if (trimmedUrl.startsWith('data:') || trimmedUrl.startsWith('blob:')) {
    return trimmedUrl
  }

  // Se for uma URL já vinda dos arquivos do próprio PocketBase
  if (trimmedUrl.includes('/api/files/whatsapp_mensagens/')) {
    return trimmedUrl
  }

  const pbUrl = (import.meta.env.VITE_POCKETBASE_URL || '').replace(/\/+$/, '')
  const params = new URLSearchParams()
  if (trimmedUrl) params.set('url', trimmedUrl)
  if (messageId) params.set('msgId', messageId)

  return `${pbUrl}/backend/v1/whatsapp/media-proxy?${params.toString()}`
}

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
