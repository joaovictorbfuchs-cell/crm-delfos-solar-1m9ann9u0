import { ClientResponseError } from 'pocketbase'

/**
 * Identifica se um erro recebido é relacionado a sessão/autenticação expirada ou inválida (401/403).
 * Implementado de forma autônoma e resiliente a diferentes formatos de erro (ClientResponseError, objetos genéricos, Error com mensagem).
 */
export function isAuthSessionError(err: unknown): boolean {
  if (!err) return false

  // PocketBase ClientResponseError ou objetos com status/statusCode
  if (typeof err === 'object') {
    const candidate = err as Record<string, unknown>
    const status =
      candidate.status ??
      (candidate.response as Record<string, unknown> | undefined)?.status ??
      candidate.statusCode
    if (typeof status === 'number' && (status === 401 || status === 403)) {
      return true
    }
  }

  // Verificação por mensagem de erro
  const message =
    err instanceof Error
      ? err.message
      : typeof err === 'object' &&
          err !== null &&
          'message' in err &&
          typeof (err as { message: unknown }).message === 'string'
        ? (err as { message: string }).message
        : typeof err === 'string'
          ? err
          : ''

  if (!message) return false

  const normalized = message.toLowerCase()
  return (
    normalized.includes('token is expired') ||
    normalized.includes('token expired') ||
    normalized.includes('failed to authenticate') ||
    normalized.includes('login expirou') ||
    normalized.includes('sessão expirada') ||
    normalized.includes('sessao expirada') ||
    normalized.includes('unauthorized') ||
    normalized.includes('the request requires valid user authorization')
  )
}

/**
 * Verifica se o erro foi decorrente de cancelamento/abort de requisição (auto-cancellation do PocketBase ou DOM AbortError).
 */
export function isAbortError(err: unknown): boolean {
  if (!err) return false
  if (typeof err === 'object') {
    const candidate = err as Record<string, unknown>
    if (candidate.isAbort || candidate.name === 'AbortError') return true
  }
  const msg = err instanceof Error ? err.message : String(err)
  return msg.toLowerCase().includes('autocancelled') || msg.toLowerCase().includes('aborted')
}

/**
 * Formata um erro do PocketBase em texto legível para o usuário final.
 */
export function formatPbError(
  error: unknown,
  fallbackMessage = 'Ocorreu um erro inesperado.',
): string {
  if (!error) return fallbackMessage
  const extracted = getErrorMessage(error)
  if (extracted && extracted !== 'An unexpected error occurred.') return extracted
  if (error instanceof Error && error.message) return error.message
  return fallbackMessage
}

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

export default {
  isAuthSessionError,
  isAbortError,
  formatPbError,
  extractFieldErrors,
  getErrorMessage,
}
