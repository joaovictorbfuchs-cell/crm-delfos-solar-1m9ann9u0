import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

export function isAuthSessionError(err: unknown): boolean {
  if (!err) return false

  const anyErr = err as Record<string, unknown>

  const status =
    typeof anyErr.status === 'number'
      ? anyErr.status
      : typeof anyErr.statusCode === 'number'
        ? anyErr.statusCode
        : typeof (anyErr.response as Record<string, unknown> | undefined)?.status === 'number'
          ? ((anyErr.response as Record<string, unknown>).status as number)
          : null

  if (status === 401 || status === 403) {
    return true
  }

  const rawMsg =
    (err instanceof Error ? err.message : '') ||
    (typeof anyErr.message === 'string' ? anyErr.message : '') ||
    (typeof anyErr.error === 'string' ? anyErr.error : '')

  const msg = rawMsg.toLowerCase()
  if (
    msg.includes('token is expired') ||
    msg.includes('token expired') ||
    msg.includes('invalid token') ||
    msg.includes('failed to authenticate') ||
    msg.includes('login expirou') ||
    msg.includes('sessão expirada') ||
    msg.includes('sessao expirada')
  ) {
    return true
  }

  return false
}

export function isAbortError(err: unknown): boolean {
  if (!err) return false
  const anyErr = err as Record<string, unknown>
  if (anyErr.isAbort === true) return true
  if (anyErr.name === 'AbortError') return true
  const msg = typeof anyErr.message === 'string' ? anyErr.message.toLowerCase() : ''
  return msg.includes('the request was aborted') || msg.includes('autocancelled')
}

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
