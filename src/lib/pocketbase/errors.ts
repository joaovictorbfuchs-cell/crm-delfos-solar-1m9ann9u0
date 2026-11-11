import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false
  if (typeof error === 'object') {
    const err = error as Record<string, unknown>
    const status =
      err.status ?? (err.response as Record<string, unknown> | undefined)?.status ?? err.statusCode
    if (status === 401 || status === 403) return true
    const message = typeof err.message === 'string' ? err.message : ''
    if (
      /token.*expired|invalid.*token|sess[aã]o.*expirad|login.*expirou|failed to authenticate/i.test(
        message,
      )
    ) {
      return true
    }
  }
  return false
}

export function isAbortError(error: unknown): boolean {
  if (!error) return false
  if (typeof error === 'object') {
    const err = error as Record<string, unknown>
    if (err.isAbort === true) return true
    if (err.name === 'AbortError') return true
  }
  return false
}

export function formatPbError(error: unknown): string {
  if (error instanceof ClientResponseError) {
    const fieldErrors = extractFieldErrors(error)
    const msgs = Object.entries(fieldErrors).map(([k, v]) => `${k}: ${v}`)
    if (msgs.length > 0) return msgs.join('; ')
    return error.message || 'Erro ao comunicar com o servidor.'
  }
  return error instanceof Error ? error.message : 'Erro inesperado.'
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
