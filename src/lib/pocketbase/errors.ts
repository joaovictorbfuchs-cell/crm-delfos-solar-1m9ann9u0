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
 * Identifica se um erro recebido do PocketBase ou da camada HTTP representa
 * falha de autenticação/sessão expirada/não autorizada (401 ou 403).
 *
 * Utilizado por AuthContext, ClientesContext, ExecucaoOS, RelatorioOSConteudo e
 * calendários para deslogar ou acionar revalidação de credenciais sem falso-positivos
 * em cancelamentos (autocancelled / abort).
 */
export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false

  // Erros de cancelamento de requisição NUNCA devem ser tratados como erro de autenticação
  if (isAbortError(error)) return false

  const anyErr = error as any

  // Status HTTP direto (ex.: ClientResponseError, Response, Axios ou mock)
  const status = anyErr.status ?? anyErr.statusCode ?? anyErr.response?.status
  if (status === 401 || status === 403) {
    return true
  }

  // Mensagens comuns de erro de autenticação do PocketBase / JWT
  const msg = String(
    anyErr.message || anyErr.data?.message || anyErr.response?.data?.message || '',
  ).toLowerCase()
  if (
    msg.includes('token is expired') ||
    msg.includes('failed to authenticate') ||
    msg.includes('login expirou') ||
    msg.includes('sessão expirada') ||
    msg.includes('sessao expirada') ||
    msg.includes('unauthorized') ||
    msg.includes('forbidden') ||
    msg.includes('invalid auth token') ||
    msg.includes('the request requires valid user authorization') ||
    msg.includes('the request requires admin authorization')
  ) {
    return true
  }

  return false
}

/**
 * Identifica erros de cancelamento de requisição (abort / autocancelled do PocketBase).
 */
export function isAbortError(error: unknown): boolean {
  if (!error) return false
  const anyErr = error as any
  if (anyErr.isAbort === true) return true
  if (anyErr.name === 'AbortError') return true
  const msg = String(anyErr.message || '').toLowerCase()
  if (msg.includes('autocancelled') || msg.includes('the request was aborted')) return true
  return false
}

/**
 * Formata um erro do PocketBase de forma amigável e legível para toasts/alertas.
 */
export function formatPbError(error: unknown, fallback = 'Ocorreu um erro na operação.'): string {
  if (!error) return fallback
  const detailed = getErrorMessage(error)
  if (detailed && detailed !== 'An unexpected error occurred.') {
    return detailed
  }
  if (error instanceof Error && error.message) {
    return error.message
  }
  return fallback
}
