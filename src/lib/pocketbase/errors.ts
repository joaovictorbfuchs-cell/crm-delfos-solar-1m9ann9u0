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

export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false
  if (error instanceof ClientResponseError) {
    if (error.status === 401 || error.status === 403) return true
    const message = (error.message || '').toLowerCase()
    return (
      message.includes('token') ||
      message.includes('authenticate') ||
      message.includes('unauthorized') ||
      message.includes('forbidden') ||
      message.includes('expired')
    )
  }
  if (typeof error === 'object' && error !== null) {
    const err = error as {
      status?: number
      response?: { status?: number; code?: number }
      message?: string
    }
    const status = err.status ?? err.response?.status ?? err.response?.code
    if (status === 401 || status === 403) return true
    if (typeof err.message === 'string') {
      const msg = err.message.toLowerCase()
      return (
        msg.includes('token') ||
        msg.includes('authenticate') ||
        msg.includes('unauthorized') ||
        msg.includes('forbidden') ||
        msg.includes('expired')
      )
    }
  }
  return false
}

export function getErrorMessage(error: unknown): string {
  if (!(error instanceof ClientResponseError)) {
    return error instanceof Error ? error.message : 'An unexpected error occurred.'
  }
  const msgs = Object.values(extractFieldErrors(error))
  return msgs.length > 0 ? msgs.join(' ') : error.message || 'An unexpected error occurred.'
}
