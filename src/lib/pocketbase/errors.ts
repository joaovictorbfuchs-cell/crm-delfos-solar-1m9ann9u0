import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

/**
 * Detecta se o erro decorre de sessão expirada ou credenciais inválidas (401/403).
 */
export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false
  if (typeof error === 'object') {
    const errObj = error as Record<string, unknown>
    if (errObj.isAbort === true) return false
    const status = (errObj.status ??
      (errObj.response as Record<string, unknown> | undefined)?.status ??
      errObj.statusCode) as number | undefined
    if (status === 401 || status === 403) return true
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    return (
      msg.includes('token is expired') ||
      msg.includes('invalid token') ||
      msg.includes('failed to authenticate') ||
      msg.includes('sessão expirada') ||
      msg.includes('login expirou')
    )
  }
  return false
}

/**
 * Detecta se o erro foi por cancelamento/autocancelamento de requisição.
 */
export function isAbortError(error: unknown): boolean {
  if (!error) return false
  if (typeof error === 'object') {
    const errObj = error as Record<string, unknown>
    if (errObj.isAbort === true) return true
    if (errObj.name === 'AbortError') return true
  }
  if (error instanceof Error && error.name === 'AbortError') return true
  return false
}

/**
 * Extrai erros de validação por campo retornados pelo PocketBase.
 */
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

/**
 * Retorna mensagem legível para o usuário a partir de um erro qualquer ou ClientResponseError.
 */
export function getErrorMessage(error: unknown): string {
  if (!(error instanceof ClientResponseError)) {
    return error instanceof Error ? error.message : 'Ocorreu um erro inesperado.'
  }
  const msgs = Object.values(extractFieldErrors(error))
  return msgs.length > 0 ? msgs.join(' ') : error.message || 'Ocorreu um erro inesperado.'
}

/**
 * Formata erro PocketBase para exibição em toasts ou logs.
 */
export function formatPbError(error: unknown): string {
  return getErrorMessage(error)
}
