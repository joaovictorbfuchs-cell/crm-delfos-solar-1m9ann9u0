import { ClientResponseError } from 'pocketbase'

/**
 * Identifica se um erro lançado por requisições ao PocketBase/API
 * decorre de sessão expirada, token inválido ou não autenticado (401/403).
 */
export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false

  if (error instanceof ClientResponseError) {
    if (error.status === 401 || error.status === 403) return true
    if (error.response?.status === 401 || error.response?.status === 403) return true
    const msg = (error.message || '').toLowerCase()
    if (
      msg.includes('token is expired') ||
      msg.includes('invalid token') ||
      msg.includes('failed to authenticate') ||
      msg.includes('sessão expirada') ||
      msg.includes('login expirou')
    ) {
      return true
    }
    return false
  }

  if (typeof error === 'object' && error !== null) {
    const errObj = error as { status?: unknown; response?: { status?: unknown }; message?: unknown }
    if (errObj.status === 401 || errObj.status === 403) return true
    if (errObj.response?.status === 401 || errObj.response?.status === 403) return true

    const msg = typeof errObj.message === 'string' ? errObj.message.toLowerCase() : ''
    if (
      msg.includes('token is expired') ||
      msg.includes('invalid token') ||
      msg.includes('failed to authenticate') ||
      msg.includes('sessão expirada') ||
      msg.includes('login expirou')
    ) {
      return true
    }
  }

  return false
}

/**
 * Identifica se o erro é de requisição abortada (cancelada intencionalmente)
 */
export function isAbortError(error: unknown): boolean {
  if (!error) return false
  if (typeof error === 'object' && error !== null) {
    const e = error as { isAbort?: unknown; name?: unknown; message?: unknown }
    if (e.isAbort === true) return true
    if (e.name === 'AbortError') return true
    if (typeof e.message === 'string' && e.message.toLowerCase().includes('request was aborted')) {
      return true
    }
  }
  return false
}

/**
 * Formata um erro de requisição PocketBase para mensagem amigável legível
 */
export function formatPbError(error: unknown, fallback = 'Erro na operação'): string {
  const msg = getErrorMessage(error)
  return msg && msg !== 'An unexpected error occurred.' ? msg : fallback
}

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
