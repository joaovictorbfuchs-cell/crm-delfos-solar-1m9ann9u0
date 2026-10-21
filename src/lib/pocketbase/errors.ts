import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false
  if (typeof error === 'object') {
    const errObj = error as Record<string, any>
    if (errObj.status === 401 || errObj.status === 403) return true
    if (errObj.statusCode === 401 || errObj.statusCode === 403) return true
    if (errObj.response && (errObj.response.status === 401 || errObj.response.status === 403)) {
      return true
    }
    if (errObj.message) {
      const msg = String(errObj.message).toLowerCase()
      if (
        msg.includes('token is expired') ||
        msg.includes('failed to authenticate') ||
        msg.includes('login expirou') ||
        msg.includes('sessão expirada') ||
        msg.includes('unauthorized') ||
        msg.includes('forbidden')
      ) {
        return true
      }
    }
  }
  return false
}

export function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const errObj = error as Record<string, any>
  return Boolean(
    errObj.isAbort ||
    errObj.name === 'AbortError' ||
    (typeof errObj.message === 'string' && errObj.message.includes('The request was aborted')),
  )
}

export function formatPbError(
  error: unknown,
  fallbackMessage = 'Ocorreu um erro na requisição',
): string {
  const msg = getErrorMessage(error)
  return msg || fallbackMessage
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
