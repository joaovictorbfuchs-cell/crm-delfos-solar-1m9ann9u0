import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

/**
 * Detecta erro de sessão/token (logout automático, sessão expirada).
 * Cobertura: status HTTP 401/403, response.status e textos de token.
 */
export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false

  if (error instanceof ClientResponseError) {
    if (error.status === 401 || error.status === 403) return true
    const respStatus = (error.response as { status?: number } | undefined)?.status
    if (respStatus === 401 || respStatus === 403) return true
    const msg = (error.message || '').toLowerCase()
    if (
      msg.includes('token') ||
      msg.includes('sessão expirada') ||
      msg.includes('session expired') ||
      msg.includes('the request requires valid record authorization token') ||
      msg.includes('authorization token') ||
      msg.includes('authtoken') ||
      msg.includes('auth token') ||
      msg.includes('unauthorized')
    ) {
      return true
    }
    const dataMsg = (error.response?.data as { message?: string } | undefined)?.message
    if (typeof dataMsg === 'string') {
      const dmsg = dataMsg.toLowerCase()
      if (dmsg.includes('token') || dmsg.includes('unauthorized')) return true
    }
  }

  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    if (
      msg.includes('token') ||
      msg.includes('sessão expirada') ||
      msg.includes('session expired') ||
      msg.includes('unauthorized')
    ) {
      return true
    }
  }

  return false
}

/** Detecta erro de aborto (auto cancellation do PocketBase). */
export function isAbortError(error: unknown): boolean {
  if (error instanceof ClientResponseError) {
    if (error.isAbort) return true
    if (error.status === 0) return true
    const url = (error.url || '').toLowerCase()
    if (url.includes('autocancel') || url.includes('auto_cancel')) return true
    const msg = (error.message || '').toLowerCase()
    if (msg.includes('autocancelled') || msg.includes('autocancelledrequesterror')) return true
  }
  if (error instanceof Error) {
    const name = error.name || ''
    if (name === 'AbortError' || name === 'AutoCancelledRequestError') return true
  }
  return false
}

/** Formata um erro de forma segura para exibição. */
export function formatPbError(error: unknown): string {
  if (error instanceof ClientResponseError) {
    const msgs = Object.values(extractFieldErrors(error))
    if (msgs.length > 0) return msgs.join(' ')
    return error.message || 'Erro inesperado.'
  }
  return error instanceof Error ? error.message : 'Erro inesperado.'
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
