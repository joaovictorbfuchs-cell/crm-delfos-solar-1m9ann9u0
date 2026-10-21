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

export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false
  if (error instanceof ClientResponseError) {
    return error.status === 401 || error.status === 403
  }
  const err = error as { status?: number; code?: number; message?: string }
  if (err.status === 401 || err.status === 403 || err.code === 401 || err.code === 403) {
    return true
  }
  if (typeof err.message === 'string') {
    const msg = err.message.toLowerCase()
    return (
      msg.includes('auth') ||
      msg.includes('token') ||
      msg.includes('expired') ||
      msg.includes('unauthorized') ||
      msg.includes('forbidden')
    )
  }
  return false
}

export function isAbortError(error: unknown): boolean {
  if (!error) return false
  if (error instanceof ClientResponseError && (error.isAbort || error.status === 0)) {
    return true
  }
  const err = error as { name?: string; message?: string; isAbort?: boolean }
  return (
    Boolean(err.isAbort) ||
    err.name === 'AbortError' ||
    (typeof err.message === 'string' && err.message.toLowerCase().includes('autocancelled'))
  )
}

export function formatPbError(error: unknown, fallback = 'Erro ao processar requisição.'): string {
  const msg = getErrorMessage(error)
  return msg && msg !== 'An unexpected error occurred.' ? msg : fallback
}
