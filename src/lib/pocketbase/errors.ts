import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

export function isAbortError(error: unknown): boolean {
  if (!error) return false
  if (typeof error === 'object') {
    const errObj = error as Record<string, unknown>
    if (errObj.isAbort === true || errObj.name === 'AbortError') return true
    if (typeof errObj.message === 'string' && errObj.message.toLowerCase().includes('abort')) {
      return true
    }
  }
  return false
}

export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false
  if (isAbortError(error)) return false

  if (typeof error === 'object') {
    const errObj = error as Record<string, unknown>
    const status = (errObj.status as number) || (errObj.response as { status?: number })?.status
    if (status === 401 || status === 403) return true

    const msg = (typeof errObj.message === 'string' ? errObj.message : String(errObj)).toLowerCase()

    if (
      msg.includes('token is expired') ||
      msg.includes('invalid token') ||
      msg.includes('login expirou') ||
      msg.includes('sessão expirada') ||
      msg.includes('failed to authenticate') ||
      msg.includes('something went wrong while processing your request')
    ) {
      return true
    }
  }

  return false
}

export function formatPbError(error: unknown): string {
  if (!error) return 'Erro desconhecido.'
  return getErrorMessage(error)
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
