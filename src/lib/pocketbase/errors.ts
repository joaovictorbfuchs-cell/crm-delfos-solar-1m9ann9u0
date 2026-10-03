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
  }

  if (typeof error === 'object' && error !== null) {
    const obj = error as Record<string, unknown>
    const status =
      obj.status ??
      obj.statusCode ??
      (obj.response as Record<string, unknown> | undefined)?.status ??
      (obj.response as Record<string, unknown> | undefined)?.code
    if (status === 401 || status === 403) return true

    const msg = String(
      obj.message ?? (obj.response as Record<string, unknown> | undefined)?.message ?? '',
    ).toLowerCase()
    if (
      msg.includes('token is expired') ||
      msg.includes('unauthorized') ||
      msg.includes('sessão expirada') ||
      msg.includes('sessao expirada') ||
      msg.includes('jwt expired') ||
      msg.includes('invalid token')
    ) {
      return true
    }
  }

  return false
}
