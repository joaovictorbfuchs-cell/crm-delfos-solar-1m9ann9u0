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

  if (typeof err === 'object') {
    const errorObj = err as Record<string, unknown>
    const status = errorObj.status ?? errorObj.statusCode
    if (status === 401 || status === 403) {
      return true
    }

    const message = String(errorObj.message || errorObj.error || '').toLowerCase()
    if (
      message.includes('token is expired') ||
      message.includes('token expired') ||
      message.includes('failed to authenticate') ||
      message.includes('the request requires valid user authorization') ||
      message.includes('unauthorized') ||
      message.includes('forbidden')
    ) {
      return true
    }
  }

  if (err instanceof ClientResponseError) {
    if (err.status === 401 || err.status === 403) {
      return true
    }
  }

  return false
}
