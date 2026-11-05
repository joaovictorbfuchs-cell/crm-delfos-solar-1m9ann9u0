import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

function extrairStatus(error: unknown): number {
  const err = error as { status?: number; statusCode?: number; response?: { status?: number } }
  return (
    err?.status ??
    err?.statusCode ??
    (typeof err?.response?.status === 'number' ? err.response.status : NaN)
  )
}

/** Erro de sessão/auth expirada (401/403) ou texto de token expirado. */
export function isAuthSessionError(error: unknown): boolean {
  if (error === null || error === undefined) return false
  const status = extrairStatus(error)
  if (!isNaN(status) && (status === 401 || status === 403)) return true
  const msg =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : ((error as { message?: string })?.message ?? '')
  if (!msg) return false
  const lowered = msg.toLowerCase()
  return (
    lowered.includes('token is expired or invalid') ||
    lowered.includes('failed to authenticate') ||
    lowered.includes('sessão expirada') ||
    lowered.includes('login expirou') ||
    lowered.includes('session expired')
  )
}

/** Erro de requisição abortada (auto-cancelamento do SDK). */
export function isAbortError(error: unknown): boolean {
  const err = error as { isAbort?: boolean; name?: string }
  return Boolean(err?.isAbort) || err?.name === 'AbortError'
}

/** Mensagem amigável consolidada de um erro do PocketBase. */
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
