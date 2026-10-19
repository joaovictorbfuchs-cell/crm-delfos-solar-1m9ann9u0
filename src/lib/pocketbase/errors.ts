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

  const errObj = error as any
  const status = errObj.status || errObj.statusCode || errObj.response?.status
  if (status === 401 || status === 403) return true

  const message = String(errObj.message || errObj.response?.message || '').toLowerCase()
  if (
    message.includes('token is expired') ||
    message.includes('token expired') ||
    message.includes('failed to authenticate') ||
    message.includes('sessão expirada') ||
    message.includes('sessao expirada') ||
    message.includes('login expirou')
  ) {
    return true
  }

  return false
}

export function isAbortError(error: unknown): boolean {
  if (!error) return false
  const errObj = error as any
  if (errObj.name === 'AbortError' || errObj.isAbort) return true
  const message = String(errObj.message || '').toLowerCase()
  return message.includes('autocancelled') || message.includes('the user aborted a request')
}

export function formatPbError(
  error: unknown,
  fallback = 'Ocorreu um erro ao processar a requisição.',
): string {
  if (!error) return fallback
  const msg = getErrorMessage(error)
  return msg && msg !== 'An unexpected error occurred.' ? msg : fallback
}

const pocketbaseErrors = {
  extractFieldErrors,
  getErrorMessage,
  isAuthSessionError,
  isAbortError,
  formatPbError,
}

export default pocketbaseErrors
