import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

export function isAbortError(error: unknown): boolean {
  if (!error) return false
  if (typeof error === 'object') {
    const errObj = error as Record<string, unknown>
    if (errObj.isAbort === true) return true
    if (errObj.name === 'AbortError') return true
    if (typeof errObj.message === 'string' && errObj.message.toLowerCase().includes('aborted')) {
      return true
    }
  }
  return false
}

export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false
  if (error instanceof ClientResponseError) {
    if (error.status === 401 || error.status === 403) return true
  }
  if (typeof error === 'object') {
    const errObj = error as Record<string, unknown>
    if (errObj.status === 401 || errObj.status === 403) return true
    if (
      errObj.response &&
      typeof errObj.response === 'object' &&
      ((errObj.response as Record<string, unknown>).status === 401 ||
        (errObj.response as Record<string, unknown>).status === 403)
    ) {
      return true
    }
    const msg = typeof errObj.message === 'string' ? errObj.message.toLowerCase() : ''
    if (
      msg.includes('token is expired') ||
      msg.includes('token expired') ||
      msg.includes('login expirou') ||
      msg.includes('sessão expirada') ||
      msg.includes('sessao expirada') ||
      msg.includes('failed to authenticate') ||
      msg.includes('unauthorized')
    ) {
      return true
    }
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    if (
      msg.includes('token is expired') ||
      msg.includes('token expired') ||
      msg.includes('login expirou') ||
      msg.includes('sessão expirada') ||
      msg.includes('sessao expirada') ||
      msg.includes('failed to authenticate') ||
      msg.includes('unauthorized')
    ) {
      return true
    }
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
