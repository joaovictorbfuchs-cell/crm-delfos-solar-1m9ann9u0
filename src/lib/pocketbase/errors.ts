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
 * Identifica se o erro é decorrente de sessão de autenticação expirada, token inválido ou não autorizado (401 / 403).
 */
export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false

  // PocketBase ClientResponseError ou objeto com status HTTP
  if (typeof error === 'object' && error !== null) {
    const errObj = error as {
      status?: unknown
      response?: { status?: unknown }
      message?: unknown
      isAbort?: unknown
    }

    // Erros de cancelamento/abort não devem ser tratados como expiração de auth
    if (errObj.isAbort === true) return false

    const status = Number(errObj.status ?? errObj.response?.status)
    if (status === 401 || status === 403) {
      return true
    }

    const message =
      typeof errObj.message === 'string'
        ? errObj.message
        : error instanceof Error
          ? error.message
          : ''

    if (message) {
      const lower = message.toLowerCase()
      // Se for cancelamento explícito, não é auth error
      if (lower.includes('aborted') || lower.includes('autocancelled')) {
        return false
      }
      if (
        lower.includes('token is expired') ||
        lower.includes('token expired') ||
        lower.includes('sessão expirada') ||
        lower.includes('sessao expirada') ||
        lower.includes('login expirou') ||
        lower.includes('failed to authenticate') ||
        lower.includes('invalid token')
      ) {
        return true
      }
    }
  }

  if (error instanceof Error) {
    const lower = error.message.toLowerCase()
    if (lower.includes('aborted') || lower.includes('autocancelled')) {
      return false
    }
    if (
      lower.includes('token is expired') ||
      lower.includes('token expired') ||
      lower.includes('sessão expirada') ||
      lower.includes('sessao expirada') ||
      lower.includes('login expirou') ||
      lower.includes('failed to authenticate') ||
      lower.includes('invalid token')
    ) {
      return true
    }
  }

  return false
}

/**
 * Identifica se a requisição foi abortada/cancelada pelo autocancel do PocketBase ou pelo AbortController.
 */
export function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const errObj = error as { isAbort?: unknown; name?: unknown; message?: unknown }
  if (errObj.isAbort === true) return true
  if (errObj.name === 'AbortError') return true
  if (typeof errObj.message === 'string') {
    const lower = errObj.message.toLowerCase()
    return lower.includes('the request was aborted') || lower.includes('autocancelled')
  }
  return false
}

/**
 * Formata um erro retornado pelo PocketBase para exibição amigável ao usuário.
 */
export function formatPbError(error: unknown): string {
  if (!error) return 'Erro desconhecido'
  return getErrorMessage(error)
}
