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

export function isAbortError(error: unknown): boolean {
  if (!error) return false
  if (typeof error === 'object') {
    const err = error as { isAbort?: boolean; name?: string; message?: string }
    if (err.isAbort === true) return true
    if (err.name === 'AbortError' || err.name === 'AutoCancelledError') return true
    if (
      typeof err.message === 'string' &&
      (err.message.includes('autocancelled') || err.message.includes('The request was aborted'))
    ) {
      return true
    }
  }
  return false
}

export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false
  if (typeof error === 'object') {
    const err = error as { status?: number; response?: { status?: number }; message?: string }
    if (err.status === 401 || err.status === 403) return true
    if (err.response?.status === 401 || err.response?.status === 403) return true
    if (typeof err.message === 'string') {
      const msg = err.message.toLowerCase()
      if (
        msg.includes('token is expired') ||
        msg.includes('token expired') ||
        msg.includes('login expirou') ||
        msg.includes('sessão expirada') ||
        msg.includes('failed to authenticate') ||
        msg.includes('invalid token')
      ) {
        return true
      }
    }
  }
  return false
}

export function formatPbError(
  error: unknown,
  fallbackMessage = 'Ocorreu um erro na requisição.',
): string {
  if (!error) return fallbackMessage
  if (error instanceof ClientResponseError) {
    const fieldErrors = extractFieldErrors(error)
    const msgs = Object.values(fieldErrors)
    if (msgs.length > 0) return msgs.join(' ')
    if (error.message) return error.message
  }
  if (error instanceof Error && error.message) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return fallbackMessage
}
