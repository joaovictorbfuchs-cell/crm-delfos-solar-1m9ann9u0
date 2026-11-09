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
 * Identifica erros de sessão/autenticação expirada ou inválida (status 401 ou 403, ou mensagens textuais correlatas).
 */
export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false
  if (typeof error === 'object') {
    const errObj = error as Record<string, unknown>
    if (errObj.isAbort === true) return false
    if (errObj.status === 401 || errObj.status === 403) return true
    if (errObj.statusCode === 401 || errObj.statusCode === 403) return true
    if (
      errObj.response &&
      typeof errObj.response === 'object' &&
      ((errObj.response as Record<string, unknown>).status === 401 ||
        (errObj.response as Record<string, unknown>).status === 403)
    ) {
      return true
    }
  }

  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message: unknown }).message)
        : typeof error === 'string'
          ? error
          : ''

  if (!message) return false

  const lower = message.toLowerCase()
  return (
    lower.includes('token is expired') ||
    lower.includes('sessão expirada') ||
    lower.includes('sessao expirada') ||
    lower.includes('login expirou') ||
    lower.includes('failed to authenticate') ||
    lower.includes('the request was forbidden') ||
    lower.includes('the request requires valid user authorization')
  )
}

/**
 * Identifica se a requisição foi abortada (cancelada pelo autocancellation ou AbortController).
 */
export function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const errObj = error as Record<string, unknown>
  if (errObj.isAbort === true) return true
  if (errObj.name === 'AbortError') return true
  if (
    typeof errObj.message === 'string' &&
    errObj.message.toLowerCase().includes('autocancelled')
  ) {
    return true
  }
  return false
}

/**
 * Formata um erro retornado pelo PocketBase de forma amigável para exibição ao usuário.
 */
export function formatPbError(
  error: unknown,
  fallbackMessage = 'Ocorreu um erro na operação.',
): string {
  if (!error) return fallbackMessage
  if (isAbortError(error)) return 'A requisição foi cancelada.'
  if (isAuthSessionError(error)) return 'Sua sessão expirou. Por favor, faça login novamente.'
  const extracted = getErrorMessage(error)
  if (extracted && extracted !== 'An unexpected error occurred.') {
    return extracted
  }
  if (error instanceof Error && error.message) {
    return error.message
  }
  return fallbackMessage
}
