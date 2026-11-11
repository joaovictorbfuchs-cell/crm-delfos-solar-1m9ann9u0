import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

/**
 * Detecta erros de sessão/auth (401/403, token expirado) a partir de qualquer forma
 * de erro (ClientResponseError, Error, objeto com status/statusCode/response).
 */
export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false

  if (error instanceof ClientResponseError) {
    if (error.status === 401 || error.status === 403) return true
  }

  const obj = error as {
    status?: unknown
    statusCode?: unknown
    response?: { status?: unknown }
    message?: unknown
  }
  const status =
    (typeof obj.status === 'number' ? obj.status : undefined) ??
    (typeof obj.statusCode === 'number' ? obj.statusCode : undefined) ??
    (obj.response && typeof obj.response === 'object' && typeof obj.response.status === 'number'
      ? obj.response.status
      : undefined)
  if (status === 401 || status === 403) return true

  const msg =
    error instanceof Error ? error.message : typeof obj.message === 'string' ? obj.message : ''
  const lowered = msg.toLowerCase()
  if (
    lowered.includes('token is expired') ||
    lowered.includes('token expirado') ||
    lowered.includes('sessão expirada') ||
    lowered.includes('sessao expirada') ||
    lowered.includes('login expirou') ||
    lowered.includes('failed to authenticate') ||
    lowered.includes('falha na autenticação') ||
    lowered.includes('falha na autenticacao') ||
    lowered.includes('the request requires valid authentication')
  ) {
    return true
  }

  return false
}

/** Detecta erros de requisição abortada (auto-cancelamento do SDK, AbortController etc.). */
export function isAbortError(error: unknown): boolean {
  if (!error) return false
  const obj = error as { isAbort?: unknown; name?: unknown }
  if (obj.isAbort === true) return true
  if (obj.name === 'AbortError') return true
  if (error instanceof DOMException && error.name === 'AbortError') return true
  return false
}

/** Formata um erro qualquer em uma mensagem legível (com detalhes de campo do PocketBase). */
export function formatPbError(error: unknown): string {
  if (isAuthSessionError(error)) return 'Sessão expirada. Faça login novamente.'
  if (error instanceof ClientResponseError) {
    const campos = extractFieldErrors(error)
    const detalhes = Object.values(campos)
    if (detalhes.length > 0) return detalhes.join(' ')
    return error.message || 'Erro na requisição.'
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
    const msg =
      detail && typeof detail === 'object' && 'message' in detail
        ? (detail as { message: unknown }).message
        : undefined
    if (typeof msg === 'string') {
      errors[field] = msg
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
