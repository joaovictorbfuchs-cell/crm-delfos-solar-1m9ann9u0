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

export function isAbortError(error: unknown): boolean {
  if (!error) return false
  if (typeof error === 'object') {
    const errObj = error as Record<string, unknown>
    if (errObj.isAbort === true || errObj.name === 'AbortError') return true
    if (
      typeof errObj.message === 'string' &&
      errObj.message.includes('The request was autocancelled')
    ) {
      return true
    }
  }
  return false
}

export function isAuthSessionError(error: unknown): boolean {
  if (!error) return false
  if (typeof error === 'object') {
    const errObj = error as Record<string, unknown>
    const status = (errObj.status ??
      errObj.statusCode ??
      (errObj.response as Record<string, unknown> | undefined)?.status) as number | undefined
    if (status === 401 || status === 403) return true
    const message = (
      typeof errObj.message === 'string'
        ? errObj.message
        : typeof (errObj.response as Record<string, unknown> | undefined)?.message === 'string'
          ? ((errObj.response as Record<string, unknown>).message as string)
          : ''
    ).toLowerCase()
    if (
      message.includes('token is expired') ||
      message.includes('login expirou') ||
      message.includes('sessão expirada') ||
      message.includes('sessao expirada') ||
      message.includes('failed to authenticate') ||
      message.includes('token inválido') ||
      message.includes('token invalido') ||
      message.includes('the request requires valid user authorization')
    ) {
      return true
    }
  }
  return false
}

export function formatPbError(error: unknown): string {
  return getErrorMessage(error)
}
