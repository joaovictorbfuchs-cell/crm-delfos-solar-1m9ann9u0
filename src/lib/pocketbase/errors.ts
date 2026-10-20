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
 * Identifica se um erro recebido é de autenticação ou sessão expirada (status 401/403 ou mensagens de token inválido).
 * Salvaguarda crítica autônoma para blindagem contra ErrorBoundary no CRM Delfos.
 */
export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false
  if (typeof error === 'object') {
    const err = error as Record<string, unknown>
    // Abort/autocancel não são erros de expiração de sessão
    if (err.isAbort || err.name === 'AbortError') return false
    if (
      typeof err.message === 'string' &&
      (err.message.includes('aborted') || err.message.includes('autocancelled'))
    ) {
      return false
    }
    if (
      err.status === 401 ||
      err.status === 403 ||
      err.statusCode === 401 ||
      err.statusCode === 403
    ) {
      return true
    }
    if (err.response && typeof err.response === 'object') {
      const resp = err.response as Record<string, unknown>
      if (resp.status === 401 || resp.status === 403) return true
    }
    const msg = String(err.message || '').toLowerCase()
    if (
      msg.includes('token is expired') ||
      msg.includes('token expired') ||
      msg.includes('expired or invalid') ||
      msg.includes('login expirou') ||
      msg.includes('sessão expirada') ||
      msg.includes('failed to authenticate')
    ) {
      return true
    }
  }
  return false
}

/**
 * Identifica se um erro é decorrente de cancelamento/abort de requisição HTTP (autocancellation do PocketBase).
 */
export function isAbortError(error: unknown): boolean {
  if (!error) return false
  if (typeof error === 'object') {
    const err = error as Record<string, unknown>
    if (err.isAbort === true) return true
    if (err.name === 'AbortError') return true
    if ((err.originalError as any)?.name === 'AbortError') return true
    const msg = String(err.message || '').toLowerCase()
    if (
      msg.includes('autocancelled') ||
      msg.includes('request was aborted') ||
      msg.includes('the request was cancelled')
    ) {
      return true
    }
  }
  return false
}

/**
 * Formata um erro retornado pelo PocketBase em mensagem amigável para exibição em toasts e alertas.
 */
export function formatPbError(error: unknown, fallback = 'Ocorreu um erro na requisição'): string {
  if (!error) return fallback
  if (typeof error === 'string') return error
  const msg = getErrorMessage(error)
  return msg || fallback
}
