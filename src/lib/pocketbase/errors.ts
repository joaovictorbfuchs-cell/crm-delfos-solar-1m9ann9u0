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
  if (err instanceof ClientResponseError) {
    if (err.status === 401 || err.status === 403) return true
  }
  if (typeof err === 'object') {
    const obj = err as Record<string, unknown>
    if (obj.status === 401 || obj.status === 403) return true
    if (obj.statusCode === 401 || obj.statusCode === 403) return true
    if (typeof obj.message === 'string') {
      const msg = obj.message.toLowerCase()
      if (
        msg.includes('token is expired') ||
        msg.includes('token expired') ||
        msg.includes('invalid token') ||
        msg.includes('missing or invalid token') ||
        msg.includes('unauthorized') ||
        msg.includes('the request requires valid record authorization token')
      ) {
        return true
      }
    }
  }
  return false
}
