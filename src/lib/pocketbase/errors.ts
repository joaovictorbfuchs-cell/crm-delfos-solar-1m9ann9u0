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
 * Identifica se um erro retornado pelo PocketBase é de sessão expirada, token inválido ou não autorizado (401 / 403).
 */
export function isAuthSessionError(err: unknown): boolean {
  if (!err) return false
  if (err instanceof ClientResponseError) {
    if (err.status === 401 || err.status === 403) return true
  }
  const errObj = err as Record<string, unknown>
  if (errObj.status === 401 || errObj.status === 403) return true
  if (errObj.statusCode === 401 || errObj.statusCode === 403) return true
  const msg = typeof errObj.message === 'string' ? errObj.message.toLowerCase() : ''
  if (
    msg.includes('token is expired') ||
    msg.includes('token expired') ||
    msg.includes('unauthorized') ||
    msg.includes('forbidden') ||
    msg.includes('failed to authenticate')
  ) {
    return true
  }
  return false
}
