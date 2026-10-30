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
    const candidate = err as Record<string, unknown>
    if (candidate.status === 401 || candidate.status === 403) return true
    if (
      candidate.response &&
      typeof candidate.response === 'object' &&
      ((candidate.response as Record<string, unknown>).status === 401 ||
        (candidate.response as Record<string, unknown>).status === 403)
    ) {
      return true
    }
    const msg = typeof candidate.message === 'string' ? candidate.message.toLowerCase() : ''
    if (
      msg.includes('token is expired') ||
      msg.includes('token expired') ||
      msg.includes('failed to authenticate') ||
      msg.includes('login expirou') ||
      msg.includes('sessão expirada') ||
      msg.includes('sessao expirada') ||
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
  const candidate = err as Record<string, unknown>
  if (candidate.isAbort === true) return true
  if (candidate.name === 'AbortError') return true
  if (
    typeof candidate.message === 'string' &&
    (candidate.message.includes('The request was aborted') ||
      candidate.message.includes('autocancelled'))
  ) {
    return true
  }
  return false
}

export function formatPbError(error: unknown): string {
  return getErrorMessage(error)
}
