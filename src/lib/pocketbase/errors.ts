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

    if (candidate.response && typeof candidate.response === 'object') {
      const resp = candidate.response as Record<string, unknown>
      if (resp.status === 401 || resp.status === 403) return true
    }

    if (typeof candidate.message === 'string') {
      const msg = candidate.message.toLowerCase()
      if (
        msg.includes('token') ||
        msg.includes('expired') ||
        msg.includes('expirou') ||
        msg.includes('sessão expirada') ||
        msg.includes('failed to authenticate') ||
        msg.includes('unauthorized')
      ) {
        return true
      }
    }
  }

  if (err instanceof Error) {
    const msg = err.message.toLowerCase()
    if (
      msg.includes('token') ||
      msg.includes('expired') ||
      msg.includes('expirou') ||
      msg.includes('sessão expirada') ||
      msg.includes('failed to authenticate') ||
      msg.includes('unauthorized')
    ) {
      return true
    }
  }

  return false
}
