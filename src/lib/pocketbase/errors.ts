import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

/**
 * Verifica se o erro representa uma sessão de autenticação expirada/inválida.
 * Implementação canônica — não reescrever aqui nem em salvaguardas (só reexportar).
 */
export function isAuthSessionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const e = error as {
    status?: number
    statusCode?: number
    response?: { status?: number }
    message?: string
  }
  const status = e.status ?? e.statusCode ?? e.response?.status
  if (status === 401 || status === 403) return true
  const msg = typeof e.message === 'string' ? e.message : ''
  return /token is expired|token expir|sess[ãa]o expirada|login expirou|failed to authenticate|autentica[çc][ãa]o necess/i.test(
    msg,
  )
}

/**
 * Verifica se o erro é um aborto de requisição (autoCancel do PocketBase / AbortController).
 */
export function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const e = error as { isAbort?: boolean; name?: string; message?: string }
  if (e.isAbort === true) return true
  if (e.name === 'AbortError') return true
  return typeof e.message === 'string' && /aborted|autocancel/i.test(e.message)
}

/**
 * Formata um erro do PocketBase (ou genérico) em uma mensagem legível.
 */
export function formatPbError(error: unknown): string {
  if (isAbortError(error)) return 'Requisição cancelada.'
  const msg = getErrorMessage(error)
  return msg || 'Erro inesperado.'
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
