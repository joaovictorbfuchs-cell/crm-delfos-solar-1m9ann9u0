import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false
  if (typeof error === 'object') {
    const err = error as Record<string, any>
    if (err.isAbort || err.name === 'AbortError') return false
    const status = err.status ?? err.statusCode ?? err.response?.status
    if (status === 401 || status === 403) return true
    const message = (err.message || err.response?.message || '') + ''
    if (
      /token/i.test(message) &&
      /(expired|invalid|revoked|missing|expirad|inválid)/i.test(message)
    ) {
      return true
    }
    if (/(sessão|sessao|login)\s+expir/i.test(message)) return true
    if (/failed to authenticate/i.test(message)) return true
  }
  return false
}

export function isAbortError(error: unknown): boolean {
  if (!error) return false
  if (typeof error === 'object') {
    const err = error as Record<string, any>
    if (err.isAbort === true || err.name === 'AbortError') return true
    if (typeof err.message === 'string' && /aborted|autocancelled/i.test(err.message)) return true
  }
  return false
}

export function formatPbError(error: unknown, fallbackMessage = 'Erro na operação'): string {
  if (!error) return fallbackMessage
  if (error instanceof ClientResponseError) {
    const data = error.response?.data
    if (data && typeof data === 'object') {
      const fieldEntries = Object.entries(data)
        .map(([field, detail]: [string, any]) => {
          const msg = detail?.message || (typeof detail === 'string' ? detail : '')
          return msg ? `${field}: ${msg}` : field
        })
        .filter(Boolean)
      if (fieldEntries.length > 0) {
        return `${error.message || fallbackMessage} (${fieldEntries.join(', ')})`
      }
    }
    return error.message || fallbackMessage
  }
  if (error instanceof Error) return error.message || fallbackMessage
  if (typeof error === 'string') return error
  return fallbackMessage
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
