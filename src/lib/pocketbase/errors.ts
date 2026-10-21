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
  const msers = Object.values(extractFieldErrors(error))
  return msers.length > 0 ? msers.join(' ') : error.message || 'An unexpected error occurred.'
}

export function formatPbError(error: unknown): string {
  return getErrorMessage(error)
}

/**
 * Identifica se um erro de rede/SDK é decorrente de sessão inválida, expirada ou não autorizada (401/403).
 */
export function isAuthSessionError(err: unknown): boolean {
  if (!err) return false

  if (typeof err === 'object') {
    const obj = err as Record<string, any>
    const status = obj.status ?? obj.statusCode ?? obj.response?.status
    if (status === 401 || status === 403) return true

    if (obj.isAbort || obj.name === 'AbortError' || obj.message === 'The request was aborted') {
      return false
    }

    const msg = String(obj.message || obj.error || '').toLowerCase()
    if (
      msg.includes('token is expired') ||
      msg.includes('token expired') ||
      msg.includes('sessão expirada') ||
      msg.includes('sessao expirada') ||
      msg.includes('login expirou') ||
      msg.includes('failed to authenticate') ||
      msg.includes('unauthorized') ||
      msg.includes('forbidden')
    ) {
      return true
    }
  }

  return false
}

/**
 * Identifica se uma requisição foi abortada/autocancelada intencionalmente.
 */
export function isAbortError(err: unknown): boolean {
  if (!err) return false
  if (typeof err === 'object') {
    const obj = err as Record<string, any>
    if (obj.isAbort === true) return true
    if (obj.name === 'AbortError') return true
    const msg = String(obj.message || '').toLowerCase()
    if (msg.includes('aborted') || msg.includes('autocancelled')) return true
  }
  return false
}
