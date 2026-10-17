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
 * Identifica se um erro retornado pelo PocketBase / chamadas de API corresponde
 * a sessão/token expirado, 401 Unauthorized ou 403 Forbidden.
 */
export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false

  // ClientResponseError ou objeto com status / statusCode / response.status
  const anyErr = error as any
  const status =
    anyErr.status ?? anyErr.statusCode ?? anyErr.response?.status ?? anyErr.response?.statusCode

  if (status === 401 || status === 403) {
    return true
  }

  const message = (
    anyErr.message ||
    anyErr.response?.message ||
    (typeof error === 'string' ? error : '')
  ).toLowerCase()

  if (
    message.includes('token is expired') ||
    message.includes('token expired') ||
    message.includes('failed to authenticate') ||
    message.includes('login expirou') ||
    message.includes('sessão expirada') ||
    message.includes('sessao expirada') ||
    message.includes('unauthorized') ||
    message.includes('jwt')
  ) {
    return true
  }

  return false
}
