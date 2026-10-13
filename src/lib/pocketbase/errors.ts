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

  // ClientResponseError do PocketBase ou objeto com status/statusCode
  const status =
    typeof error === 'object' && error !== null
      ? ((error as any).status ?? (error as any).statusCode ?? (error as any).response?.status)
      : undefined

  if (status === 401 || status === 403) return true

  // Verificação por mensagem de erro comum de sessão expirada / inválida
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error
        ? String((error as any).message)
        : ''

  const msgLower = message.toLowerCase()
  if (
    msgLower.includes('token is expired') ||
    msgLower.includes('failed to authenticate') ||
    msgLower.includes('the request requires valid record authorization') ||
    msgLower.includes('sessão expirada') ||
    msgLower.includes('unauthorized')
  ) {
    return true
  }

  return false
}
