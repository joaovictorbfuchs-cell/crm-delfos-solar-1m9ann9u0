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

export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false
  if (typeof error === 'object') {
    const errObj = error as Record<string, unknown>
    if (errObj.status === 401 || errObj.status === 403) return true
    if (typeof errObj.response === 'object' && errObj.response !== null) {
      const resp = errObj.response as Record<string, unknown>
      if (resp.status === 401 || resp.status === 403) return true
    }
  }
  const msg = error instanceof Error ? error.message : String(error)
  if (
    /token is expired or invalid/i.test(msg) ||
    /login expirou/i.test(msg) ||
    /sessão expirada/i.test(msg) ||
    /sessao expirada/i.test(msg) ||
    /failed to authenticate/i.test(msg) ||
    /unauthorized/i.test(msg)
  ) {
    return true
  }
  return false
}

export function isAbortError(error: unknown): boolean {
  if (!error) return false
  if (typeof error === 'object') {
    const errObj = error as Record<string, unknown>
    if (errObj.isAbort === true) return true
    if (errObj.name === 'AbortError') return true
  }
  const msg = error instanceof Error ? error.message : String(error)
  return /aborted|autocancelled/i.test(msg)
}

export function formatPbError(error: unknown): string {
  return getErrorMessage(error)
}

export function getErrorMessage(error: unknown): string {
  if (!(error instanceof ClientResponseError)) {
    return error instanceof Error ? error.message : 'An unexpected error occurred.'
  }
  const msgs = Object.values(extractFieldErrors(error))
  return msgs.length > 0 ? msgs.join(' ') : error.message || 'An unexpected error occurred.'
}
