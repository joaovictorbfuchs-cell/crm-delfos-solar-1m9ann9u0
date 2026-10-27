import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

/**
 * Identifica se um erro retornado pelo PocketBase decorre de sessão expirada,
 * token inválido ou não autorizado (status 401 ou 403).
 */
export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false

  // Verificação de status HTTP direto ou em response.status
  const status =
    (typeof error === 'object' && error !== null && 'status' in error
      ? Number((error as { status?: unknown }).status)
      : undefined) ??
    (typeof error === 'object' && error !== null && 'statusCode' in error
      ? Number((error as { statusCode?: unknown }).statusCode)
      : undefined) ??
    (typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: { status?: unknown } }).response === 'object'
      ? Number((error as { response?: { status?: unknown } }).response?.status)
      : undefined)

  if (status === 401 || status === 403) {
    return true
  }

  // Verificação textual por mensagens típicas de sessão expirada / não autorizada
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message?: unknown }).message)
        : ''

  if (message) {
    const msgLower = message.toLowerCase()
    if (msgLower.includes('the request was aborted') || msgLower.includes('autocancelled')) {
      return false
    }
    if (
      msgLower.includes('token is expired') ||
      msgLower.includes('failed to authenticate') ||
      msgLower.includes('sessão expirada') ||
      msgLower.includes('sessao expirada') ||
      msgLower.includes('login expirou') ||
      msgLower.includes('unauthorized') ||
      msgLower.includes('forbidden')
    ) {
      return true
    }
  }

  return false
}

/**
 * Identifica se uma requisição foi abortada (cancelamento manual ou auto-cancellation do PocketBase).
 */
export function isAbortError(error: unknown): boolean {
  if (!error) return false
  if (typeof error === 'object') {
    if ('isAbort' in error && (error as { isAbort?: unknown }).isAbort === true) {
      return true
    }
    if ('name' in error && (error as { name?: unknown }).name === 'AbortError') {
      return true
    }
    if (
      'message' in error &&
      typeof (error as { message?: unknown }).message === 'string' &&
      String((error as { message?: unknown }).message)
        .toLowerCase()
        .includes('autocancelled')
    ) {
      return true
    }
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
 * Formata um erro do PocketBase para exibição amigável ao usuário.
 */
export function formatPbError(
  error: unknown,
  fallbackMessage = 'Ocorreu um erro inesperado.',
): string {
  if (!error) return fallbackMessage
  const msg = getErrorMessage(error)
  return msg && msg !== 'An unexpected error occurred.' ? msg : fallbackMessage
}
