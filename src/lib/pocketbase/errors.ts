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
  if (typeof error === 'object' && error !== null) {
    const obj = error as Record<string, unknown>
    if (
      obj.status === 401 ||
      obj.status === 403 ||
      obj.statusCode === 401 ||
      obj.statusCode === 403
    ) {
      return true
    }
    if (typeof obj.message === 'string') {
      const msg = obj.message.toLowerCase()
      if (
        msg.includes('token is expired') ||
        msg.includes('token expired') ||
        msg.includes('failed to authenticate') ||
        msg.includes('unauthorized') ||
        msg.includes('forbidden') ||
        msg.includes('something went wrong while processing your request')
      ) {
        return true
      }
    }
  }
  if (error instanceof ClientResponseError) {
    return error.status === 401 || error.status === 403
  }
  const errStr = String(error).toLowerCase()
  return (
    errStr.includes('something went wrong while processing your request') ||
    errStr.includes('failed to authenticate') ||
    errStr.includes('token expired') ||
    errStr.includes('unauthorized') ||
    errStr.includes('forbidden')
  )
}
