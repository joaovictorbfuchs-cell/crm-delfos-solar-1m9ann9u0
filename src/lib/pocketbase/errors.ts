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
    if (errObj.status === 401 || errObj.status === 403) return true
    if (errObj.response && typeof errObj.response === 'object') {
      const resp = errObj.response as Record<string, unknown>
      if (resp.status === 401 || resp.status === 403) return true
    }
  }
  const msg =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : (error as any)?.message
  if (typeof msg === 'string') {
    const lower = msg.toLowerCase()
    if (
      lower.includes('token is expired') ||
      lower.includes('token expired') ||
      lower.includes('sessão expirada') ||
      lower.includes('sessao expirada') ||
      lower.includes('login expirou') ||
      lower.includes('failed to authenticate') ||
      lower.includes('the request requires valid record authorization token')
    ) {
      return true
    }
  }
  return false
}

export function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const errObj = error as Record<string, unknown>
  if (errObj.isAbort === true) return true
  if (errObj.name === 'AbortError') return true
  if (
    typeof errObj.message === 'string' &&
    errObj.message.toLowerCase().includes('request was aborted')
  ) {
    return true
  }
  return false
}

export function formatPbError(error: unknown): string {
  return getErrorMessage(error)
}
