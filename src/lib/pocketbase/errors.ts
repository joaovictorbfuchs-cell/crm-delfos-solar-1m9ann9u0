import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

/**
 * Identifica se um erro é decorrente de sessão inválida, token expirado ou erro 401/403.
 * Usado amplamente no Delfos Solar para evitar telas brancas e disparar refresh de sessão.
 */
export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false

  // Status numérico direto ou em objeto aninhado
  const errObj = error as {
    status?: unknown
    statusCode?: unknown
    response?: { status?: unknown }
    message?: unknown
    name?: unknown
  }

  const status = Number(errObj.status || errObj.statusCode || errObj.response?.status)
  if (status === 401 || status === 403) {
    return true
  }

  // Verificação por mensagem de erro ou erro típico do PocketBase
  const msg = String(errObj.message || error || '').toLowerCase()
  if (
    msg.includes('failed to authenticate') ||
    msg.includes('token is expired') ||
    msg.includes('token expired') ||
    msg.includes('invalid token') ||
    msg.includes('login expirou') ||
    msg.includes('sessão expirada') ||
    msg.includes('sessao expirada') ||
    msg.includes('the request requires higher permissions') ||
    msg.includes('higher permissions') ||
    msg.includes('the request requires valid')
  ) {
    return true
  }

  return false
}

/**
 * Identifica erros de autocancelação de requisição (abort / autocancel)
 */
export function isAbortError(error: unknown): boolean {
  if (!error) return false
  const errObj = error as { isAbort?: unknown; name?: unknown; message?: unknown }
  if (errObj.isAbort === true) return true
  if (errObj.name === 'AbortError') return true
  const msg = String(errObj.message || '').toLowerCase()
  return msg.includes('autocancelled') || msg.includes('the request was autocancelled')
}

/**
 * Formata erro do PocketBase de forma amigável
 */
export function formatPbError(
  error: unknown,
  fallback = 'Ocorreu um erro ao processar a requisição.',
): string {
  if (!error) return fallback
  const detailed = getErrorMessage(error)
  if (detailed && detailed !== 'An unexpected error occurred.') {
    return detailed
  }
  if (error instanceof Error && error.message) {
    return error.message
  }
  return fallback
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
