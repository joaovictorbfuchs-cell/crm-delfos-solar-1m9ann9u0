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
  const status = (error as { status?: number })?.status
  if (status === 401 || status === 403) return true
  const msg = String((error as { message?: string })?.message || '').toLowerCase()
  return (
    msg.includes('token') &&
    (msg.includes('expired') || msg.includes('invalid') || msg.includes('revoked'))
  )
}

export function isAbortError(error: unknown): boolean {
  if (!error) return false
  if (error instanceof ClientResponseError) {
    return error.isAbort || error.status === 0
  }
  const err = error as { isAbort?: boolean; name?: string; status?: number; message?: string }
  return (
    Boolean(err.isAbort) ||
    err.name === 'AbortError' ||
    err.status === 0 ||
    String(err.message || '')
      .toLowerCase()
      .includes('autocancelled') ||
    String(err.message || '')
      .toLowerCase()
      .includes('abort')
  )
}

export function formatPbError(
  error: unknown,
  fallbackMessage = 'Ocorreu um erro inesperado.',
): string {
  if (!error) return fallbackMessage
  const msg = getErrorMessage(error)
  return msg && msg !== 'An unexpected error occurred.' ? msg : fallbackMessage
}
