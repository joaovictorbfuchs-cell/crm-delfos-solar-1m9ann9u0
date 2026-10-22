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
    const e = error as Record<string, unknown>
    if (e.isAbort === true) return true
    if (e.name === 'AbortError') return true
    if (typeof e.message === 'string' && e.message.toLowerCase().includes('aborted')) return true
  }
  return false
}

export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false
  if (isAbortError(error)) return false

  if (typeof error === 'object') {
    const e = error as Record<string, unknown>
    if (e.status === 401 || e.status === 403) return true
    if (e.statusCode === 401 || e.statusCode === 403) return true
    if (e.response && typeof e.response === 'object') {
      const resp = e.response as Record<string, unknown>
      if (resp.status === 401 || resp.status === 403) return true
    }
    if (typeof e.message === 'string') {
      const msg = e.message.toLowerCase()
      if (
        msg.includes('token is expired') ||
        msg.includes('login expirou') ||
        msg.includes('sessão expirada') ||
        msg.includes('sessao expirada') ||
        msg.includes('failed to authenticate')
      ) {
        return true
      }
    }
  }

  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    if (
      msg.includes('token is expired') ||
      msg.includes('login expirou') ||
      msg.includes('sessão expirada') ||
      msg.includes('sessao expirada') ||
      msg.includes('failed to authenticate')
    ) {
      return true
    }
  }

  return false
}

export function formatPbError(error: unknown, fallbackMessage = 'Erro na operação'): string {
  if (!error) return fallbackMessage
  const specificMsg = getErrorMessage(error)
  if (specificMsg && specificMsg !== 'An unexpected error occurred.') {
    return specificMsg
  }
  if (error instanceof Error && error.message) {
    return error.message
  }
  return fallbackMessage
}
