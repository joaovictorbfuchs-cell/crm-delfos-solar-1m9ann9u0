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
 * Identifica se um erro lançado por requisições do PocketBase ou chamadas HTTP
 * corresponde a sessão expirada, token inválido ou ausência de autorização (401/403).
 */
export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false

  // Se for instância ou estrutura do ClientResponseError
  if (error instanceof ClientResponseError) {
    if (error.status === 401 || error.status === 403) return true
    if (error.status === 400) {
      const msg = (error.message || '').toLowerCase()
      if (
        msg.includes('token') ||
        msg.includes('auth') ||
        msg.includes('authenticate') ||
        msg.includes('expired') ||
        msg.includes('invalid user')
      ) {
        return true
      }
    }
    return false
  }

  // Objeto genérico de erro com propriedades status ou name
  if (typeof error === 'object' && error !== null) {
    const errObj = error as {
      status?: number
      name?: string
      message?: string
      originalError?: unknown
    }
    if (errObj.status === 401 || errObj.status === 403) {
      return true
    }
    const msg = (errObj.message || '').toLowerCase()
    if (
      msg.includes('token expired') ||
      msg.includes('sessão expirada') ||
      msg.includes('jwt expired') ||
      msg.includes('unauthorized') ||
      msg.includes('failed to authenticate')
    ) {
      return true
    }
    if (errObj.originalError && errObj.originalError !== error) {
      return isAuthSessionError(errObj.originalError)
    }
  }

  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    if (
      msg.includes('sessão expirada') ||
      msg.includes('token expired') ||
      msg.includes('jwt expired') ||
      msg.includes('unauthorized')
    ) {
      return true
    }
  }

  return false
}
