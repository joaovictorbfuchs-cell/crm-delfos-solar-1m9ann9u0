import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

/**
 * Identifica se um erro indica sessão expirada, token inválido ou ausência de autorização (401/403).
 * Ignora explicitamente cancelamentos e abortos (AbortError, status 0, isAbort).
 */
export function isAuthSessionError(err: unknown): boolean {
  if (!err) return false

  // Se for erro de abort / cancelamento, não é erro de sessão
  if (isAbortError(err)) return false

  const anyErr = err as {
    status?: unknown
    statusCode?: unknown
    response?: { status?: unknown }
    message?: unknown
    data?: unknown
  }

  const status = Number(anyErr.status ?? anyErr.statusCode ?? anyErr.response?.status ?? 0)
  if (status === 401 || status === 403) return true

  const msg = String(anyErr.message || '').toLowerCase()
  if (
    msg.includes('token is expired') ||
    msg.includes('token expired') ||
    msg.includes('invalid token') ||
    msg.includes('failed to authenticate') ||
    msg.includes('sessão expirada') ||
    msg.includes('sessao expirada') ||
    msg.includes('login expirou') ||
    msg.includes('login expirado') ||
    msg.includes('unauthorized') ||
    msg.includes('não autorizado') ||
    msg.includes('nao autorizado')
  ) {
    return true
  }

  return false
}

/**
 * Identifica requisições canceladas pelo cliente (AbortError, status 0, autocancelled do PB).
 */
export function isAbortError(err: unknown): boolean {
  if (!err) return false
  const anyErr = err as {
    isAbort?: unknown
    name?: unknown
    status?: unknown
    statusCode?: unknown
    message?: unknown
  }

  if (anyErr.isAbort) return true
  if (anyErr.name === 'AbortError') return true
  if (anyErr.status === 0 || anyErr.statusCode === 0) return true

  const msg = String(anyErr.message || '').toLowerCase()
  if (
    msg.includes('autocancelled') ||
    msg.includes('auto-cancelled') ||
    msg.includes('the request was aborted') ||
    msg.includes('abort')
  ) {
    return true
  }

  return false
}

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

export default {
  isAuthSessionError,
  isAbortError,
  extractFieldErrors,
  getErrorMessage,
  formatPbError,
}
