import { ClientResponseError } from 'pocketbase'

export function isAuthSessionError(err: unknown): boolean {
  if (!err) return false
  if (err instanceof ClientResponseError) {
    return err.status === 401 || err.status === 403
  }
  const status = (err as { status?: number })?.status
  if (status === 401 || status === 403) return true
  const msg = String((err as { message?: string })?.message || '').toLowerCase()
  return (
    msg.includes('token is expired') ||
    msg.includes('token is invalid') ||
    msg.includes('failed to authenticate') ||
    msg.includes('unauthorized') ||
    msg.includes('the request requires valid user authorization')
  )
}

export function isAbortError(err: unknown): boolean {
  if (!err) return false
  if (err instanceof ClientResponseError && (err.isAbort || err.status === 0)) return true
  const name = (err as { name?: string })?.name
  if (name === 'AbortError') return true
  const msg = String((err as { message?: string })?.message || '').toLowerCase()
  return msg.includes('autocancelled') || msg.includes('aborted')
}

export function formatPbError(err: unknown, fallback = 'Erro na operação'): string {
  if (!err) return fallback
  if (err instanceof ClientResponseError) {
    if (err.response?.message) return err.response.message
    if (err.message) return err.message
  }
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  return fallback
}

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
