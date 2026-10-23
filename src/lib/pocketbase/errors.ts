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
    const obj = error as Record<string, any>
    const status = obj.status || obj.statusCode || obj.response?.status || obj.response?.statusCode
    if (status === 401 || status === 403) return true
    const msg = String(obj.message || obj.response?.message || '').toLowerCase()
    if (
      msg.includes('token is expired') ||
      msg.includes('failed to authenticate') ||
      msg.includes('login expirou') ||
      msg.includes('sessão expirada') ||
      msg.includes('sessao expirada') ||
      msg.includes('unauthorized') ||
      msg.includes('forbidden')
    ) {
      // AbortError não é auth session error
      if (isAbortError(error)) return false
      return true
    }
  }
  return false
}

export function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const obj = error as Record<string, any>
  if (obj.isAbort === true) return true
  if (obj.name === 'AbortError') return true
  const msg = String(obj.message || '').toLowerCase()
  return msg.includes('request was aborted') || msg.includes('the user aborted a request')
}

export function formatPbError(error: unknown, fallback = 'Ocorreu um erro na requisição.'): string {
  if (!error) return fallback
  const msg = getErrorMessage(error)
  return msg && msg !== 'An unexpected error occurred.' ? msg : fallback
}
