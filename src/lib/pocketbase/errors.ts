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
 * Identifica se um erro recebido das requisições do PocketBase decorre de token expirado,
 * ausente ou sessão revogada (status 401/403 ou mensagens comuns de autenticação).
 */
export function isAuthSessionError(err: unknown): boolean {
  if (!err) return false

  if (typeof err === 'object') {
    const errorObj = err as Record<string, any>
    const status = Number(errorObj.status || errorObj.statusCode || errorObj.code)
    if (status === 401 || status === 403) {
      return true
    }

    const msg = String(errorObj.message || errorObj.response?.message || '').toLowerCase()
    if (
      msg.includes('token is expired') ||
      msg.includes('token has expired') ||
      msg.includes('failed to authenticate') ||
      msg.includes('the request requires valid user authorization') ||
      msg.includes('the request requires valid admin authorization') ||
      msg.includes('unauthorized') ||
      msg.includes('forbidden') ||
      msg.includes('invalid token')
    ) {
      return true
    }
  }

  return false
}
