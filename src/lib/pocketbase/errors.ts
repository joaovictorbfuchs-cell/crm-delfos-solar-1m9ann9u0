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
  if (typeof error === 'object' && 'status' in error) {
    const status = (error as { status?: number }).status
    if (status === 401 || status === 403) return true
  }
  if (error instanceof ClientResponseError) {
    return error.status === 401 || error.status === 403
  }
  const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
  return (
    msg.includes('auth') ||
    msg.includes('token') ||
    msg.includes('session') ||
    msg.includes('unauthorized') ||
    msg.includes('forbidden')
  )
}

export function isAbortError(error: unknown): boolean {
  if (!error) return false
  if (error instanceof DOMException && error.name === 'AbortError') return true
  if (error instanceof ClientResponseError && (error.isAbort || error.status === 0)) return true
  const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
  return msg.includes('autocancelled') || msg.includes('abort')
}

export function formatPbError(error: unknown): string {
  return getErrorMessage(error)
}
