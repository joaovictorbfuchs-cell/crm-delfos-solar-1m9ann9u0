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

  if (error instanceof ClientResponseError) {
    if (error.status === 401 || error.status === 403) return true
    const responseStatus = error.response?.status
    if (responseStatus === 401 || responseStatus === 403) return true
  }

  if (typeof error === 'object' && error !== null) {
    const errObj = error as {
      status?: unknown
      response?: { status?: unknown }
      message?: unknown
      isAbort?: unknown
    }
    if (errObj.isAbort) return false
    if (errObj.status === 401 || errObj.status === 403) return true
    if (errObj.response && (errObj.response.status === 401 || errObj.response.status === 403))
      return true

    if (typeof errObj.message === 'string') {
      const msg = errObj.message.toLowerCase()
      if (
        msg.includes('token is expired') ||
        msg.includes('token is invalid') ||
        msg.includes('failed to authenticate') ||
        msg.includes('sessão expirada') ||
        msg.includes('sessao expirada') ||
        msg.includes('login expirou') ||
        msg.includes('the request requires valid record authorization token')
      ) {
        return true
      }
    }
  }

  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    if (
      msg.includes('token is expired') ||
      msg.includes('token is invalid') ||
      msg.includes('failed to authenticate') ||
      msg.includes('sessão expirada') ||
      msg.includes('sessao expirada') ||
      msg.includes('login expirou') ||
      msg.includes('the request requires valid record authorization token')
    ) {
      return true
    }
  }

  return false
}

export function isAbortError(error: unknown): boolean {
  if (!error) return false
  if (typeof error === 'object' && error !== null) {
    const e = error as { isAbort?: unknown; name?: unknown; message?: unknown }
    if (e.isAbort === true) return true
    if (e.name === 'AbortError') return true
    if (
      typeof e.message === 'string' &&
      e.message.toLowerCase().includes('the request was aborted')
    )
      return true
  }
  return false
}

export function formatPbError(error: unknown): string {
  return getErrorMessage(error)
}
