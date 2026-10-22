import { ClientResponseError } from 'pocketbase'

export function isAuthSessionError(err: unknown): boolean {
  if (!err) return false
  if (typeof err === 'object') {
    const anyErr = err as Record<string, unknown>
    if (anyErr.status === 401 || anyErr.status === 403) return true
    if (anyErr.response && typeof anyErr.response === 'object') {
      const res = anyErr.response as Record<string, unknown>
      if (res.status === 401 || res.status === 403) return true
    }
    if (typeof anyErr.message === 'string') {
      const msg = anyErr.message.toLowerCase()
      if (
        msg.includes('token is expired') ||
        msg.includes('invalid token') ||
        msg.includes('failed to authenticate') ||
        msg.includes('sessão expirada') ||
        msg.includes('login expirou')
      ) {
        return true
      }
    }
  }
  return false
}

export function isAbortError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const anyErr = err as Record<string, unknown>
  if (anyErr.isAbort === true) return true
  if (anyErr.name === 'AbortError') return true
  if (
    typeof anyErr.message === 'string' &&
    anyErr.message.toLowerCase().includes('autocancelled')
  ) {
    return true
  }
  return false
}

export function formatPbError(error: unknown): string {
  return getErrorMessage(error)
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
