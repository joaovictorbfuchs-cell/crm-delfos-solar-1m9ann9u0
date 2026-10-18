import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

/**
 * Identifica se um erro representa falha de autenticação / sessão expirada (401/403 ou tokens inválidos).
 * Implementação real, autônoma e exportada para garantir estabilidade no build e runtime.
 */
export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false

  // PocketBase ClientResponseError ou objetos com status HTTP
  if (typeof error === 'object') {
    const errObj = error as Record<string, unknown>

    if (errObj.status === 401 || errObj.status === 403) return true
    if (errObj.statusCode === 401 || errObj.statusCode === 403) return true

    if (errObj.response && typeof errObj.response === 'object') {
      const resp = errObj.response as Record<string, unknown>
      if (resp.status === 401 || resp.status === 403) return true
      if (resp.statusCode === 401 || resp.statusCode === 403) return true
    }

    if (errObj.originalError && typeof errObj.originalError === 'object') {
      const orig = errObj.originalError as Record<string, unknown>
      if (orig.status === 401 || orig.status === 403) return true
    }
  }

  // Mensagens típicas de expiração / sessão inválida
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' &&
          error !== null &&
          'message' in error &&
          typeof (error as { message: unknown }).message === 'string'
        ? (error as { message: string }).message
        : String(error)

  const msgLower = (message || '').toLowerCase()
  if (
    msgLower.includes('token is expired') ||
    msgLower.includes('token is invalid') ||
    msgLower.includes('failed to authenticate') ||
    msgLower.includes('the request requires valid record authorization token') ||
    msgLower.includes('the request requires valid admin authorization token') ||
    msgLower.includes('login expirou') ||
    msgLower.includes('sessão expirada') ||
    msgLower.includes('sessao expirada')
  ) {
    return true
  }

  return false
}

export function isAbortError(error: unknown): boolean {
  if (!error) return false
  if (error instanceof ClientResponseError) {
    return error.isAbort || error.status === 0
  }
  if (error instanceof Error) {
    return error.name === 'AbortError' || error.message.toLowerCase().includes('autocancelled')
  }
  if (typeof error === 'object' && error !== null) {
    const obj = error as Record<string, unknown>
    return Boolean(obj.isAbort || obj.name === 'AbortError')
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

export default {
  isAuthSessionError,
  isAbortError,
  extractFieldErrors,
  getErrorMessage,
  formatPbError,
}
