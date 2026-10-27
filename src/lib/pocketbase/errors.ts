import { ClientResponseError } from 'pocketbase'

export function isAuthSessionError(err: unknown): boolean {
  if (!err) return false
  if (typeof err === 'object') {
    const errorObj = err as Record<string, any>
    if (errorObj.status === 401 || errorObj.status === 403) return true
    if (errorObj.response && (errorObj.response.status === 401 || errorObj.response.status === 403))
      return true
    if (typeof errorObj.message === 'string') {
      const msg = errorObj.message.toLowerCase()
      if (
        msg.includes('token is expired') ||
        msg.includes('failed to authenticate') ||
        msg.includes('login expirou') ||
        msg.includes('sessão expirada') ||
        msg.includes('sessao expirada')
      ) {
        return true
      }
    }
  }
  return false
}

export function isAbortError(err: unknown): boolean {
  if (!err) return false
  if (typeof err === 'object') {
    const e = err as Record<string, any>
    if (e.isAbort) return true
    if (e.name === 'AbortError') return true
    if (typeof e.message === 'string' && e.message.toLowerCase().includes('aborted')) return true
  }
  return false
}

export function formatPbError(err: unknown): string {
  return getErrorMessage(err)
}

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
