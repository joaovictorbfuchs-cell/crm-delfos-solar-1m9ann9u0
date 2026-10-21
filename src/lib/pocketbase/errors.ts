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

export function isAbortError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const anyErr = err as { name?: string; isAbort?: boolean; message?: string }
  return (
    anyErr.name === 'AbortError' ||
    anyErr.isAbort === true ||
    (typeof anyErr.message === 'string' && anyErr.message.toLowerCase().includes('aborted'))
  )
}

export function isAuthSessionError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const anyErr = err as { status?: number; message?: string }
  // Não tratar requisição abortada como erro de sessão
  if (isAbortError(err)) return false
  if (anyErr.status === 401 || anyErr.status === 403) return true
  const msg = (anyErr.message || '').toLowerCase()
  return (
    msg.includes('auth') ||
    msg.includes('token') ||
    msg.includes('unauthorized') ||
    msg.includes('forbidden')
  )
}

export function formatPbError(error: unknown): string {
  return getErrorMessage(error)
}
