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
 * Identifica se um erro recebido do PocketBase ou de requisição representa
 * sessão expirada, token inválido, 401 Unauthorized ou 403 Forbidden.
 */
export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false

  // Se for abort de requisição intencional, não é erro de auth
  if (isAbortError(error)) return false

  const errObj = error as Record<string, unknown>

  // Verifica status HTTP direto ou em response/statusCode
  const status =
    typeof errObj.status === 'number'
      ? errObj.status
      : typeof (errObj.response as Record<string, unknown>)?.status === 'number'
        ? ((errObj.response as Record<string, unknown>).status as number)
        : typeof errObj.statusCode === 'number'
          ? errObj.statusCode
          : null

  if (status === 401 || status === 403) {
    return true
  }

  // Verifica mensagens textuais típicas de expiração de token ou auth
  const msg =
    (error instanceof Error ? error.message : '') ||
    (typeof errObj.message === 'string' ? errObj.message : '')

  const msgLower = msg.toLowerCase()
  if (
    msgLower.includes('token is expired') ||
    msgLower.includes('token expired') ||
    msgLower.includes('sessão expirada') ||
    msgLower.includes('sessao expirada') ||
    msgLower.includes('login expirou') ||
    msgLower.includes('failed to authenticate') ||
    msgLower.includes('the request requires valid user authorization')
  ) {
    return true
  }

  return false
}

/**
 * Identifica se a requisição foi abortada (ex: componente desmontado ou autocancellation)
 */
export function isAbortError(error: unknown): boolean {
  if (!error) return false
  const errObj = error as Record<string, unknown>
  if (errObj.isAbort === true) return true
  if (errObj.name === 'AbortError') return true
  if (error instanceof Error && error.name === 'AbortError') return true
  return false
}

/**
 * Formata um erro do PocketBase para exibição amigável ao usuário
 */
export function formatPbError(error: unknown, fallback = 'Erro na operação'): string {
  if (!error) return fallback
  if (isAuthSessionError(error)) {
    return 'Sua sessão expirou ou não possui autorização. Por favor, faça login novamente.'
  }
  const msg = getErrorMessage(error)
  return msg || fallback
}
