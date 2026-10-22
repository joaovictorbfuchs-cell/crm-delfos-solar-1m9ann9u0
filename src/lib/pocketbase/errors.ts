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

export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false
  if (typeof error === 'object') {
    const obj = error as Record<string, unknown>
    if (
      obj.status === 401 ||
      obj.status === 403 ||
      obj.statusCode === 401 ||
      obj.statusCode === 403
    ) {
      return true
    }
    if (obj.response && typeof obj.response === 'object') {
      const resp = obj.response as Record<string, unknown>
      if (resp.status === 401 || resp.status === 403) {
        return true
      }
    }
    const msg = typeof obj.message === 'string' ? obj.message.toLowerCase() : ''
    if (
      msg.includes('token is expired') ||
      msg.includes('token expired') ||
      msg.includes('login expirou') ||
      msg.includes('sessão expirada') ||
      msg.includes('sessao expirada') ||
      msg.includes('failed to authenticate')
    ) {
      return true
    }
  }
  return false
}

export function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const obj = error as Record<string, unknown>
  if (obj.isAbort === true) return true
  if (obj.name === 'AbortError') return true
  if (typeof obj.message === 'string' && obj.message.toLowerCase().includes('aborted')) return true
  return false
}

export function formatPbError(error: unknown): string {
  return getErrorMessage(error)
}
