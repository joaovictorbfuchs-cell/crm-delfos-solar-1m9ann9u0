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
 * Identifica se um erro recebido do backend ou rede é decorrente de sessão inválida / token expirado
 * ou códigos de não autorizado (401) / proibido (403).
 */
export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false

  if (typeof error === 'object') {
    const errObj = error as Record<string, any>
    const status = errObj.status ?? errObj.statusCode ?? errObj.response?.status
    if (status === 401 || status === 403) {
      return true
    }

    const message = String(errObj.message || errObj.error || '').toLowerCase()
    if (
      message.includes('token is expired') ||
      message.includes('token expired') ||
      message.includes('login expirou') ||
      message.includes('sessão expirada') ||
      message.includes('failed to authenticate') ||
      message.includes('the request requires valid user authorization')
    ) {
      return true
    }
  }

  return false
}
