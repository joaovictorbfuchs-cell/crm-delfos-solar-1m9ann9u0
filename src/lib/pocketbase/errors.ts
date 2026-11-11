import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

/**
 * Indica se o erro corresponde a uma sessão de autenticação expirada/inválida
 * (401/403, token expirado, login expirado). Usado para disparar re-login.
 */
export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false

  // ClientResponseError do PocketBase (status direto ou em response.status)
  if (typeof error === 'object') {
    const err = error as { status?: unknown; statusCode?: unknown; response?: { status?: unknown } }
    const status = err.status ?? err.statusCode ?? err.response?.status
    if (status === 401 || status === 403) return true

    const message =
      error instanceof Error
        ? error.message
        : String((error as { message?: unknown })?.message ?? '')
    const texto = message.toLowerCase()
    if (
      texto.includes('token is expired') ||
      texto.includes('token expirado') ||
      texto.includes('the request requires valid record authorization token') ||
      texto.includes('failed to authenticate') ||
      texto.includes('autenticação falhou') ||
      texto.includes('sessão expirada') ||
      texto.includes('login expirou') ||
      texto.includes('login expirado')
    ) {
      return true
    }
  }

  if (typeof error === 'string') {
    const texto = error.toLowerCase()
    if (
      texto.includes('token is expired') ||
      texto.includes('token expirado') ||
      texto.includes('failed to authenticate') ||
      texto.includes('sessão expirada') ||
      texto.includes('login expirou') ||
      texto.includes('login expirado')
    ) {
      return true
    }
  }

  return false
}

/** Erros de requisição abortada (auto-cancelamento do PocketBase / AbortController). */
export function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const err = error as { isAbort?: unknown; name?: unknown }
  return err.isAbort === true || err.name === 'AbortError'
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

/** Mensagem amigável para exibição ao usuário, combinando erros por campo quando existirem. */
export function formatPbError(error: unknown): string {
  if (isAuthSessionError(error)) {
    return 'Sua sessão expirou. Faça login novamente para continuar.'
  }
  if (error instanceof ClientResponseError) {
    const fieldMsgs = Object.values(extractFieldErrors(error))
    if (fieldMsgs.length > 0) return fieldMsgs.join(' ')
    return error.message || 'Ocorreu um erro inesperado.'
  }
  if (isAbortError(error)) return 'Requisição cancelada.'
  return error instanceof Error ? error.message : 'Ocorreu um erro inesperado.'
}

export function getErrorMessage(error: unknown): string {
  if (!(error instanceof ClientResponseError)) {
    return error instanceof Error ? error.message : 'An unexpected error occurred.'
  }
  const msgs = Object.values(extractFieldErrors(error))
  return msgs.length > 0 ? msgs.join(' ') : error.message || 'An unexpected error occurred.'
}
