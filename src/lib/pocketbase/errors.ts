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
    if ('isAbort' in error && Boolean((error as { isAbort: unknown }).isAbort)) return true
    if ('name' in error && (error as { name: unknown }).name === 'AbortError') return true
    if ('message' in error && typeof (error as { message: unknown }).message === 'string') {
      const msg = (error as { message: string }).message.toLowerCase()
      if (
        msg.includes('autocancelled') ||
        msg.includes('the request was aborted') ||
        msg.includes('request was cancelled')
      ) {
        return true
      }
    }
  }
  return false
}

export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false
  if (isAbortError(error)) return false

  if (typeof error === 'object') {
    const errObj = error as Record<string, any>
    const status = Number(errObj.status || errObj.statusCode || errObj.response?.status)
    if (status === 401 || status === 403) return true

    const msg = String(errObj.message || errObj.response?.message || '').toLowerCase()
    if (
      msg.includes('token is expired or invalid') ||
      msg.includes('token expired') ||
      msg.includes('login expirou') ||
      msg.includes('sessão expirada') ||
      msg.includes('sessao expirada') ||
      msg.includes('failed to authenticate') ||
      msg.includes('the request requires valid user authorization') ||
      msg.includes('unauthorized') ||
      msg.includes('token inválido') ||
      msg.includes('token invalido')
    ) {
      return true
    }
  }
  return false
}

export function formatPbError(
  error: unknown,
  fallbackMessage = 'Ocorreu um erro na requisição',
): string {
  if (!error) return fallbackMessage
  if (typeof error === 'string') return error
  const msg = getErrorMessage(error)
  return msg && msg !== 'An unexpected error occurred.' ? msg : fallbackMessage
}
