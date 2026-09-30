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

export function isAuthSessionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const err = error as {
    status?: number
    statusCode?: number
    message?: string
    response?: { code?: number; message?: string }
  }
  if (
    err.status === 401 ||
    err.status === 403 ||
    err.statusCode === 401 ||
    err.statusCode === 403
  ) {
    return true
  }
  if (err.response?.code === 401 || err.response?.code === 403) {
    return true
  }
  const msg = (err.message || err.response?.message || '').toLowerCase()
  if (
    msg.includes('token is expired') ||
    msg.includes('token is invalid') ||
    msg.includes('failed to authenticate') ||
    msg.includes('the request requires higher permissions')
  ) {
    return true
  }
  return false
}

export function getErrorMessage(error: unknown): string {
  if (!(error instanceof ClientResponseError)) {
    return error instanceof Error ? error.message : 'An unexpected error occurred.'
  }
  const msgs = Object.values(extractFieldErrors(error))
  return msgs.length > 0 ? msgs.join(' ') : error.message || 'An unexpected error occurred.'
}
