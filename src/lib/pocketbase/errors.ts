import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

/**
 * Identifica se um erro é de autenticação ou sessão expirada (401/403).
 */
export function isAuthSessionError(err: unknown): boolean {
  if (!err) return false
  if (typeof err === 'object') {
    const anyErr = err as Record<string, any>
    if (anyErr.status === 401 || anyErr.status === 403) return true
    if (anyErr.statusCode === 401 || anyErr.statusCode === 403) return true
    if (anyErr.response && (anyErr.response.status === 401 || anyErr.response.status === 403)) {
      return true
    }
    const msg = String(anyErr.message || '').toLowerCase()
    if (
      msg.includes('token is expired') ||
      msg.includes('failed to authenticate') ||
      msg.includes('login expirou') ||
      msg.includes('sessão expirada') ||
      msg.includes('sessao expirada') ||
      msg.includes('unauthorized') ||
      msg.includes('forbidden')
    ) {
      return true
    }
  }
  return false
}

/**
 * Identifica se um erro foi disparado por abort/autocancelling de requisição.
 */
export function isAbortError(err: unknown): boolean {
  if (!err) return false
  if (typeof err === 'object') {
    const anyErr = err as Record<string, any>
    if (anyErr.isAbort === true) return true
    if (anyErr.name === 'AbortError') return true
    const msg = String(anyErr.message || '').toLowerCase()
    if (msg.includes('autocancelled') || msg.includes('was aborted')) return true
  }
  return false
}

/**
 * Formata um erro retornado pelo PocketBase para mensagem legível.
 */
export function formatPbError(error: unknown): string {
  return getErrorMessage(error)
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
