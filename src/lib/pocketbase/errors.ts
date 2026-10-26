import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

export function isAuthSessionError(err: unknown): boolean {
  if (!err) return false

  // Se já for um ClientResponseError ou objeto com status HTTP
  const anyErr = err as Record<string, unknown>
  const status =
    (anyErr.status as number | undefined) ??
    ((anyErr.response as Record<string, unknown>)?.status as number | undefined) ??
    (anyErr.statusCode as number | undefined)

  if (status === 401 || status === 403) {
    return true
  }

  // Verifica mensagens conhecidas de autenticação ou token expirado
  const msg =
    (typeof anyErr.message === 'string' ? anyErr.message : '') ||
    (typeof anyErr.error === 'string' ? anyErr.error : '')
  const msgLower = msg.toLowerCase()

  if (
    msgLower.includes('token is expired') ||
    msgLower.includes('failed to authenticate') ||
    msgLower.includes('login expirou') ||
    msgLower.includes('sessão expirada') ||
    msgLower.includes('sessao expirada') ||
    msgLower.includes('token expired') ||
    msgLower.includes('invalid token')
  ) {
    return true
  }

  return false
}

export function isAbortError(err: unknown): boolean {
  if (!err) return false
  const anyErr = err as Record<string, unknown>
  if (anyErr.isAbort === true) return true
  if (anyErr.name === 'AbortError') return true
  const msg = typeof anyErr.message === 'string' ? anyErr.message.toLowerCase() : ''
  return (
    msg.includes('the request was autocancelled') ||
    msg.includes('autocancelled') ||
    msg.includes('aborted')
  )
}

export function formatPbError(err: unknown): string {
  return getErrorMessage(err)
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
