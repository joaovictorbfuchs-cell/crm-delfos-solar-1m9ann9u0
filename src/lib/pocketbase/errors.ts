import { ClientResponseError } from 'pocketbase'

export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false
  if (error instanceof ClientResponseError) {
    return error.status === 401 || error.status === 403
  }
  const status = (error as { status?: number })?.status
  if (status === 401 || status === 403) return true
  const msg = (error as { message?: string })?.message || ''
  return /auth|unauthorized|forbidden|jwt|token|session/i.test(msg)
}

export function isAbortError(error: unknown): boolean {
  if (!error) return false
  if (error instanceof DOMException && error.name === 'AbortError') return true
  if (error instanceof ClientResponseError && error.isAbort) return true
  const msg = (error as { message?: string })?.message || ''
  return /abort|autocancel/i.test(msg)
}

export function formatPbError(
  error: unknown,
  fallback = 'Erro na operação do banco de dados.',
): string {
  if (!error) return fallback
  if (error instanceof ClientResponseError) {
    const fieldErrors = extractFieldErrors(error)
    const fieldMsgs = Object.entries(fieldErrors).map(([f, m]) => `${f}: ${m}`)
    if (fieldMsgs.length > 0) return fieldMsgs.join('; ')
    return error.message || fallback
  }
  if (error instanceof Error) return error.message
  return String(error)
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
