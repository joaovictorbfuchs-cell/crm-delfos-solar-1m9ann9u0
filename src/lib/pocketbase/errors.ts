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
    if (error.status === 401 || error.status === 403) return true
    const msg = (error.message || '').toLowerCase()
    if (
      msg.includes('auth') ||
      msg.includes('token') ||
      msg.includes('unauthorized') ||
      msg.includes('forbidden')
    ) {
      return true
    }
  }
  if (typeof error === 'object' && error !== null) {
    const err = error as {
      status?: number
      response?: { status?: number; message?: string }
      message?: string
    }
    if (
      err.status === 401 ||
      err.status === 403 ||
      err.response?.status === 401 ||
      err.response?.status === 403
    ) {
      return true
    }
    const msg = (err.message || err.response?.message || '').toLowerCase()
    if (
      msg.includes('auth') ||
      msg.includes('token') ||
      msg.includes('unauthorized') ||
      msg.includes('forbidden') ||
      msg.includes('sessão expirada')
    ) {
      return true
    }
  }
  return false
}
