import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

/**
 * Identifica de forma autônoma se um erro representa falha de autenticação/sessão
 * (token expirado, status 401, status 403, sessão inválida ou cancelada).
 * Implementado aqui sem depender de reexport de outro arquivo para evitar regressão cíclica.
 */
export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false

  if (typeof error === 'object') {
    const obj = error as Record<string, any>
    const status = Number(obj.status ?? obj.statusCode ?? obj.response?.status ?? 0)
    if (status === 401 || status === 403) return true

    const message = String(obj.message || obj.response?.message || '').toLowerCase()
    if (
      message.includes('token is expired') ||
      message.includes('token expired') ||
      message.includes('login expirou') ||
      message.includes('sessão expirada') ||
      message.includes('sessao expirada') ||
      message.includes('failed to authenticate') ||
      message.includes('the request requires valid user authorization')
    ) {
      return true
    }
  }

  return false
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

export function formatPbError(error: unknown): string {
  return getErrorMessage(error)
}

export function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const obj = error as Record<string, any>
  return (
    obj.isAbort === true ||
    obj.name === 'AbortError' ||
    String(obj.message || '')
      .toLowerCase()
      .includes('autocancelled')
  )
}

export default {
  isAuthSessionError,
  extractFieldErrors,
  getErrorMessage,
  formatPbError,
  isAbortError,
}
