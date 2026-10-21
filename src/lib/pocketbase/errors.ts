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
  if (!error || typeof error !== 'object') return false
  const err = error as { isAbort?: boolean; name?: string; message?: string }
  if (err.isAbort === true) return true
  if (err.name === 'AbortError') return true
  if (typeof err.message === 'string' && err.message.toLowerCase().includes('aborted')) return true
  return false
}

export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false
  if (typeof error === 'object') {
    const err = error as {
      status?: number
      statusCode?: number
      response?: { status?: number; statusCode?: number }
      message?: string
    }
    if (err.status === 401 || err.status === 403) return true
    if (err.statusCode === 401 || err.statusCode === 403) return true
    if (err.response?.status === 401 || err.response?.status === 403) return true
    if (err.response?.statusCode === 401 || err.response?.statusCode === 403) return true

    const msg = typeof err.message === 'string' ? err.message.toLowerCase() : ''
    if (
      msg.includes('token is expired') ||
      msg.includes('token expired') ||
      msg.includes('sessão expirada') ||
      msg.includes('login expirou') ||
      msg.includes('failed to authenticate') ||
      msg.includes('failed to create request context')
    ) {
      return true
    }
  }
  return false
}
