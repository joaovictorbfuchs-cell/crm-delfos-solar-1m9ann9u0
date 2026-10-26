import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

export function isAuthSessionError(err: unknown): boolean {
  if (!err) return false

  // Status check (PocketBase ClientResponseError ou objeto similar com status)
  if (typeof err === 'object' && err !== null) {
    const maybeStatus = (err as { status?: unknown }).status
    if (typeof maybeStatus === 'number' && (maybeStatus === 401 || maybeStatus === 403)) {
      return true
    }
  }

  // ClientResponseError check
  if (err instanceof ClientResponseError) {
    if (err.status === 401 || err.status === 403) return true
  }

  // String check on message
  const message =
    err instanceof Error
      ? err.message
      : typeof err === 'object' &&
          err !== null &&
          'message' in err &&
          typeof (err as { message: unknown }).message === 'string'
        ? (err as { message: string }).message
        : typeof err === 'string'
          ? err
          : ''

  const lower = message.toLowerCase()
  return (
    lower.includes('token expired') ||
    lower.includes('session expired') ||
    lower.includes('the request requires valid authentication') ||
    lower.includes('auth/invalid')
  )
}

export function isAbortError(err: unknown): boolean {
  if (!err) return false
  if (err instanceof DOMException && err.name === 'AbortError') return true
  if (err instanceof Error && err.name === 'AbortError') return true
  if (
    typeof err === 'object' &&
    err !== null &&
    'name' in err &&
    (err as { name: unknown }).name === 'AbortError'
  ) {
    return true
  }
  return false
}

export function formatPbError(err: unknown): string {
  if (!err) return 'Erro inesperado'

  if (err instanceof ClientResponseError) {
    const data = err.response?.data
    if (data && typeof data === 'object') {
      const messages: string[] = []
      for (const [field, detail] of Object.entries(data)) {
        if (
          detail &&
          typeof detail === 'object' &&
          'message' in detail &&
          typeof (detail as { message: unknown }).message === 'string'
        ) {
          messages.push(`${field}: ${(detail as { message: string }).message}`)
        }
      }
      if (messages.length > 0) return messages.join('; ')
    }
    if (err.response?.message && typeof err.response.message === 'string') {
      return err.response.message
    }
    if (err.message) return err.message
  }

  if (typeof err === 'object' && err !== null) {
    const resp = (err as { response?: { message?: unknown; data?: unknown } }).response
    if (resp?.message && typeof resp.message === 'string') {
      return resp.message
    }
    const msg = (err as { message?: unknown }).message
    if (typeof msg === 'string' && msg.trim()) return msg
  }

  if (err instanceof Error && err.message) return err.message
  if (typeof err === 'string' && err.trim()) return err

  return 'Erro inesperado'
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
