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

export function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  if ('isAbort' in error && Boolean((error as { isAbort: unknown }).isAbort)) return true
  if ('name' in error && (error as { name: unknown }).name === 'AbortError') return true
  return false
}

export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false
  if (isAbortError(error)) return false

  if (typeof error === 'object') {
    const errObj = error as Record<string, unknown>
    if (errObj.status === 401 || errObj.status === 403) return true
    if (errObj.statusCode === 401 || errObj.statusCode === 403) return true
    if (
      errObj.response &&
      typeof errObj.response === 'object' &&
      ((errObj.response as Record<string, unknown>).status === 401 ||
        (errObj.response as Record<string, unknown>).status === 403)
    ) {
      return true
    }
  }

  const message = error instanceof Error ? error.message : String(error)
  const lower = message.toLowerCase()
  return (
    lower.includes('token is expired') ||
    lower.includes('sessão expirada') ||
    lower.includes('login expirou') ||
    lower.includes('failed to authenticate') ||
    lower.includes('the request requires valid record authorization token')
  )
}

export function formatPbError(error: unknown): string {
  return getErrorMessage(error)
}
