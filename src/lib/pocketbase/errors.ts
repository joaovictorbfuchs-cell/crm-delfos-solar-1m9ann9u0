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
 * Identifica se um erro é decorrente de sessão expirada / não autorizada (401 ou 403)
 */
export function isAuthSessionError(err: unknown): boolean {
  if (!err) return false
  if (typeof err === 'object') {
    const obj = err as any
    const status = obj.status || obj.response?.status || obj.statusCode
    if (status === 401 || status === 403) return true

    const msg = String(obj.message || obj.response?.message || '').toLowerCase()
    if (
      msg.includes('token is expired') ||
      msg.includes('token expired') ||
      msg.includes('sessão expirada') ||
      msg.includes('login expirou') ||
      msg.includes('failed to authenticate') ||
      msg.includes('unauthorized') ||
      msg.includes('the request requires valid user authorization')
    ) {
      return true
    }
  }
  return false
}

/**
 * Identifica se um erro é decorrente de cancelamento de requisição (abort / autocancel)
 */
export function isAbortError(err: unknown): boolean {
  if (!err) return false
  if (typeof err === 'object') {
    const obj = err as any
    if (obj.isAbort || obj.name === 'AbortError') return true
    const msg = String(obj.message || '').toLowerCase()
    if (msg.includes('autocancelled') || msg.includes('the request was aborted')) return true
  }
  return false
}

/**
 * Formata um erro retornado pelo PocketBase para mensagem amigável ao usuário
 */
export function formatPbError(err: unknown, fallback = 'Erro ao processar solicitação'): string {
  if (!err) return fallback
  if (isAbortError(err)) return 'Operação cancelada'
  if (isAuthSessionError(err)) return 'Sua sessão expirou. Faça login novamente.'
  return getErrorMessage(err) || fallback
}
