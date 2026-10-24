import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

export function isAuthSessionError(err: unknown): boolean {
  if (!err) return false
  if (typeof err === 'object') {
    const e = err as {
      status?: unknown
      statusCode?: unknown
      response?: { status?: unknown }
      name?: unknown
      message?: unknown
    }
    if (e.status === 401 || e.status === 403) return true
    if (e.statusCode === 401 || e.statusCode === 403) return true
    if (e.response && (e.response.status === 401 || e.response.status === 403)) return true
    const msg = typeof e.message === 'string' ? e.message.toLowerCase() : ''
    if (
      msg.includes('token is expired') ||
      msg.includes('token expired') ||
      msg.includes('login expirou') ||
      msg.includes('sessão expirada') ||
      msg.includes('failed to authenticate') ||
      msg.includes('user not authenticated') ||
      msg.includes('authentication required')
    ) {
      return true
    }
  }
  return false
}

export function isAbortError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const e = err as { name?: unknown; isAbort?: unknown; message?: unknown }
  if (e.isAbort === true) return true
  if (e.name === 'AbortError') return true
  const msg = typeof e.message === 'string' ? e.message.toLowerCase() : ''
  return msg.includes('autocancelled') || msg.includes('aborted')
}

export function formatPbError(error: unknown, fallback = 'Ocorreu um erro inesperado'): string {
  if (!error) return fallback
  if (typeof error === 'string') return error
  const msg = getErrorMessage(error)
  return msg && msg !== 'An unexpected error occurred.' ? msg : fallback
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
