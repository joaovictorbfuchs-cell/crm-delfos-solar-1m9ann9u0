import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

/**
 * Determina se o erro representa uma sessão de autenticação expirada/inválida.
 * Export crítico: NUNCA remover deste arquivo (ver exportsGuard.test.ts).
 *
 * Cobre: status 401/403, statusCode, response.status, mensagens de token/sessão (pt/en).
 */
export function isAuthSessionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false

  const err = error as {
    status?: number
    statusCode?: number
    response?: { status?: number }
    message?: string
    isAbort?: boolean
    name?: string
  }

  if (err.isAbort === true) return false
  if (err.name === 'AbortError') return false

  if (err.status === 401 || err.status === 403) return true
  if (err.statusCode === 401 || err.statusCode === 403) return true
  if (err.response?.status === 401 || err.response?.status === 403) return true

  const message = typeof err.message === 'string' ? err.message.toLowerCase() : ''
  if (!message) return false

  const tokens = [
    'token is expired',
    'token expirado',
    'token invalid',
    'token inválido',
    'failed to authenticate',
    'falha ao autenticar',
    'sessão expirada',
    'sessao expirada',
    'login expirou',
    'login expirado',
    'autenticação expirada',
    'autenticacao expirada',
    'unauthorized',
    'não autorizado',
    'nao autorizado',
  ]
  return tokens.some((t) => message.includes(t))
}

/**
 * Determina se o erro é de abortamento de requisição (auto-cancellation do SDK).
 * Export crítico: NUNCA remover deste arquivo (ver exportsGuard.test.ts).
 */
export function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const err = error as { isAbort?: boolean; name?: string }
  if (err.isAbort === true) return true
  if (err.name === 'AbortError') return true
  return false
}

/**
 * Formata um erro PocketBase em mensagem legível para o usuário.
 * Export crítico: NUNCA remover deste arquivo (ver exportsGuard.test.ts).
 */
export function formatPbError(error: unknown): string {
  if (!error) return 'Ocorreu um erro inesperado.'

  if (error instanceof ClientResponseError) {
    const fieldMsgs = Object.values(extractFieldErrors(error))
    if (fieldMsgs.length > 0) return fieldMsgs.join(' ')

    if (isAuthSessionError(error)) {
      return 'Sua sessão expirou. Faça login novamente.'
    }
    if (isAbortError(error)) {
      return 'Requisição cancelada.'
    }
    return error.message || 'Ocorreu um erro inesperado.'
  }

  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'Ocorreu um erro inesperado.'
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
