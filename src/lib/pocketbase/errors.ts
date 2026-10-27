import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

/**
 * Identifica se um erro lançado por requisição ao PocketBase/backend representa sessão expirada ou não autenticada (401/403).
 * Blindado contra erros de abort / autoCancellation.
 */
export function isAuthSessionError(err: unknown): boolean {
  if (!err) return false

  // Erros de cancelamento/abort nunca devem ser interpretados como sessão expirada
  if (isAbortError(err)) return false

  // Status HTTP direto ou em response.status
  const status = (err as any)?.status ?? (err as any)?.response?.status
  if (status === 401 || status === 403) return true

  // Verificação textual por mensagens conhecidas do PocketBase/SDK
  const message = String((err as any)?.message || '').toLowerCase()
  if (
    message.includes('token is expired') ||
    message.includes('token expired') ||
    message.includes('sessão expirada') ||
    message.includes('sessao expirada') ||
    message.includes('login expirou') ||
    message.includes('failed to authenticate') ||
    message.includes('the request requires valid user authorization') ||
    message.includes('the request requires admin authorization')
  ) {
    return true
  }

  return false
}

/**
 * Identifica se um erro é resultado de requisição abortada/auto-cancelada
 */
export function isAbortError(err: unknown): boolean {
  if (!err) return false
  if ((err as any)?.isAbort === true) return true
  if ((err as any)?.name === 'AbortError') return true
  const msg = String((err as any)?.message || '').toLowerCase()
  return msg.includes('the request was aborted') || msg.includes('autocancel')
}

/**
 * Formata um erro do PocketBase para exibição amigável
 */
export function formatPbError(error: unknown): string {
  if (!error) return 'Erro desconhecido'
  return getErrorMessage(error)
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
