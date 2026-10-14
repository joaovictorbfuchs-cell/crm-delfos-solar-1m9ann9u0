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
 * Identifica se um erro lançado por requisições ao PocketBase é relativo a sessão
 * inválida ou expirada (HTTP 401/403, token inválido, autenticação necessária).
 */
export function isAuthSessionError(err: unknown): boolean {
  if (!err) return false

  // Se for ClientResponseError do PocketBase
  if (err instanceof ClientResponseError) {
    if (err.status === 401 || err.status === 403) return true
    const msg = (err.message || '').toLowerCase()
    if (
      msg.includes('requires valid authentication') ||
      msg.includes('token') ||
      msg.includes('session expired') ||
      msg.includes('sessão expirada') ||
      msg.includes('login expirou')
    ) {
      return true
    }
  }

  // Se for objeto genérico com status ou response.status
  if (typeof err === 'object') {
    const anyErr = err as Record<string, unknown>
    const status =
      anyErr.status ??
      (anyErr.response as Record<string, unknown> | undefined)?.status ??
      anyErr.statusCode
    if (status === 401 || status === 403) return true

    const msg = String(
      anyErr.message || (anyErr.response as Record<string, unknown> | undefined)?.message || '',
    ).toLowerCase()
    if (
      msg.includes('requires valid authentication') ||
      msg.includes('auth/invalid auth token') ||
      msg.includes('token is expired') ||
      msg.includes('token expired') ||
      msg.includes('failed to authenticate') ||
      msg.includes('sessão expirada') ||
      msg.includes('sessao expirada') ||
      msg.includes('login expirou') ||
      msg.includes('session expired')
    ) {
      return true
    }
  }

  return false
}
