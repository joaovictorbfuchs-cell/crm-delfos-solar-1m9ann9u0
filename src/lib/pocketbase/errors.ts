import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

export function isAuthSessionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const err = error as {
    status?: number
    response?: { code?: number; message?: string }
    message?: string
  }
  if (err.status === 401 || err.status === 403) return true
  if (err.response?.code === 401 || err.response?.code === 403) return true
  const msg = (err.message || '').toLowerCase()
  if (
    msg.includes('token') &&
    (msg.includes('expired') || msg.includes('invalid') || msg.includes('revoked'))
  ) {
    return true
  }
  return false
}

export function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const err = error as { isAbort?: boolean; name?: string; message?: string }
  if (err.isAbort === true) return true
  if (err.name === 'AbortError') return true
  const msg = (err.message || '').toLowerCase()
  return msg.includes('autocancelled') || msg.includes('the request was aborted')
}

export function formatPbError(error: unknown, fallback = 'Erro na operação'): string {
  if (!error) return fallback
  const fieldErrs = extractFieldErrors(error)
  const fieldMsgs = Object.entries(fieldErrs).map(([f, m]) => `${f}: ${m}`)
  if (fieldMsgs.length > 0) return fieldMsgs.join(', ')
  return getErrorMessage(error) || fallback
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
