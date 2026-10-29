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
 * Identifica se um erro é de autenticação ou sessão expirada/inválida do PocketBase
 * Suporta status HTTP 401/403, instâncias ClientResponseError, objetos com { status } ou { response: { status } }
 * e mensagens conhecidas de token expirado/sessão terminada.
 */
export function isAuthSessionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false

  // Status direto no erro ou na response
  const anyErr = error as {
    status?: unknown
    statusCode?: unknown
    response?: { status?: unknown }
    message?: unknown
    originalError?: unknown
  }

  const status =
    typeof anyErr.status === 'number'
      ? anyErr.status
      : typeof anyErr.statusCode === 'number'
        ? anyErr.statusCode
        : typeof anyErr.response?.status === 'number'
          ? anyErr.response.status
          : null

  if (status === 401 || status === 403) {
    return true
  }

  // Análise de mensagem textual
  const message =
    typeof anyErr.message === 'string'
      ? anyErr.message.toLowerCase()
      : error instanceof Error
        ? error.message.toLowerCase()
        : ''

  if (
    message.includes('token is expired') ||
    message.includes('token expired') ||
    message.includes('login expirou') ||
    message.includes('sessão expirada') ||
    message.includes('sessao expirada') ||
    message.includes('failed to authenticate') ||
    message.includes('the request requires valid user authorization') ||
    message.includes('the request requires valid admin authorization')
  ) {
    return true
  }

  // Verifica erro aninhado se houver
  if (anyErr.originalError && anyErr.originalError !== error) {
    return isAuthSessionError(anyErr.originalError)
  }

  return false
}

/**
 * Identifica se um erro foi disparado por cancelamento de requisição (abort/autocancel)
 */
export function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const anyErr = error as { isAbort?: unknown; name?: unknown; message?: unknown }
  if (anyErr.isAbort === true) return true
  if (anyErr.name === 'AbortError') return true
  if (
    typeof anyErr.message === 'string' &&
    (anyErr.message.includes('autocancelled') || anyErr.message.includes('The request was aborted'))
  ) {
    return true
  }
  return false
}

/**
 * Formata um erro do PocketBase para exibição amigável em UI/Toasts
 */
export function formatPbError(
  error: unknown,
  fallbackMessage = 'Ocorreu um erro ao processar a operação.',
): string {
  if (!error) return fallbackMessage
  if (isAbortError(error)) return ''
  if (isAuthSessionError(error)) {
    return 'Sua sessão expirou ou não tem permissão para esta operação. Faça login novamente.'
  }
  const detailed = getErrorMessage(error)
  if (detailed && detailed !== 'An unexpected error occurred.') {
    return detailed
  }
  if (error instanceof Error && error.message) {
    return error.message
  }
  return fallbackMessage
}
