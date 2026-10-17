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
 * Identifica se um erro de requisição corresponde a expiração/invalidade de sessão ou falha de autenticação (401/403).
 */
export function isAuthSessionError(err: unknown): boolean {
  if (!err) return false

  const anyErr = err as any
  const status = anyErr?.status ?? anyErr?.statusCode ?? anyErr?.response?.status

  if (status === 401 || status === 403) {
    return true
  }

  const message = String(anyErr?.message || anyErr?.response?.message || '').toLowerCase()
  if (
    message.includes('token is expired') ||
    message.includes('failed to authenticate') ||
    message.includes('the request requires valid') ||
    message.includes('sessão expirada') ||
    message.includes('sessao expirada') ||
    message.includes('login expirou') ||
    message.includes('token expired')
  ) {
    return true
  }

  return false
}
