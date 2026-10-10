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

export function isAuthSessionError(err: unknown): boolean {
  if (!err) return false
  const status = (err as any)?.status || (err as any)?.statusCode
  if (status === 401 || status === 403) return true
  const msg = String((err as any)?.message || '').toLowerCase()
  if (
    msg.includes('token is expired') ||
    msg.includes('invalid token') ||
    msg.includes('failed to authenticate') ||
    msg.includes('unauthorized') ||
    msg.includes('forbidden') ||
    msg.includes('token expired')
  ) {
    return true
  }
  return false
}
