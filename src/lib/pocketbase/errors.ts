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

export function isAbortError(error: unknown): boolean {
  if (!error) return false
  if (typeof error === 'object') {
    const err = error as { isAbort?: boolean; name?: string; message?: string }
    if (err.isAbort === true) return true
    if (err.name === 'AbortError') return true
    if (typeof err.message === 'string' && /abort(ed)?/i.test(err.message)) return true
  }
  return false
}

export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false
  if (isAbortError(error)) return false

  if (typeof error === 'object') {
    const err = error as {
      status?: number
      response?: { status?: number; message?: string }
      message?: string
    }
    const status = err.status ?? err.response?.status
    if (status === 401 || status === 403) return true

    const msg = (err.message || err.response?.message || '').toLowerCase()
    if (
      msg.includes('token is expired') ||
      msg.includes('invalid token') ||
      msg.includes('failed to authenticate') ||
      msg.includes('sessão expirada') ||
      msg.includes('sessao expirada') ||
      msg.includes('login expirou')
    ) {
      return true
    }
  }

  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    if (
      msg.includes('token is expired') ||
      msg.includes('invalid token') ||
      msg.includes('failed to authenticate') ||
      msg.includes('sessão expirada') ||
      msg.includes('sessao expirada') ||
      msg.includes('login expirou')
    ) {
      return true
    }
  }

  return false
}

export function formatPbError(error: unknown, fallbackMessage = 'Erro na operação'): string {
  if (!error) return fallbackMessage
  const msg = getErrorMessage(error)
  return msg && msg !== 'An unexpected error occurred.' ? msg : fallbackMessage
}
