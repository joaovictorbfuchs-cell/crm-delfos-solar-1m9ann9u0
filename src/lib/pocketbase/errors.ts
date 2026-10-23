import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

/**
 * Identifica se um erro recebido é de autenticação ou sessão expirada/inválida (401 ou 403).
 * Trata tanto ClientResponseError de PocketBase quanto objetos de erro genéricos.
 * Ignora erros de requisição cancelada (isAbort / AbortError / autocancelled).
 */
export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false
  if (typeof error === 'object') {
    const errObj = error as Record<string, unknown>
    // Ignora abort / autocancel
    if (
      errObj.isAbort === true ||
      errObj.name === 'AbortError' ||
      (typeof errObj.message === 'string' &&
        (errObj.message.toLowerCase().includes('autocancelled') ||
          errObj.message.toLowerCase().includes('the request was aborted')))
    ) {
      return false
    }

    // Status numérico
    const status =
      (typeof errObj.status === 'number' && errObj.status) ||
      (typeof errObj.statusCode === 'number' && errObj.statusCode) ||
      (typeof (errObj.response as Record<string, unknown>)?.status === 'number' &&
        (errObj.response as Record<string, unknown>).status)
    if (status === 401 || status === 403) {
      return true
    }

    // Mensagens textuais características de sessão inválida / token expirado
    const msg =
      typeof errObj.message === 'string'
        ? errObj.message.toLowerCase()
        : typeof (errObj.response as Record<string, unknown>)?.message === 'string'
          ? String((errObj.response as Record<string, unknown>).message).toLowerCase()
          : ''

    if (
      msg.includes('token is expired') ||
      msg.includes('token expired') ||
      msg.includes('failed to authenticate') ||
      msg.includes('sessão expirada') ||
      msg.includes('sessao expirada') ||
      msg.includes('login expirou') ||
      msg.includes('unauthorized') ||
      msg.includes('forbidden')
    ) {
      return true
    }
  }
  return false
}

/**
 * Identifica requisições canceladas por autocancel ou abort controller.
 */
export function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const errObj = error as Record<string, unknown>
  return (
    errObj.isAbort === true ||
    errObj.name === 'AbortError' ||
    (typeof errObj.message === 'string' &&
      (errObj.message.toLowerCase().includes('autocancelled') ||
        errObj.message.toLowerCase().includes('the request was aborted')))
  )
}

/**
 * Formata erro do PocketBase em mensagem legível ao usuário.
 */
export function formatPbError(
  error: unknown,
  fallback = 'Ocorreu um erro ao processar a operação.',
): string {
  if (isAuthSessionError(error)) {
    return 'Sua sessão expirou ou não possui permissão. Faça login novamente.'
  }
  const msg = getErrorMessage(error)
  return msg && msg !== 'An unexpected error occurred.' ? msg : fallback
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
