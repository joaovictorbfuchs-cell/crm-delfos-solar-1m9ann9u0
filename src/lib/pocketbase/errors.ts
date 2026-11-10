import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

export function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const err = error as Record<string, unknown>
  if (err.isAbort === true) return true
  if (err.name === 'AbortError') return true
  const msg = typeof err.message === 'string' ? err.message.toLowerCase() : ''
  return msg.includes('autocancelled') || msg.includes('abort')
}

export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false
  if (isAbortError(error)) return false

  if (typeof error === 'object') {
    const err = error as Record<string, unknown>
    const status = Number(
      err.status ?? err.statusCode ?? (err.response as Record<string, unknown> | undefined)?.status,
    )
    if (status === 401 || status === 403) return true

    const msg = String(
      err.message ?? (err.data as Record<string, unknown> | undefined)?.message ?? '',
    ).toLowerCase()
    if (
      msg.includes('token is expired or invalid') ||
      msg.includes('sessão expirada') ||
      msg.includes('login expirou') ||
      msg.includes('failed to authenticate') ||
      msg.includes('the request requires valid record authorization token') ||
      msg.includes('unauthorized') ||
      msg.includes('forbidden')
    ) {
      return true
    }
  }

  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    return (
      msg.includes('token is expired or invalid') ||
      msg.includes('sessão expirada') ||
      msg.includes('login expirou') ||
      msg.includes('failed to authenticate') ||
      msg.includes('unauthorized') ||
      msg.includes('forbidden')
    )
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

export function formatPbError(error: unknown, fallbackMessage = 'Erro na operação'): string {
  if (!error) return fallbackMessage
  if (isAuthSessionError(error)) return 'Sua sessão expirou. Por favor, faça login novamente.'
  const extracted = getErrorMessage(error)
  if (extracted && extracted !== 'An unexpected error occurred.') {
    return extracted
  }
  if (error instanceof Error && error.message) {
    return error.message
  }
  return fallbackMessage
}
