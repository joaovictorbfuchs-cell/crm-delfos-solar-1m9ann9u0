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
  if (e.isAbort === true) return true
  return e.name === 'AbortError'
}

export function formatPbError(error: unknown): string {
  if (error instanceof ClientResponseError) {
    return getErrorMessage(error)
  }
  if (error instanceof Error) return error.message
  if (typeof error === 'string' && error.trim()) return error
  return 'Ocorreu um erro inesperado.'
}

export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false
  if (isAbortError(error)) return false
  const directStatus = (error as { status?: unknown }).status
  const nestedStatus = (error as { response?: { status?: unknown } }).response?.status
  const statusCode = (error as { statusCode?: unknown }).statusCode
  if (directStatus === 401 || directStatus === 403) return true
  if (nestedStatus === 401 || nestedStatus === 403) return true
  if (statusCode === 401 || statusCode === 403) return true
  if (error instanceof Error) {
    const msg = (error.message || '').toLowerCase()
    return (
      msg.includes('token is expired') ||
      msg.includes('token is invalid') ||
      msg.includes('sessão expirada') ||
      msg.includes('sessao expirada') ||
      msg.includes('login expirou') ||
      msg.includes('failed to authenticate') ||
      (msg.includes('autenticação') && msg.includes('expirad'))
    )
  }
  return false
}
