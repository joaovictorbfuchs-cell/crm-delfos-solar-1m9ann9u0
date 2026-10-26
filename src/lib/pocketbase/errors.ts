import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

export function isAbortError(error: unknown): boolean {
  if (!error) return false
  if (error instanceof Error && error.name === 'AbortError') return true
  if (typeof error === 'object' && error !== null) {
    const errObj = error as Record<string, unknown>
    if (errObj.isAbort === true) return true
    if (typeof errObj.message === 'string' && errObj.message.includes('autocancelled')) return true
    if (typeof errObj.message === 'string' && errObj.message.includes('The request was aborted'))
      return true
  }
  return false
}

export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false
  if (isAbortError(error)) return false

  if (error instanceof ClientResponseError) {
    if (error.status === 401 || error.status === 403) return true
  }

  if (typeof error === 'object' && error !== null) {
    const errObj = error as Record<string, unknown>
    if (errObj.status === 401 || errObj.status === 403) return true
    if (errObj.statusCode === 401 || errObj.statusCode === 403) return true
    if (errObj.response && typeof errObj.response === 'object') {
      const resp = errObj.response as Record<string, unknown>
      if (resp.status === 401 || resp.status === 403) return true
    }
  }

  if (
    error instanceof Error ||
    (typeof error === 'object' && error !== null && 'message' in error)
  ) {
    const msg = String((error as { message?: unknown }).message || '').toLowerCase()
    if (
      msg.includes('token is expired') ||
      msg.includes('failed to authenticate') ||
      msg.includes('sessão expirada') ||
      msg.includes('login expirou') ||
      msg.includes('unauthorized') ||
      msg.includes('forbidden')
    ) {
      return true
    }
  }

  return false
}

export function formatPbError(error: unknown, fallback = 'Ocorreu um erro na requisição'): string {
  if (!error) return fallback
  if (error instanceof ClientResponseError) {
    const data = error.response?.data
    if (data && typeof data === 'object') {
      const details = Object.entries(data)
        .map(
          ([k, v]: [string, any]) =>
            `${k}: ${typeof v === 'object' ? v?.message || JSON.stringify(v) : v}`,
        )
        .join(', ')
      if (details) return `${error.message} (${details})`
    }
    return error.message || fallback
  }
  if (error instanceof Error) return error.message
  return String(error)
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
