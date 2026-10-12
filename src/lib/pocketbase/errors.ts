import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

/**
 * Verifica se um erro corresponde a falha de autenticação/sessão expirada (401, 403, token inválido).
 * Salvaguarda crítica do sistema para tratamento unificado de sessão expirada.
 */
export function isAuthSessionError(err: unknown): boolean {
  if (!err) return false
  const anyErr = err as any
  const status = anyErr?.status ?? anyErr?.statusCode ?? anyErr?.response?.status
  if (status === 401 || status === 403) return true
  const msg = String(anyErr?.message || anyErr?.response?.message || '').toLowerCase()
  if (
    msg.includes('token') &&
    (msg.includes('expired') || msg.includes('invalid') || msg.includes('revoked'))
  ) {
    return true
  }
  if (msg.includes('failed to authenticate') || msg.includes('the request requires valid user')) {
    return true
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
