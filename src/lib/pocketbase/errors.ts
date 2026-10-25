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

export function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const err = error as Record<string, unknown>
  if (err.isAbort === true) return true
  if (err.name === 'AbortError') return true
  if (
    typeof err.message === 'string' &&
    (err.message.includes('autocancelled') || err.message.includes('aborted'))
  ) {
    return true
  }
  return false
}

export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false
  if (isAbortError(error)) return false
  if (typeof error === 'object') {
    const err = error as Record<string, unknown>
    const status = (err.status ??
      err.statusCode ??
      (err.response as Record<string, unknown> | undefined)?.status) as number | undefined
    if (status === 401 || status === 403) return true
    if (typeof err.message === 'string') {
      const msg = err.message.toLowerCase()
      if (
        msg.includes('token is expired') ||
        msg.includes('failed to authenticate') ||
        msg.includes('sessão expirada') ||
        msg.includes('login expirou') ||
        msg.includes('não autenticado')
      ) {
        return true
      }
    }
  }
  return false
}

export function formatPbError(error: unknown, fallback = 'Ocorreu um erro no servidor.'): string {
  if (isAuthSessionError(error)) {
    return 'Sua sessão expirou ou não possui permissão. Faça login novamente.'
  }
  const msg = getErrorMessage(error)
  return msg && msg !== 'An unexpected error occurred.' ? msg : fallback
}
