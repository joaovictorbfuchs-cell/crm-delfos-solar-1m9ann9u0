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

export function isAuthSessionError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const anyErr = err as { status?: number; response?: { message?: string } }
  return anyErr.status === 401 || anyErr.status === 403
}

export function formatPbError(err: unknown, fallback = 'Erro na operação'): string {
  if (!err) return fallback
  if (typeof err === 'string') return err
  return getErrorMessage(err) || fallback
}

export function isAbortError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const anyErr = err as { isAbort?: boolean; name?: string; message?: string }
  return Boolean(
    anyErr.isAbort ||
    anyErr.name === 'AbortError' ||
    (typeof anyErr.message === 'string' && anyErr.message.toLowerCase().includes('abort')),
  )
}
