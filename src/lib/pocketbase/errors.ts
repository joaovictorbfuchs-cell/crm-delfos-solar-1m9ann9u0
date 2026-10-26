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
    const obj = error as Record<string, unknown>
    if (obj.status === 401 || obj.status === 403) return true
    if (obj.response && typeof obj.response === 'object') {
      const resp = obj.response as Record<string, unknown>
      if (resp.status === 401 || resp.status === 403) return true
    }
    const msg = String(obj.message || obj.error || '').toLowerCase()
    if (
      msg.includes('token is expired') ||
      msg.includes('invalid token') ||
      msg.includes('failed to authenticate') ||
      msg.includes('sessão expirada') ||
      msg.includes('login expirou')
    ) {
      return true
    }
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    return (
      msg.includes('token is expired') ||
      msg.includes('invalid token') ||
      msg.includes('failed to authenticate') ||
      msg.includes('sessão expirada') ||
      msg.includes('login expirou')
    )
  }
  return false
}

export function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const obj = error as Record<string, unknown>
  if (obj.isAbort === true) return true
  if (obj.name === 'AbortError') return true
  const msg = String(obj.message || '').toLowerCase()
  return msg.includes('aborted') || msg.includes('autocancelled')
}

export function formatPbError(
  error: unknown,
  fallback = 'Ocorreu um erro ao processar a requisição.',
): string {
  if (!error) return fallback
  const message = getErrorMessage(error)
  return message && message !== 'An unexpected error occurred.' ? message : fallback
}
