import { ClientResponseError } from 'pocketbase'

export function isAuthSessionError(err: unknown): boolean {
  if (!err) return false
  if (typeof err === 'object') {
    const errorObj = err as Record<string, any>
    const status = errorObj.status || errorObj.statusCode || errorObj.response?.status
    if (status === 401 || status === 403) return true
    const msg = String(errorObj.message || errorObj.response?.message || '').toLowerCase()
    if (
      msg.includes('token is expired') ||
      msg.includes('token invalid') ||
      msg.includes('invalid token') ||
      msg.includes('login expirou') ||
      msg.includes('sessão expirada') ||
      msg.includes('failed to authenticate') ||
      msg.includes('unauthorized') ||
      msg.includes('forbidden')
    ) {
      return true
    }
  }
  return false
}

export function isAbortError(err: unknown): boolean {
  if (!err) return false
  if (typeof err === 'object') {
    const errorObj = err as Record<string, any>
    if (errorObj.isAbort === true) return true
    if (errorObj.name === 'AbortError') return true
    const msg = String(errorObj.message || '').toLowerCase()
    if (msg.includes('autocancelled') || msg.includes('the request was aborted')) return true
  }
  return false
}

export function formatPbError(error: unknown): string {
  return getErrorMessage(error)
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
