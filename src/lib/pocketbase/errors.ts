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
  if (!error || typeof error !== 'object') return false
  const e = error as { isAbort?: unknown; name?: unknown }
  return e.isAbort === true || e.name === 'AbortError'
}

export function formatPbError(error: unknown): string {
  return getErrorMessage(error)
}

export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false

  if (error instanceof Error) {
    const msg = String(error.message || '').toLowerCase()
    if (
      msg.includes('token is expired') ||
      msg.includes('token invalid') ||
      msg.includes('failed to authenticate') ||
      msg.includes('sessão expirada') ||
      msg.includes('login expirou') ||
      msg.includes('autenticação')
    ) {
      return true
    }
  }

  const maybe = error as {
    status?: unknown
    statusCode?: unknown
    response?: { status?: unknown }
    message?: unknown
  }

  const status =
    typeof maybe.status === 'number'
      ? maybe.status
      : typeof maybe.statusCode === 'number'
        ? maybe.statusCode
        : typeof maybe.response?.status === 'number'
          ? maybe.response.status
          : undefined

  if (status === 401 || status === 403) return true

  if (typeof maybe.message === 'string') {
    const msg = maybe.message.toLowerCase()
    if (
      msg.includes('token is expired') ||
      msg.includes('token invalid') ||
      msg.includes('failed to authenticate') ||
      msg.includes('sessão expirada') ||
      msg.includes('login expirou') ||
      msg.includes('auth')
    ) {
      return true
    }
  }

  return false
}
