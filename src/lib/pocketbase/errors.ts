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
 * Determina se um erro qualquer (tipicamente um ClientResponseError do PocketBase)
 * representa uma sessão de autenticação expirada/inválida.
 *
 * Critérios (comportamento esperado pelo CRM):
 * - HTTP 401 ou 403 (via `status` atual do SDK ou `statusCode` legado, inclusive em `response.status`)
 * - Mensagens de token expirado/revogado/inválido
 * - Falha no refresh do auth_token / sessão não autorizada
 */
export function isAuthSessionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false

  const err = error as {
    status?: unknown
    statusCode?: unknown
    message?: unknown
    response?: { status?: unknown; message?: unknown }
  }

  // HTTP 401/403: status atual do SDK, statusCode legado ou status da resposta
  const statusCandidates: unknown[] = [err.status, err.statusCode, err.response?.status]
  for (const candidate of statusCandidates) {
    if (candidate === 401 || candidate === 403) return true
  }

  // Mensagens de token expirado/revogado/inválido ou refresh de auth_token inválido
  const rawMessage =
    (typeof err.message === 'string' && err.message) ||
    (typeof err.response?.message === 'string' && err.response.message) ||
    ''
  if (!rawMessage) return false

  const message = rawMessage.toLowerCase()
  const sessionErrorPatterns = [
    'token is expired',
    'token expired',
    'expired token',
    'invalid or expired token',
    'token is invalid',
    'invalid token',
    'token inválido',
    'token invalido',
    'token is revoked',
    'token revoked',
    'revoked token',
    'token revogado',
    'invalid or revoked token',
    'auth_token',
    'auth token',
    'authentication token',
    'unauthorized',
    'não autorizado',
    'nao autorizado',
    'forbidden',
    'session expired',
    'sessão expirada',
    'sessao expirada',
    'sessão inválida',
    'sessao invalida',
    'invalid session',
  ]
  return sessionErrorPatterns.some((pattern) => message.includes(pattern))
}
