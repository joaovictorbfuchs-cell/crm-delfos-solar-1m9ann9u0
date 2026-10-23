import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

export function isAbortError(error: unknown): boolean {
  if (!error) return false
  if (typeof error === 'object' && error !== null) {
    const anyErr = error as { isAbort?: boolean; name?: string; message?: string; status?: number }
    if (anyErr.isAbort === true) return true
    if (anyErr.name === 'AbortError') return true
    if (anyErr.status === 0) return true
    const msg = String(anyErr.message || '').toLowerCase()
    if (msg.includes('autocancelled') || msg.includes('abort')) return true
  }
  return false
}

export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false
  if (typeof error === 'object' && error !== null) {
    const anyErr = error as {
      status?: number
      statusCode?: number
      response?: { status?: number; data?: unknown }
      message?: string
    }
    const status = anyErr.status ?? anyErr.statusCode ?? anyErr.response?.status
    if (status === 401 || status === 403) return true
    const msg = String(anyErr.message || '').toLowerCase()
    if (
      msg.includes('token is expired') ||
      msg.includes('invalid token') ||
      msg.includes('sessão expirada') ||
      msg.includes('sessao expirada') ||
      msg.includes('login expirou') ||
      msg.includes('failed to authenticate')
    ) {
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
