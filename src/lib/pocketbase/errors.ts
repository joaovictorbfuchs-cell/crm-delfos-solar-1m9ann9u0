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

  const errObj = error as Record<string, unknown>
  const status = Number(
    errObj?.status ??
      (errObj?.response as Record<string, unknown> | undefined)?.status ??
      errObj?.statusCode,
  )
  if (status === 401 || status === 403) return true

  const msg = typeof errObj?.message === 'string' ? errObj.message : String(error)
  const lower = msg.toLowerCase()
  return (
    lower.includes('token is expired') ||
    lower.includes('expired or invalid') ||
    lower.includes('login expirou') ||
    lower.includes('sessão expirada') ||
    lower.includes('failed to authenticate') ||
    lower.includes('unauthorized') ||
    lower.includes('forbidden')
  )
}

export function formatPbError(error: unknown): string {
  return getErrorMessage(error)
}

export function isAbortError(error: unknown): boolean {
  if (!error) return false
  const errObj = error as Record<string, unknown>
  return Boolean(
    errObj?.isAbort ||
    (typeof errObj?.message === 'string' && errObj.message.toLowerCase().includes('autocancelled')),
  )
}

export default isAuthSessionError
