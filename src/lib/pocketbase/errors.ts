import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false
  if (typeof error === 'object') {
    const err = error as { status?: number; response?: { status?: number }; statusCode?: number }
    if (err.status === 401 || err.status === 403) return true
    if (err.response?.status === 401 || err.response?.status === 403) return true
    if (err.statusCode === 401 || err.statusCode === 403) return true
  }
  if (error instanceof Error) {
    const msg = error.message
    if (
      msg.includes('Token is expired') ||
      msg.includes('The request requires valid authentication') ||
      msg.includes('Sessão expirada') ||
      msg.includes('Login expirou') ||
      msg.includes('Failed to authenticate')
    ) {
      return true
    }
  }
  return false
}

export function isAbortError(error: unknown): boolean {
  if (!error) return false
  if (error instanceof Error && error.name === 'AbortError') return true
  if (typeof error === 'object' && (error as { isAbort?: boolean }).isAbort === true) return true
  return false
}

export function formatPbError(error: unknown): string {
  if (error instanceof ClientResponseError) {
    return getErrorMessage(error)
  }
  if (error instanceof Error) return error.message
  return String(error)
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
