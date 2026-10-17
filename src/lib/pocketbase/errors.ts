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
 * Identifica se um erro é decorrente de sessão/token expirado ou não autorizado (401/403).
 */
export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false

  if (typeof error === 'object') {
    const obj = error as Record<string, any>
    if (obj.status === 401 || obj.status === 403) return true
    if (obj.statusCode === 401 || obj.statusCode === 403) return true
    if (obj.response && (obj.response.status === 401 || obj.response.status === 403)) return true
    if (typeof obj.message === 'string') {
      const msg = obj.message.toLowerCase()
      if (
        msg.includes('token is expired') ||
        msg.includes('token expired') ||
        msg.includes('login expirou') ||
        msg.includes('sessão expirada') ||
        msg.includes('failed to authenticate') ||
        msg.includes('unauthorized') ||
        msg.includes('forbidden')
      ) {
        return true
      }
    }
  }

  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    if (
      msg.includes('token is expired') ||
      msg.includes('token expired') ||
      msg.includes('login expirou') ||
      msg.includes('sessão expirada') ||
      msg.includes('failed to authenticate') ||
      msg.includes('unauthorized') ||
      msg.includes('forbidden')
    ) {
      return true
    }
  }

  return false
}
