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

export function isAuthSessionError(err: any): boolean {
  if (!err) return false
  if (err?.isAbort || err?.name === 'AbortError' || err?.message === 'The request was aborted') {
    return false
  }
  const status = Number(err?.status || err?.statusCode || err?.response?.status || 0)
  if (status === 401 || status === 403) return true
  const msg = String(err?.message || err?.error || '').toLowerCase()
  if (
    msg.includes('token is expired') ||
    msg.includes('failed to authenticate') ||
    msg.includes('login expirou') ||
    msg.includes('sessão expirada') ||
    msg.includes('sessao expirada') ||
    msg.includes('not authenticated') ||
    msg.includes('the request requires valid user authorization')
  ) {
    return true
  }
  return false
}

export function isAbortError(err: any): boolean {
  if (!err) return false
  return Boolean(
    err?.isAbort ||
    err?.name === 'AbortError' ||
    err?.message === 'The request was aborted' ||
    err?.message?.includes?.('autocancelled') ||
    err?.message?.includes?.('auto-cancelled'),
  )
}

export function formatPbError(err: any, fallback = 'Ocorreu um erro no servidor'): string {
  if (!err) return fallback
  if (isAbortError(err)) return 'Operação cancelada'
  if (isAuthSessionError(err)) return 'Sua sessão expirou. Faça login novamente.'
  return getErrorMessage(err) || fallback
}
