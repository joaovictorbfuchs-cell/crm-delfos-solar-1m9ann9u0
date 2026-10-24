import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false
  const err = error as { status?: number; response?: { status?: number }; message?: string }
  if (err.status === 401 || err.status === 403) return true
  if (err.response?.status === 401 || err.response?.status === 403) return true
  const msg = typeof err.message === 'string' ? err.message.toLowerCase() : ''
  if (
    msg.includes('token is expired') ||
    msg.includes('token expired') ||
    msg.includes('failed to authenticate') ||
    msg.includes('login expirou') ||
    msg.includes('sessão expirada') ||
    msg.includes('sessao expirada') ||
    msg.includes('unauthorized') ||
    msg.includes('forbidden')
  ) {
    return true
  }
  return false
}

export function isAbortError(error: unknown): boolean {
  if (!error) return false
  const err = error as { isAbort?: boolean; name?: string; message?: string }
  if (err.isAbort === true) return true
  if (err.name === 'AbortError') return true
  const msg = typeof err.message === 'string' ? err.message.toLowerCase() : ''
  return msg.includes('aborted') || msg.includes('autocancelled')
}

export function formatPbError(error: unknown, fallback = 'Ocorreu um erro na operação.'): string {
  if (!error) return fallback
  const detailed = getErrorMessage(error)
  if (detailed && detailed !== 'An unexpected error occurred.') {
    return detailed
  }
  if (error instanceof Error && error.message) {
    return error.message
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
