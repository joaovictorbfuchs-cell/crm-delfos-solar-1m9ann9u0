import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

export function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const err = error as { isAbort?: unknown; name?: unknown; message?: unknown }
  if (err.isAbort === true) return true
  if (err.name === 'AbortError') return true
  if (typeof err.message === 'string' && err.message.toLowerCase().includes('abort')) return true
  return false
}

export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false
  if (isAbortError(error)) return false

  if (typeof error === 'object') {
    const err = error as {
      status?: unknown
      statusCode?: unknown
      response?: { status?: unknown }
      message?: unknown
    }

    const status = err.status ?? err.statusCode ?? err.response?.status
    if (status === 401 || status === 403) return true

    const message = typeof err.message === 'string' ? err.message : ''

    const authPhrases = [
      'token is expired or invalid',
      'sessão expirada',
      'login expirou',
      'failed to authenticate',
    ]

    const lower = message.toLowerCase()
    if (authPhrases.some((phrase) => lower.includes(phrase))) {
      return true
    }
  }

  return false
}

export function formatPbError(error: unknown, fallback = 'Erro na operação'): string {
  if (!error) return fallback
  const message = getErrorMessage(error)
  return message && message.trim() ? message : fallback
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
