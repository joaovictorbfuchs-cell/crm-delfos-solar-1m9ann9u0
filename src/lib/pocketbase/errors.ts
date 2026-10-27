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
    const record = err as Record<string, unknown>
    if (record.status === 401 || record.status === 403) return true
    if (record.statusCode === 401 || record.statusCode === 403) return true
    if (
      record.response &&
      typeof record.response === 'object' &&
      ((record.response as Record<string, unknown>).status === 401 ||
        (record.response as Record<string, unknown>).status === 403)
    ) {
      return true
    }
    const msg = typeof record.message === 'string' ? record.message.toLowerCase() : ''
    if (
      msg.includes('token is expired') ||
      msg.includes('failed to authenticate') ||
      msg.includes('login expirou') ||
      msg.includes('sessão expirada') ||
      msg.includes('sessao expirada')
    ) {
      return true
    }
  }
  if (err instanceof Error) {
    const msg = err.message.toLowerCase()
    return (
      msg.includes('token is expired') ||
      msg.includes('failed to authenticate') ||
      msg.includes('login expirou') ||
      msg.includes('sessão expirada') ||
      msg.includes('sessao expirada')
    )
  }
  return false
}

export function isAbortError(err: unknown): boolean {
  if (!err) return false
  if (typeof err === 'object') {
    const record = err as Record<string, unknown>
    if (record.isAbort === true) return true
    if (record.name === 'AbortError') return true
    if (
      typeof record.message === 'string' &&
      record.message.toLowerCase().includes('autocancelled')
    ) {
      return true
    }
  }
  return false
}

export function formatPbError(err: unknown, fallback = 'Erro na operação'): string {
  const msg = getErrorMessage(err)
  return msg && msg !== 'An unexpected error occurred.' ? msg : fallback
}
