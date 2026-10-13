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
  }
  if (typeof error === 'object' && error !== null) {
    const errObj = error as {
      status?: number
      statusCode?: number
      message?: unknown
      response?: { message?: unknown }
    }
    if (
      errObj.status === 401 ||
      errObj.status === 403 ||
      errObj.statusCode === 401 ||
      errObj.statusCode === 403
    ) {
      return true
    }
    const msg = typeof errObj.message === 'string' ? errObj.message.toLowerCase() : ''
    const respMsg =
      typeof errObj.response?.message === 'string' ? errObj.response.message.toLowerCase() : ''
    const fullMsg = `${msg} ${respMsg}`
    if (
      fullMsg.includes('token') ||
      fullMsg.includes('expired') ||
      fullMsg.includes('auth') ||
      fullMsg.includes('session')
    ) {
      // Mas não retornar true para erros gerais de servidor se tiver status 500 sem indicação real de auth
      if (
        (errObj.status === 500 || errObj.statusCode === 500) &&
        !fullMsg.includes('token') &&
        !fullMsg.includes('expired') &&
        !fullMsg.includes('auth')
      ) {
        return false
      }
      return true
    }
  }
  return false
}
