import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false
  if (typeof error === 'object') {
    const errObj = error as Record<string, unknown>
    const status =
      errObj.status ??
      errObj.statusCode ??
      (errObj.response as Record<string, unknown> | undefined)?.status
    if (status === 401 || status === 403) return true
    const message = typeof errObj.message === 'string' ? errObj.message.toLowerCase() : ''
    if (message.includes('token') && (message.includes('expired') || message.includes('invalid')))
      return true
    if (
      message.includes('failed to authenticate') ||
      message.includes('unauthorized') ||
      message.includes('forbidden')
    )
      return true
  }
  return false
}

export function isAbortError(error: unknown): boolean {
  if (!error) return false
  if (typeof error === 'object') {
    const errObj = error as Record<string, unknown>
    if (errObj.isAbort === true || errObj.name === 'AbortError') return true
    const message = typeof errObj.message === 'string' ? errObj.message.toLowerCase() : ''
    if (message.includes('autocancelled') || message.includes('abort')) return true
  }
  return false
}

export function formatPbError(error: unknown): string {
  return getErrorMessage(error)
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
