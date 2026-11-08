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
  const err = error as Record<string, unknown>
  const status =
    err.status ??
    err.statusCode ??
    (err.response && typeof err.response === 'object'
      ? (err.response as Record<string, unknown>).status
      : undefined)

  if (status === 401 || status === 403) return true

  const msg =
    (typeof err.message === 'string' && err.message) ||
    (typeof (err.response as Record<string, unknown> | undefined)?.message === 'string' &&
      ((err.response as Record<string, unknown>).message as string)) ||
    ''

  const lower = msg.toLowerCase()
  if (
    lower.includes('token is expired') ||
    lower.includes('sessão expirada') ||
    lower.includes('sessao expirada') ||
    lower.includes('login expirou') ||
    lower.includes('failed to authenticate')
  ) {
    return true
  }

  return false
}

export function isAbortError(error: unknown): boolean {
  if (!error) return false
  const err = error as Record<string, unknown>
  if (err.isAbort === true) return true
  if (err.name === 'AbortError') return true
  return false
}

export function formatPbError(error: unknown): string {
  return getErrorMessage(error)
}
