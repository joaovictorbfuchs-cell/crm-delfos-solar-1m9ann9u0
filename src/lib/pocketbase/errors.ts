import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

export function isAuthSessionError(err: unknown): boolean {
  if (!err) return false
  if (typeof err === 'object') {
    const e = err as Record<string, unknown>
    if (e.status === 401 || e.status === 403 || e.statusCode === 401 || e.statusCode === 403)
      return true
    if (e.response && typeof e.response === 'object') {
      const resp = e.response as Record<string, unknown>
      if (
        resp.status === 401 ||
        resp.status === 403 ||
        resp.statusCode === 401 ||
        resp.statusCode === 403
      )
        return true
    }
  }
  const msg = err instanceof Error ? err.message : String(err)
  const lower = msg.toLowerCase()
  if (
    lower.includes('token is expired') ||
    lower.includes('token expired') ||
    lower.includes('failed to authenticate') ||
    lower.includes('sessão expirada') ||
    lower.includes('sessao expirada') ||
    lower.includes('login expirou') ||
    lower.includes('unauthorized') ||
    lower.includes('forbidden')
  ) {
    return true
  }
  return false
}

export function isAbortError(err: unknown): boolean {
  if (!err) return false
  if (typeof err === 'object') {
    const e = err as Record<string, unknown>
    if (e.isAbort === true) return true
    if (e.name === 'AbortError' || e.name === 'AutocancelledError') return true
  }
  const msg = err instanceof Error ? err.message : String(err)
  return msg.toLowerCase().includes('aborted') || msg.toLowerCase().includes('autocancelled')
}

export function formatPbError(error: unknown, fallback = 'Erro ao processar solicitação'): string {
  if (!error) return fallback
  const detailed = getErrorMessage(error)
  return detailed || fallback
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
