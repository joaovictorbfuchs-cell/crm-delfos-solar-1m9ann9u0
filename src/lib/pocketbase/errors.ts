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

  const errObj = error as {
    status?: unknown
    statusCode?: unknown
    response?: { status?: unknown; statusCode?: unknown; message?: unknown }
    message?: unknown
    originalError?: { message?: unknown }
  }

  const status =
    errObj.status ?? errObj.statusCode ?? errObj.response?.status ?? errObj.response?.statusCode
  if (status === 401 || status === 403) return true

  const rawMsg = [
    typeof errObj.message === 'string' ? errObj.message : '',
    typeof errObj.response?.message === 'string' ? errObj.response.message : '',
    typeof errObj.originalError?.message === 'string' ? errObj.originalError.message : '',
  ]
    .join(' ')
    .toLowerCase()

  if (
    rawMsg.includes('token is expired') ||
    rawMsg.includes('token expired') ||
    rawMsg.includes('failed to authenticate') ||
    rawMsg.includes('sessão expirada') ||
    rawMsg.includes('sessao expirada') ||
    rawMsg.includes('login expirou') ||
    rawMsg.includes('unauthorized') ||
    rawMsg.includes('forbidden')
  ) {
    return true
  }

  return false
}
