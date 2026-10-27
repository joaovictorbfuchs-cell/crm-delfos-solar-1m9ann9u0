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

export function isAuthSessionError(err: unknown): boolean {
  if (!err) return false
  if (typeof err === 'object') {
    const e = err as any
    if (e.status === 401 || e.status === 403) return true
    if (e.statusCode === 401 || e.statusCode === 403) return true
    if (e.response?.status === 401 || e.response?.status === 403) return true
    if (typeof e.message === 'string') {
      const msg = e.message.toLowerCase()
      if (
        msg.includes('token is expired') ||
        msg.includes('login expirou') ||
        msg.includes('sessão expirada') ||
        msg.includes('failed to authenticate')
      ) {
        return true
      }
    }
  }
  return false
}

export function isAbortError(err: unknown): boolean {
  if (!err) return false
  if (typeof err === 'object') {
    const e = err as any
    if (e.isAbort === true) return true
    if (e.name === 'AbortError') return true
    if (typeof e.message === 'string') {
      const msg = e.message.toLowerCase()
      if (msg.includes('autocancelled') || msg.includes('the request was aborted')) {
        return true
      }
    }
  }
  return false
}

export function formatPbError(err: unknown, fallback = 'Erro na operação'): string {
  if (!err) return fallback
  if (isAuthSessionError(err)) {
    return 'Sua sessão expirou. Faça login novamente.'
  }
  return getErrorMessage(err) || fallback
}
