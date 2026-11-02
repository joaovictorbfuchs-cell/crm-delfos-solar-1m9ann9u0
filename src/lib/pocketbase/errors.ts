import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

/**
 * Identifica se um erro retornado pelo PocketBase ou pela aplicação é de sessão expirada ou não autenticado (401/403).
 */
export function isAuthSessionError(err: unknown): boolean {
  if (!err) return false

  if (err instanceof ClientResponseError) {
    if (err.status === 401 || err.status === 403) return true
  }

  if (typeof err === 'object' && err !== null) {
    const anyErr = err as Record<string, any>
    const status = anyErr.status ?? anyErr.statusCode ?? anyErr.response?.status
    if (status === 401 || status === 403) return true

    const msg = String(anyErr.message || anyErr.data?.message || '').toLowerCase()
    if (
      msg.includes('token is expired') ||
      msg.includes('failed to authenticate') ||
      msg.includes('sessão expirada') ||
      msg.includes('sessao expirada') ||
      msg.includes('login expirou') ||
      msg.includes('the request requires valid user authorization') ||
      msg.includes('token inválido') ||
      msg.includes('token invalido')
    ) {
      return true
    }
  }

  return false
}

/**
 * Identifica se um erro foi disparado pelo autocancelling do PocketBase ou AbortController.
 */
export function isAbortError(err: unknown): boolean {
  if (!err) return false
  if (err instanceof ClientResponseError) {
    return err.isAbort || Boolean(err.originalError?.name === 'AbortError')
  }
  if (typeof err === 'object' && err !== null) {
    const anyErr = err as Record<string, any>
    if (anyErr.isAbort || anyErr.name === 'AbortError') return true
    const msg = String(anyErr.message || '').toLowerCase()
    if (msg.includes('the request was autocancelled') || msg.includes('the request was aborted')) {
      return true
    }
  }
  return false
}

/**
 * Formata um erro do PocketBase para exibição amigável ao usuário.
 */
export function formatPbError(
  error: unknown,
  defaultMessage = 'Ocorreu um erro ao processar a requisição.',
): string {
  if (!error) return defaultMessage
  if (error instanceof ClientResponseError) {
    const fieldErrors = extractFieldErrors(error)
    const errorList = Object.entries(fieldErrors).map(([campo, msg]) => `${campo}: ${msg}`)
    if (errorList.length > 0) {
      return errorList.join(' | ')
    }
    return error.message || defaultMessage
  }
  if (error instanceof Error) {
    return error.message || defaultMessage
  }
  return defaultMessage
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
