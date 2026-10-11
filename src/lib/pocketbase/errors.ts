import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

/**
 * Identifica se um erro lançado por chamada PocketBase é decorrente de
 * expiração/invalidação de sessão (401/403 ou tokens expirados/revogados).
 */
export function isAuthSessionError(err: unknown): boolean {
  if (!err) return false

  // Se for ClientResponseError do PocketBase
  if (err instanceof ClientResponseError) {
    if (err.status === 401 || err.status === 403) return true
    const msg = (err.message || '').toLowerCase()
    if (
      msg.includes('token is expired') ||
      msg.includes('failed to authenticate') ||
      msg.includes('something went wrong while processing your request')
    ) {
      return true
    }
  }

  // Objeto genérico com status/statusCode
  if (typeof err === 'object' && err !== null) {
    const obj = err as Record<string, any>
    const status = Number(obj.status || obj.statusCode || obj.code)
    if (status === 401 || status === 403) return true

    const msg = String(obj.message || obj.error || '').toLowerCase()
    if (
      msg.includes('token is expired') ||
      msg.includes('jwt expired') ||
      msg.includes('failed to authenticate') ||
      msg.includes('unauthorized') ||
      msg.includes('forbidden')
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
