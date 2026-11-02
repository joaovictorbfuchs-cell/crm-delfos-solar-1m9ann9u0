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
 * Identifica se um erro recebido é relacionado a sessão/token expirado ou 401/403 não autorizado.
 * Usado transversalmente em AuthContext, AtividadesCalendario, FichaExecucaoOS, etc.
 */
export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false

  // ClientResponseError do PocketBase ou objeto de status HTTP
  const status =
    (error as any)?.status ?? (error as any)?.response?.status ?? (error as any)?.statusCode

  if (status === 401 || status === 403) {
    return true
  }

  // Abort / Autocancelled não é erro de sessão expirada
  if (isAbortError(error)) {
    return false
  }

  // Mensagens comuns de erro de token/autenticação no PocketBase e JWT
  const msg =
    (error instanceof Error ? error.message : null) ||
    (error as any)?.message ||
    (error as any)?.response?.message ||
    ''

  const msgLower = String(msg).toLowerCase()
  if (
    msgLower.includes('token is expired') ||
    msgLower.includes('token invalid') ||
    msgLower.includes('sessão expirada') ||
    msgLower.includes('sessao expirada') ||
    msgLower.includes('login expirou') ||
    msgLower.includes('failed to authenticate') ||
    msgLower.includes('the request requires valid user authorization')
  ) {
    return true
  }

  return false
}

/**
 * Identifica se uma requisição foi abortada pelo cliente ou auto-cancelada pelo SDK
 */
export function isAbortError(error: unknown): boolean {
  if (!error) return false
  if ((error as any)?.isAbort === true) return true
  if ((error as any)?.name === 'AbortError') return true
  const msg = (error as any)?.message || ''
  return typeof msg === 'string' && (msg.includes('autocancelled') || msg.includes('aborted'))
}

/**
 * Formata um erro do PocketBase em mensagem amigável em português
 */
export function formatPbError(
  error: unknown,
  fallback = 'Ocorreu um erro ao processar a requisição.',
): string {
  if (isAuthSessionError(error)) {
    return 'Sua sessão expirou. Por favor, faça login novamente.'
  }
  return getErrorMessage(error) || fallback
}
