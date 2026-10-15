import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

/**
 * Verifica se um erro retornado pelo PocketBase indica sessão/token expirado ou falta de autenticação (401/403).
 */
export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false
  if (typeof error === 'object') {
    const errObj = error as Record<string, unknown>
    const status =
      errObj.status ??
      errObj.statusCode ??
      (errObj.response as Record<string, unknown> | undefined)?.status
    if (status === 401 || status === 403) return true
    const msg = String(errObj.message || errObj.originalError || '')
    if (
      msg.includes('Token is expired') ||
      msg.includes('Failed to authenticate') ||
      msg.includes('Login expirou') ||
      msg.includes('Sessão expirada')
    ) {
      return true
    }
  }
  if (error instanceof Error) {
    const msg = error.message
    if (
      msg.includes('Token is expired') ||
      msg.includes('Failed to authenticate') ||
      msg.includes('Login expirou') ||
      msg.includes('Sessão expirada')
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
