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
  const message =
    err instanceof Error
      ? err.message
      : typeof err === 'object' && err !== null && 'message' in err
        ? String((err as { message: unknown }).message)
        : String(err)
  const lower = message.toLowerCase()
  return (
    lower.includes('token expired') ||
    lower.includes('token is expired') ||
    lower.includes('session expired') ||
    lower.includes('sessão expirada') ||
    lower.includes('failed to authenticate') ||
    lower.includes('the request requires valid record authorization') ||
    lower.includes('the request requires valid admin authorization')
  )
}
