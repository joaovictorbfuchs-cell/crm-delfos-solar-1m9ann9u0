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

  // Status checks on various error shapes
  if (typeof err === 'object') {
    const errObj = err as Record<string, unknown>
    const status =
      errObj.status ??
      errObj.statusCode ??
      (errObj.response as Record<string, unknown> | undefined)?.status
    if (status === 401 || status === 403) return true
  }

  // ClientResponseError checks
  if (err instanceof ClientResponseError) {
    if (err.status === 401 || err.status === 403) return true
  }

  // Error message inspection
  if (
    err instanceof Error ||
    (typeof err === 'object' && 'message' in (err as Record<string, unknown>))
  ) {
    const message = String((err as { message?: unknown }).message || '').toLowerCase()
    const sessionKeywords = [
      'token is expired',
      'token expired',
      'invalid token',
      'login expirou',
      'sessão expirada',
      'sessao expirada',
      'failed to authenticate',
      'the request requires valid user authorization',
      'unauthorized',
      'forbidden',
    ]
    if (sessionKeywords.some((kw) => message.includes(kw))) {
      return true
    }
  }

  return false
}
