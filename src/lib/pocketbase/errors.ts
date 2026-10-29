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

export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false
  if (error instanceof ClientResponseError) {
    return error.status === 401 || error.status === 403
  }
  if (typeof error === 'object' && error !== null) {
    const errObj = error as Record<string, unknown>
    if (errObj.status === 401 || errObj.status === 403) return true
    const msg = String(errObj.message || '').toLowerCase()
    return (
      msg.includes('authenticate') ||
      msg.includes('token') ||
      msg.includes('session expired') ||
      msg.includes('unauthorized') ||
      msg.includes('forbidden')
    )
  }
  return false
}

export function isAbortError(error: unknown): boolean {
  if (!error) return false
  if (error instanceof ClientResponseError) {
    return error.isAbort === true || error.status === 0
  }
  if (typeof error === 'object' && error !== null) {
    const errObj = error as Record<string, unknown>
    return (
      errObj.isAbort === true ||
      errObj.name === 'AbortError' ||
      String(errObj.message || '').includes('autocancelled')
    )
  }
  return false
}

export function formatPbError(error: unknown, fallback: string = 'Erro inesperado'): string {
  if (!error) return fallback
  const msg = getErrorMessage(error)
  return msg && msg !== 'An unexpected error occurred.' ? msg : fallback
}
