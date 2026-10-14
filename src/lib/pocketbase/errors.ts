import { ClientResponseError } from 'pocketbase'

/**
 * Identifica se um erro indica expiração de sessão ou falta de autenticação / autorização
 * (ex.: token expirado, 401 Unauthorized, 403 Forbidden).
 */
export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false
  if (error instanceof ClientResponseError) {
    if (error.status === 401 || error.status === 403) return true
    const msg = (error.message || '').toLowerCase()
    if (msg.includes('token') && (msg.includes('expired') || msg.includes('invalid'))) return true
    if (msg.includes('failed to authenticate') || msg.includes('unauthorized')) return true
    return false
  }
  if (typeof error === 'object') {
    const errObj = error as Record<string, any>
    const status = Number(errObj.status || errObj.statusCode || 0)
    if (status === 401 || status === 403) return true
    const msg = String(errObj.message || '').toLowerCase()
    if (
      msg.includes('token') &&
      (msg.includes('expired') || msg.includes('invalid') || msg.includes('inválido'))
    ) {
      return true
    }
    if (
      msg.includes('sessão expirada') ||
      msg.includes('sessao expirada') ||
      msg.includes('failed to authenticate') ||
      msg.includes('unauthorized')
    ) {
      return true
    }
  }
  return false
}

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
