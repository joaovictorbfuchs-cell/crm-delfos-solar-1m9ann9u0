import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false
  if (typeof error === 'object' && error !== null) {
    const errObj = error as { status?: unknown; response?: { status?: unknown }; message?: unknown }
    if (errObj.status === 401 || errObj.status === 403) return true
    if (errObj.response?.status === 401 || errObj.response?.status === 403) return true
    if (typeof errObj.message === 'string') {
      const msg = errObj.message.toLowerCase()
      if (
        msg.includes('token') ||
        msg.includes('expired') ||
        msg.includes('expirou') ||
        msg.includes('sessão expirada') ||
        msg.includes('sessao expirada') ||
        msg.includes('failed to authenticate')
      ) {
        return true
      }
    }
  }
  return false
}

export function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const errObj = error as { isAbort?: unknown; name?: unknown; message?: unknown }
  if (errObj.isAbort === true) return true
  if (errObj.name === 'AbortError') return true
  if (typeof errObj.message === 'string' && errObj.message.toLowerCase().includes('aborted'))
    return true
  return false
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
