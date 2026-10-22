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
    const errObj = error as Record<string, unknown>
    if (
      errObj.status === 401 ||
      errObj.status === 403 ||
      errObj.statusCode === 401 ||
      errObj.statusCode === 403
    ) {
      return true
    }
    const resp = errObj.response as Record<string, unknown> | undefined
    if (
      resp &&
      (resp.status === 401 ||
        resp.status === 403 ||
        resp.statusCode === 401 ||
        resp.statusCode === 403)
    ) {
      return true
    }
    const msg = String(errObj.message || '')
    if (
      msg.includes('Token is expired') ||
      msg.includes('Failed to authenticate') ||
      msg.includes('Login expirou') ||
      msg.includes('Sessão expirada')
    ) {
      return true
    }
  }
  return false
}

export function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const err = error as Record<string, unknown>
  return Boolean(
    err.isAbort ||
    err.name === 'AbortError' ||
    (typeof err.message === 'string' && err.message.toLowerCase().includes('abort')),
  )
}

export function formatPbError(error: unknown): string {
  return getErrorMessage(error)
}
