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
  if (typeof error === 'object') {
    const errObj = error as Record<string, any>
    const status = errObj.status ?? errObj.statusCode ?? errObj.response?.status
    if (status === 401 || status === 403) return true

    const message = String(errObj.message || errObj.response?.message || '')
    const lower = message.toLowerCase()
    if (
      lower.includes('token is expired') ||
      lower.includes('invalid token') ||
      lower.includes('failed to authenticate') ||
      lower.includes('login expirou') ||
      lower.includes('sessão expirada') ||
      lower.includes('autentica')
    ) {
      return true
    }
  }
  if (error instanceof Error) {
    const lower = error.message.toLowerCase()
    return (
      lower.includes('token is expired') ||
      lower.includes('invalid token') ||
      lower.includes('failed to authenticate') ||
      lower.includes('login expirou') ||
      lower.includes('sessão expirada')
    )
  }
  return false
}

export function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const errObj = error as Record<string, any>
  return Boolean(
    errObj.isAbort === true ||
    errObj.name === 'AbortError' ||
    errObj.name === 'ClientResponseError 0' ||
    (typeof errObj.message === 'string' &&
      errObj.message.toLowerCase().includes('request was aborted')),
  )
}

export function formatPbError(error: unknown): string {
  return getErrorMessage(error)
}
