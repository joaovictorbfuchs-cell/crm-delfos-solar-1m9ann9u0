import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

/**
 * Identifica se um erro retornado pelo PocketBase ou requisição HTTP é de sessão expirada,
 * token inválido ou credenciais negadas (401 / 403).
 */
export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false

  // Se for abort de requisição (autocancel), não é erro de sessão
  if (isAbortError(error)) return false

  if (typeof error === 'object') {
    const errObj = error as Record<string, unknown>

    if (errObj.status === 401 || errObj.status === 403) return true
    if (errObj.statusCode === 401 || errObj.statusCode === 403) return true

    const response = errObj.response as Record<string, unknown> | undefined
    if (response && (response.status === 401 || response.status === 403)) return true
    if (response && (response.code === 401 || response.code === 403)) return true

    const message = typeof errObj.message === 'string' ? errObj.message : ''
    const msgLower = message.toLowerCase()
    if (
      msgLower.includes('token is expired') ||
      msgLower.includes('failed to authenticate') ||
      msgLower.includes('login expirou') ||
      msgLower.includes('sessão expirada') ||
      msgLower.includes('sessao expirada') ||
      msgLower.includes('unauthorized') ||
      msgLower.includes('token expired') ||
      msgLower.includes('authstore is invalid')
    ) {
      return true
    }
  }

  return false
}

/**
 * Identifica se um erro foi disparado por cancelamento de requisição (autocancel do SDK ou AbortController).
 */
export function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const errObj = error as Record<string, unknown>
  if (errObj.isAbort === true) return true
  if (errObj.name === 'AbortError') return true
  if (
    typeof errObj.message === 'string' &&
    errObj.message.toLowerCase().includes('the request was aborted')
  ) {
    return true
  }
  return false
}

/**
 * Formata um erro do PocketBase ou genérico de forma amigável para exibição em toasts ou alertas.
 */
export function formatPbError(
  error: unknown,
  fallbackMessage = 'Ocorreu um erro ao processar a operação.',
): string {
  if (!error) return fallbackMessage
  const fieldErrors = extractFieldErrors(error)
  const fieldMessages = Object.entries(fieldErrors).map(([field, msg]) => `${field}: ${msg}`)
  if (fieldMessages.length > 0) {
    return fieldMessages.join('; ')
  }
  return getErrorMessage(error) || fallbackMessage
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
