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
    const errObj = error as {
      status?: number
      response?: { status?: number }
      message?: string
      name?: string
    }
    const status = errObj.status ?? errObj.response?.status
    if (status === 401 || status === 403) return true
    const message = (errObj.message || '').toLowerCase()
    if (
      message.includes('token is expired') ||
      message.includes('token expired') ||
      message.includes('failed to authenticate') ||
      message.includes('sessão expirada') ||
      message.includes('sessao expirada') ||
      message.includes('the request requires valid user authorization')
    ) {
      return true
    }
  }
  return false
}

export function isAbortError(error: unknown): boolean {
  if (!error) return false
  if (error instanceof ClientResponseError && error.isAbort) return true
  if (
    error instanceof Error &&
    (error.name === 'AbortError' || error.message.includes('autocancelled'))
  ) {
    return true
  }
  return false
}

export function formatPbError(error: unknown): string {
  return getErrorMessage(error)
}

export default {
  extractFieldErrors,
  getErrorMessage,
  isAuthSessionError,
  isAbortError,
  formatPbError,
}
