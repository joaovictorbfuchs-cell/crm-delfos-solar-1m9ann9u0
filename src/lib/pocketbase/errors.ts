import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

/**
 * Identifica se um erro retornado pelo PocketBase indica que a sessão do usuário
 * expirou, é inválida ou não autorizada (HTTP 401/403 ou tokens expirados).
 */
export function isAuthSessionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false

  const errObj = error as Record<string, unknown>

  // AbortError e requisições canceladas não são erro de sessão
  if (errObj.isAbort === true || errObj.name === 'AbortError') return false

  // Status HTTP direto
  const status =
    (typeof errObj.status === 'number' ? errObj.status : undefined) ??
    (typeof errObj.statusCode === 'number' ? errObj.statusCode : undefined) ??
    (errObj.response && typeof (errObj.response as Record<string, unknown>).status === 'number'
      ? ((errObj.response as Record<string, unknown>).status as number)
      : undefined)

  if (status === 401 || status === 403) return true

  // Verificação por mensagem de erro conhecida
  const message =
    typeof errObj.message === 'string'
      ? errObj.message
      : typeof (errObj.data as Record<string, unknown>)?.message === 'string'
        ? ((errObj.data as Record<string, unknown>).message as string)
        : ''

  if (message) {
    const msgLower = message.toLowerCase()
    if (
      msgLower.includes('token is expired or invalid') ||
      msgLower.includes('sessão expirada') ||
      msgLower.includes('sessao expirada') ||
      msgLower.includes('login expirou') ||
      msgLower.includes('failed to authenticate') ||
      msgLower.includes('the request requires valid user authorization')
    ) {
      return true
    }
  }

  return false
}

/**
 * Identifica se um erro foi disparado pelo cancelamento intencional de uma requisição.
 */
export function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const errObj = error as Record<string, unknown>
  return errObj.isAbort === true || errObj.name === 'AbortError'
}

/**
 * Formata um erro do PocketBase para exibição amigável ao usuário.
 */
export function formatPbError(error: unknown, fallback = 'Erro ao processar requisição'): string {
  if (!error) return fallback
  if (isAuthSessionError(error)) return 'Sua sessão expirou. Faça login novamente.'
  return getErrorMessage(error) || fallback
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
