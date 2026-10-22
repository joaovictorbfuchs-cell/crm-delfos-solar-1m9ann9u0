import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

/**
 * Identifica erros de sessão expirada / não autorizada / token inválido (401 / 403).
 */
export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false
  if (typeof error === 'object') {
    const errObj = error as Record<string, unknown>
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
    const msg = typeof errObj.message === 'string' ? errObj.message.toLowerCase() : ''
    if (
      msg.includes('token is expired') ||
      msg.includes('token expired') ||
      msg.includes('sessão expirada') ||
      msg.includes('sessao expirada') ||
      msg.includes('login expirou') ||
      msg.includes('failed to authenticate') ||
      msg.includes('token is invalid')
    ) {
      return true
    }
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    return (
      msg.includes('token is expired') ||
      msg.includes('token expired') ||
      msg.includes('sessão expirada') ||
      msg.includes('sessao expirada') ||
      msg.includes('login expirou') ||
      msg.includes('failed to authenticate') ||
      msg.includes('token is invalid')
    )
  }
  return false
}

/**
 * Identifica se uma requisição foi abortada (ex.: autocancel do PocketBase ou AbortController).
 */
export function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const err = error as Record<string, unknown>
  if (err.isAbort === true) return true
  if (err.name === 'AbortError') return true
  if (
    typeof err.message === 'string' &&
    err.message.toLowerCase().includes('the request was autocancelled')
  ) {
    return true
  }
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
 * Formata um erro do PocketBase em mensagem legível para exibição ao usuário.
 */
export function formatPbError(
  error: unknown,
  defaultMessage = 'Ocorreu um erro inesperado.',
): string {
  if (!error) return defaultMessage
  if (isAbortError(error)) return 'Operação cancelada.'
  if (isAuthSessionError(error)) return 'Sua sessão expirou. Faça login novamente.'
  return getErrorMessage(error) || defaultMessage
}
