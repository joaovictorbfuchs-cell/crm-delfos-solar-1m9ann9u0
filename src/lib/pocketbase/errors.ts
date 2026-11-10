import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false
  if (typeof error === 'object' && error !== null) {
    const obj = error as Record<string, unknown>
    if (obj.status === 401 || obj.status === 403) return true
    if (obj.statusCode === 401 || obj.statusCode === 403) return true
    if (obj.response && typeof obj.response === 'object') {
      const resp = obj.response as Record<string, unknown>
      if (resp.status === 401 || resp.status === 403) return true
      if (resp.code === 401 || resp.code === 403) return true
    }
  }
  const msg = error instanceof Error ? error.message : String(error)
  if (
    /token/i.test(msg) &&
    (/expired/i.test(msg) || /invalid/i.test(msg) || /revoked/i.test(msg))
  ) {
    return true
  }
  if (
    /sess[ãa]o expirada/i.test(msg) ||
    /login expirou/i.test(msg) ||
    /failed to authenticate/i.test(msg)
  ) {
    return true
  }
  return false
}

export function isAbortError(error: unknown): boolean {
  if (!error) return false
  if (typeof error === 'object' && error !== null) {
    const obj = error as Record<string, unknown>
    if (obj.isAbort === true) return true
    if (obj.name === 'AbortError') return true
  }
  return false
}

export function formatPbError(
  error: unknown,
  fallback = 'Erro na operação do banco de dados.',
): string {
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
