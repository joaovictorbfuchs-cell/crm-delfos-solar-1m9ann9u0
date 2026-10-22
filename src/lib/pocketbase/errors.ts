import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

/**
 * Retorna true se o erro indicar expiração ou invalidade de token/sessão auth
 */
export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false
  if (typeof error === 'object') {
    const err = error as Record<string, any>
    const status = err.status ?? err.statusCode ?? err.response?.status
    if (status === 401 || status === 403) return true

    const msg = String(err.message || err.response?.message || '').toLowerCase()
    if (
      msg.includes('token is expired') ||
      msg.includes('token expired') ||
      msg.includes('failed to authenticate') ||
      msg.includes('sessão expirada') ||
      msg.includes('login expirou') ||
      msg.includes('sessao expirada')
    ) {
      return true
    }
  }
  return false
}

/**
 * Retorna true se a requisição foi abortada (autocancel ou AbortController)
 */
export function isAbortError(error: unknown): boolean {
  if (!error) return false
  if (typeof error === 'object') {
    const err = error as Record<string, any>
    if (err.isAbort === true) return true
    if (err.name === 'AbortError') return true
    const msg = String(err.message || '').toLowerCase()
    if (msg.includes('autocancelled') || msg.includes('the request was aborted')) return true
  }
  return false
}

/**
 * Formata um erro retornado pelo PocketBase para mensagem legível em português
 */
export function formatPbError(error: unknown, fallback = 'Ocorreu um erro inesperado.'): string {
  if (!error) return fallback
  if (error instanceof ClientResponseError) {
    const fieldErrs = extractFieldErrors(error)
    const msgs = Object.values(fieldErrs)
    if (msgs.length > 0) return msgs.join('. ')
    if (error.message) return error.message
  }
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return fallback
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
