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
  if (typeof error === 'object') {
    const err = error as Record<string, unknown>
    const status = err.status ?? err.statusCode
    if (status === 401 || status === 403) return true
    const message = typeof err.message === 'string' ? err.message.toLowerCase() : ''
    if (
      message.includes('token') &&
      (message.includes('expired') || message.includes('invalid') || message.includes('missing'))
    ) {
      return true
    }
    if (
      message.includes('session expired') ||
      message.includes('sessão expirada') ||
      message.includes('unauthorized')
    ) {
      return true
    }
    if (err.response && typeof err.response === 'object') {
      const resp = err.response as Record<string, unknown>
      const respStatus = resp.status ?? resp.code
      if (respStatus === 401 || respStatus === 403) return true
    }
  }
  return false
}
