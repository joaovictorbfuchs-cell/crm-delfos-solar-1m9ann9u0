import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

/**
 * Identifica erros de sessão/autenticação expirada ou inválida (status 401/403 ou mensagens correlatas).
 */
export function isAuthSessionError(err: unknown): boolean {
  if (!err) return false

  // Se for abort/autocancel, nunca é erro de autenticação
  if (isAbortError(err)) return false

  if (err instanceof ClientResponseError) {
    if (err.status === 401 || err.status === 403) return true
    const msg = (err.message || '').toLowerCase()
    return (
      msg.includes('token is expired') ||
      msg.includes('failed to authenticate') ||
      msg.includes('invalid auth') ||
      msg.includes('unauthorized') ||
      msg.includes('forbidden') ||
      msg.includes('login expirou') ||
      msg.includes('sessão expirada')
    )
  }

  if (typeof err === 'object' && err !== null) {
    const obj = err as Record<string, unknown>
    const status = Number(
      obj.status ?? obj.statusCode ?? (obj.response as Record<string, unknown>)?.status,
    )
    if (status === 401 || status === 403) return true

    const msg = String(obj.message || obj.error || '').toLowerCase()
    if (
      msg.includes('token is expired') ||
      msg.includes('failed to authenticate') ||
      msg.includes('invalid auth') ||
      msg.includes('unauthorized') ||
      msg.includes('forbidden') ||
      msg.includes('login expirou') ||
      msg.includes('sessão expirada')
    ) {
      return true
    }
  }

  return false
}

/**
 * Identifica se a requisição foi abortada ou autocancelada pelo PocketBase / Fetch API.
 */
export function isAbortError(err: unknown): boolean {
  if (!err) return false
  if (typeof err === 'object' && err !== null) {
    const obj = err as Record<string, unknown>
    if (obj.isAbort === true || obj.name === 'AbortError') return true
    const msg = String(obj.message || '').toLowerCase()
    if (
      msg.includes('autocancelled') ||
      msg.includes('the request was aborted') ||
      msg.includes('aborterror')
    ) {
      return true
    }
  }
  return false
}

/**
 * Formata um erro do PocketBase em mensagem amigável legível.
 */
export function formatPbError(
  error: unknown,
  fallback = 'Erro na operação com o servidor.',
): string {
  if (isAbortError(error)) return 'A requisição foi cancelada.'
  if (isAuthSessionError(error)) return 'Sua sessão expirou. Faça login novamente.'
  return getErrorMessage(error) || fallback
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
