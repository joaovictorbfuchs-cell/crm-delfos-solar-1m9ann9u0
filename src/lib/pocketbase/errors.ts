import { ClientResponseError } from 'pocketbase'

/**
 * Checks if an error is a PocketBase auth session error (e.g. 401 Unauthorized or 403 Forbidden).
 */
export function isAuthSessionError(err: unknown): boolean {
  if (!err) return false
  if (err instanceof ClientResponseError) {
    return err.status === 401 || err.status === 403
  }
  if (typeof err === 'object' && err !== null) {
    const record = err as Record<string, unknown>
    const status = record.status ?? record.statusCode
    if (status === 401 || status === 403) return true
    const message = String(record.message || '').toLowerCase()
    if (
      message.includes('token is expired') ||
      message.includes('token is invalid') ||
      message.includes('failed to authenticate') ||
      message.includes('the request requires valid user authorization')
    ) {
      return true
    }
  }
  return false
}

/**
 * Extracts a user-friendly error message from a PocketBase or generic error.
 */
export function getErrorMessage(err: unknown, fallback = 'Ocorreu um erro inesperado.'): string {
  if (!err) return fallback
  if (typeof err === 'string') return err
  if (err instanceof ClientResponseError) {
    if (err.data && typeof err.data === 'object' && 'message' in err.data) {
      return String(err.data.message)
    }
    return err.message || fallback
  }
  if (err instanceof Error) {
    return err.message || fallback
  }
  if (typeof err === 'object' && err !== null && 'message' in err) {
    return String((err as { message: unknown }).message) || fallback
  }
  return fallback
}

/**
 * Extracts field-level validation errors from a PocketBase ClientResponseError.
 */
export function extractFieldErrors(err: unknown): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!err || typeof err !== 'object') return errors
  if (err instanceof ClientResponseError && err.data?.data) {
    const data = err.data.data
    for (const [key, val] of Object.entries(data)) {
      if (typeof val === 'object' && val !== null && 'message' in val) {
        errors[key] = String((val as { message: unknown }).message)
      } else if (typeof val === 'string') {
        errors[key] = val
      }
    }
  }
  return errors
}

export default isAuthSessionError
