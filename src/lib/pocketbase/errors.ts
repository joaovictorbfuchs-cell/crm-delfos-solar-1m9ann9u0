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

export function isAuthSessionError(err: any): boolean {
  if (!err) return false
  if (err?.status === 401 || err?.status === 403) return true
  if (err?.response?.status === 401 || err?.response?.status === 403) return true
  const msg = String(err?.message || err?.data?.message || err || '').toLowerCase()
  return (
    msg.includes('token is expired') ||
    msg.includes('token expired') ||
    msg.includes('failed to authenticate') ||
    msg.includes('sessão expirada') ||
    msg.includes('login expirou') ||
    msg.includes('unauthorized') ||
    msg.includes('não autorizado')
  )
}

export function isAbortError(err: any): boolean {
  if (!err) return false
  if (err?.isAbort === true) return true
  if (err?.name === 'AbortError') return true
  const msg = String(err?.message || '').toLowerCase()
  return msg.includes('the request was autocancelled') || msg.includes('the request was aborted')
}

export function formatPbError(err: any, fallback = 'Ocorreu um erro na operação'): string {
  if (!err) return fallback
  if (typeof err === 'string') return err
  if (err?.message && typeof err.message === 'string') return err.message
  return getErrorMessage(err) || fallback
}
