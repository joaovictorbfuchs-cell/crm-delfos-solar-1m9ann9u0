import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

/**
 * Identifica se um erro retornado pelo PocketBase indica sessão expirada, token inválido ou não autenticado (401/403).
 */
export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false

  if (typeof error === 'object') {
    const errObj = error as Record<string, any>

    // Checagem por status numérico direto
    if (errObj.status === 401 || errObj.status === 403) return true
    if (errObj.statusCode === 401 || errObj.statusCode === 403) return true

    // Checagem por response.status
    if (errObj.response && typeof errObj.response === 'object') {
      const respStatus = errObj.response.status ?? errObj.response.statusCode
      if (respStatus === 401 || respStatus === 403) return true
    }

    // Abort errors não são erros de auth
    if (errObj.isAbort || errObj.name === 'AbortError') return false

    // Checagem textual na mensagem
    const msg = String(errObj.message || errObj.error || '').toLowerCase()
    if (
      msg.includes('token is expired') ||
      msg.includes('token expired') ||
      msg.includes('failed to authenticate') ||
      msg.includes('login expirou') ||
      msg.includes('sessão expirada') ||
      msg.includes('sessao expirada') ||
      msg.includes('unauthorized') ||
      msg.includes('forbidden')
    ) {
      return true
    }
  }

  return false
}

/**
 * Identifica se um erro é resultado de requisição abortada / auto-cancelamento do PocketBase.
 */
export function isAbortError(error: unknown): boolean {
  if (!error) return false
  if (typeof error === 'object') {
    const errObj = error as Record<string, any>
    if (errObj.isAbort === true) return true
    if (errObj.name === 'AbortError') return true
    const msg = String(errObj.message || '').toLowerCase()
    if (msg.includes('request was aborted') || msg.includes('autocancelled')) return true
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

/**
 * Formata um erro do PocketBase de forma amigável para exibição em toasts ou logs.
 */
export function formatPbError(
  error: unknown,
  fallbackMessage = 'Ocorreu um erro no servidor.',
): string {
  if (!error) return fallbackMessage
  const extracted = getErrorMessage(error)
  if (extracted && extracted !== 'An unexpected error occurred.') return extracted
  if (error instanceof Error && error.message) return error.message
  return fallbackMessage
}
