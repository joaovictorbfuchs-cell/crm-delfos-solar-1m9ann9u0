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

/**
 * Identifica se o erro é decorrente de sessão/token expirado ou não autorizado (401/403).
 */
export function isAuthSessionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const err = error as Record<string, any>
  const status = Number(err.status ?? err.statusCode ?? err.response?.status)
  if (status === 401 || status === 403) return true
  const msg = String(err.message || '').toLowerCase()
  return (
    msg.includes('token is expired') ||
    msg.includes('failed to authenticate') ||
    msg.includes('token is invalid') ||
    msg.includes('unauthorized') ||
    msg.includes('forbidden')
  )
}
