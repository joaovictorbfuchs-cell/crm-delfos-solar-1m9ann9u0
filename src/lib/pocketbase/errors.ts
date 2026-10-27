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
    const errObj = error as Record<string, any>
    const status = errObj.status ?? errObj.response?.status
    if (status === 401 || status === 403) return true
    const msg = (errObj.message || errObj.response?.message || '').toString().toLowerCase()
    if (
      msg.includes('token') &&
      (msg.includes('expired') || msg.includes('invalid') || msg.includes('missing'))
    ) {
      return true
    }
    if (
      msg.includes('login expirou') ||
      msg.includes('sessão expirada') ||
      msg.includes('sessao expirada')
    ) {
      return true
    }
    if (msg.includes('failed to authenticate') || msg.includes('authentication required')) {
      return true
    }
    if (msg.includes('auth') && msg.includes('session')) {
      return true
    }
  }
  return false
}

export function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const errObj = error as Record<string, any>
  if (errObj.isAbort === true) return true
  if (errObj.name === 'AbortError') return true
  const msg = (errObj.message || '').toString().toLowerCase()
  return msg.includes('autocancelled') || msg.includes('request was aborted')
}

export function formatPbError(
  error: unknown,
  fallbackMessage = 'Erro na operação do PocketBase',
): string {
  if (!error) return fallbackMessage
  const extracted = getErrorMessage(error)
  if (extracted && extracted !== 'An unexpected error occurred.') return extracted
  if (error instanceof Error && error.message) return error.message
  return fallbackMessage
}
