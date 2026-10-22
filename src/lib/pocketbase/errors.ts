import { ClientResponseError } from 'pocketbase'

export function isAuthSessionError(err: unknown): boolean {
  if (!err) return false
  if (typeof err === 'object') {
    const obj = err as Record<string, unknown>
    if (
      obj.status === 401 ||
      obj.status === 403 ||
      obj.statusCode === 401 ||
      obj.statusCode === 403
    ) {
      return true
    }
    const response = obj.response as Record<string, unknown> | undefined
    if (response && (response.status === 401 || response.status === 403)) {
      return true
    }
  }
  const msg =
    err instanceof Error
      ? err.message
      : typeof err === 'object' && err !== null && 'message' in err
        ? String((err as { message: unknown }).message)
        : String(err)
  const lower = msg.toLowerCase()
  return (
    lower.includes('token is expired') ||
    lower.includes('login expirou') ||
    lower.includes('sessão expirada') ||
    lower.includes('failed to authenticate') ||
    lower.includes('failed to refresh')
  )
}

export function isAbortError(err: unknown): boolean {
  if (!err) return false
  if (typeof err === 'object') {
    const obj = err as Record<string, unknown>
    if (obj.isAbort === true) return true
    if (obj.name === 'AbortError') return true
  }
  return false
}

export function formatPbError(error: unknown, fallback = 'Erro na operação'): string {
  const msg = getErrorMessage(error)
  return msg && msg !== 'An unexpected error occurred.' ? msg : fallback
}

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
