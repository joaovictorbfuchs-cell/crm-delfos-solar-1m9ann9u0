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

export function isAbortError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const anyErr = err as { isAbort?: boolean; name?: string; message?: string }
  if (anyErr.isAbort === true) return true
  if (anyErr.name === 'AbortError') return true
  if (typeof anyErr.message === 'string' && anyErr.message.toLowerCase().includes('aborted')) {
    return true
  }
  return false
}

export function isAuthSessionError(err: unknown): boolean {
  if (!err) return false
  if (isAbortError(err)) return false

  const anyErr = err as {
    status?: unknown
    statusCode?: unknown
    response?: { status?: unknown }
    message?: unknown
  }

  const status = Number(anyErr.status ?? anyErr.statusCode ?? anyErr.response?.status)
  if (status === 401 || status === 403) return true

  if (typeof anyErr.message === 'string') {
    const msg = anyErr.message.toLowerCase()
    if (
      msg.includes('token is expired') ||
      msg.includes('failed to authenticate') ||
      msg.includes('the request requires valid user authorization') ||
      msg.includes('user not authenticated') ||
      msg.includes('invalid token')
    ) {
      return true
    }
  }

  return false
}

export function formatPbError(err: unknown, fallbackMessage = 'Erro na requisição'): string {
  if (isAbortError(err)) return ''
  if (isAuthSessionError(err)) return 'Sessão expirada. Faça login novamente.'
  return getErrorMessage(err) || fallbackMessage
}
