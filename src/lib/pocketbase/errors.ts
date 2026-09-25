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
 * Detecta se um erro ou status representa falha de autenticação/sessão expirada do PocketBase.
 * Erros 401 (Unauthorized) ou 403 (Forbidden) ao acessar coleções protegidas,
 * além de mensagens explícitas de token inválido/expirado.
 */
export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false
  const err = error as any

  // 1. Status HTTP 401 ou 403
  if (err?.status === 401 || err?.status === 403) return true
  if (err?.response?.status === 401 || err?.response?.status === 403) return true

  // 2. Erros com código ou nome de token inválido
  const code = String(err?.code || err?.response?.code || '')
  if (code === '401' || code === '403') return true

  // 3. Verificação textual na mensagem do erro
  const msg = String(err?.message || err?.response?.message || '').toLowerCase()
  if (
    msg.includes('token') &&
    (msg.includes('expired') ||
      msg.includes('invalid') ||
      msg.includes('revoked') ||
      msg.includes('expirado'))
  ) {
    return true
  }
  if (
    msg.includes('failed to authenticate') ||
    msg.includes('unauthorized') ||
    msg.includes('sessão expirada')
  ) {
    return true
  }

  return false
}
