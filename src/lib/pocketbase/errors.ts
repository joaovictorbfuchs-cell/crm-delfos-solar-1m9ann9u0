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
 * Identifica se um erro de requisição é de sessão inválida/expirada ou falta de autenticação (401, 403, etc.)
 */
export function isAuthSessionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const err = error as any

  // Status HTTP clássicos de autenticação/autorização
  if (
    err.status === 401 ||
    err.status === 403 ||
    err.statusCode === 401 ||
    err.statusCode === 403
  ) {
    return true
  }

  // PocketBase ClientResponseError
  if (err instanceof ClientResponseError) {
    if (err.status === 401 || err.status === 403) return true
  }

  // Verificação por mensagem de erro comum de sessão expirada ou token inválido
  const message = String(err.message || '').toLowerCase()
  if (
    message.includes('token is expired') ||
    message.includes('failed to authenticate') ||
    message.includes('invalid token') ||
    message.includes('the request requires valid user authorization') ||
    message.includes('token expired')
  ) {
    return true
  }

  return false
}
