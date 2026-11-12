import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

/**
 * Verifica se um erro representa uma sessão/autenticação expirada ou inválida.
 * Cobre: status 401/403 (direto ou em response/response.status/statusCode),
 * além de textos comuns de token expirado (PT e EN).
 */
export function isAuthSessionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    // Textos de token expirado em erros que não são objetos (Error puro)
    if (error instanceof Error) {
      const m = error.message || ''
      const lower = m.toLowerCase()
      if (
        lower.includes('token is expired') ||
        lower.includes('token expired') ||
        lower.includes('failed to authenticate') ||
        lower.includes('sessão expirada') ||
        lower.includes('login expirou')
      ) {
        return true
      }
    }
    return false
  }

  const err = error as Record<string, unknown>

  // Status direto, em response, ou em statusCode
  const status =
    (typeof err.status === 'number' && err.status) ||
    (typeof err.statusCode === 'number' && err.statusCode) ||
    (() => {
      const resp = err.response as Record<string, unknown> | undefined
      if (resp && typeof resp === 'object' && typeof resp.status === 'number') return resp.status
      return 0
    })()

  if (status === 401 || status === 403) return true

  // Textos de token/sessão expirada em message de Error instanciado
  if (err instanceof Error) {
    const lower = (err.message || '').toLowerCase()
    if (
      lower.includes('token is expired') ||
      lower.includes('token expired') ||
      lower.includes('failed to authenticate') ||
      lower.includes('sessão expirada') ||
      lower.includes('login expirou')
    ) {
      return true
    }
  }

  return false
}

/**
 * Verifica se o erro é um aborto de requisição (timeout ou cancelamento).
 */
export function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const err = error as Record<string, unknown>
  return err.isAbort === true || err.name === 'AbortError'
}

/**
 * Formata uma mensagem de erro amigável a partir de qualquer erro.
 * Prioriza mensagens de campo (extractFieldErrors), depois response.message,
 * depois error.message, com fallback em texto genérico.
 */
export function formatPbError(error: unknown): string {
  if (error instanceof ClientResponseError) {
    const fieldMsgs = Object.values(extractFieldErrors(error))
    if (fieldMsgs.length > 0) return fieldMsgs.join(' ')
    const resp = error.response as Record<string, unknown> | undefined
    if (resp && typeof resp.message === 'string' && resp.message) return resp.message
    return error.message || 'Erro inesperado.'
  }
  if (error instanceof Error) return error.message
  if (typeof error === 'string' && error) return error
  return 'Erro inesperado.'
}

export function extractFieldErrors(error: unknown): FieldErrors {
  if (!(error instanceof ClientResponseError)) return {}
  const data = error.response?.data
  if (!data || typeof data !== 'object') return {}
  // Suporta tanto response.data.data (PocketBase < 0.23) quanto response.data
  const source =
    (data as { data?: Record<string, unknown> }).data || (data as Record<string, unknown>)
  if (!source || typeof source !== 'object') return {}
  const errors: FieldErrors = {}
  for (const [field, detail] of Object.entries(source)) {
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
