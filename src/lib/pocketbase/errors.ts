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
 * Identifica se um erro retornado pelo PocketBase / API decorre de sessão expirada,
 * não autenticada ou não autorizada (401 / 403 / token expirado).
 */
export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false

  // ClientResponseError do PocketBase ou objeto com status/statusCode
  const errObj = error as {
    status?: unknown
    statusCode?: unknown
    message?: unknown
    response?: { code?: unknown; message?: unknown; status?: unknown }
  }

  const status = Number(
    errObj.status || errObj.statusCode || errObj.response?.status || errObj.response?.code,
  )
  if (status === 401 || status === 403) {
    return true
  }

  const msg = String(errObj.message || errObj.response?.message || '').toLowerCase()
  if (
    msg.includes('token is expired') ||
    msg.includes('token expired') ||
    msg.includes('token is invalid') ||
    msg.includes('unauthorized') ||
    msg.includes('the request requires valid user authorization') ||
    msg.includes('sessão expirada') ||
    msg.includes('sessao expirada') ||
    msg.includes('não autenticado') ||
    msg.includes('nao autenticado')
  ) {
    return true
  }

  return false
}
