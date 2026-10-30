import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

/**
 * Verifica se um erro retornado pelo PocketBase decorre de sessão de autenticação expirada, inválida ou ausente (401/403).
 */
export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false
  if (error instanceof ClientResponseError) {
    return error.status === 401 || error.status === 403
  }
  if (typeof error === 'object') {
    const errObj = error as { status?: number; response?: { status?: number }; message?: string }
    if (errObj.status === 401 || errObj.status === 403) return true
    if (errObj.response?.status === 401 || errObj.response?.status === 403) return true
    const msg = (errObj.message || '').toLowerCase()
    if (
      msg.includes('authenticate') ||
      msg.includes('unauthorized') ||
      msg.includes('forbidden') ||
      msg.includes('invalid token')
    ) {
      return true
    }
  }
  return false
}

/**
 * Verifica se o erro foi originado por cancelamento de requisição (AbortError / autoCancellation do PocketBase).
 */
export function isAbortError(error: unknown): boolean {
  if (!error) return false
  if (typeof error === 'object') {
    const errObj = error as { isAbort?: boolean; name?: string; message?: string }
    if (errObj.isAbort === true) return true
    if (errObj.name === 'AbortError') return true
    if ((errObj.message || '').toLowerCase().includes('request was aborted')) return true
  }
  return false
}

/**
 * Formata um erro de requisição do PocketBase de forma legível.
 */
export function formatPbError(error: unknown, fallback = 'Ocorreu um erro na requisição.'): string {
  if (!error) return fallback
  if (error instanceof ClientResponseError) {
    const errs = extractFieldErrors(error)
    const errValues = Object.values(errs)
    if (errValues.length > 0) return errValues.join(', ')
    return error.message || fallback
  }
  if (error instanceof Error) {
    return error.message || fallback
  }
  return fallback
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
