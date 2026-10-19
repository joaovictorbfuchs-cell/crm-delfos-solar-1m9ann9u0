import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

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

export function getErrorMessage(error: unknown): string {
  if (!(error instanceof ClientResponseError)) {
    return error instanceof Error ? error.message : 'An unexpected error occurred.'
  }
  const msgs = Object.values(extractFieldErrors(error))
  return msgs.length > 0 ? msgs.join(' ') : error.message || 'An unexpected error occurred.'
}

export function formatPbError(error: unknown): string {
  return getErrorMessage(error)
}

export function isAbortError(error: unknown): boolean {
  if (!error) return false
  if (error instanceof ClientResponseError && (error.isAbort || error.status === 0)) {
    return true
  }
  const err = error as { name?: string; message?: string; isAbort?: boolean }
  if (err.isAbort) return true
  if (err.name === 'AbortError') return true
  const msg = typeof err.message === 'string' ? err.message.toLowerCase() : ''
  return (
    msg.includes('autocancelled') ||
    msg.includes('abort') ||
    msg.includes('the request was autocancelled')
  )
}

/**
 * Detecta de forma autônoma se um erro decorre de sessão/token expirado ou HTTP 401/403.
 * Trata ClientResponseError do PocketBase, objetos envelopados { status, statusCode, response: { status } },
 * e mensagens textuais em português e inglês.
 */
export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false

  // 1. ClientResponseError nativo do SDK PocketBase
  if (error instanceof ClientResponseError) {
    if (error.status === 401 || error.status === 403) return true
  }

  // 2. Objetos envelopados ou duck-typed
  const errObj = error as {
    status?: unknown
    statusCode?: unknown
    code?: unknown
    response?: { status?: unknown; statusCode?: unknown; message?: unknown; data?: unknown }
    originalError?: unknown
    message?: unknown
  }

  const rawStatus =
    errObj.status ??
    errObj.statusCode ??
    errObj.code ??
    errObj.response?.status ??
    errObj.response?.statusCode

  if (rawStatus === 401 || rawStatus === 403 || rawStatus === '401' || rawStatus === '403') {
    return true
  }

  // Se houver originalError aninhado
  if (errObj.originalError && isAuthSessionError(errObj.originalError)) {
    return true
  }

  // 3. Inspeção de mensagens de texto (pt-BR e en-US)
  const candidateTexts: string[] = []
  if (typeof errObj.message === 'string') candidateTexts.push(errObj.message)
  if (error instanceof Error && typeof error.message === 'string')
    candidateTexts.push(error.message)
  if (errObj.response && typeof errObj.response.message === 'string') {
    candidateTexts.push(errObj.response.message)
  }

  const normalized = candidateTexts.join(' ').toLowerCase()
  if (!normalized) return false

  const sessionKeywords = [
    'token is expired',
    'token expired',
    'token inválido',
    'token invalido',
    'sessão expirada',
    'sessao expirada',
    'sessão expirou',
    'sessao expirou',
    'login expirou',
    'login expirado',
    'failed to authenticate',
    'requires authentication',
    'unauthorized',
    'não autorizado',
    'nao autorizado',
    'forbidden',
    'acesso negado',
    'invalid token',
    'jwt expired',
    'the request requires valid record authorization token',
    'the request requires valid admin authorization token',
  ]

  return sessionKeywords.some((keyword) => normalized.includes(keyword))
}

export default {
  extractFieldErrors,
  getErrorMessage,
  formatPbError,
  isAbortError,
  isAuthSessionError,
}
