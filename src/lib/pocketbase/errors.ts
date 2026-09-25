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
 * Detecta se um erro retornado pelo PocketBase (ou requisição HTTP)
 * decorre de sessão encerrada, 401 Unauthorized, 403 Forbidden ou token expirado.
 */
export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false

  if (error instanceof ClientResponseError) {
    if (error.status === 401 || error.status === 403) return true
    const msg = (error.message || '').toLowerCase()
    if (
      msg.includes('token') ||
      msg.includes('authenticate') ||
      msg.includes('autentic') ||
      msg.includes('unauthorized') ||
      msg.includes('forbidden') ||
      msg.includes('expir')
    ) {
      return true
    }
  }

  if (typeof error === 'object' && error !== null) {
    const errObj = error as { status?: number; response?: { status?: number }; message?: string }
    const status = errObj.status ?? errObj.response?.status
    if (status === 401 || status === 403) return true
    if (typeof errObj.message === 'string') {
      const msg = errObj.message.toLowerCase()
      if (
        msg.includes('401') ||
        msg.includes('403') ||
        msg.includes('token expired') ||
        msg.includes('token inválido') ||
        msg.includes('token invalido') ||
        msg.includes('sessão expirada') ||
        msg.includes('sessao expirada') ||
        msg.includes('failed to authenticate') ||
        msg.includes('unauthorized')
      ) {
        return true
      }
    }
  }

  return false
}
