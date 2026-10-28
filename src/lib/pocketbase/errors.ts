import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

export function isAuthSessionError(error: unknown): boolean {
  if (error instanceof ClientResponseError) {
    return error.status === 401 || error.status === 403
  }
  if (error && typeof error === 'object') {
    const err = error as { status?: number; code?: number; message?: string }
    if (err.status === 401 || err.status === 403 || err.code === 401 || err.code === 403) {
      return true
    }
    const msg = (err.message || '').toLowerCase()
    return (
      msg.includes('token') &&
      (msg.includes('expired') || msg.includes('invalid') || msg.includes('unauthorized'))
    )
  }
  return false
}

export function isAbortError(error: unknown): boolean {
  if (!error) return false
  if (error instanceof ClientResponseError) {
    return error.isAbort || error.status === 0
  }
  if (error && typeof error === 'object') {
    const err = error as { name?: string; message?: string; isAbort?: boolean }
    if (err.isAbort) return true
    if (err.name === 'AbortError') return true
    if (err.message && err.message.toLowerCase().includes('autocancelled')) return true
  }
  return false
}

export function formatPbError(
  error: unknown,
  fallbackMessage = 'Ocorreu um erro ao processar a requisição.',
): string {
  if (!error) return fallbackMessage
  if (error instanceof ClientResponseError) {
    const fieldErrors = extractFieldErrors(error)
    const msgs = Object.values(fieldErrors)
    if (msgs.length > 0) return msgs.join(' ')
    return error.message || fallbackMessage
  }
  if (error instanceof Error) {
    return error.message || fallbackMessage
  }
  if (typeof error === 'string') return error
  return fallbackMessage
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
