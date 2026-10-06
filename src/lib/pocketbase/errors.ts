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
 * Identifica se um erro retornado pelo PocketBase decorre de sessão de autenticação
 * ausente, expirada ou inválida (status HTTP 401 ou 403, ou mensagem de token expirado).
 * Salvaguarda crítica do CRM Delfos Solar para evitar quebras de sessão e loops no ErrorBoundary.
 */
export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false

  if (error instanceof ClientResponseError) {
    if (error.status === 401 || error.status === 403) return true
    const msg = (error.message || '').toLowerCase()
    if (msg.includes('token') && (msg.includes('expired') || msg.includes('invalid'))) return true
  }

  if (typeof error === 'object' && error !== null) {
    const errObj = error as Record<string, unknown>
    const status =
      errObj.status ??
      errObj.statusCode ??
      (errObj.response as Record<string, unknown> | undefined)?.status
    if (status === 401 || status === 403) return true

    const msg = String(errObj.message || errObj.error || '').toLowerCase()
    if (
      msg.includes('token is expired') ||
      msg.includes('token expired') ||
      msg.includes('token is invalid') ||
      msg.includes('failed to authenticate')
    ) {
      return true
    }
  }

  return false
}
