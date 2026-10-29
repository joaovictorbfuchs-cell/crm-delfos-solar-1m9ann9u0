import { ClientResponseError } from 'pocketbase'

export function isAuthSessionError(err: unknown): boolean {
  if (!err) return false
  if (typeof err === 'object' && err !== null) {
    const errorObj = err as Record<string, unknown>
    if (errorObj.status === 401 || errorObj.status === 403) return true
    if (errorObj.response && typeof errorObj.response === 'object') {
      const resp = errorObj.response as Record<string, unknown>
      if (resp.status === 401 || resp.status === 403) return true
    }
  }
  const msg = err instanceof Error ? err.message : String(err)
  const lower = msg.toLowerCase()
  return (
    lower.includes('token is expired') ||
    lower.includes('failed to authenticate') ||
    lower.includes('login expirou') ||
    lower.includes('sessão expirada') ||
    lower.includes('unauthorized')
  )
}

export function isAbortError(err: unknown): boolean {
  if (!err) return false
  if (typeof err === 'object' && err !== null) {
    const errorObj = err as Record<string, unknown>
    if (errorObj.isAbort === true) return true
    if (errorObj.name === 'AbortError') return true
  }
  const msg = err instanceof Error ? err.message : String(err)
  return msg.toLowerCase().includes('the request was aborted')
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
