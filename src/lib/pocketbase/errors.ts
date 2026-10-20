import { ClientResponseError } from 'pocketbase'

export function isAuthSessionError(err: unknown): boolean {
  if (!err) return false
  if (typeof err === 'object') {
    const errorObj = err as Record<string, unknown>
    if (errorObj.status === 401 || errorObj.status === 403) return true
    if (errorObj.statusCode === 401 || errorObj.statusCode === 403) return true
    if (typeof errorObj.response === 'object' && errorObj.response !== null) {
      const resp = errorObj.response as Record<string, unknown>
      if (resp.status === 401 || resp.status === 403) return true
    }
    const message = typeof errorObj.message === 'string' ? errorObj.message.toLowerCase() : ''
    if (message.includes('token') && (message.includes('expired') || message.includes('invalid'))) {
      return true
    }
    if (message.includes('login expirou') || message.includes('sessão expirada')) {
      return true
    }
    if (message.includes('failed to authenticate')) {
      return true
    }
  }
  return false
}

export function isAbortError(err: unknown): boolean {
  if (!err) return false
  if (typeof err === 'object') {
    const errorObj = err as Record<string, unknown>
    if (errorObj.isAbort === true) return true
    if (errorObj.name === 'AbortError') return true
    const message = typeof errorObj.message === 'string' ? errorObj.message.toLowerCase() : ''
    if (message.includes('autocancelled') || message.includes('request was aborted')) {
      return true
    }
  }
  return false
}

export function formatPbError(error: unknown, fallback = 'Erro na operação'): string {
  const msg = getErrorMessage(error)
  return msg && msg !== 'An unexpected error occurred.' ? msg : fallback
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
