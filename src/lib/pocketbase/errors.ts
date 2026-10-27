import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

export function isAuthSessionError(err: unknown): boolean {
  if (!err) return false
  if (typeof err === 'object') {
    const e = err as Record<string, unknown>
    if (e.status === 401 || e.status === 403 || e.statusCode === 401 || e.statusCode === 403) {
      return true
    }
    const resp = e.response as Record<string, unknown> | undefined
    if (
      resp &&
      (resp.status === 401 || resp.status === 403 || resp.code === 401 || resp.code === 403)
    ) {
      return true
    }
    const msg = typeof e.message === 'string' ? e.message.toLowerCase() : ''
    if (
      msg.includes('token is expired') ||
      msg.includes('token expired') ||
      msg.includes('failed to authenticate') ||
      msg.includes('sessão expirada') ||
      msg.includes('sessao expirada') ||
      msg.includes('login expirou') ||
      msg.includes('não autorizado') ||
      msg.includes('nao autorizado')
    ) {
      return true
    }
  }
  return false
}

export function isAbortError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const e = err as Record<string, unknown>
  if (e.isAbort === true) return true
  if (e.name === 'AbortError') return true
  const msg = typeof e.message === 'string' ? e.message.toLowerCase() : ''
  return msg.includes('the request was aborted') || msg.includes('autocancelled')
}

export function formatPbError(error: unknown): string {
  return getErrorMessage(error)
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
