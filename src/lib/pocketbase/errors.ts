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
  if (typeof error === 'object') {
    const errObj = error as Record<string, unknown>
    const status =
      errObj.status ??
      (errObj.response as Record<string, unknown> | undefined)?.status ??
      errObj.statusCode
    if (status === 401 || status === 403) return true
    const msg = String(errObj.message || '')
    if (
      msg.includes('Token is expired') ||
      msg.includes('Login expirou') ||
      msg.includes('Sessão expirada') ||
      msg.includes('Failed to authenticate')
    ) {
      return true
    }
  }
  if (error instanceof Error) {
    const msg = error.message
    if (
      msg.includes('Token is expired') ||
      msg.includes('Login expirou') ||
      msg.includes('Sessão expirada') ||
      msg.includes('Failed to authenticate')
    ) {
      return true
    }
  }
  return false
}

export function isAbortError(error: unknown): boolean {
  if (!error) return false
  if (typeof error === 'object') {
    const errObj = error as Record<string, unknown>
    if (errObj.isAbort === true || errObj.name === 'AbortError') return true
    if (String(errObj.message || '').includes('The request was aborted')) return true
  }
  if (
    error instanceof Error &&
    (error.name === 'AbortError' || error.message.includes('The request was aborted'))
  ) {
    return true
  }
  return false
}

export function formatPbError(error: unknown): string {
  return getErrorMessage(error)
}
