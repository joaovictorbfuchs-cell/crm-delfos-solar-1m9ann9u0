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
 * Identifica se um erro retornado pelo PocketBase decorre de sessão/token expirado,
 * ausência de autenticação ou falta de permissão de acesso (status 401 ou 403).
 */
export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false

  // Checagem direta de status HTTP
  if (typeof error === 'object' && error !== null) {
    const errObj = error as Record<string, unknown>
    const status = Number(errObj.status ?? errObj.statusCode ?? (errObj.response as any)?.status)
    if (status === 401 || status === 403) return true
  }

  // Checagem de mensagens típicas de sessão expirada / não autorizada
  const msg =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error
        ? String((error as any).message)
        : String(error)

  const lower = msg.toLowerCase()
  if (
    lower.includes('token is expired') ||
    lower.includes('failed to authenticate') ||
    lower.includes('sessão expirada') ||
    lower.includes('login expirou') ||
    lower.includes('não autorizado') ||
    lower.includes('unauthorized') ||
    lower.includes('forbidden')
  ) {
    return true
  }

  return false
}
