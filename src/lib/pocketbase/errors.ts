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

export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false

  // Objeto de erro com status HTTP 401 ou 403
  const errObj = error as {
    status?: unknown
    statusCode?: unknown
    code?: unknown
    message?: unknown
    response?: { status?: unknown; code?: unknown; message?: unknown }
  }

  const status = errObj.status ?? errObj.statusCode ?? errObj.response?.status
  if (status === 401 || status === 403) {
    return true
  }

  const code = errObj.code ?? errObj.response?.code
  if (code === 401 || code === 403) {
    return true
  }

  // Verificação por mensagem textual de token / autenticação
  const message =
    typeof errObj.message === 'string'
      ? errObj.message
      : typeof errObj.response?.message === 'string'
        ? errObj.response.message
        : ''

  if (message) {
    const lower = message.toLowerCase()
    if (
      lower.includes('token is expired') ||
      lower.includes('token expired') ||
      lower.includes('failed to authenticate') ||
      lower.includes('the request requires valid') ||
      lower.includes('token is invalid') ||
      lower.includes('invalid token') ||
      lower.includes('invalid or expired')
    ) {
      return true
    }
  }

  return false
}
