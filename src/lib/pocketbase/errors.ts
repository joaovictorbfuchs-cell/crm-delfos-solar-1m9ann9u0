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

export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false
  if (typeof error === 'object') {
    const errObj = error as Record<string, unknown>
    const status = (errObj.status ??
      (errObj.response as Record<string, unknown> | undefined)?.status ??
      errObj.statusCode) as number | undefined
    if (status === 401 || status === 403) return true
    const message = (errObj.message ||
      (errObj.response as Record<string, unknown> | undefined)?.message) as string | undefined
    if (typeof message === 'string') {
      const lower = message.toLowerCase()
      if (
        lower.includes('token is expired') ||
        lower.includes('token invalid') ||
        lower.includes('failed to authenticate') ||
        lower.includes('sessão expirada') ||
        lower.includes('login expirou') ||
        lower.includes('unauthorized') ||
        lower.includes('the request requires valid user authorization token')
      ) {
        return true
      }
    }
  }
  return false
}

export function isAbortError(error: unknown): boolean {
  if (!error) return false
  if (error instanceof ClientResponseError && (error.isAbort || error.status === 0)) return true
  if (typeof error === 'object') {
    const errObj = error as Record<string, unknown>
    if (errObj.name === 'AbortError' || errObj.isAbort === true) return true
  }
  return false
}

export function formatPbError(
  error: unknown,
  fallbackMessage = 'Ocorreu um erro inesperado',
): string {
  const msg = getErrorMessage(error)
  return msg && msg !== 'An unexpected error occurred.' ? msg : fallbackMessage
}

export function getErrorMessage(error: unknown): string {
  if (!(error instanceof ClientResponseError)) {
    return error instanceof Error ? error.message : 'An unexpected error occurred.'
  }
  const msgs = Object.values(extractFieldErrors(error))
  return msgs.length > 0 ? msgs.join(' ') : error.message || 'An unexpected error occurred.'
}
