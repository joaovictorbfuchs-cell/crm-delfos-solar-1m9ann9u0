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
 * Identifica se um erro recebido representa uma sessão de autenticação expirada, revogada ou inválida:
 * - HTTP status 401 (Unauthorized) ou 403 (Forbidden)
 * - Mensagens típicas de PocketBase/JWT ("Token is expired", "Failed to authenticate", etc.)
 */
export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false

  if (error instanceof ClientResponseError) {
    if (error.status === 401 || error.status === 403) return true
  }

  if (typeof error === 'object' && error !== null) {
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

    if (message) {
      const lower = message.toLowerCase()
      if (
        lower.includes('token is expired') ||
        lower.includes('token expired') ||
        lower.includes('token is invalid') ||
        lower.includes('failed to authenticate') ||
        lower.includes('sessão expirada') ||
        lower.includes('sessao expirada') ||
        lower.includes('unauthorized') ||
        lower.includes('jwt expired')
      ) {
        return true
      }
    }
  }

  return false
}
