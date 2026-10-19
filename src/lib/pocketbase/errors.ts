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

  // Checagem de status direto ou response.status
  const status =
    (typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof (error as { status: unknown }).status === 'number'
      ? (error as { status: number }).status
      : undefined) ??
    (typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    typeof (error as { statusCode: unknown }).statusCode === 'number'
      ? (error as { statusCode: number }).statusCode
      : undefined) ??
    (typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response: unknown }).response === 'object' &&
    (error as { response: Record<string, unknown> }).response !== null &&
    typeof (error as { response: { status?: unknown } }).response.status === 'number'
      ? (error as { response: { status: number } }).response.status
      : undefined)

  if (status === 401 || status === 403) return true

  // Checagem textual na mensagem de erro
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' &&
          error !== null &&
          'message' in error &&
          typeof (error as { message: unknown }).message === 'string'
        ? (error as { message: string }).message
        : ''

  if (!message) return false

  const lower = message.toLowerCase()
  return (
    lower.includes('token is expired') ||
    lower.includes('token expired') ||
    lower.includes('failed to authenticate') ||
    lower.includes('sessão expirada') ||
    lower.includes('sessao expirada') ||
    lower.includes('login expirou') ||
    lower.includes('não autorizado') ||
    lower.includes('nao autorizado') ||
    lower.includes('unauthorized') ||
    lower.includes('forbidden')
  )
}

export function isAbortError(error: unknown): boolean {
  if (!error) return false
  if (error instanceof DOMException && error.name === 'AbortError') return true
  if (typeof error === 'object' && error !== null) {
    if ('isAbort' in error && Boolean((error as { isAbort: unknown }).isAbort)) return true
    if ('name' in error && (error as { name: unknown }).name === 'AbortError') return true
    if ('message' in error && typeof (error as { message: unknown }).message === 'string') {
      const msg = (error as { message: string }).message.toLowerCase()
      if (
        msg.includes('autocancelled') ||
        msg.includes('auto-cancelled') ||
        msg.includes('aborted')
      )
        return true
    }
  }
  return false
}

export function formatPbError(
  error: unknown,
  fallbackMessage = 'Ocorreu um erro na requisição.',
): string {
  if (!error) return fallbackMessage
  const extracted = getErrorMessage(error)
  if (extracted && extracted !== 'An unexpected error occurred.') {
    return extracted
  }
  if (error instanceof Error && error.message) {
    return error.message
  }
  return fallbackMessage
}

export default {
  extractFieldErrors,
  getErrorMessage,
  isAuthSessionError,
  isAbortError,
  formatPbError,
}
