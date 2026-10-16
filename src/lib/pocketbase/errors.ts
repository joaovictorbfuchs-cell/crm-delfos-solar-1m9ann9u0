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

  const anyErr = err as Record<string, unknown>
  const status = Number(
    anyErr.status ??
      anyErr.statusCode ??
      (anyErr.response && typeof anyErr.response === 'object'
        ? (anyErr.response as Record<string, unknown>).status
        : undefined),
  )

  if (status === 401 || status === 403) return true

  const msg = (
    anyErr.message ||
    (anyErr.response && typeof anyErr.response === 'object'
      ? (anyErr.response as Record<string, unknown>).message
      : '') ||
    String(err)
  )
    .toString()
    .toLowerCase()

  return (
    msg.includes('token is expired') ||
    msg.includes('token expired') ||
    msg.includes('login expirou') ||
    msg.includes('sessão expirada') ||
    msg.includes('sessao expirada') ||
    msg.includes('failed to authenticate') ||
    msg.includes('the request requires valid user authorization')
  )
}
