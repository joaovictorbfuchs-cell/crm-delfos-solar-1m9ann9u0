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
  if (typeof error === 'object' && 'status' in error) {
    const status = (error as { status?: unknown }).status
    if (status === 401 || status === 403) return true
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    return (
      msg.includes('401') ||
      msg.includes('403') ||
      msg.includes('unauthorized') ||
      msg.includes('forbidden') ||
      msg.includes('sessão expirada') ||
      msg.includes('token')
    )
  }
  return false
}
