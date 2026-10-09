import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

/**
 * Identifica se um erro lançado por chamadas ao PocketBase decorre de
 * sessão de autenticação expirada, token inválido ou ausente.
 * Trata códigos HTTP 401 (Unauthorized) e 403 (Forbidden), mensagens de token expirado
 * e erros de autenticação/refresh com código 400.
 */
export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false

  // ClientResponseError do PocketBase
  if (error instanceof ClientResponseError) {
    if (error.status === 401 || error.status === 403) return true
    const msg = (error.message || '').toLowerCase()
    if (
      msg.includes('token') &&
      (msg.includes('expired') || msg.includes('invalid') || msg.includes('revoked'))
    ) {
      return true
    }
    // Erros de refresh de autenticação podem retornar 400 com mensagem específica
    if (
      error.status === 400 &&
      (msg.includes('failed to authenticate') ||
        msg.includes('failed to refresh') ||
        msg.includes('invalid auth') ||
        msg.includes('auth_token'))
    ) {
      return true
    }
    return false
  }

  // Objetos genéricos ou outros formatos ({ status: 401 }, { statusCode: 401 }, Error, etc.)
  if (typeof error === 'object') {
    const errObj = error as Record<string, unknown>
    const status =
      errObj.status ??
      errObj.statusCode ??
      (errObj.response as Record<string, unknown> | undefined)?.status
    if (status === 401 || status === 403) return true

    const message =
      typeof errObj.message === 'string'
        ? errObj.message
        : typeof (errObj.response as Record<string, unknown> | undefined)?.message === 'string'
          ? ((errObj.response as Record<string, unknown>).message as string)
          : ''

    const lowerMsg = message.toLowerCase()
    if (
      lowerMsg.includes('token') &&
      (lowerMsg.includes('expired') || lowerMsg.includes('invalid') || lowerMsg.includes('revoked'))
    ) {
      return true
    }
    if (
      lowerMsg.includes('jwt') &&
      (lowerMsg.includes('expired') ||
        lowerMsg.includes('invalid') ||
        lowerMsg.includes('malformed'))
    ) {
      return true
    }
    if (
      status === 400 &&
      (lowerMsg.includes('failed to authenticate') ||
        lowerMsg.includes('failed to refresh') ||
        lowerMsg.includes('invalid auth') ||
        lowerMsg.includes('auth_token'))
    ) {
      return true
    }
  }

  return false
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
