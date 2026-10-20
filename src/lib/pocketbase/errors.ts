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
 * Identifica de forma autônoma e resiliente se um erro é decorrente de sessão expirada,
 * token inválido, 401 Unauthorized ou 403 Forbidden.
 */
export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false

  // ClientResponseError do PocketBase ou objeto de erro com status/statusCode
  const anyErr = error as {
    status?: unknown
    statusCode?: unknown
    response?: { status?: unknown; statusCode?: unknown; message?: unknown }
    message?: unknown
    name?: unknown
    isAbort?: unknown
  }

  const status = Number(
    anyErr.status ?? anyErr.statusCode ?? anyErr.response?.status ?? anyErr.response?.statusCode,
  )
  if (status === 401 || status === 403) return true

  const msg = String(anyErr.message || anyErr.response?.message || '').toLowerCase()
  if (
    msg.includes('token is expired') ||
    msg.includes('token has expired') ||
    msg.includes('token expired') ||
    msg.includes('token is invalid') ||
    msg.includes('failed to authenticate') ||
    msg.includes('sessão expirada') ||
    msg.includes('sessao expirada') ||
    msg.includes('login expirou') ||
    msg.includes('unauthorized') ||
    msg.includes('the request requires valid user authorization') ||
    msg.includes('the request requires valid admin authorization')
  ) {
    return true
  }

  return false
}

/** Formata mensagem amigável de erro PocketBase */
export function formatPbError(
  error: unknown,
  fallbackMessage = 'Ocorreu um erro na requisição',
): string {
  if (!error) return fallbackMessage
  if (isAuthSessionError(error)) {
    return 'Sua sessão expirou. Faça login novamente.'
  }
  return getErrorMessage(error) || fallbackMessage
}

/** Verifica se a requisição foi abortada pelo autocancellation do PocketBase */
export function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const anyErr = error as { isAbort?: unknown; name?: unknown; message?: unknown }
  return (
    Boolean(anyErr.isAbort) ||
    anyErr.name === 'AbortError' ||
    String(anyErr.message || '')
      .toLowerCase()
      .includes('autocancelled')
  )
}
