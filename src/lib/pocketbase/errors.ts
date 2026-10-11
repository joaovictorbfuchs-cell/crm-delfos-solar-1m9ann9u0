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
 * Identifica se um erro recebido é relacionado a sessão/autenticação expirada, inválida ou ausente (401 / 403 / token expirado)
 */
export function isAuthSessionError(err: unknown): boolean {
  if (!err) return false

  // Checagem em ClientResponseError do PocketBase
  if (err instanceof ClientResponseError) {
    if (err.status === 401 || err.status === 403) return true
  }

  // Checagem genérica por status/statusCode numéricos
  const maybeObj = err as Record<string, unknown>
  if (typeof maybeObj === 'object' && maybeObj !== null) {
    const status = maybeObj.status ?? maybeObj.statusCode
    if (status === 401 || status === 403) return true

    const message = String(maybeObj.message || '').toLowerCase()
    if (
      message.includes('token is expired') ||
      message.includes('failed to authenticate') ||
      message.includes('token has expired') ||
      message.includes('unauthorized') ||
      message.includes('forbidden') ||
      message.includes('token invalid')
    ) {
      return true
    }
  }

  return false
}
