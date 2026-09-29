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

/**
 * Detecta se o erro decorre de sessão expirada / não autorizada (401, 403, token inválido).
 * Utilizado pelos interceptores e contextos do CRM Delfos Solar.
 */
export function isAuthSessionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const err = error as Record<string, unknown>

  if (err.status === 401 || err.status === 403) return true
  if (err.statusCode === 401 || err.statusCode === 403) return true

  const message = typeof err.message === 'string' ? err.message.toLowerCase() : ''
  if (
    message.includes('token') &&
    (message.includes('expired') ||
      message.includes('invalid') ||
      message.includes('required') ||
      message.includes('missing'))
  ) {
    return true
  }

  if (err.response && typeof err.response === 'object') {
    const res = err.response as Record<string, unknown>
    if (res.code === 401 || res.code === 403 || res.status === 401 || res.status === 403) {
      return true
    }
  }

  return false
}

export function getErrorMessage(error: unknown): string {
  if (!(error instanceof ClientResponseError)) {
    return error instanceof Error ? error.message : 'An unexpected error occurred.'
  }
  const msgs = Object.values(extractFieldErrors(error))
  return msgs.length > 0 ? msgs.join(' ') : error.message || 'An unexpected error occurred.'
}
