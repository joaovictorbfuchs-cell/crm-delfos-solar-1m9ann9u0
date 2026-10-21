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

export function isAuthSessionError(err: unknown): boolean {
  if (!err) return false
  if (typeof err === 'object') {
    const obj = err as Record<string, unknown>
    if (
      obj.status === 401 ||
      obj.status === 403 ||
      obj.statusCode === 401 ||
      obj.statusCode === 403
    ) {
      return true
    }
    if (obj.response && typeof obj.response === 'object') {
      const resp = obj.response as Record<string, unknown>
      if (resp.status === 401 || resp.status === 403) {
        return true
      }
    }
    const message = typeof obj.message === 'string' ? obj.message.toLowerCase() : ''
    if (
      message.includes('token is expired') ||
      message.includes('failed to authenticate') ||
      message.includes('login expirou') ||
      message.includes('sessão expirada') ||
      message.includes('sessao expirada') ||
      message.includes('token expired') ||
      message.includes('invalid token')
    ) {
      return true
    }
  }
  return false
}

export function isAbortError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const obj = err as Record<string, unknown>
  if (obj.isAbort === true) return true
  if (obj.name === 'AbortError') return true
  if (
    typeof obj.message === 'string' &&
    obj.message.toLowerCase().includes('request was aborted')
  ) {
    return true
  }
  return false
}

export function formatPbError(
  err: unknown,
  defaultMessage = 'Ocorreu um erro no servidor',
): string {
  if (!err) return defaultMessage
  if (err instanceof ClientResponseError) {
    const fieldErrs = extractFieldErrors(err)
    const msgs = Object.values(fieldErrs)
    if (msgs.length > 0) return msgs.join(', ')
    return err.message || defaultMessage
  }
  if (err instanceof Error) return err.message
  return defaultMessage
}
