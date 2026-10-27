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
 * Detecta se um erro retornado pelo PocketBase decorre de sessão inválida/expirada (401 / 403 de autenticação).
 */
export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false
  const err = error as any
  const status = typeof err.status === 'number' ? err.status : undefined
  if (status === 401) return true

  const message = String(err.message || '').toLowerCase()
  if (
    message.includes('the request requires valid user authorization') ||
    message.includes('the request requires valid admin authorization') ||
    message.includes('failed to authenticate') ||
    message.includes('invalid token') ||
    message.includes('token expired') ||
    message.includes('jwt')
  ) {
    return true
  }

  // PocketBase ClientResponseError data message
  const responseMsg = String(err.response?.message || '').toLowerCase()
  if (
    responseMsg.includes('the request requires valid user authorization') ||
    responseMsg.includes('the request requires valid admin authorization') ||
    responseMsg.includes('failed to authenticate') ||
    responseMsg.includes('invalid token') ||
    responseMsg.includes('token expired')
  ) {
    return true
  }

  return false
}

/**
 * Detecta se a requisição foi abortada ou cancelada pelo auto-cancellation do PocketBase.
 */
export function isAbortError(error: unknown): boolean {
  if (!error) return false
  const err = error as any
  if (err.isAbort || err.name === 'AbortError') return true
  const msg = String(err.message || '').toLowerCase()
  return (
    msg.includes('autocancelled') ||
    msg.includes('the request was autocancelled') ||
    msg.includes('abort')
  )
}

/**
 * Formata um erro de requisição do PocketBase para exibição ao usuário.
 */
export function formatPbError(
  error: unknown,
  fallbackMessage = 'Ocorreu um erro inesperado.',
): string {
  if (!error) return fallbackMessage
  if (isAbortError(error)) return 'A requisição foi cancelada.'
  if (isAuthSessionError(error)) return 'Sua sessão expirou. Faça login novamente.'
  return getErrorMessage(error) || fallbackMessage
}
