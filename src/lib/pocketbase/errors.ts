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

export function isAuthSessionError(err: unknown): boolean {
  if (!err) return false
  if (typeof err === 'object') {
    const errorObj = err as Record<string, unknown>
    if (errorObj.status === 401 || errorObj.status === 403) {
      return true
    }
    const msg = String(errorObj.message || errorObj.error || '').toLowerCase()
    if (
      msg.includes('authenticate') ||
      msg.includes('unauthorized') ||
      msg.includes('token') ||
      msg.includes('session expired') ||
      msg.includes('sessão expirada')
    ) {
      return true
    }
  }
  return false
}

export function isAbortError(err: unknown): boolean {
  if (!err) return false
  if (typeof err === 'object') {
    const errorObj = err as Record<string, unknown>
    if (errorObj.isAbort === true || errorObj.name === 'AbortError') {
      return true
    }
    const msg = String(errorObj.message || '').toLowerCase()
    if (msg.includes('autocancelled') || msg.includes('aborted') || msg.includes('aborter')) {
      return true
    }
  }
  return false
}

export function formatPbError(err: unknown, fallback = 'Erro na requisição'): string {
  if (!err) return fallback
  const msg = getErrorMessage(err)
  return msg && msg !== 'An unexpected error occurred.' ? msg : fallback
}
