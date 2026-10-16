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
 * Identifica se um erro recebido é relacionado à sessão expirada ou inválida do PocketBase
 * (HTTP 401, 403, mensagens de "token is expired", "login expirou", "sessão expirada", etc.)
 */
export function isAuthSessionError(err: unknown): boolean {
  if (!err) return false

  // Se for objeto com propriedade status ou statusCode
  if (typeof err === 'object') {
    const errorObj = err as Record<string, any>
    const status = errorObj.status ?? errorObj.statusCode ?? errorObj.response?.status
    if (status === 401 || status === 403) return true

    const msg = String(errorObj.message || errorObj.error || '').toLowerCase()
    if (
      msg.includes('token') &&
      (msg.includes('expired') || msg.includes('invalid') || msg.includes('expirou'))
    ) {
      return true
    }
    if (
      msg.includes('sessão expirada') ||
      msg.includes('sessao expirada') ||
      msg.includes('login expirou')
    ) {
      return true
    }
    if (msg.includes('failed to authenticate') || msg.includes('não autenticado')) {
      return true
    }
  }

  if (err instanceof Error) {
    const msg = err.message.toLowerCase()
    if (
      msg.includes('token') &&
      (msg.includes('expired') || msg.includes('invalid') || msg.includes('expirou'))
    ) {
      return true
    }
    if (
      msg.includes('sessão expirada') ||
      msg.includes('sessao expirada') ||
      msg.includes('login expirou')
    ) {
      return true
    }
    if (msg.includes('failed to authenticate')) {
      return true
    }
  }

  return false
}
