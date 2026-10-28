import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

/**
 * Identifica se um erro retornado pelo PocketBase decorre de sessão/token expirado, inválido
 * ou de falha de autenticação (HTTP 401 ou 403).
 */
export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false

  // Se for cancelamento explícito / abort, não é erro de sessão
  if (isAbortError(error)) return false

  // PocketBase ClientResponseError ou objeto equivalente com status/response.status
  const status =
    (error as { status?: number })?.status ??
    (error as { response?: { status?: number } })?.response?.status

  if (status === 401 || status === 403) {
    return true
  }

  // Análise da mensagem de erro
  const message =
    (error as { message?: string })?.message ||
    (error as { response?: { message?: string } })?.response?.message ||
    ''

  const lowerMsg = String(message).toLowerCase()
  if (
    lowerMsg.includes('failed to authenticate') ||
    lowerMsg.includes('token is expired') ||
    lowerMsg.includes('token is invalid') ||
    lowerMsg.includes('sessão expirada') ||
    lowerMsg.includes('login expirou') ||
    lowerMsg.includes('invalid auth token') ||
    lowerMsg.includes('unauthorized') ||
    lowerMsg.includes('forbidden')
  ) {
    return true
  }

  return false
}

/**
 * Identifica se a requisição foi abortada/autocancelada pelo SDK do PocketBase
 */
export function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const err = error as { isAbort?: boolean; name?: string; message?: string }
  if (err.isAbort === true) return true
  if (err.name === 'AbortError') return true
  if (
    typeof err.message === 'string' &&
    err.message.toLowerCase().includes('the request was aborted')
  ) {
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

/**
 * Formata um erro do PocketBase em mensagem legível para o usuário
 */
export function formatPbError(
  error: unknown,
  fallbackMessage = 'Ocorreu um erro na requisição',
): string {
  if (!error) return fallbackMessage
  const err = error as any
  if (isAbortError(err)) return 'A requisição foi cancelada.'
  if (isAuthSessionError(err)) return 'Sua sessão expirou ou é inválida. Faça login novamente.'
  const fieldErrors = extractFieldErrors(err)
  const fieldKeys = Object.keys(fieldErrors)
  if (fieldKeys.length > 0) {
    return fieldKeys.map((k) => `${k}: ${fieldErrors[k]}`).join('; ')
  }
  return getErrorMessage(err) || fallbackMessage
}
