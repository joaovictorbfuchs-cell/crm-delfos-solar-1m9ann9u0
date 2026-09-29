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
 * Detecta se um erro é proveniente de sessão/token expirado ou credenciais inválidas no PocketBase.
 */
export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false
  const err = error as any
  const status = Number(err?.status || err?.statusCode || err?.response?.status || 0)
  if (status === 401 || status === 403) return true
  const msg = String(
    err?.message || err?.data?.message || err?.response?.message || '',
  ).toLowerCase()
  if (
    msg.includes('token') &&
    (msg.includes('expired') || msg.includes('invalid') || msg.includes('revoked'))
  ) {
    return true
  }
  if (
    msg.includes('unauthorized') ||
    msg.includes('forbidden') ||
    msg.includes('sessão expirada') ||
    msg.includes('failed to authenticate')
  ) {
    return true
  }
  return false
}
