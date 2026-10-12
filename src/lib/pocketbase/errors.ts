import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

/**
 * Identifica se um erro é decorrente de sessão inválida, token expirado ou falha 401/403.
 * Utilizado por Providers e componentes para interceptar expiração de sessão e redirecionar ao login.
 */
export function isAuthSessionError(err: unknown): boolean {
  if (!err) return false

  // Se já for ClientResponseError do PocketBase
  if (err instanceof ClientResponseError) {
    if (err.status === 401 || err.status === 403) return true
  }

  // Se for objeto com campo status ou statusCode
  if (typeof err === 'object' && err !== null) {
    const candidate = err as Record<string, unknown>
    if (candidate.status === 401 || candidate.status === 403) return true
    if (candidate.statusCode === 401 || candidate.statusCode === 403) return true
    if (typeof candidate.message === 'string') {
      const msg = candidate.message.toLowerCase()
      if (
        msg.includes('token is expired') ||
        msg.includes('failed to authenticate') ||
        msg.includes('unauthorized') ||
        msg.includes('forbidden')
      ) {
        return true
      }
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
