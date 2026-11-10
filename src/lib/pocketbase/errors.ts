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
    if (candidate.statusCode === 401 || candidate.statusCode === 403) return true
    const resp = candidate.response as Record<string, unknown> | undefined
    if (resp && (resp.status === 401 || resp.status === 403)) return true
    if (resp && (resp.code === 401 || resp.code === 403)) return true
    if (candidate.code === 401 || candidate.code === 403) return true
  }
  const msg =
    err instanceof Error
      ? err.message
      : typeof err === 'object' && err !== null && 'message' in err
        ? String((err as { message: unknown }).message)
        : String(err)
  const lower = msg.toLowerCase()
  return (
    lower.includes('token is expired') ||
    lower.includes('failed to authenticate') ||
    lower.includes('sessão expirada') ||
    lower.includes('login expirou') ||
    lower.includes('autenticação') ||
    lower.includes('requires authentication') ||
    lower.includes('the request requires admin authorization')
  )
}

export function isAbortError(err: unknown): boolean {
  if (!err) return false
  if (typeof err === 'object') {
    const c = err as Record<string, unknown>
    if (c.isAbort === true) return true
    if (c.name === 'AbortError') return true
  }
  if (err instanceof Error && err.name === 'AbortError') return true
  const msg = err instanceof Error ? err.message : String(err)
  return (
    msg.toLowerCase().includes('request was aborted') || msg.toLowerCase().includes('autocancelled')
  )
}

export function formatPbError(error: unknown, fallbackMessage = 'Erro na operação'): string {
  const extracted = getErrorMessage(error)
  if (extracted && extracted !== 'An unexpected error occurred.') {
    return extracted
  }
  return fallbackMessage
}
