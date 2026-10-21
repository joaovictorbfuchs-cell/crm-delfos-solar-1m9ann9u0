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

/**
 * Retorna true se o erro representa sessão/token expirado, inválido ou não autorizado (401/403).
 */
export function isAuthSessionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false

  const err = error as Record<string, any>

  // Não confundir com cancelamento / abort
  if (err.isAbort || err.name === 'AbortError') return false

  const status = err.status ?? err.response?.status
  if (status === 401 || status === 403) return true

  const msg = String(err.message || err.response?.message || '')
  if (
    /token is expired or invalid/i.test(msg) ||
    /login expirou/i.test(msg) ||
    /sess[aã]o expirada/i.test(msg) ||
    /failed to authenticate/i.test(msg)
  ) {
    return true
  }

  return false
}

/**
 * Retorna true se a requisição foi abortada/cancelada pelo SDK PocketBase ou Fetch API.
 */
export function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const err = error as Record<string, any>
  return Boolean(
    err.isAbort === true ||
    err.name === 'AbortError' ||
    /the request was aborted/i.test(String(err.message || '')),
  )
}

/**
 * Formata um erro do PocketBase em mensagem legível.
 */
export function formatPbError(
  error: unknown,
  fallbackMessage = 'Ocorreu um erro inesperado.',
): string {
  if (!error) return fallbackMessage
  const err = error as Record<string, any>
  if (err.message && typeof err.message === 'string') {
    return err.message
  }
  return getErrorMessage(error) || fallbackMessage
}
