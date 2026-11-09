import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

/**
 * Verifica se um erro representa expiração de token ou falha de autenticação/sessão (401 ou 403).
 */
export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false

  if (typeof error === 'object') {
    const obj = error as Record<string, any>
    if (obj.isAbort) return false

    const status =
      obj.status ??
      obj.statusCode ??
      obj.response?.status ??
      obj.originalError?.status

    if (status === 401 || status === 403) {
      return true
    }

    const msg = String(obj.message || obj.response?.message || '').toLowerCase()
    if (
      msg.includes('token is expired') ||
      msg.includes('token expired') ||
      msg.includes('invalid token') ||
      msg.includes('failed to authenticate') ||
      msg.includes('sessão expirada') ||
      msg.includes('login expirou') ||
      msg.includes('autenticação necessária')
    ) {
      return true
    }
  }

  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    if (
      msg.includes('token is expired') ||
      msg.includes('token expired') ||
      msg.includes('invalid token') ||
      msg.includes('failed to authenticate') ||
      msg.includes('sessão expirada') ||
      msg.includes('login expirou')
    ) {
      return true
    }
  }

  return false
}

/**
 * Verifica se um erro decorre de auto-cancelamento ou abort manual de requisição HTTP.
 */
export function isAbortError(error: unknown): boolean {
  if (!error) return false
  if (typeof error === 'object') {
    const obj = error as Record<string, any>
    if (obj.isAbort === true) return true
    if (obj.name === 'AbortError') return true
    const msg = String(obj.message || '').toLowerCase()
    if (msg.includes('autocancelled') || msg.includes('the request was aborted')) {
      return true
    }
  }
  return false
}

/**
 * Formata um erro retornado pelo PocketBase de forma amigável ao usuário.
 */
export function formatPbError(error: unknown, fallbackMessage = 'Ocorreu um erro na requisição.'): string {
  if (!error) return fallbackMessage
  if (isAbortError(error)) return 'Requisição cancelada.'
  if (isAuthSessionError(error)) return 'Sua sessão expirou. Faça login novamente.'
  return getErrorMessage(error) || fallbackMessage
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
