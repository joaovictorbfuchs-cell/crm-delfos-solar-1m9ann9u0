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

export function formatPbError(error: unknown): string {
  return getErrorMessage(error)
}

export function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const err = error as Record<string, unknown>
  if (err.isAbort === true) return true
  if (err.name === 'AbortError') return true
  const msg = typeof err.message === 'string' ? err.message : ''
  return msg.toLowerCase().includes('aborted') || msg.toLowerCase().includes('autocancelled')
}

export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false
  if (typeof error !== 'object') return false

  // Se foi abortada/cancelada, não é expiração de sessão
  if (isAbortError(error)) return false

  const err = error as Record<string, unknown>
  const status = typeof err.status === 'number' ? err.status : undefined
  const statusCode = typeof err.statusCode === 'number' ? err.statusCode : undefined
  const response = err.response as Record<string, unknown> | undefined
  const responseStatus =
    response && typeof response.status === 'number' ? response.status : undefined

  if (status === 401 || status === 403) return true
  if (statusCode === 401 || statusCode === 403) return true
  if (responseStatus === 401 || responseStatus === 403) return true

  const message = typeof err.message === 'string' ? err.message.toLowerCase() : ''
  if (
    message.includes('token is expired') ||
    message.includes('login expirou') ||
    message.includes('sessão expirada') ||
    message.includes('failed to authenticate') ||
    message.includes('unauthorized') ||
    message.includes('the request requires valid user authorization')
  ) {
    return true
  }

  return false
}
