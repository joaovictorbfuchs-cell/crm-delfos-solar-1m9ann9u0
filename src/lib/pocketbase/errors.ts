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

export function formatPbError(error: unknown): string {
  return getErrorMessage(error)
}

export function isAbortError(error: unknown): boolean {
  if (!error) return false
  if (typeof error === 'object') {
    const errObj = error as Record<string, unknown>
    if (errObj.isAbort === true) return true
    if (errObj.name === 'AbortError') return true
    const msg = typeof errObj.message === 'string' ? errObj.message : ''
    if (msg.includes('autocancelled') || msg.includes('abort')) return true
  }
  if (error instanceof Error) {
    if (error.name === 'AbortError') return true
    if (error.message.includes('autocancelled') || error.message.includes('abort')) return true
  }
  return false
}

export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false

  if (typeof error === 'object') {
    const errObj = error as Record<string, unknown>
    const status =
      typeof errObj.status === 'number'
        ? errObj.status
        : typeof (errObj.response as Record<string, unknown> | undefined)?.status === 'number'
          ? (errObj.response as Record<string, unknown>).status
          : null

    if (status === 401 || status === 403) {
      return true
    }

    const msg =
      typeof errObj.message === 'string'
        ? errObj.message
        : typeof (errObj.response as Record<string, unknown> | undefined)?.message === 'string'
          ? ((errObj.response as Record<string, unknown>).message as string)
          : ''

    const lower = msg.toLowerCase()
    if (
      lower.includes('failed to authenticate') ||
      lower.includes('token is expired') ||
      lower.includes('the request requires valid') ||
      lower.includes('sessão expirada') ||
      lower.includes('login expirou') ||
      lower.includes('não autorizado') ||
      lower.includes('unauthorized') ||
      lower.includes('forbidden')
    ) {
      return true
    }
  }

  if (error instanceof Error) {
    const lower = error.message.toLowerCase()
    if (
      lower.includes('failed to authenticate') ||
      lower.includes('token is expired') ||
      lower.includes('sessão expirada') ||
      lower.includes('login expirou') ||
      lower.includes('não autorizado') ||
      lower.includes('unauthorized') ||
      lower.includes('forbidden')
    ) {
      return true
    }
  }

  return false
}
