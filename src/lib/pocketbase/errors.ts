import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false
  if (typeof error === 'object' && error !== null) {
    const anyErr = error as any
    if (anyErr.isAbort || anyErr.name === 'AbortError') return false
    if (typeof anyErr.message === 'string' && anyErr.message.toLowerCase().includes('aborted')) {
      return false
    }
    if (anyErr.status === 401 || anyErr.status === 403) return true
    if (anyErr.statusCode === 401 || anyErr.statusCode === 403) return true
    if (anyErr.response?.status === 401 || anyErr.response?.status === 403) return true
    if (anyErr.response?.statusCode === 401 || anyErr.response?.statusCode === 403) return true
    const msg = String(anyErr.message || anyErr.error || '').toLowerCase()
    if (
      msg.includes('token is expired') ||
      msg.includes('token expired') ||
      msg.includes('failed to authenticate') ||
      msg.includes('sessão expirada') ||
      msg.includes('login expirou') ||
      msg.includes('invalid token')
    ) {
      return true
    }
  }
  return false
}

export function isAbortError(error: unknown): boolean {
  if (!error) return false
  if (typeof error === 'object' && error !== null) {
    const anyErr = error as any
    if (anyErr.isAbort === true) return true
    if (anyErr.name === 'AbortError') return true
    if (typeof anyErr.message === 'string' && anyErr.message.toLowerCase().includes('aborted')) {
      return true
    }
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
