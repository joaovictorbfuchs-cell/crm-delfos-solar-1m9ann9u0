import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

/**
 * Identifica se um erro recebido corresponde a expiração de sessão, token inválido,
 * ou falta de autorização (HTTP 401 ou 403), em qualquer formato:
 * - ClientResponseError do SDK PocketBase
 * - Objetos literais com status / statusCode / response.status / status === 401 | 403
 * - Objetos com originalError ou data aninhado
 * - Erros genéricos de runtime com mensagens canônicas de sessão/token/login expirado
 */
export function isAuthSessionError(err: unknown): boolean {
  if (!err) return false

  // ClientResponseError nativo do SDK PocketBase
  if (err instanceof ClientResponseError) {
    if (err.status === 401 || err.status === 403) return true
  }

  // Objeto estruturado com propriedades status / statusCode / response
  if (typeof err === 'object' && err !== null) {
    const obj = err as Record<string, unknown>
    const statusVal = obj.status ?? obj.statusCode
    if (statusVal === 401 || statusVal === 403) return true

    if (obj.response && typeof obj.response === 'object' && obj.response !== null) {
      const resp = obj.response as Record<string, unknown>
      const respStatus = resp.status ?? resp.statusCode
      if (respStatus === 401 || respStatus === 403) return true
    }

    if (obj.originalError) {
      if (isAuthSessionError(obj.originalError)) return true
    }
  }

  // Análise de mensagem de erro textual para casos em que o status HTTP se perde
  const msg =
    err instanceof Error
      ? err.message
      : typeof err === 'object' &&
          err !== null &&
          'message' in err &&
          typeof (err as { message: unknown }).message === 'string'
        ? (err as { message: string }).message
        : typeof err === 'string'
          ? err
          : ''

  if (msg) {
    const lower = msg.toLowerCase()
    if (
      lower.includes('token is expired') ||
      lower.includes('token expired') ||
      lower.includes('invalid token') ||
      lower.includes('failed to authenticate') ||
      lower.includes('unauthorized') ||
      lower.includes('forbidden') ||
      lower.includes('login expirou') ||
      lower.includes('sessão expirada') ||
      lower.includes('sessao expirada') ||
      lower.includes('requisição não autorizada') ||
      lower.includes('requisicao nao autorizada') ||
      lower.includes('the request requires valid user authorization to be processed')
    ) {
      return true
    }
  }

  return false
}

/**
 * Identifica se uma requisição foi autocancelada pelo PocketBase (isAbort).
 */
export function isAbortError(err: unknown): boolean {
  if (!err) return false
  if (err instanceof ClientResponseError && (err.isAbort || err.status === 0)) {
    return true
  }
  if (typeof err === 'object' && err !== null) {
    const anyErr = err as Record<string, unknown>
    if (anyErr.isAbort === true || anyErr.name === 'AbortError') return true
  }
  return false
}

/**
 * Extrai erros estruturados por campo retornados pelo PocketBase.
 */
export function extractFieldErrors(error: unknown): FieldErrors {
  if (!(error instanceof ClientResponseError)) return {}
  const data = error.response?.data
  if (!data || typeof data !== 'object') return {}
  const errors: FieldErrors = {}
  for (const [field, detail] of Object.entries(data)) {
    if (
      detail &&
      typeof detail === 'object' &&
      'message' in detail &&
      typeof (detail as { message: unknown }).message === 'string'
    ) {
      errors[field] = (detail as { message: string }).message
    }
  }
  return errors
}

/**
 * Retorna mensagem de erro amigável em português a partir de qualquer erro recebido.
 */
export function getErrorMessage(error: unknown): string {
  if (isAuthSessionError(error)) {
    return 'Sua sessão expirou. Faça login novamente.'
  }
  if (!(error instanceof ClientResponseError)) {
    return error instanceof Error ? error.message : 'Ocorreu um erro inesperado.'
  }
  const msgs = Object.values(extractFieldErrors(error))
  return msgs.length > 0 ? msgs.join(' ') : error.message || 'Ocorreu um erro inesperado.'
}

/**
 * Formata um erro do PocketBase para texto simples unificado.
 */
export function formatPbError(error: unknown): string {
  return getErrorMessage(error)
}

export default {
  isAuthSessionError,
  isAbortError,
  extractFieldErrors,
  getErrorMessage,
  formatPbError,
}
