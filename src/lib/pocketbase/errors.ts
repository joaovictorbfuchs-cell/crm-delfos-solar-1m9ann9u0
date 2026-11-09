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
 * Detecta se um erro é de cancelamento/abort de requisição PocketBase ou DOM.
 */
export function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const err = error as Record<string, unknown>
  if (err.isAbort === true) return true
  if (err.name === 'AbortError') return true
  if (typeof err.message === 'string' && /abort/i.test(err.message)) return true
  return false
}

/**
 * Identifica se um erro recebido do PocketBase ou de requisição HTTP
 * corresponde a sessão/token expirado ou não autorizado (status 401 ou 403).
 *
 * Rejeita explicitamente erros nulos, indefinidos, aborts ou erros genéricos de rede.
 */
export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false

  // Se for abort/cancelamento de requisição, não é expiração de sessão
  if (isAbortError(error)) return false

  // Verificação direta em instâncias de ClientResponseError ou objetos com status
  if (typeof error === 'object') {
    const err = error as Record<string, unknown>
    const status =
      typeof err.status === 'number'
        ? err.status
        : typeof err.statusCode === 'number'
          ? err.statusCode
          : typeof (err.response as Record<string, unknown> | undefined)?.status === 'number'
            ? (err.response as { status: number }).status
            : 0

    if (status === 401 || status === 403) {
      return true
    }

    // Checagem de mensagens internas
    const message =
      typeof err.message === 'string'
        ? err.message
        : typeof (err.response as Record<string, unknown> | undefined)?.message === 'string'
          ? (err.response as { message: string }).message
          : ''

    if (message) {
      if (/token is expired or invalid/i.test(message)) return true
      if (/sessão expirada/i.test(message)) return true
      if (/login expirou/i.test(message)) return true
      if (/failed to authenticate/i.test(message)) return true
      if (/token is expired/i.test(message)) return true
    }
  }

  if (error instanceof Error) {
    const msg = error.message || ''
    if (/token is expired or invalid/i.test(msg)) return true
    if (/sessão expirada/i.test(msg)) return true
    if (/login expirou/i.test(msg)) return true
    if (/failed to authenticate/i.test(msg)) return true
    if (/token is expired/i.test(msg)) return true
  }

  return false
}

/**
 * Formata um erro do PocketBase para exibição amigável ao usuário.
 */
export function formatPbError(
  error: unknown,
  fallbackMessage = 'Ocorreu um erro inesperado',
): string {
  if (!error) return fallbackMessage
  const fieldErrors = extractFieldErrors(error)
  const fieldMsgs = Object.values(fieldErrors)
  if (fieldMsgs.length > 0) {
    return fieldMsgs.join(' ')
  }
  return getErrorMessage(error) || fallbackMessage
}
