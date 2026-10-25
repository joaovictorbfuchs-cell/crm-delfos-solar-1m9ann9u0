import { ClientResponseError } from 'pocketbase'

export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false
  if (typeof error === 'object') {
    const errObj = error as { status?: number; response?: { status?: number }; message?: string }
    const status = errObj.status ?? errObj.response?.status
    if (status === 401 || status === 403) return true
    const msg = String(errObj.message || '').toLowerCase()
    if (
      msg.includes('token') &&
      (msg.includes('expired') || msg.includes('invalid') || msg.includes('missing'))
    ) {
      return true
    }
    if (msg.includes('failed to authenticate') || msg.includes('unauthorized')) {
      return true
    }
  }
  return false
}

export function isAbortError(error: unknown): boolean {
  if (!error) return false
  if (typeof error === 'object') {
    const errObj = error as { isAbort?: boolean; name?: string; message?: string }
    if (errObj.isAbort) return true
    if (errObj.name === 'AbortError') return true
    if (
      String(errObj.message || '')
        .toLowerCase()
        .includes('autocancelled')
    )
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
