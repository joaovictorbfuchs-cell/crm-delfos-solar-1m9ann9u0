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
    const msg = typeof errObj.message === 'string' ? errObj.message.toLowerCase() : ''
    if (
      msg.includes('token') &&
      (msg.includes('expired') || msg.includes('invalid') || msg.includes('missing'))
    ) {
      return true
    }
    if (msg.includes('failed to authenticate') || msg.includes('requires valid request auth')) {
      return true
    }
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
